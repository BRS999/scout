-- Scout Database Initialization
-- This script initializes the main scout database, agent memory, and cron databases

-- Create the main scout database (if not exists)
-- Note: This is handled by POSTGRES_DB environment variable, but we'll create additional databases

-- Create the scout_agent database for Mastra memory
CREATE DATABASE scout_agent;

-- Create the scout_cron database for cron jobs
CREATE DATABASE scout_cron;

-- Switch to the main scout database
\c scout;

-- Create tables for main scout application (chats, etc.)
-- Add your main application schema here

-- Switch to the scout_agent database and set up pgvector
\c scout_agent;

-- Create pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Switch to the scout_cron database
\c scout_cron;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL DEFAULT '1.0.0',
    name TEXT NOT NULL,
    description TEXT,
    owner TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    schedule TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    jitter_ms INTEGER NOT NULL DEFAULT 0,
    catchup BOOLEAN NOT NULL DEFAULT false,
    concurrency TEXT NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 0,
    not_before BIGINT,
    not_after BIGINT,
    graph_id TEXT NOT NULL,
    inputs JSONB NOT NULL DEFAULT '{}',
    resources JSONB NOT NULL DEFAULT '{}',
    retry_config JSONB NOT NULL DEFAULT '{}',
    alerts_config JSONB NOT NULL DEFAULT '{}',
    labels JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create runs table
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    scheduled_at BIGINT NOT NULL,
    started_at BIGINT,
    completed_at BIGINT,
    state TEXT NOT NULL,
    attempt INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,
    resource_usage JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create run_events table
CREATE TABLE IF NOT EXISTS run_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    level TEXT NOT NULL,
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create locks table for concurrency control
CREATE TABLE IF NOT EXISTS locks (
    id TEXT PRIMARY KEY,
    resource TEXT NOT NULL UNIQUE,
    acquired_at BIGINT NOT NULL,
    expires_at BIGINT,
    owner TEXT NOT NULL, -- run_id
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create schedules table for job scheduling
CREATE TABLE IF NOT EXISTS schedules (
    job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    next_due BIGINT NOT NULL,
    last_scheduled BIGINT,
    last_success BIGINT,
    last_attempt BIGINT,
    timezone TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create graph_registry table
CREATE TABLE IF NOT EXISTS graph_registry (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    inputs JSONB NOT NULL DEFAULT '{}',
    outputs JSONB NOT NULL DEFAULT '{}',
    tags JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_runs_job_id ON runs(job_id);
CREATE INDEX IF NOT EXISTS idx_runs_state ON runs(state);
CREATE INDEX IF NOT EXISTS idx_runs_scheduled_at ON runs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);
CREATE INDEX IF NOT EXISTS idx_run_events_run_id ON run_events(run_id);
CREATE INDEX IF NOT EXISTS idx_run_events_timestamp ON run_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_run_events_created_at ON run_events(created_at);
CREATE INDEX IF NOT EXISTS idx_locks_resource ON locks(resource);
CREATE INDEX IF NOT EXISTS idx_schedules_next_due ON schedules(next_due);
CREATE INDEX IF NOT EXISTS idx_jobs_enabled ON jobs(enabled);
CREATE INDEX IF NOT EXISTS idx_jobs_graph_id ON jobs(graph_id);

-- Create indexes on JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_labels ON jobs USING GIN(labels);
CREATE INDEX IF NOT EXISTS idx_runs_resource_usage ON runs USING GIN(resource_usage);
CREATE INDEX IF NOT EXISTS idx_graph_registry_tags ON graph_registry USING GIN(tags);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_graph_registry_updated_at BEFORE UPDATE ON graph_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data (optional)
-- This can be removed in production
INSERT INTO graph_registry (id, name, description, version, inputs, outputs, tags) VALUES
('webwatcher.v1', 'Web Watcher Agent', 'Monitors websites for changes', '1.0.0',
 '{"url":{"type":"string","required":true},"selectors":{"type":"array","required":false},"checkInterval":{"type":"number","required":false}}',
 '{"summary":{"type":"string"},"changes":{"type":"array"},"screenshots":{"type":"array"}}',
 '["monitoring", "web", "automation"]')
ON CONFLICT (id) DO NOTHING;

-- Create a view for job statistics (optional)
CREATE OR REPLACE VIEW job_stats AS
SELECT
    j.id,
    j.name,
    j.enabled,
    COUNT(r.id) as total_runs,
    COUNT(CASE WHEN r.state = 'SUCCEEDED' THEN 1 END) as successful_runs,
    COUNT(CASE WHEN r.state = 'FAILED' THEN 1 END) as failed_runs,
    MAX(r.completed_at) as last_run_at,
    AVG(CASE WHEN r.resource_usage->>'durationMs' IS NOT NULL THEN (r.resource_usage->>'durationMs')::float END) as avg_duration_ms
FROM jobs j
LEFT JOIN runs r ON j.id = r.job_id
GROUP BY j.id, j.name, j.enabled;

-- Grant permissions to the scout user (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO scout;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO scout;
