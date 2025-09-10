import { DateTime } from 'luxon'
import type { CronDatabase } from './database.js'
import type { JobDefinition, RunMetadata } from './types.js'

export class CronScheduler {
  constructor(private db: CronDatabase) {}

  /**
   * Calculate next due time for a job based on its cron expression and timezone
   */
  calculateNextDue(job: JobDefinition, fromTime?: DateTime): DateTime | null {
    const timezone = job.timezone || 'America/New_York'
    const baseTime = fromTime || DateTime.now().setZone(timezone)

    // For now, use a simple calculation - add 1 hour for testing
    // TODO: Implement proper cron parsing
    let nextDue = baseTime.plus({ hours: 1 })

    // Apply jitter if configured
    if (job.jitterMs > 0) {
      const jitter = Math.floor(Math.random() * job.jitterMs)
      nextDue = nextDue.plus({ milliseconds: jitter })
    }

    // Check time windows
    if (job.notBefore && nextDue.toMillis() < job.notBefore) {
      // Recalculate from notBefore time
      return this.calculateNextDue(job, DateTime.fromMillis(job.notBefore, { zone: timezone }))
    }

    if (job.notAfter && nextDue.toMillis() > job.notAfter) {
      return null // No more runs within window
    }

    return nextDue
  }

  /**
   * Get all jobs that are due for scheduling
   */
  async getDueJobs(): Promise<JobDefinition[]> {
    const now = DateTime.now()
    const schedules = await this.db.getDueSchedules(now.toMillis())

    const dueJobs: JobDefinition[] = []

    for (const schedule of schedules) {
      const job = await this.db.getJob(schedule.jobId)
      if (job?.enabled) {
        dueJobs.push(job)
      }
    }

    return dueJobs
  }

  /**
   * Schedule a job for its next run(s)
   */
  async scheduleJob(job: JobDefinition): Promise<void> {
    const now = DateTime.now()
    let schedule = await this.db.getSchedule(job.id)

    if (!schedule) {
      // First time scheduling this job
      const nextDue = this.calculateNextDue(job)
      if (!nextDue) {
        console.warn(`No valid next due time for job ${job.id}`)
        return
      }
      schedule = {
        jobId: job.id,
        nextDue: nextDue.toMillis(),
        timezone: job.timezone,
      }
    } else {
      // Update existing schedule
      const lastScheduled = schedule.lastScheduled
        ? DateTime.fromMillis(schedule.lastScheduled, { zone: job.timezone })
        : now

      let nextDue = this.calculateNextDue(job, lastScheduled)
      if (!nextDue) {
        console.warn(`No valid next due time for job ${job.id}`)
        return
      }

      // Handle catch-up logic
      if (job.catchup && schedule.lastSuccess) {
        const _lastSuccess = DateTime.fromMillis(schedule.lastSuccess, { zone: job.timezone })

        // If we missed runs since last success, schedule catch-up runs
        while (nextDue.toMillis() <= now.toMillis()) {
          await this.createRun(job, nextDue.toMillis())
          const newNextDue = this.calculateNextDue(job, nextDue)
          if (!newNextDue) break
          nextDue = newNextDue
        }
      } else {
        // Skip missed runs, just schedule next one
        if (nextDue.toMillis() <= now.toMillis()) {
          const newNextDue = this.calculateNextDue(job, now)
          if (!newNextDue) {
            console.warn(`No valid next due time for job ${job.id}`)
            return
          }
          nextDue = newNextDue
        }
      }

      schedule.nextDue = nextDue.toMillis()
    }

    await this.db.saveSchedule(schedule)
  }

  /**
   * Create a run for a job at a specific time
   */
  private async createRun(job: JobDefinition, scheduledAt: number): Promise<string> {
    const runId = `run_${job.id}_${scheduledAt}_${Math.random().toString(36).substr(2, 9)}`

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

    await this.db.saveRun(run)
    return runId
  }

  /**
   * Mark a job run as scheduled
   */
  async markRunScheduled(runId: string): Promise<void> {
    const run = await this.db.getRun(runId)
    if (run) {
      run.state = 'SCHEDULED'
      await this.db.saveRun(run)

      // Update schedule's last_scheduled
      const schedule = await this.db.getSchedule(run.jobId)
      if (schedule) {
        schedule.lastScheduled = Date.now()
        await this.db.saveSchedule(schedule)
      }
    }
  }

  /**
   * Mark a job run as started
   */
  async markRunStarted(runId: string): Promise<void> {
    const run = await this.db.getRun(runId)
    if (run) {
      run.state = 'STARTING'
      run.startedAt = Date.now()
      await this.db.saveRun(run)
    }
  }

  /**
   * Mark a job run as completed with success or failure
   */
  async markRunCompleted(
    runId: string,
    success: boolean,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const run = await this.db.getRun(runId)
    if (run) {
      run.completedAt = Date.now()
      run.state = success ? 'SUCCEEDED' : 'FAILED'

      if (!success) {
        run.errorCode = errorCode
        run.errorMessage = errorMessage
      }

      await this.db.saveRun(run)

      // Update schedule's last_success or last_attempt
      const schedule = await this.db.getSchedule(run.jobId)
      if (schedule) {
        schedule.lastAttempt = Date.now()
        if (success) {
          schedule.lastSuccess = Date.now()
        }
        await this.db.saveSchedule(schedule)
      }
    }
  }

  /**
   * Check if a job can run based on concurrency policy
   */
  async canRunJob(
    job: JobDefinition
  ): Promise<{ canRun: boolean; reason?: string; existingRunId?: string }> {
    const runningRuns = (await this.db.listRuns(job.id)).filter((r) =>
      ['STARTING', 'RUNNING'].includes(r.state)
    )

    if (runningRuns.length === 0) {
      return { canRun: true }
    }

    switch (job.concurrency) {
      case 'allow':
        return { canRun: true }

      case 'skip':
        return {
          canRun: false,
          reason: 'Job already running (skip policy)',
          existingRunId: runningRuns[0].id,
        }

      case 'queue':
        return {
          canRun: false,
          reason: 'Job already running (queue policy)',
          existingRunId: runningRuns[0].id,
        }

      case 'cancel-previous':
        // Cancel the previous run
        for (const run of runningRuns) {
          await this.cancelRun(run.id)
        }
        return { canRun: true }

      default:
        return { canRun: false, reason: 'Unknown concurrency policy' }
    }
  }

  /**
   * Cancel a running job
   */
  async cancelRun(runId: string): Promise<void> {
    const run = await this.db.getRun(runId)
    if (run && ['STARTING', 'RUNNING'].includes(run.state)) {
      run.state = 'CANCELLED'
      run.completedAt = Date.now()
      await this.db.saveRun(run)
    }
  }

  /**
   * Get pending runs that should be executed
   */
  async getPendingRuns(): Promise<RunMetadata[]> {
    // Get runs in DUE or SCHEDULED state
    const allRuns = await this.db.listRuns()
    return allRuns.filter((r) => ['DUE', 'SCHEDULED'].includes(r.state))
  }

  /**
   * Update schedules for all enabled jobs
   */
  async updateAllSchedules(): Promise<void> {
    const jobs = await this.db.listJobs()

    for (const job of jobs) {
      if (job.enabled) {
        await this.scheduleJob(job)
      }
    }
  }
}
