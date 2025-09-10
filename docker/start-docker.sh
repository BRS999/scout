#!/bin/bash

# Scout Docker Startup Script with build optimizations

set -e

echo "🚀 Starting Scout with Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ docker-compose is not installed."
    exit 1
fi

# Generate SearxNG secret key if not set
if [ -z "$SEARXNG_SECRET_KEY" ]; then
    export SEARXNG_SECRET_KEY=$(openssl rand -hex 32)
    echo "🔑 Generated SearxNG secret key: $SEARXNG_SECRET_KEY"
fi

echo "📦 Building and starting services..."
echo ""

# Use COMPOSE_BAKE for better build performance
echo "🚀 Using COMPOSE_BAKE for optimized builds..."
export COMPOSE_BAKE=true

# Start all services with build
docker-compose up --build -d

echo ""
echo "✅ Services are starting up..."
echo ""
echo "🔍 Service Status:"
echo "  📊 Redis:        http://localhost:6379"
echo "  🔎 SearxNG:      http://localhost:8080"
echo "  🌐 Frontend API: http://localhost:3001"
echo "  📡 API Health:   http://localhost:3001/api/health"
echo ""
echo "⏳ Waiting for services to be ready..."

# Wait for frontend API to be healthy
echo "Waiting for frontend API to be ready..."
timeout=120
counter=0
while ! curl -f http://localhost:3001/api/health > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ Frontend API failed to start within ${timeout} seconds"
        echo "Check the logs with: docker-compose logs frontend"
        exit 1
    fi
    counter=$((counter + 5))
    echo -n "."
    sleep 5
done

echo ""
echo "✅ Frontend API is ready!"
echo ""

# Wait for frontend to be ready
echo "Waiting for frontend to be ready..."
counter=0
while ! curl -f http://localhost:3001 > /dev/null 2>&1; do
    if [ $counter -ge 60 ]; then
        echo "⚠️  Frontend might still be building..."
        break
    fi
    counter=$((counter + 5))
    echo -n "."
    sleep 5
done

echo ""
echo "🎉 Scout is now running!"
echo ""
echo "🌐 Open your browser to: http://localhost:3001"
echo ""
echo "📋 Useful commands:"
echo "  📊 View logs:       docker-compose logs -f"
echo "  🛑 Stop services:   docker-compose down"
echo "  🔄 Restart:         docker-compose restart"
echo "  🧹 Clean up:        docker-compose down -v"
echo ""
echo "💡 Note: Make sure LLM Studio is running on port 1234 for AI features"
echo "   Download from: https://lmstudio.ai/"
echo ""

# Show running containers
echo "🐳 Running containers:"
docker-compose ps
