#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

const program = new Command();

program
  .name('mage-map')
  .description('Magento 2 Core Documentation & Mapping Tool')
  .version(packageJson.version);

// Parse command - Parse Magento module configuration
program
  .command('parse')
  .description('Parse Magento module XML configuration')
  .argument('[module]', 'Module name (e.g., Magento_Customer)', 'Magento_Customer')
  .option('-p, --path <path>', 'Path to Magento installation', process.env.MAGENTO_PATH || './vendor/magento')
  .option('-o, --output <dir>', 'Output directory for parsed data', './data')
  .action(async (module, options) => {
    try {
      const { parseModule } = await import('../commands/parse.js');
      await parseModule(module, options.path, options.output);
    } catch (error) {
      console.error(chalk.red('❌ Failed to parse module:'), error.message);
      process.exit(1);
    }
  });

// Plugins command - Show plugins for an interface/class
program
  .command('plugins')
  .description('Show all plugins intercepting a class or interface')
  .argument('<target>', 'Interface or class name (e.g., CustomerRepositoryInterface)')
  .option('-a, --area <area>', 'Filter by area (frontend, adminhtml, graphql, webapi_rest)', 'all')
  .option('--sort-order', 'Show sortOrder values', true)
  .option('-g, --graph-file <file>', 'Path to graph JSON file')
  .action(async (target, options) => {
    try {
      const { queryPlugins } = await import('../commands/plugins.js');
      await queryPlugins(target, options);
    } catch (error) {
      console.error(chalk.red('❌ Query failed:'), error.message);
      process.exit(1);
    }
  });

// Observers command - Show observers for an event
program
  .command('observers')
  .description('Show all observers listening to an event')
  .argument('<event>', 'Event name (e.g., customer_save_after)')
  .option('-a, --area <area>', 'Filter by area', 'all')
  .option('-g, --graph-file <file>', 'Path to graph JSON file')
  .action(async (event, options) => {
    try {
      const { queryObservers } = await import('../commands/observers.js');
      await queryObservers(event, options);
    } catch (error) {
      console.error(chalk.red('❌ Query failed:'), error.message);
      process.exit(1);
    }
  });

// Deps command - Show module dependencies
program
  .command('deps')
  .description('Show module dependencies (sequence and composer)')
  .argument('<module>', 'Module name (e.g., Magento_Customer)')
  .option('-t, --transitive', 'Show transitive dependencies', false)
  .option('--reverse', 'Show reverse dependencies (what depends on this module)', false)
  .action((module, options) => {
    console.log(chalk.blue('📦 Dependencies for:'), chalk.bold(module));
    console.log(chalk.gray('Transitive:'), options.transitive);
    console.log(chalk.gray('Reverse:'), options.reverse);
    console.log(chalk.yellow('\n⚠️  Query not yet implemented - Coming in Week 2!'));
    console.log(chalk.gray('This will show module.xml sequence and composer.json dependencies'));
  });

// Diagram command - Generate Mermaid diagram
program
  .command('diagram')
  .description('Generate Mermaid diagram for plugin chain or dependency graph')
  .argument('<target>', 'Target (e.g., CustomerRepository::save or Magento_Customer)')
  .option('-t, --type <type>', 'Diagram type (plugins, deps, events)', 'plugins')
  .option('-o, --output <dir>', 'Output directory', './diagrams')
  .option('--format <format>', 'Output format (mmd, png, svg)', 'mmd')
  .action((target, options) => {
    console.log(chalk.blue('📊 Generating diagram for:'), chalk.bold(target));
    console.log(chalk.gray('Type:'), options.type);
    console.log(chalk.gray('Format:'), options.format);
    console.log(chalk.yellow('\n⚠️  Diagram generator not yet implemented - Coming in Week 3!'));
    console.log(chalk.gray('This will generate Mermaid flowcharts showing execution flow'));
  });

// Import command - Import parsed data to Neo4j
program
  .command('import')
  .description('Import parsed graph data to Neo4j')
  .argument('[file]', 'JSON graph file to import', './data/graph.json')
  .option('--neo4j-uri <uri>', 'Neo4j URI', process.env.NEO4J_URI || 'bolt://localhost:7687')
  .option('--neo4j-user <user>', 'Neo4j username', process.env.NEO4J_USER || 'neo4j')
  .option('--neo4j-password <password>', 'Neo4j password', process.env.NEO4J_PASSWORD || 'magento-analyzer')
  .option('--clear', 'Clear existing data before import', false)
  .action((file, options) => {
    console.log(chalk.blue('📥 Importing to Neo4j:'), chalk.bold(file));
    console.log(chalk.gray('URI:'), options.neo4jUri);
    console.log(chalk.gray('Clear existing:'), options.clear);
    console.log(chalk.yellow('\n⚠️  Neo4j importer not yet implemented - Coming in Phase 2!'));
    console.log(chalk.gray('This will import the graph into Neo4j for advanced queries'));
  });

// Query command - Execute Cypher query on Neo4j
program
  .command('query')
  .description('Execute Cypher query on Neo4j graph database')
  .argument('<cypher>', 'Cypher query to execute')
  .option('--neo4j-uri <uri>', 'Neo4j URI', process.env.NEO4J_URI || 'bolt://localhost:7687')
  .option('--neo4j-user <user>', 'Neo4j username', process.env.NEO4J_USER || 'neo4j')
  .option('--neo4j-password <password>', 'Neo4j password', process.env.NEO4J_PASSWORD || 'magento-analyzer')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action((cypher, options) => {
    console.log(chalk.blue('🔍 Executing Cypher query...'));
    console.log(chalk.gray('Query:'), cypher);
    console.log(chalk.yellow('\n⚠️  Neo4j query not yet implemented - Coming in Phase 2!'));
    console.log(chalk.gray('This will execute custom Cypher queries against the graph'));
  });

// Init command - Initialize project and check dependencies
program
  .command('init')
  .description('Initialize project and verify setup')
  .option('--docker', 'Check Docker setup', true)
  .option('--magento <path>', 'Path to Magento installation to validate')
  .action((options) => {
    console.log(chalk.blue.bold('\n🚀 Magento Core Analyzer - Initialization\n'));

    console.log(chalk.green('✓'), 'Node.js version:', process.version);
    console.log(chalk.green('✓'), 'CLI version:', packageJson.version);

    if (options.docker) {
      console.log(chalk.blue('\n📦 Docker Setup:'));
      console.log(chalk.gray('  To start services:'), chalk.white('npm run docker:up'));
      console.log(chalk.gray('  To stop services:'), chalk.white('npm run docker:down'));
      console.log(chalk.gray('  Neo4j Browser:'), chalk.white('http://localhost:7474'));
    }

    if (options.magento) {
      console.log(chalk.blue('\n🔍 Magento Installation:'));
      console.log(chalk.gray('  Path:'), options.magento);
      console.log(chalk.yellow('  ⚠️  Validation not yet implemented'));
    }

    console.log(chalk.blue('\n📝 Next Steps:'));
    console.log(chalk.gray('  1. Install dependencies:'), chalk.white('npm install'));
    console.log(chalk.gray('  2. Start Docker services:'), chalk.white('npm run docker:up'));
    console.log(chalk.gray('  3. Parse a module:'), chalk.white('mage-map parse Magento_Customer'));
    console.log(chalk.gray('  4. View help:'), chalk.white('mage-map --help'));

    console.log(chalk.gray('\n📚 Documentation: See README.md\n'));
  });

// Parse command line arguments
program.parse();
