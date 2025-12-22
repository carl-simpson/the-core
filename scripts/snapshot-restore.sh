#!/bin/bash

# Magento Core Analyzer - Snapshot Restoration Script
# Restores a complete backup of project data

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Snapshot directory required"
  echo ""
  echo "Usage: $0 <snapshot-directory>"
  echo ""
  echo "Available snapshots:"
  if [ -d "snapshots" ]; then
    ls -1 snapshots/ | sed 's/^/  - snapshots\//'
  else
    echo "  (none found)"
  fi
  exit 1
fi

SNAPSHOT_DIR="$1"

if [ ! -d "${SNAPSHOT_DIR}" ]; then
  echo "❌ Error: Snapshot directory not found: ${SNAPSHOT_DIR}"
  exit 1
fi

echo ""
echo "🔄 Restoring Snapshot..."
echo "========================"
echo ""
echo "Source: ${SNAPSHOT_DIR}"
echo ""

# Confirm before proceeding
read -p "⚠️  This will overwrite existing data. Continue? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 0
fi

# Stop Docker services if running
echo ""
echo "🛑 Stopping Docker services..."
docker-compose -f docker/docker-compose.yml down 2>/dev/null || true

# Create necessary directories
mkdir -p docker-data/neo4j/data
mkdir -p docker-data/neo4j/logs
mkdir -p docker-data/neo4j/import
mkdir -p docker-data/neo4j/plugins
mkdir -p data
mkdir -p diagrams

# Restore Neo4j data
if [ -f "${SNAPSHOT_DIR}/neo4j-data.tar.gz" ]; then
  echo "📦 Restoring Neo4j data..."
  rm -rf docker-data/neo4j/data/*
  tar -xzf "${SNAPSHOT_DIR}/neo4j-data.tar.gz" -C docker-data/neo4j/
  echo "   ✓ Neo4j data restored"
fi

# Restore parsed data
if [ -f "${SNAPSHOT_DIR}/parsed-data.tar.gz" ]; then
  echo "📊 Restoring parsed graph data..."
  rm -rf data/*
  tar -xzf "${SNAPSHOT_DIR}/parsed-data.tar.gz" -C .
  echo "   ✓ Graph data restored"
fi

# Restore diagrams
if [ -f "${SNAPSHOT_DIR}/diagrams.tar.gz" ]; then
  echo "📊 Restoring diagrams..."
  rm -rf diagrams/*
  tar -xzf "${SNAPSHOT_DIR}/diagrams.tar.gz" -C .
  echo "   ✓ Diagrams restored"
fi

# Restore configuration (but don't overwrite if .env already exists)
if [ -f "${SNAPSHOT_DIR}/.env.backup" ]; then
  if [ -f ".env" ]; then
    echo "⚙️  .env already exists - backed up to .env.old"
    cp .env .env.old
  fi
  cp "${SNAPSHOT_DIR}/.env.backup" .env
  echo "   ✓ Configuration restored"
fi

echo ""
echo "✅ Snapshot restored successfully!"
echo ""
echo "Next steps:"
echo "  1. Verify .env configuration (especially USER_ID and GROUP_ID for Linux)"
echo "  2. Start services: npm run docker:up"
echo "  3. Verify Neo4j: http://localhost:7474"
echo ""
