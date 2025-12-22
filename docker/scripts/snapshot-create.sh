#!/bin/bash

# Magento Core Analyzer - Snapshot Creation Script
# Creates a complete backup of all project data for portability

set -e

echo ""
echo "📸 Creating Snapshot Backup..."
echo "==============================="
echo ""

# Create snapshots directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_DIR="snapshots/${TIMESTAMP}"

echo "Creating snapshot directory: ${SNAPSHOT_DIR}"
mkdir -p "${SNAPSHOT_DIR}"

# Backup Neo4j data (if exists and has content)
if [ -d "docker-data/neo4j/data" ] && [ "$(ls -A docker-data/neo4j/data 2>/dev/null)" ]; then
  echo "📦 Backing up Neo4j data..."
  tar -czf "${SNAPSHOT_DIR}/neo4j-data.tar.gz" -C docker-data/neo4j data
  echo "   ✓ Neo4j data backed up ($(du -h "${SNAPSHOT_DIR}/neo4j-data.tar.gz" | cut -f1))"
else
  echo "⚠️  No Neo4j data to backup (empty or doesn't exist)"
fi

# Backup parsed graph data
if [ -d "data" ] && [ "$(ls -A data 2>/dev/null)" ]; then
  echo "📊 Backing up parsed graph data..."
  tar -czf "${SNAPSHOT_DIR}/parsed-data.tar.gz" -C . data
  echo "   ✓ Graph data backed up ($(du -h "${SNAPSHOT_DIR}/parsed-data.tar.gz" | cut -f1))"
else
  echo "⚠️  No parsed data to backup"
fi

# Backup diagrams (if any)
if [ -d "diagrams" ] && [ "$(ls -A diagrams 2>/dev/null)" ]; then
  echo "📊 Backing up diagrams..."
  tar -czf "${SNAPSHOT_DIR}/diagrams.tar.gz" -C . diagrams
  echo "   ✓ Diagrams backed up ($(du -h "${SNAPSHOT_DIR}/diagrams.tar.gz" | cut -f1))"
fi

# Copy configuration files
echo "⚙️  Backing up configuration..."
cp .env "${SNAPSHOT_DIR}/.env.backup"
echo "   ✓ .env backed up"

# Create manifest file
cat > "${SNAPSHOT_DIR}/MANIFEST.txt" << MANIFEST
Magento Core Analyzer Snapshot
Created: $(date)
Hostname: $(hostname)
Platform: $(uname -s)

Contents:
- neo4j-data.tar.gz: Neo4j database files
- parsed-data.tar.gz: Parsed Magento module graphs
- diagrams.tar.gz: Generated diagrams (if any)
- .env.backup: Environment configuration

To restore on a new machine:
1. Copy this entire folder to the new magento-core directory
2. Run: ./scripts/snapshot-restore.sh snapshots/${TIMESTAMP}
MANIFEST

echo ""
echo "✅ Snapshot created successfully!"
echo ""
echo "📁 Location: ${SNAPSHOT_DIR}"
echo "📦 Total size: $(du -sh "${SNAPSHOT_DIR}" | cut -f1)"
echo ""
echo "To restore this snapshot:"
echo "   ./scripts/snapshot-restore.sh ${SNAPSHOT_DIR}"
echo ""
