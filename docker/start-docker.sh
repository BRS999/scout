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
echo "  🌐 Frontend + API: http://localhost:3000"
echo ""
echo "⏳ Waiting for services to be ready..."

echo ""
echo "🎉 Scout is now running!"
echo ""
echo "🌐 Open your browser to: http://localhost:3000"
echo "   (Frontend + API are unified in one service)"
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
