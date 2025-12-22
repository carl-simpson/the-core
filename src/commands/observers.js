import { Graph } from '../graph/Graph.js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Query observers for an event
 */
export async function queryObservers(eventName, options) {
  const graphFile = findGraphFile(options.graphFile);

  if (!graphFile) {
    console.error(chalk.red('❌ No graph file found.'));
    console.error(chalk.gray('Run:'), chalk.white(`npm start -- parse <ModuleName>`));
    process.exit(1);
  }

  console.log(chalk.blue.bold('\n👀 Observers Query\n'));
  console.log(chalk.gray('Event:'), chalk.white(eventName));
  console.log(chalk.gray('Graph:'), chalk.white(graphFile));
  console.log('');

  try {
    // Load graph
    const graphData = JSON.parse(readFileSync(graphFile, 'utf-8'));
    const graph = Graph.fromJSON(graphData);

    // Find observers watching this event
    const observers = graph.edges
      .filter(edge =>
        edge.type === 'OBSERVES' &&
        edge.to === eventName
      );

    if (observers.length === 0) {
      console.log(chalk.yellow('No observers found for event'), chalk.bold(eventName));
      console.log('');
      return;
    }

    // Create table
    const table = new Table({
      head: [
        chalk.cyan('Observer'),
        chalk.cyan('Class'),
        chalk.cyan('Method'),
        chalk.cyan('Area')
      ],
      style: { head: [], border: [] }
    });

    for (const edge of observers) {
      const observerNode = graph.getNode(edge.from);
      const observerName = observerNode?.properties?.name || edge.from.split('::')[1];
      const observerClass = observerNode?.properties?.class || '';

      table.push([
        chalk.white(observerName),
        chalk.gray(observerClass),
        edge.properties.method || 'execute',
        edge.properties.area || chalk.gray('global')
      ]);
    }

    console.log(table.toString());
    console.log('');
    console.log(chalk.green(`✅ Found ${observers.length} observer(s)`));
    console.log('');

  } catch (error) {
    console.error(chalk.red('❌ Error querying observers:'), error.message);
    process.exit(1);
  }
}

/**
 * Find any graph file in data directory
 */
function findGraphFile(explicitFile) {
  if (explicitFile && existsSync(explicitFile)) {
    return explicitFile;
  }

  const dataDir = './data';
  if (existsSync(dataDir)) {
    const files = readdirSync(dataDir).filter(f =>
      f.endsWith('-graph.json') && !f.startsWith('._')
    );
    if (files.length > 0) {
      return join(dataDir, files[0]);
    }
  }

  return null;
}

export default queryObservers;
