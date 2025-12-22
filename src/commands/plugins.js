import { Graph } from '../graph/Graph.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Query plugins for a class or interface
 */
export async function queryPlugins(targetClass, options) {
  const graphFile = findGraphFile(targetClass, options.graphFile);

  if (!graphFile) {
    console.error(chalk.red('❌ No graph file found.'));
    console.error(chalk.gray('Run:'), chalk.white(`npm start -- parse <ModuleName>`));
    process.exit(1);
  }

  console.log(chalk.blue.bold('\n🔌 Plugins Query\n'));
  console.log(chalk.gray('Target:'), chalk.white(targetClass));
  console.log(chalk.gray('Graph:'), chalk.white(graphFile));
  console.log('');

  try {
    // Load graph
    const graphData = JSON.parse(readFileSync(graphFile, 'utf-8'));
    const graph = Graph.fromJSON(graphData);

    // Find plugins intercepting this class/interface
    const plugins = graph.edges
      .filter(edge =>
        edge.type === 'INTERCEPTS' &&
        edge.to === targetClass
      )
      .sort((a, b) => (a.properties.sortOrder || 10) - (b.properties.sortOrder || 10));

    if (plugins.length === 0) {
      console.log(chalk.yellow('No plugins found for'), chalk.bold(targetClass));
      console.log('');
      return;
    }

    // Create table
    const table = new Table({
      head: [
        chalk.cyan('Plugin'),
        chalk.cyan('Sort Order'),
        chalk.cyan('Method'),
        chalk.cyan('Area')
      ],
      style: { head: [], border: [] }
    });

    for (const edge of plugins) {
      const pluginNode = graph.getNode(edge.from);
      const pluginName = pluginNode?.properties?.name || edge.from;
      const pluginClass = pluginNode?.properties?.class || '';

      table.push([
        `${chalk.white(pluginName)}\n${chalk.gray(pluginClass)}`,
        chalk.yellow(edge.properties.sortOrder || 10),
        edge.properties.method || chalk.gray('all'),
        edge.properties.area || chalk.gray('global')
      ]);
    }

    console.log(table.toString());
    console.log('');
    console.log(chalk.green(`✅ Found ${plugins.length} plugin(s)`));
    console.log('');

    // Show execution order
    if (options.sortOrder && plugins.length > 1) {
      console.log(chalk.blue.bold('Execution Order:\n'));
      plugins.forEach((edge, idx) => {
        const pluginNode = graph.getNode(edge.from);
        const pluginName = pluginNode?.properties?.name || edge.from;
        console.log(`  ${chalk.yellow(idx + 1)}. ${pluginName} ${chalk.gray(`(sortOrder: ${edge.properties.sortOrder || 10})`)}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error(chalk.red('❌ Error querying plugins:'), error.message);
    process.exit(1);
  }
}

/**
 * Find graph file for a class (search in data directory)
 */
function findGraphFile(targetClass, explicitFile) {
  if (explicitFile && existsSync(explicitFile)) {
    return explicitFile;
  }

  // Try to infer module name from class
  const moduleName = targetClass.split('\\')[1]; // Magento\Customer\... -> Customer
  if (moduleName) {
    const graphFile = join('./data', `Magento_${moduleName}-graph.json`);
    if (existsSync(graphFile)) {
      return graphFile;
    }
  }

  // Fall back to any graph file in data/
  const dataDir = './data';
  if (existsSync(dataDir)) {
    const files = require('fs').readdirSync(dataDir).filter(f =>
      f.endsWith('-graph.json') && !f.startsWith('._')
    );
    if (files.length > 0) {
      return join(dataDir, files[0]);
    }
  }

  return null;
}

export default queryPlugins;
