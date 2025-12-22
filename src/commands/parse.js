import { DiXmlParser } from '../parsers/xml/DiXmlParser.js';
import { EventsXmlParser } from '../parsers/xml/EventsXmlParser.js';
import { ModuleXmlParser } from '../parsers/xml/ModuleXmlParser.js';
import { GraphBuilder } from '../graph/GraphBuilder.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Parse a Magento module and build graph
 */
export async function parseModule(moduleName, magentoPath, outputDir) {
  const modulePath = join(magentoPath, 'module-' + moduleName.replace('Magento_', '').toLowerCase());

  console.log(chalk.blue.bold('\n🔍 Parsing Magento Module\n'));
  console.log(chalk.gray('Module:'), chalk.white(moduleName));
  console.log(chalk.gray('Path:'), chalk.white(modulePath));
  console.log(chalk.gray('Output:'), chalk.white(outputDir));
  console.log('');

  // Initialize parsers
  const diParser = new DiXmlParser();
  const eventsParser = new EventsXmlParser();
  const moduleParser = new ModuleXmlParser();

  let spinner;

  try {
    // Parse DI configuration
    spinner = ora('Parsing di.xml files...').start();
    const diResults = diParser.parseModule(modulePath);
    const diStats = diParser.getStats();
    spinner.succeed(
      `DI Config: ${diStats.preferences} preferences, ${diStats.plugins} plugins, ${diStats.virtualTypes} virtual types`
    );

    // Parse events configuration
    spinner = ora('Parsing events.xml files...').start();
    const eventsResults = eventsParser.parseModule(modulePath);
    const eventsStats = eventsParser.getStats();
    spinner.succeed(
      `Events: ${eventsStats.events} events, ${eventsStats.observers} observers`
    );

    // Parse module configuration
    spinner = ora('Parsing module.xml...').start();
    const moduleResults = moduleParser.parseModule(modulePath);
    const moduleStats = moduleParser.getStats();
    spinner.succeed(
      `Module: ${moduleStats.modules} module(s), ${moduleStats.totalDependencies} dependencies`
    );

    // Build graph
    spinner = ora('Building relationship graph...').start();
    const builder = new GraphBuilder();
    const graph = builder.build(diResults, eventsResults, moduleResults);
    const graphStats = graph.getStats();
    spinner.succeed(
      `Graph: ${graphStats.totalNodes} nodes, ${graphStats.totalEdges} edges`
    );

    // Save graph to JSON
    const outputFile = join(outputDir, `${moduleName}-graph.json`);
    spinner = ora(`Saving to ${outputFile}...`).start();
    writeFileSync(outputFile, JSON.stringify(graph.toJSON(), null, 2));
    spinner.succeed(`Saved to ${chalk.green(outputFile)}`);

    // Display statistics
    console.log('');
    console.log(chalk.blue.bold('📊 Statistics\n'));

    console.log(chalk.cyan('Nodes by Type:'));
    for (const [type, count] of Object.entries(graphStats.nodeTypes)) {
      console.log(`  ${type}: ${chalk.yellow(count)}`);
    }

    console.log('');
    console.log(chalk.cyan('Edges by Type:'));
    for (const [type, count] of Object.entries(graphStats.edgeTypes)) {
      console.log(`  ${type}: ${chalk.yellow(count)}`);
    }

    console.log('');
    console.log(chalk.green.bold('✅ Parsing complete!\n'));

    return {
      graph,
      stats: graphStats,
      outputFile
    };

  } catch (error) {
    if (spinner) spinner.fail(chalk.red('Parsing failed'));
    console.error(chalk.red('\n❌ Error:'), error.message);
    console.error(chalk.gray(error.stack));
    throw error;
  }
}

export default parseModule;
