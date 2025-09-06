#!/bin/bash

# AgenticSeek TypeScript - Service Starter
# This script reuses Docker containers from the original AgenticSeek

set -e

echo "🚀 Starting AgenticSeek TypeScript Services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Database
POSTGRES_PASSWORD=agentic_seek_password

# SearX (reuse from original AgenticSeek)
SEARXNG_SECRET_KEY=your_secret_key_here
SEARXNG_BASE_URL=http://localhost:8080

# Redis
REDIS_URL=redis://localhost:6379/0

# Application
NODE_ENV=development
PORT=7777
WORK_DIR=./workspace
EOL
    echo "✅ Created .env file. Please edit it with your actual values."
fi

# Start Docker services
echo "🐳 Starting Docker services..."
cd docker
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services started successfully!"
    echo ""
    echo "🌐 Services available at:"
    echo "  - SearX: http://localhost:8080"
    echo "  - API: http://localhost:7777 (when you start the backend)"
    echo "  - Frontend: http://localhost:3000 (when you start the frontend)"
    echo ""
    echo "📊 To check service status: docker-compose ps"
    echo "📋 To view logs: docker-compose logs -f"
    echo "🛑 To stop services: docker-compose down"
else
    echo "❌ Failed to start services. Check logs with: docker-compose logs"
    exit 1
fi

echo ""
echo "🎉 Ready to start developing!"
echo "Run 'bun run dev' to start the development servers."

