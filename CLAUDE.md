# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Magento 2 Core Documentation & Mapping Tool - A Node.js utility that parses, analyzes, documents, and visualizes the Magento 2 core codebase. Includes a static HTML documentation site for Magento modules.

## Essential Commands

### Documentation Site
```bash
# Start the docs site (requires host entry: 127.0.0.1 magento-core.local)
cd /home/carl/Documents/the-core/docs && python3 -m http.server 9090 --bind 127.0.0.1
# Access at: http://magento-core.local:9090/
```

### Development
```bash
npm install              # Install dependencies
npm run dev              # CLI in watch mode (auto-reload)
npm start -- --help      # Show CLI help
npm start -- init        # Verify setup
```

### Testing & Linting
```bash
npm test                 # Run tests (uses --experimental-vm-modules for ESM)
npm run test:watch       # Tests in watch mode
npm run lint             # ESLint on src/
```

### CLI Commands (mage-map)
```bash
npm start -- parse Magento_Customer              # Parse module XML config
npm start -- plugins CustomerRepositoryInterface # Show plugins for interface
npm start -- observers customer_save_after       # Show event observers
npm start -- deps Magento_Customer              # Show module dependencies
npm start -- diagram CustomerRepository::save   # Generate Mermaid diagram
```

### Docker (Neo4j + PHP Parser)
```bash
npm run docker:up        # Start services
npm run docker:down      # Stop services
npm run neo4j:browser    # Open Neo4j at http://localhost:7474
```

### Backup/Snapshots
```bash
./scripts/snapshot-create.sh   # Create backup
./scripts/snapshot-restore.sh  # Restore from backup
```

## Architecture

### Source Code (`src/`)
- **cli/index.js** - Commander.js CLI entry point, defines all commands
- **parsers/xml/** - Magento XML parsers (DiXmlParser, EventsXmlParser, ModuleXmlParser)
- **parsers/php/** - PHP AST parser wrapper (uses nikic/php-parser via Docker)
- **graph/** - Graph.js (data structure) and GraphBuilder.js (builds from parsed data)
- **commands/** - CLI command implementations (parse.js, plugins.js, observers.js)

### Documentation (`docs/`)
- **index.html** - Main documentation landing page
- **modules/** - Per-module documentation (Magento_Customer, Magento_Sales, etc.)
  - Each module has `html/` subdirectory with: architecture.html, execution-flows.html, plugins-observers.html, integrations.html, known-issues.html, anti-patterns.html

### Annotations (`annotations/`)
YAML files containing known issues and gotchas for modules (customer/, catalog/, sales/)

### Data Flow
1. XML Parsers read Magento di.xml/events.xml/module.xml
2. GraphBuilder constructs in-memory relationship graph
3. Commands query the graph for plugins, observers, dependencies
4. Results displayed via CLI or exported as Mermaid diagrams

## Design System (Documentation HTML)

All HTML documentation uses Tailwind CSS with the Magento brand palette. Key requirements:

### Colors (ONLY use these)
- **Primary**: `orange-500` (#F26423) - actions, accents
- **Secondary**: `yellow-500` (#F1BC1B) - warnings, highlights
- **Text/Dark**: `charcoal-500` (#2C2C2C) - body text, backgrounds

### Style Rules
- **No rounded corners on cards/containers** - Magento uses angular geometric forms
- Only use `rounded-full` for circular elements (badges, avatars)
- Use `rounded-r-lg` only on callout right edges (paired with left border)
- Inter Tight font family
- WCAG AA accessibility compliance required

### Forbidden Colors
Never use: purple (#292562), red (#ec2254), blues, greens, or pink/magenta

## Environment Configuration

Copy `.env.example` to `.env` and set:
- `MAGENTO_PATH` - Path to Magento 2 installation
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` - Database connection
- `OUTPUT_DIR`, `DIAGRAMS_DIR` - Output paths

## Project Status

Current phase: POC targeting Magento_Customer module. Features implemented:
- XML config parsers (di.xml, events.xml, module.xml)
- In-memory graph builder
- CLI queries for plugins and observers
- Static HTML documentation for 10+ modules

Coming soon: Neo4j integration, PHP call chain analysis, interactive D3.js visualization.
