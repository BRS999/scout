import fs from 'node:fs'
import path from 'node:path'
import { mastra } from '@scout/agent'
import type { CronDatabase } from './database.js'
import type { CronScheduler } from './scheduler.js'
import type { CronConfig, JobDefinition, RunEvent, RunMetadata } from './types.js'

interface AgentResult {
  output: string
  intermediateSteps?: unknown[]
  toolUsage?: unknown[]
  executionTime?: number
  toolsUsed?: number
}

export class CronRunner {
  private agent = mastra.getAgent('scoutAgent')

  constructor(
    private db: CronDatabase,
    private scheduler: CronScheduler,
    private config: CronConfig
  ) {}

  /**
   * Execute a job run
   */
  async executeRun(runId: string): Promise<void> {
    const run = await this.db.getRun(runId)
    if (!run) {
      throw new Error(`Run ${runId} not found`)
    }

    const job = await this.db.getJob(run.jobId)
    if (!job) {
      throw new Error(`Job ${run.jobId} not found`)
    }

    // Check concurrency policy
    const concurrencyCheck = await this.scheduler.canRunJob(job)
    if (!concurrencyCheck.canRun) {
      this.logEvent(runId, 'warn', 'concurrency_check_failed', concurrencyCheck.reason!)
      run.state = 'FAILED'
      run.errorMessage = concurrencyCheck.reason
      await this.db.saveRun(run)
      return
    }

    // Mark run as starting
    await this.scheduler.markRunStarted(runId)
    this.logEvent(runId, 'info', 'run_started', `Starting execution of job ${job.name}`)

    try {
      // Create run directory for artifacts
      const runDir = this.createRunDirectory(runId, job)
      const startTime = Date.now()

      // Execute the job
      const result = await this.executeJob(job, run, runDir)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Update run metadata
      run.completedAt = endTime
      run.state = 'SUCCEEDED'
      run.resourceUsage = {
        steps: result.toolsUsed || 0,
        tokens: 0, // TODO: track token usage
        durationMs: duration,
        bandwidthBytes: 0, // TODO: track bandwidth
      }

      await this.db.saveRun(run)

      // Save artifacts
      await this.saveArtifacts(run, job, result, runDir)

      this.logEvent(runId, 'info', 'run_completed', `Job completed successfully in ${duration}ms`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorCode = error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR'

      this.logEvent(runId, 'error', 'run_failed', errorMessage)

      run.completedAt = Date.now()
      run.state = 'FAILED'
      run.errorCode = errorCode
      run.errorMessage = errorMessage

      await this.db.saveRun(run)
    }
  }

  /**
   * Execute the actual job logic
   */
  private async executeJob(
    job: JobDefinition,
    run: RunMetadata,
    runDir: string
  ): Promise<AgentResult> {
    this.logEvent(run.id, 'info', 'agent_invoked', `Invoking agent with graph ${job.graphId}`)

    // Prepare inputs for the agent
    // Extract a meaningful input string from job configuration
    const inputString = job.inputs?.url
      ? `Monitor website: ${job.inputs.url} for changes. ${job.inputs.checkInterval ? `Check every ${job.inputs.checkInterval}ms.` : ''} ${Array.isArray(job.inputs.selectors) ? `Look for content in: ${job.inputs.selectors.join(', ')}` : ''}`
      : `Execute cron job: ${job.name} - ${job.description || 'No description available'}`

    // Set cron context in environment for agent to access
    process.env._CRON_JOB_ID = job.id
    process.env._CRON_RUN_ID = run.id
    process.env._CRON_ARTIFACTS_DIR = runDir

    // Execute with Mastra agent
    const startTime = Date.now()
    const response = await this.agent.generate([{ role: 'user', content: inputString }])
    const endTime = Date.now()

    const result: AgentResult = {
      output: response.text || '',
      intermediateSteps: [],
      toolUsage: [],
      executionTime: endTime - startTime,
      toolsUsed: 0,
    }

    return result
  }

  /**
   * Create directory structure for run artifacts
   */
  private createRunDirectory(runId: string, job: JobDefinition): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const runDir = path.join(this.config.artifactsPath, job.id, `${timestamp}_${runId}`)

    fs.mkdirSync(runDir, { recursive: true })
    fs.mkdirSync(path.join(runDir, 'snapshots'), { recursive: true })
    fs.mkdirSync(path.join(runDir, 'cleaned'), { recursive: true })
    fs.mkdirSync(path.join(runDir, 'diffs'), { recursive: true })

    return runDir
  }

