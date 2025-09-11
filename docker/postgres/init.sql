-- Initialize Scout PostgreSQL database
-- This script runs automatically when the container starts for the first time

-- Create the pgvector extension (if not already exists)
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE scout TO scout;

-- Create schema for Mastra memory storage (will be created automatically by Mastra)
-- The Mastra PostgreSQL adapter will create the necessary tables:
-- - memory_messages: stores conversation messages
-- - memory_threads: stores conversation threads
-- - memory_embeddings: stores vector embeddings for semantic search

-- Set up any additional configuration
ALTER DATABASE scout SET timezone TO 'UTC';

-- Log initialization completion
\echo 'Scout PostgreSQL database initialized with pgvector extension'