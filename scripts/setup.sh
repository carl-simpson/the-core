#!/bin/bash
set -e

echo "🔧 Setting up Magento Core Analyzer..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Docker is required for Neo4j and PHP parser."
    echo "   Download: https://www.docker.com/products/docker-desktop"
else
    echo "✅ Docker version: $(docker --version)"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose is not installed."
else
    echo "✅ Docker Compose version: $(docker-compose --version)"
fi

echo ""

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy .env.example to .env and configure if needed:"
echo "      cp .env.example .env"
echo ""
echo "   2. Set MAGENTO_PATH in .env to point to your Magento installation:"
echo "      MAGENTO_PATH=/path/to/your/magento2"
echo ""
echo "   3. Start Docker services:"
echo "      npm run docker:up"
echo ""
echo "   4. Run the CLI:"
echo "      npm start -- init"
echo "      npm start -- parse Magento_Customer"
echo ""
echo "📚 See README.md for detailed usage instructions"
echo ""
