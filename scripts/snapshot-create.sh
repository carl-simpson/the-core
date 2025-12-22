#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_DIR="snapshots/${TIMESTAMP}"

echo "📸 Creating snapshot: ${TIMESTAMP}"
echo ""

# Create snapshot directory
mkdir -p "${SNAPSHOT_DIR}"

# 1. Backup Neo4j data
if [ -d "docker-data/neo4j/data" ] && [ "$(ls -A docker-data/neo4j/data 2>/dev/null)" ]; then
    echo "💾 Backing up Neo4j database..."
    tar -czf "${SNAPSHOT_DIR}/neo4j-data.tar.gz" -C docker-data/neo4j data
    echo "   ✅ Neo4j data: $(du -h ${SNAPSHOT_DIR}/neo4j-data.tar.gz | cut -f1)"
else
    echo "⚠️  No Neo4j data to backup"
fi

# 2. Backup parsed data
if [ -d "data" ] && [ "$(ls -A data 2>/dev/null)" ]; then
    echo "💾 Backing up parsed data..."
    tar -czf "${SNAPSHOT_DIR}/parsed-data.tar.gz" data
    echo "   ✅ Parsed data: $(du -h ${SNAPSHOT_DIR}/parsed-data.tar.gz | cut -f1)"
else
    echo "⚠️  No parsed data to backup"
fi

# 3. Backup generated diagrams
if [ -d "diagrams" ] && [ "$(ls -A diagrams 2>/dev/null)" ]; then
    echo "💾 Backing up diagrams..."
    tar -czf "${SNAPSHOT_DIR}/diagrams.tar.gz" diagrams
    echo "   ✅ Diagrams: $(du -h ${SNAPSHOT_DIR}/diagrams.tar.gz | cut -f1)"
fi

# 4. Copy environment file
if [ -f ".env" ]; then
    echo "💾 Backing up .env configuration..."
    cp .env "${SNAPSHOT_DIR}/.env"
    echo "   ✅ Environment configuration"
fi

# 5. Create manifest
cat > "${SNAPSHOT_DIR}/manifest.txt" <<EOF
Magento Core Analyzer - Snapshot
Created: ${TIMESTAMP}
Hostname: $(hostname)
OS: $(uname -s)
Docker: $(docker --version 2>/dev/null || echo "Not available")

Contents:
- neo4j-data.tar.gz    : Neo4j graph database
- parsed-data.tar.gz   : Parsed Magento data
- diagrams.tar.gz      : Generated diagrams
- .env                 : Environment configuration

To restore:
  ./scripts/snapshot-restore.sh snapshots/${TIMESTAMP}
EOF

echo ""
echo "✅ Snapshot created: snapshots/${TIMESTAMP}"
echo "📊 Total size: $(du -sh ${SNAPSHOT_DIR} | cut -f1)"
echo ""
echo "💡 To restore on another machine:"
echo "   ./scripts/snapshot-restore.sh snapshots/${TIMESTAMP}"
echo ""
