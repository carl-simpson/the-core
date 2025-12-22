# Quick Start - 5 Minutes to Running

## On This Machine (macOS)

```bash
cd /Volumes/External/magento-core

# 1. Install dependencies (2 min)
npm install

# 2. Configure (1 min)
cp .env.example .env
nano .env  # Set MAGENTO_PATH=

# 3. Start Docker (1 min)
npm run docker:up

# 4. Test (30 sec)
npm start -- init

# 5. Parse your first module (1 min)
npm start -- parse Magento_Customer
```

## What You Get

✅ **3 Working Parsers**: di.xml, events.xml, module.xml
✅ **Graph Builder**: In-memory relationship graph
✅ **CLI Commands**: plugins, observers, deps queries
✅ **Docker Services**: Neo4j + PHP Parser
✅ **Backup System**: Snapshots + incremental backups
✅ **Portable Setup**: Copy folder → New machine → Works

## Common Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# Parse a module
npm start -- parse Magento_Customer

# Query plugins
npm start -- plugins CustomerRepositoryInterface

# Query observers
npm start -- observers customer_save_after

# Create backup
./scripts/snapshot-create.sh

# View Neo4j browser
open http://localhost:7474
```

## Next Steps

1. **Read 24-HOUR-SPRINT.md** for development roadmap
2. **Read PORTABILITY.md** for migration guide
4. **Start coding!** See `src/parsers/xml/` for examples

## Snapshot Before Machine Wipe

```bash
# Create final backup
./scripts/snapshot-create.sh

# Stop services
npm run docker:down

# Eject drive
diskutil eject /Volumes/External
```

Done! Everything is backed up and portable.
