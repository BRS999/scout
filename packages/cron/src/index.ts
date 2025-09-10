import fs from 'node:fs'
import path from 'node:path'
import { Command } from 'commander'
import YAML from 'yaml'
import { CronDatabase } from './database.js'
import { CronRunner } from './runner.js'
import { CronScheduler } from './scheduler.js'
import type {
  CliResult,
  CronConfig,
  JobDefinition,
  JobListResponse,
  RunListResponse,
} from './types.js'
import { JobDefinitionSchema } from './types.js'

export class ScoutCron {
  private db: CronDatabase
  private scheduler: CronScheduler
  private runner: CronRunner
  private config: CronConfig

  constructor(config?: Partial<CronConfig>) {
    this.config = {
      databasePath: './data/scout-cron.db',
      artifactsPath: './artifacts',
      logsPath: './logs',
      maxConcurrentRuns: 5,
      defaultTimezone: 'America/New_York',
      enableDryRun: false,
      ...config,
    }

    this.db = new CronDatabase({} as CronConfig) // CronDatabase now uses env vars
    this.scheduler = new CronScheduler(this.db)
    this.runner = new CronRunner(this.db, this.scheduler, this.config)

    // Ensure directories exist
    this.ensureDirectories()
  }

  async initialize(): Promise<void> {
    await this.db.initialize()
  }

  private ensureDirectories(): void {
    const dirs = [this.config.artifactsPath, this.config.logsPath]
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
  }

