#!/bin/bash
set -e

BACKUP_DIR="../backups/neo4j/$(date +%Y%m%d_%H%M%S)"

echo "💾 Backing up Neo4j database..."

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if Neo4j is running
if docker ps | grep -q magento-analyzer-neo4j; then
    echo "📊 Neo4j is running - performing online backup..."

    # Export via Cypher (works while running)
    docker exec magento-analyzer-neo4j cypher-shell \
        -u "${NEO4J_USER:-neo4j}" \
        -p "${NEO4J_PASSWORD:-magento-analyzer}" \
        "CALL apoc.export.json.all('backup.json', {})" 2>/dev/null || \
        echo "⚠️  APOC export not available - using data directory copy"

    # Copy data directory as fallback
    docker exec magento-analyzer-neo4j tar czf /tmp/neo4j-backup.tar.gz /data
    docker cp magento-analyzer-neo4j:/tmp/neo4j-backup.tar.gz "${BACKUP_DIR}/"
else
    echo "🛑 Neo4j is not running - copying data directory..."
    if [ -d "../docker-data/neo4j/data" ]; then
        tar -czf "${BACKUP_DIR}/neo4j-backup.tar.gz" -C ../docker-data/neo4j data
    else
        echo "❌ No Neo4j data found"
        exit 1
    fi
fi

echo "✅ Backup created: ${BACKUP_DIR}"
echo "📊 Size: $(du -sh ${BACKUP_DIR} | cut -f1)"
echo ""
