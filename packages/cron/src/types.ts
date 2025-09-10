import { z } from 'zod'

// Job States
export const JobStateSchema = z.enum([
  'CREATED',
  'SCHEDULED',
  'DUE',
  'STARTING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED_RETRYABLE',
  'FAILED',
  'CANCELLED',
  'PAUSED',
])

export type JobState = z.infer<typeof JobStateSchema>

// Concurrency Policies
export const ConcurrencyPolicySchema = z.enum(['allow', 'skip', 'queue', 'cancel-previous'])

export type ConcurrencyPolicy = z.infer<typeof ConcurrencyPolicySchema>

// Job Definition Schema
export const JobDefinitionSchema = z.object({
  id: z.string(),
  version: z.string().default('1.0.0'),
  name: z.string(),
  description: z.string().optional(),
  owner: z.string().optional(),
  enabled: z.boolean().default(true),

  // Scheduling
  schedule: z.string(), // cron expression
  timezone: z.string().default('America/New_York'),
  jitterMs: z.number().min(0).max(300000).default(0), // 0-5 minutes
  catchup: z.boolean().default(false),
  concurrency: ConcurrencyPolicySchema.default('allow'),
  priority: z.number().default(0),

  // Time windows
  notBefore: z.number().optional(), // timestamp ms
  notAfter: z.number().optional(), // timestamp ms

  // Graph execution
  graphId: z.string(),
  inputs: z.record(z.unknown()).default({}),

  // Resource limits
  resources: z
    .object({
      networkScope: z.enum(['none', 'localhost', 'allowlist', 'all']).default('all'),
      allowlist: z.array(z.string()).default([]), // hostname patterns
      rateLimits: z.record(z.number()).default({}), // hostname -> requests per minute
      maxBandwidth: z.number().optional(), // bytes per second
      maxSteps: z.number().default(10),
      maxRunSeconds: z.number().default(300), // 5 minutes
      maxModelTokens: z.number().default(4000),
    })
    .default({}),

  // Retry policy
  retry: z
    .object({
      maxRetries: z.number().default(3),
      strategy: z.enum(['immediate', 'exponential', 'linear']).default('exponential'),
      delays: z.array(z.number()).default([1000, 5000, 30000]), // ms
      retryableCodes: z.array(z.string()).default([]),
    })
    .default({}),

  // Alerts
  alerts: z
    .object({
      onSuccess: z.boolean().default(false),
      onFailure: z.boolean().default(false),
      onMaterialChange: z.boolean().default(false),
    })
    .default({}),

  // Metadata
  labels: z.record(z.string()).default({}),
})

export type JobDefinition = z.infer<typeof JobDefinitionSchema>

// Run Metadata
export const RunMetadataSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  scheduledAt: z.number(), // timestamp ms
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  state: JobStateSchema,
  attempt: z.number().default(0),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  resourceUsage: z
    .object({
      steps: z.number().default(0),
      tokens: z.number().default(0),
      durationMs: z.number().default(0),
      bandwidthBytes: z.number().default(0),
    })
    .default({}),
})

export type RunMetadata = z.infer<typeof RunMetadataSchema>

// Run Event for logging
export const RunEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  timestamp: z.number(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  event: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).optional(),
})

export type RunEvent = z.infer<typeof RunEventSchema>

// Lock for concurrency control
export const LockSchema = z.object({
  id: z.string(),
  resource: z.string(), // job_id or hostname
  acquiredAt: z.number(),
  expiresAt: z.number().optional(),
  owner: z.string(), // run_id
})

export type Lock = z.infer<typeof LockSchema>

// Schedule tracking
export const ScheduleSchema = z.object({
  jobId: z.string(),
  nextDue: z.number(),
  lastScheduled: z.number().optional(),
  lastSuccess: z.number().optional(),
  lastAttempt: z.number().optional(),
  timezone: z.string(),
})

export type Schedule = z.infer<typeof ScheduleSchema>

// Graph Registry Entry
export const GraphRegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  inputs: z.record(
    z.object({
      type: z.string(),
      required: z.boolean().default(false),
      description: z.string().optional(),
    })
  ),
  outputs: z.record(
    z.object({
      type: z.string(),
      description: z.string().optional(),
    })
  ),
  tags: z.array(z.string()).default([]),
})

export type GraphRegistryEntry = z.infer<typeof GraphRegistryEntrySchema>

// Cron Configuration
export const CronConfigSchema = z.object({
  databasePath: z.string().default('./data/scout-cron.db'),
  artifactsPath: z.string().default('./artifacts'),
  logsPath: z.string().default('./logs'),
  maxConcurrentRuns: z.number().default(5),
  defaultTimezone: z.string().default('America/New_York'),
  enableDryRun: z.boolean().default(false),
})

export type CronConfig = z.infer<typeof CronConfigSchema>

// CLI Command Results
export interface CliResult {
  success: boolean
  message: string
  data?: unknown
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// Job List Response
export interface JobListResponse {
  jobs: JobDefinition[]
  total: number
  offset: number
  limit: number
}

// Run List Response
export interface RunListResponse {
  runs: RunMetadata[]
  total: number
  offset: number
  limit: number
}
