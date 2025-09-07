#!/bin/bash

# Scout Services Starter
# Simple script to start Scout services for non-technical users

echo "🚀 Starting Scout services..."
echo ""

# Change to docker directory and run the startup script
cd "$(dirname "$0")/docker" || {
    echo "❌ Error: Could not find docker directory"
    exit 1
}

# Run the Docker startup script
./start-docker.sh
