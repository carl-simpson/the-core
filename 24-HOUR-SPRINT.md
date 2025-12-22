# 24-Hour Aggressive Development Sprint

**Goal**: Maximum functional progress before machine wipe
**Strategy**: Focus on core parsing and working demo, defer polish

## ✅ Infrastructure Complete (Done)
- [x] Docker Compose with local volumes
- [x] Backup/restore scripts
- [x] Snapshot system for portability
- [x] CLI framework
- [x] Project structure

---

## 🎯 24-Hour Priority Plan

### Hour 0-2: Setup & First Parser ✅ CRITICAL PATH
**Status**: READY TO START

```bash
# 1. Install dependencies (10 min)
npm install

# 2. Start Docker (5 min)
npm run docker:up

# 3. Implement DiXmlParser.js (1.5 hours)
   - Parse <preference>
   - Parse <plugin>
   - Parse <virtualType>
   - Handle area-specific di.xml
```

**Deliverable**: Working di.xml parser for Magento_Customer

---

### Hour 2-4: Second Parser & Graph Foundation
```bash
# 4. Implement EventsXmlParser.js (1 hour)
   - Parse <event> nodes
   - Parse <observer> nodes
   - Handle disabled flag

# 5. Implement ModuleXmlParser.js (30 min)
   - Parse <sequence> dependencies
   - Extract module name/version

# 6. Implement Graph.js (30 min)
   - addNode()
   - addEdge()
   - serialize to JSON
```

**Deliverable**: All 3 parsers + graph model working

---

### Hour 4-8: CLI Commands & Integration
```bash
# 7. Wire parsers to CLI (1 hour)
   - Update parse command
   - Test against Magento_Customer

# 8. Implement plugins command (1 hour)
   - Query graph for plugins
   - Format output with chalk

# 9. Implement observers command (1 hour)
   - Query graph for observers
   - Show event details

# 10. Implement deps command (1 hour)
   - Query module dependencies
   - Show transitive deps
```

**Deliverable**: Working CLI queries

---

### Hour 8-12: Mermaid Diagrams & Testing
```bash
# 11. Implement MermaidGenerator.js (2 hours)
   - Plugin chain flowcharts
   - Module dependency graphs
   - Export to .mmd files

# 12. Create test fixtures (1 hour)
   - Sample di.xml
   - Sample events.xml
   - Test against real Magento

# 13. Integration testing (1 hour)
   - Parse Magento_Customer
   - Run all queries
   - Generate diagram
```

**Deliverable**: End-to-end demo working

---

### Hour 12-16: Neo4j Import (Phase 2 Preview)
```bash
# 14. Implement Neo4jConnector.js (2 hours)
   - Connect to Neo4j
   - Batch import nodes/edges
   - Create indexes

# 15. Implement import command (1 hour)
   - Load JSON graph
   - Import to Neo4j

# 16. Test Cypher queries (1 hour)
   - Validate graph structure
   - Test complex queries
```

**Deliverable**: Neo4j integration working

---

### Hour 16-20: Polish & Documentation
```bash
# 17. Error handling (1 hour)
   - Graceful XML parsing errors
   - File not found handling
   - Docker connection errors

# 18. Progress bars & UX (1 hour)
   - Add ora spinners
   - cli-progress for parsing
   - Better error messages

# 19. Usage documentation (1 hour)
   - Update README examples
   - Add troubleshooting
   - Document known issues

# 20. Create demo script (1 hour)
   - Automated demo
   - Screenshots
   - Sample outputs
```

**Deliverable**: Polished demo-ready tool

---

### Hour 20-24: Final Push & Backup
```bash
# 21. Parse additional modules (2 hours)
   - Magento_Catalog (if time)
   - Magento_Checkout (if time)
   - Validate against plan

# 22. Performance testing (1 hour)
   - Time full parse
   - Optimize bottlenecks
   - Document performance

# 23. Create comprehensive snapshot (30 min)
   - Snapshot all data
   - Backup Neo4j
   - Package for transfer

# 24. Final validation (30 min)
   - Test restore on same machine
   - Document migration steps
   - Create migration checklist
```

**Deliverable**: Production-ready portable package

---

## 🚀 Critical Path (Must Complete)

1. ✅ DiXmlParser.js (Hour 0-2) **← START HERE**
2. ✅ EventsXmlParser.js + ModuleXmlParser.js (Hour 2-3)
3. ✅ Graph.js (Hour 3-4)
4. ✅ CLI command implementations (Hour 4-8)
5. ✅ MermaidGenerator.js (Hour 8-10)
6. ✅ Integration test with Magento_Customer (Hour 10-12)

**If only 12 hours available**: Stop here and snapshot

---

## 📦 Backup Strategy

**Every 4 hours**: Create snapshot
```bash
./scripts/snapshot-create.sh
```

**Before major changes**: Backup Neo4j
```bash
./scripts/backup-neo4j.sh
```

**Final backup**: Full snapshot + tar.gz entire folder
```bash
./scripts/snapshot-create.sh
cd ..
tar -czf magento-core-final-$(date +%Y%m%d).tar.gz magento-core/
```

---

## 🎯 Success Criteria

**Minimum Viable Demo** (12 hours):
- [x] Parse Magento_Customer successfully
- [x] All 3 CLI queries working
- [x] At least 1 Mermaid diagram generated
- [x] Snapshot created

**Stretch Goals** (24 hours):
- [x] Neo4j import working
- [ ] Multiple modules parsed
- [ ] Performance optimized
- [ ] Demo script automated

---

## 🚨 Fallback Plan

**If blocked on parser**:
- Use `bin/magento dev:di:info` as fallback
- Parse output instead of XML
- Document limitation

**If blocked on Neo4j**:
- In-memory graph queries only
- Defer to Phase 2
- Focus on CLI output

**If blocked on Mermaid**:
- ASCII tree output only
- Text-based visualization
- Still meets POC criteria

---

## 📝 Migration Checklist (To Linux)

1. Copy entire folder to Linux machine
2. Install Docker + Docker Compose
3. Install Node.js 18+
4. Run `./scripts/setup.sh`
5. Update `.env` with new MAGENTO_PATH
6. Run `./scripts/snapshot-restore.sh <timestamp>`
7. Start services: `npm run docker:up`
8. Verify: `npm start -- init`

---

## 🎬 Quick Start (Right Now)

```bash
cd /Volumes/External/magento-core

# 1. Install
npm install

# 2. Start Docker
npm run docker:up

# 3. Start coding!
# Open src/parsers/xml/DiXmlParser.js
```

**Let's go!** 🚀
