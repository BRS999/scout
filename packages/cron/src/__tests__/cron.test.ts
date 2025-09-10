import { describe, expect, it } from 'vitest'
import YAML from 'yaml'
import { CronConfigSchema, JobDefinitionSchema } from '../types.js'

describe('ScoutCron Types and Validation', () => {
  describe('Job Definition Validation', () => {
    const validJobData = {
      id: 'test_job',
      version: '1.0.0',
      name: 'Test Job',
      description: 'A test job for unit testing',
      owner: 'test-user',
      enabled: true,
      schedule: '0 * * * *', // Every hour
      timezone: 'America/New_York',
      jitterMs: 0,
      catchup: false,
      concurrency: 'allow' as const,
      priority: 0,
      graphId: 'test_graph',
      inputs: { test: 'value' },
      resources: {
        networkScope: 'all' as const,
        allowlist: [],
        rateLimits: {},
        maxSteps: 10,
        maxRunSeconds: 300,
        maxModelTokens: 4000,
      },
      retry: {
        maxRetries: 3,
        strategy: 'exponential' as const,
        delays: [1000, 5000, 30000],
        retryableCodes: [],
      },
      alerts: {
        onSuccess: false,
        onFailure: false,
        onMaterialChange: false,
      },
      labels: { category: 'test' },
    }

    it('should validate a complete job definition', () => {
      const result = JobDefinitionSchema.safeParse(validJobData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('test_job')
        expect(result.data.name).toBe('Test Job')
      }
    })

    it('should reject invalid job definition', () => {
      const invalidJob = {
        id: 'test_job',
        // Missing required fields like schedule, graphId, etc.
      }

      const result = JobDefinitionSchema.safeParse(invalidJob)

      expect(result.success).toBe(false)
    })

    it('should handle optional fields correctly', () => {
      const minimalJob = {
        id: 'minimal_job',
        name: 'Minimal Job',
        schedule: '0 * * * *',
        graphId: 'test_graph',
        inputs: {},
        resources: {
          networkScope: 'all' as const,
          maxSteps: 10,
          maxRunSeconds: 300,
          maxModelTokens: 4000,
        },
        retry: {
          maxRetries: 3,
          strategy: 'exponential' as const,
          delays: [1000, 5000, 30000],
        },
        alerts: {
          onSuccess: false,
          onFailure: false,
          onMaterialChange: false,
        },
        labels: {},
      }

      const result = JobDefinitionSchema.safeParse(minimalJob)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.enabled).toBe(true) // Should default to true
        expect(result.data.timezone).toBe('America/New_York') // Should have default
      }
    })
  })

  describe('YAML/JSON Parsing', () => {
    it('should parse valid YAML job definition', () => {
      const yamlContent = `
id: yaml_test_job
name: "YAML Test Job"
schedule: "0 * * * *"
graphId: "test_graph"
inputs:
  test: "yaml_value"
resources:
  networkScope: "all"
  maxSteps: 10
  maxRunSeconds: 300
  maxModelTokens: 4000
retry:
  maxRetries: 3
  strategy: "exponential"
  delays: [1000, 5000, 30000]
alerts:
  onSuccess: false
  onFailure: false
  onMaterialChange: false
labels:
  category: "test"
`

      const parsed = YAML.parse(yamlContent)
      const result = JobDefinitionSchema.safeParse(parsed)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('yaml_test_job')
        expect(result.data.name).toBe('YAML Test Job')
        expect(result.data.inputs.test).toBe('yaml_value')
      }
    })

    it('should parse valid JSON job definition', () => {
      const jsonContent = {
        id: 'json_test_job',
        name: 'JSON Test Job',
        schedule: '0 * * * *',
        graphId: 'test_graph',
        inputs: { test: 'json_value' },
        resources: {
          networkScope: 'all',
          maxSteps: 10,
          maxRunSeconds: 300,
          maxModelTokens: 4000,
        },
        retry: {
          maxRetries: 3,
          strategy: 'exponential',
          delays: [1000, 5000, 30000],
        },
        alerts: {
          onSuccess: false,
          onFailure: false,
          onMaterialChange: false,
        },
        labels: { category: 'test' },
      }

      const result = JobDefinitionSchema.safeParse(jsonContent)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('json_test_job')
        expect(result.data.name).toBe('JSON Test Job')
        expect(result.data.inputs.test).toBe('json_value')
      }
    })
  })

  describe('CronConfig Validation', () => {
    it('should validate cron configuration with defaults', () => {
      const config = {
        databasePath: './test.db',
      }

      const result = CronConfigSchema.safeParse(config)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.databasePath).toBe('./test.db')
        expect(result.data.artifactsPath).toBe('./artifacts') // default
        expect(result.data.maxConcurrentRuns).toBe(5) // default
      }
    })
  })
})