  /**
   * Save execution artifacts
   */
  private async saveArtifacts(
    run: RunMetadata,
    job: JobDefinition,
    result: AgentResult,
    runDir: string
  ): Promise<void> {
    // Save metadata
    const metadata = {
      jobId: job.id,
      runId: run.id,
      scheduledAt: run.scheduledAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      graphId: job.graphId,
      inputs: job.inputs,
      resourceCaps: job.resources,
      executionTime: result.executionTime,
      toolsUsed: result.toolsUsed,
    }

    fs.writeFileSync(path.join(runDir, 'metadata.json'), JSON.stringify(metadata, null, 2))

    // Save stdout log (structured events)
    const events = await this.db.getRunEvents(run.id)
    fs.writeFileSync(
      path.join(runDir, 'stdout.log'),
      events
        .map(
          (e) =>
            `[${new Date(Number(e.timestamp)).toISOString()}] ${e.level.toUpperCase()}: ${e.message}`
        )
        .join('\n')
    )

    // Save steps summary
    if (result.intermediateSteps) {
      const steps = result.intermediateSteps.map((step: any, index: number) => ({
        step: index,
        action: step.action,
        observation: step.observation,
        timestamp: Date.now() + index, // Approximate timestamps
      }))

      fs.writeFileSync(path.join(runDir, 'steps.json'), JSON.stringify(steps, null, 2))
    }

    // Save human-readable report
    const report = this.generateReport(job, run, result)
    fs.writeFileSync(path.join(runDir, 'report.md'), report)

    this.logEvent(run.id, 'info', 'artifacts_saved', `Artifacts saved to ${runDir}`)
  }

  /**
   * Generate human-readable report
   */
  private generateReport(job: JobDefinition, run: RunMetadata, result: AgentResult): string {
    const startTime = run.startedAt ? new Date(run.startedAt).toISOString() : 'Unknown'
    const endTime = run.completedAt ? new Date(run.completedAt).toISOString() : 'Unknown'

    return `# Job Execution Report

## Job Information
- **Job ID**: ${job.id}
- **Name**: ${job.name}
- **Graph**: ${job.graphId}
- **Run ID**: ${run.id}
- **Scheduled At**: ${new Date(run.scheduledAt).toISOString()}

## Execution Details
- **Started**: ${startTime}
- **Completed**: ${endTime}
- **Duration**: ${result.executionTime || 0}ms
- **Tools Used**: ${result.toolsUsed || 0}

## Result
${result.output}

## Resource Usage
- Steps: ${result.toolsUsed || 0}
- Execution Time: ${result.executionTime || 0}ms

---
*Generated by Scout Cron on ${new Date().toISOString()}*
`
  }

  /**
   * Log an event for a run
   */
  private async logEvent(
    runId: string,
    level: RunEvent['level'],
    event: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const runEvent: RunEvent = {
      id: `event_${runId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      runId,
      timestamp: Date.now(),
      level,
      event,
      message,
      data,
    }

    await this.db.logEvent(runEvent)
  }

  /**
   * Execute a job immediately (for testing or manual runs)
   */
  async runJobNow(jobId: string, customInputs?: Record<string, unknown>): Promise<string> {
    const job = await this.db.getJob(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    // Create a run for immediate execution
    const runId = `run_${jobId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const scheduledAt = Date.now()

    const run: RunMetadata = {
      id: runId,
      jobId: job.id,
      scheduledAt,
      state: 'DUE',
      attempt: 0,
      resourceUsage: {
        steps: 0,
        tokens: 0,
        durationMs: 0,
        bandwidthBytes: 0,
      },
    }

    // Override inputs if provided
    if (customInputs) {
      job.inputs = { ...job.inputs, ...customInputs }
    }

    await this.db.saveRun(run)
    await this.db.saveJob(job) // Save any input changes

    // Execute immediately
    await this.executeRun(runId)

    return runId
  }

  /**
   * Execute a dry run (simulate execution without actual agent calls)
   */
  async dryRun(jobId: string): Promise<string> {
    const job = await this.db.getJob(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    const runId = `dryrun_${jobId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const scheduledAt = Date.now()

    const run: RunMetadata = {
      id: runId,
      jobId: job.id,
      scheduledAt,
      state: 'STARTING',
      startedAt: Date.now(),
      attempt: 0,
      resourceUsage: {
        steps: 0,
        tokens: 0,
        durationMs: 0,
        bandwidthBytes: 0,
      },
    }

    await this.db.saveRun(run)

    // Simulate execution
    this.logEvent(runId, 'info', 'dry_run_started', `Starting dry run of job ${job.name}`)

    // Create run directory
    const runDir = this.createRunDirectory(runId, job)

    // Simulate result
    const result: AgentResult = {
      output: `# Dry Run Result

This is a simulated execution of job **${job.name}**.

## Configuration
- Job ID: ${job.id}
- Graph: ${job.graphId}
- Schedule: ${job.schedule}
- Timezone: ${job.timezone}

## Simulated Execution
- Would execute agent with inputs: ${JSON.stringify(job.inputs, null, 2)}
- Would respect resource limits: ${JSON.stringify(job.resources, null, 2)}
- Would generate artifacts in: ${runDir}

*This is a dry run - no actual execution occurred.*
`,
      intermediateSteps: [],
      toolUsage: [],
      executionTime: 100,
      toolsUsed: 0,
    }

    // Save simulated artifacts
    await this.saveArtifacts(run, job, result, runDir)

    // Mark as completed
    run.completedAt = Date.now()
    run.state = 'SUCCEEDED'
    run.resourceUsage = {
      steps: 0,
      tokens: 0,
      durationMs: 100,
      bandwidthBytes: 0,
    }

    await this.db.saveRun(run)
    this.logEvent(runId, 'info', 'dry_run_completed', 'Dry run completed successfully')

    return runId
  }
}
