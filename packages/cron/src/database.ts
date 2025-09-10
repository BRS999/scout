import { Pool, type PoolClient } from 'pg'
import type { CronConfig, JobDefinition, Lock, RunEvent, RunMetadata, Schedule } from './types.js'

export class CronDatabase {
  private pool: Pool

  constructor(_config: CronConfig) {
    // PostgreSQL connection configuration using CRON_DATABASE_URL
    const cronDatabaseUrl =
      process.env.CRON_DATABASE_URL || 'postgresql://scout:scout_password@postgres:5432/scout_cron'

    this.pool = new Pool({
      connectionString: cronDatabaseUrl,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      process.exit(-1)
    })
  }

  async initialize(): Promise<void> {
    const client = await this.pool.connect()
    try {
      await this.initializeSchema(client)
      await this.createIndexes(client)
    } finally {
      client.release()
    }
  }

  private async initializeSchema(client: PoolClient): Promise<void> {
    // Jobs table
    await client.query(`
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
      )
    `)

    // Runs table
    await client.query(`
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
      )
    `)

    // Run events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        timestamp BIGINT NOT NULL,
        level TEXT NOT NULL,
        event TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `)

    // Locks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locks (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL UNIQUE,
        acquired_at BIGINT NOT NULL,
        expires_at BIGINT,
        owner TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `)

    // Schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
        next_due BIGINT NOT NULL,
        last_scheduled BIGINT,
        last_success BIGINT,
        last_attempt BIGINT,
        timezone TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `)

    // Graph registry table
    await client.query(`
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
      )
    `)
  }

  private async createIndexes(client: PoolClient): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_runs_job_id ON runs (job_id)',
      'CREATE INDEX IF NOT EXISTS idx_runs_state ON runs (state)',
      'CREATE INDEX IF NOT EXISTS idx_runs_scheduled_at ON runs (scheduled_at)',
      'CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_run_events_run_id ON run_events (run_id)',
      'CREATE INDEX IF NOT EXISTS idx_run_events_timestamp ON run_events (timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_run_events_created_at ON run_events (created_at)',
      'CREATE INDEX IF NOT EXISTS idx_locks_resource ON locks (resource)',
      'CREATE INDEX IF NOT EXISTS idx_schedules_next_due ON schedules (next_due)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_enabled ON jobs (enabled)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_graph_id ON jobs (graph_id)',
      'CREATE INDEX IF NOT EXISTS idx_jobs_labels ON jobs USING GIN (labels)',
      'CREATE INDEX IF NOT EXISTS idx_runs_resource_usage ON runs USING GIN (resource_usage)',
      'CREATE INDEX IF NOT EXISTS idx_graph_registry_tags ON graph_registry USING GIN (tags)',
    ]

    for (const index of indexes) {
      await client.query(index)
    }
  }

  // Job operations
  async saveJob(job: JobDefinition): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `
        INSERT INTO jobs (
          id, version, name, description, owner, enabled,
          schedule, timezone, jitter_ms, catchup, concurrency, priority,
          not_before, not_after, graph_id, inputs, resources,
          retry_config, alerts_config, labels,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (id) DO UPDATE SET
          version = EXCLUDED.version,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          owner = EXCLUDED.owner,
          enabled = EXCLUDED.enabled,
          schedule = EXCLUDED.schedule,
          timezone = EXCLUDED.timezone,
          jitter_ms = EXCLUDED.jitter_ms,
          catchup = EXCLUDED.catchup,
          concurrency = EXCLUDED.concurrency,
          priority = EXCLUDED.priority,
          not_before = EXCLUDED.not_before,
          not_after = EXCLUDED.not_after,
          graph_id = EXCLUDED.graph_id,
          inputs = EXCLUDED.inputs,
          resources = EXCLUDED.resources,
          retry_config = EXCLUDED.retry_config,
          alerts_config = EXCLUDED.alerts_config,
          labels = EXCLUDED.labels,
          updated_at = NOW()
      `,
        [
          job.id,
          job.version,
          job.name,
          job.description,
          job.owner,
          job.enabled,
          job.schedule,
          job.timezone,
          job.jitterMs,
          job.catchup,
          job.concurrency,
          job.priority,
          job.notBefore,
          job.notAfter,
          job.graphId,
          job.inputs,
          job.resources,
          job.retry,
          job.alerts,
          job.labels,
          new Date(),
          new Date(),
        ]
      )
    } finally {
      client.release()
    }
  }

  async getJob(jobId: string): Promise<JobDefinition | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM jobs WHERE id = $1', [jobId])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        version: row.version,
        name: row.name,
        description: row.description,
        owner: row.owner,
        enabled: row.enabled,
        schedule: row.schedule,
        timezone: row.timezone,
        jitterMs: row.jitter_ms,
        catchup: row.catchup,
        concurrency: row.concurrency,
        priority: row.priority,
        notBefore: row.not_before,
        notAfter: row.not_after,
        graphId: row.graph_id,
        inputs: row.inputs,
        resources: row.resources,
        retry: row.retry_config,
        alerts: row.alerts_config,
        labels: row.labels,
      }
    } finally {
      client.release()
    }
  }

  async listJobs(offset = 0, limit = 50): Promise<JobDefinition[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      )

      return result.rows.map((row) => ({
        id: row.id,
        version: row.version,
        name: row.name,
        description: row.description,
        owner: row.owner,
        enabled: row.enabled,
        schedule: row.schedule,
        timezone: row.timezone,
        jitterMs: row.jitter_ms,
        catchup: row.catchup,
        concurrency: row.concurrency,
        priority: row.priority,
        notBefore: row.not_before,
        notAfter: row.not_after,
        graphId: row.graph_id,
        inputs: row.inputs,
        resources: row.resources,
        retry: row.retry_config,
        alerts: row.alerts_config,
        labels: row.labels,
      }))
    } finally {
      client.release()
    }
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('DELETE FROM jobs WHERE id = $1', [jobId])
      return (result.rowCount ?? 0) > 0
    } finally {
      client.release()
    }
  }

  // Run operations
  async saveRun(run: RunMetadata): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `
        INSERT INTO runs (
          id, job_id, scheduled_at, started_at, completed_at,
          state, attempt, error_code, error_message, resource_usage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          started_at = EXCLUDED.started_at,
          completed_at = EXCLUDED.completed_at,
          state = EXCLUDED.state,
          attempt = EXCLUDED.attempt,
          error_code = EXCLUDED.error_code,
          error_message = EXCLUDED.error_message,
          resource_usage = EXCLUDED.resource_usage
      `,
        [
          run.id,
          run.jobId,
          run.scheduledAt,
          run.startedAt,
          run.completedAt,
          run.state,
          run.attempt,
          run.errorCode,
          run.errorMessage,
          run.resourceUsage,
        ]
      )
    } finally {
      client.release()
    }
  }

  async getRun(runId: string): Promise<RunMetadata | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM runs WHERE id = $1', [runId])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        jobId: row.job_id,
        scheduledAt: row.scheduled_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        state: row.state,
        attempt: row.attempt,
        errorCode: row.error_code,
        errorMessage: row.error_message,
        resourceUsage: row.resource_usage || {
          steps: 0,
          tokens: 0,
          durationMs: 0,
          bandwidthBytes: 0,
        },
      }
    } finally {
      client.release()
    }
  }

  async listRuns(jobId?: string, offset = 0, limit = 50): Promise<RunMetadata[]> {
    const client = await this.pool.connect()
    try {
      let query = 'SELECT * FROM runs'
      const params: string[] = []

      if (jobId) {
        query += ' WHERE job_id = $1'
        params.push(jobId)
      }

      query += ` ORDER BY scheduled_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(limit.toString(), offset.toString())

      const result = await client.query(query, params)

      return result.rows.map((row) => ({
        id: row.id,
        jobId: row.job_id,
        scheduledAt: row.scheduled_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        state: row.state,
        attempt: row.attempt,
        errorCode: row.error_code,
        errorMessage: row.error_message,
        resourceUsage: row.resource_usage || {
          steps: 0,
          tokens: 0,
          durationMs: 0,
          bandwidthBytes: 0,
        },
      }))
    } finally {
      client.release()
    }
  }

  // Event logging
  async logEvent(event: RunEvent): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `
        INSERT INTO run_events (id, run_id, timestamp, level, event, message, data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          event.id,
          event.runId,
          event.timestamp,
          event.level,
          event.event,
          event.message,
          event.data,
        ]
      )
    } finally {
      client.release()
    }
  }

  async getRunEvents(runId: string, limit = 100): Promise<RunEvent[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        `
        SELECT * FROM run_events WHERE run_id = $1 ORDER BY timestamp DESC LIMIT $2
      `,
        [runId, limit]
      )

      return result.rows.map((row) => ({
        id: row.id,
        runId: row.run_id,
        timestamp: row.timestamp,
        level: row.level,
        event: row.event,
        message: row.message,
        data: row.data,
      }))
    } finally {
      client.release()
    }
  }

  // Lock operations
  async acquireLock(lock: Lock): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `
        INSERT INTO locks (id, resource, acquired_at, expires_at, owner)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [lock.id, lock.resource, lock.acquiredAt, lock.expiresAt, lock.owner]
      )
      return true
    } catch (_error) {
      // Lock already exists (UNIQUE constraint violation)
      return false
    } finally {
      client.release()
    }
  }

  async releaseLock(resource: string, owner: string): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('DELETE FROM locks WHERE resource = $1 AND owner = $2', [
        resource,
        owner,
      ])
      return (result.rowCount ?? 0) > 0
    } finally {
      client.release()
    }
  }

  async getLock(resource: string): Promise<Lock | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM locks WHERE resource = $1', [resource])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        resource: row.resource,
        acquiredAt: row.acquired_at,
        expiresAt: row.expires_at,
        owner: row.owner,
      }
    } finally {
      client.release()
    }
  }

  // Schedule operations
  async saveSchedule(schedule: Schedule): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `
        INSERT INTO schedules (
          job_id, next_due, last_scheduled, last_success, last_attempt, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (job_id) DO UPDATE SET
          next_due = EXCLUDED.next_due,
          last_scheduled = EXCLUDED.last_scheduled,
          last_success = EXCLUDED.last_success,
          last_attempt = EXCLUDED.last_attempt,
          timezone = EXCLUDED.timezone,
          updated_at = NOW()
      `,
        [
          schedule.jobId,
          schedule.nextDue,
          schedule.lastScheduled,
          schedule.lastSuccess,
          schedule.lastAttempt,
          schedule.timezone,
        ]
      )
    } finally {
      client.release()
    }
  }

  async getSchedule(jobId: string): Promise<Schedule | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM schedules WHERE job_id = $1', [jobId])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        jobId: row.job_id,
        nextDue: row.next_due,
        lastScheduled: row.last_scheduled,
        lastSuccess: row.last_success,
        lastAttempt: row.last_attempt,
        timezone: row.timezone,
      }
    } finally {
      client.release()
    }
  }

  async getDueSchedules(now: number): Promise<Schedule[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT * FROM schedules WHERE next_due <= $1', [now])

      return result.rows.map((row) => ({
        jobId: row.job_id,
        nextDue: row.next_due,
        lastScheduled: row.last_scheduled,
        lastSuccess: row.last_success,
        lastAttempt: row.last_attempt,
        timezone: row.timezone,
      }))
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
