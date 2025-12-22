#!/bin/bash
set -e

echo "🚀 Starting Magento Core Analyzer Docker services..."

# Change to docker directory
cd "$(dirname "$0")/../docker"

# Load environment variables if .env exists
if [ -f ../.env ]; then
    echo "📝 Loading environment from .env file..."
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Start Docker services
echo "🐳 Starting Neo4j and PHP Parser..."
docker-compose up -d

# Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j to be ready..."
max_attempts=30
attempt=0

until docker-compose exec -T neo4j wget --spider -q http://localhost:7474 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Neo4j failed to start after ${max_attempts} attempts"
        exit 1
    fi
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

echo ""
echo "✅ All services are running!"
echo ""
echo "📊 Neo4j Browser:  http://localhost:7474"
echo "   Username:       ${NEO4J_USER:-neo4j}"
echo "   Password:       ${NEO4J_PASSWORD:-magento-analyzer}"
echo ""
echo "🔧 To view logs:   docker-compose logs -f"
echo "🛑 To stop:        npm run docker:down"
echo ""