  // Job Management
  async addJob(jobDef: JobDefinition): Promise<CliResult> {
    try {
      // Validate job definition
      const validatedJob = JobDefinitionSchema.parse(jobDef)

      // Save to database
      await this.db.saveJob(validatedJob)

      // Schedule the job
      await this.scheduler.scheduleJob(validatedJob)

      return {
        success: true,
        message: `Job "${validatedJob.name}" added successfully`,
        data: { jobId: validatedJob.id },
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to add job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  async listJobs(offset = 0, limit = 50): Promise<JobListResponse> {
    const jobs = await this.db.listJobs(offset, limit)
    const total = jobs.length // TODO: implement proper count query

    return {
      jobs,
      total,
      offset,
      limit,
    }
  }

  async getJob(jobId: string): Promise<JobDefinition | null> {
    return await this.db.getJob(jobId)
  }

  async pauseJob(jobId: string): Promise<CliResult> {
    const job = await this.db.getJob(jobId)
    if (!job) {
      return { success: false, message: `Job ${jobId} not found` }
    }

    job.enabled = false
    await this.db.saveJob(job)

    return {
      success: true,
      message: `Job "${job.name}" paused`,
    }
  }

  async resumeJob(jobId: string): Promise<CliResult> {
    const job = await this.db.getJob(jobId)
    if (!job) {
      return { success: false, message: `Job ${jobId} not found` }
    }

    job.enabled = true
    await this.db.saveJob(job)

    // Re-schedule the job
    await this.scheduler.scheduleJob(job)

    return {
      success: true,
      message: `Job "${job.name}" resumed`,
    }
  }

  async deleteJob(jobId: string): Promise<CliResult> {
    const job = await this.db.getJob(jobId)
    if (!job) {
      return { success: false, message: `Job ${jobId} not found` }
    }

    // Delete from database (cascading deletes will handle runs and events)
    const deleted = await this.db.deleteJob(jobId)

    if (deleted) {
      return {
        success: true,
        message: `Job "${job.name}" deleted successfully`,
      }
    }
    return {
      success: false,
      message: `Failed to delete job ${jobId}`,
    }
  }

  // Run Management
  async runJobNow(jobId: string, customInputs?: Record<string, unknown>): Promise<CliResult> {
    try {
      const runId = await this.runner.runJobNow(jobId, customInputs)
      return {
        success: true,
        message: 'Job run started',
        data: { runId },
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to run job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  async dryRun(jobId: string): Promise<CliResult> {
    try {
      const runId = await this.runner.dryRun(jobId)
      return {
        success: true,
        message: 'Dry run completed',
        data: { runId },
      }
    } catch (error) {
      return {
        success: false,
        message: `Dry run failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  async listRuns(jobId?: string, offset = 0, limit = 50): Promise<RunListResponse> {
    const runs = await this.db.listRuns(jobId, offset, limit)
    const total = runs.length // TODO: implement proper count query

    return {
      runs,
      total,
      offset,
      limit,
    }
  }

  async getRun(runId: string) {
    return await this.db.getRun(runId)
  }

  async getRunEvents(runId: string, limit = 100) {
    return await this.db.getRunEvents(runId, limit)
  }

  // Scheduling
  async updateSchedules(): Promise<void> {
    await this.scheduler.updateAllSchedules()
  }

  async getPendingRuns() {
    return await this.scheduler.getPendingRuns()
  }

  async processPendingRuns(): Promise<void> {
    const pendingRuns = await this.getPendingRuns()

    for (const run of pendingRuns) {
      try {
        await this.runner.executeRun(run.id)
      } catch (error) {
        console.error(`Failed to execute run ${run.id}:`, error)
      }
    }
  }

  // Utility methods
  loadJobFromFile(filePath: string): JobDefinition {
    const content = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath).toLowerCase()

    let jobDef: unknown

    if (ext === '.yaml' || ext === '.yml') {
      jobDef = YAML.parse(content)
    } else if (ext === '.json') {
      jobDef = JSON.parse(content)
    } else {
      throw new Error(`Unsupported file format: ${ext}`)
    }

    return JobDefinitionSchema.parse(jobDef)
  }

  close(): void {
    this.db.close()
  }
}

// CLI Interface
export function createCLI(): Command {
  const program = new Command()

  program.name('scout cron').description('Scout cron job scheduling system').version('0.1.0')

  const cron = new ScoutCron()

  // Job commands
  program
    .command('add <jobFile>')
    .description('Add a job from YAML or JSON file')
    .action(async (jobFile: string) => {
      try {
        await cron.initialize()
        const jobDef = cron.loadJobFromFile(jobFile)
        const result = await cron.addJob(jobDef)

        if (result.success) {
          if (result.data && typeof result.data === 'object' && 'jobId' in result.data) {
          }
        } else {
          console.error(`❌ ${result.message}`)
          process.exit(1)
        }
      } catch (error) {
        console.error(`❌ Failed to load job file: ${error}`)
        process.exit(1)
      }
    })

  program
    .command('list')
    .description('List all jobs')
    .option('-o, --offset <number>', 'Offset for pagination', '0')
    .option('-l, --limit <number>', 'Limit for pagination', '50')
    .action(async (options: { offset: string; limit: string }) => {
      await cron.initialize()
      const offset = Number.parseInt(options.offset)
      const limit = Number.parseInt(options.limit)
      const result = await cron.listJobs(offset, limit)

      if (result.jobs.length === 0) {
        return
      }
      for (const _job of result.jobs) {
        // Process job
      }
    })

  program
    .command('show <jobId>')
    .description('Show details of a specific job')
    .action(async (jobId: string) => {
      await cron.initialize()
      const job = await cron.getJob(jobId)

      if (!job) {
        console.error(`❌ Job ${jobId} not found`)
        process.exit(1)
      }
    })

  program
    .command('pause <jobId>')
    .description('Pause a job')
    .action(async (jobId: string) => {
      await cron.initialize()
      const result = await cron.pauseJob(jobId)

      if (result.success) {
      } else {
        console.error(`❌ ${result.message}`)
        process.exit(1)
      }
    })

  program
    .command('resume <jobId>')
    .description('Resume a paused job')
    .action(async (jobId: string) => {
      await cron.initialize()
      const result = await cron.resumeJob(jobId)

      if (result.success) {
      } else {
        console.error(`❌ ${result.message}`)
        process.exit(1)
      }
    })

  program
    .command('delete <jobId>')
    .description('Delete a job')
    .action(async (jobId: string) => {
      await cron.initialize()
      const result = await cron.deleteJob(jobId)

      if (result.success) {
      } else {
        console.error(`❌ ${result.message}`)
        process.exit(1)
      }
    })

  // Run commands
  program
    .command('run-now <jobId>')
    .description('Run a job immediately')
    .option('--dry-run', 'Perform a dry run without actual execution')
    .action(async (jobId: string, options: { dryRun: boolean }) => {
      try {
        await cron.initialize()
        let result: CliResult

        if (options.dryRun) {
          result = await cron.dryRun(jobId)
        } else {
          result = await cron.runJobNow(jobId)
        }

        if (result.success) {
          if (result.data && typeof result.data === 'object' && 'runId' in result.data) {
          }
        } else {
          console.error(`❌ ${result.message}`)
          process.exit(1)
        }
      } catch (error) {
        console.error(`❌ Error: ${error}`)
        process.exit(1)
      }
    })

  program
    .command('tail <jobId>')
    .description('Stream events for a job (shows recent runs)')
    .action(async (jobId: string) => {
      await cron.initialize()
      const runs = await cron.listRuns(jobId, 0, 10)

      if (runs.runs.length === 0) {
        return
      }
      for (const _run of runs.runs) {
        // Process run
      }
    })

  program
    .command('logs <runId>')
    .description('Show logs for a specific run')
    .option('-l, --limit <number>', 'Number of log entries to show', '100')
    .action(async (runId: string, options: { limit: string }) => {
      await cron.initialize()
      const limit = Number.parseInt(options.limit)
      const events = await cron.getRunEvents(runId, limit)

      if (events.length === 0) {
        return
      }
      for (const event of events) {
        const _timestamp = new Date(Number(event.timestamp)).toISOString()
        // Process event
      }
    })

  program
    .command('export <runId> <outputPath>')
    .description('Export run artifacts to a zip file')
    .action(async (_runId: string, _outputPath: string) => {})

  // Scheduler commands
  program
    .command('process')
    .description('Process pending runs (called by scheduler daemon)')
    .action(async () => {
      await cron.initialize()
      await cron.processPendingRuns()
    })

  program
    .command('update-schedules')
    .description('Update schedules for all jobs')
    .action(async () => {
      await cron.initialize()
      await cron.updateSchedules()
    })

  return program
}

// ScoutCron class is already exported via the class declaration
