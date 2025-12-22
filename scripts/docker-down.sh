#!/bin/bash
set -e

echo "🛑 Stopping Magento Core Analyzer Docker services..."

# Change to docker directory
cd "$(dirname "$0")/../docker"

# Stop Docker services
docker-compose down

echo "✅ All services stopped"
echo ""
echo "💡 To remove volumes (CAUTION: deletes all Neo4j data):"
echo "   docker-compose down -v"
echo ""
