#!/bin/bash

# Scout Docker Launcher
# This script launches the Docker setup from the docker/ directory

echo "🚀 Starting Scout with Docker..."
echo ""

# Change to docker directory and run the startup script
cd "$(dirname "$0")/docker" || {
    echo "❌ Error: Could not find docker directory"
    exit 1
}

# Run the Docker startup script
./start-docker.sh
