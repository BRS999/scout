import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface ToolCallRecord {
  tool: string
  args: Record<string, unknown>
  startTime: string
  endTime: string
  duration: number
  result: unknown
  error?: string
}

export interface AgentRunRecord {
  id: string
  startTime: string
  endTime: string
  duration: number
  input: string
  output: string
  toolCalls: ToolCallRecord[]
  metadata: {
    model?: string
    temperature?: number
    maxIterations?: number
    totalTokens?: number
  }
}

/**
 * Records agent runs and tool executions for debugging and analysis
 */
export class RunRecorder {
  private runsDir: string
  private currentRun?: AgentRunRecord
  private currentRunPath?: string

  constructor(runsDir = './.runs') {
    this.runsDir = runsDir
  }

  /**
   * Start recording a new agent run
   */
  async startRun(input: string, metadata: Record<string, unknown> = {}): Promise<string> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = new Date().toISOString()

    this.currentRun = {
      id: runId,
      startTime,
      endTime: '',
      duration: 0,
      input,
      output: '',
      toolCalls: [],
      metadata,
    }

    // Ensure runs directory exists
    await fs.mkdir(this.runsDir, { recursive: true })

    this.currentRunPath = path.join(this.runsDir, `${runId}.jsonl`)

    return runId
  }

  /**
   * Record a tool call
   */
  async recordToolCall(
    tool: string,
    args: Record<string, unknown>,
    result: unknown,
    error?: string
  ): Promise<void> {
    if (!this.currentRun) {
      console.warn('[RunRecorder] No active run to record tool call')
      return
    }

    const startTime = new Date().toISOString()
    const endTime = new Date().toISOString()
    const duration = 0 // Could be improved with actual timing

    const toolCall: ToolCallRecord = {
      tool,
      args,
      startTime,
      endTime,
      duration,
      result,
      error,
    }

    this.currentRun.toolCalls.push(toolCall)
  }

  /**
   * End the current run and save to file
   */
  async endRun(output: string): Promise<void> {
    if (!this.currentRun) {
      console.warn('[RunRecorder] No active run to end')
      return
    }

    this.currentRun.endTime = new Date().toISOString()
    this.currentRun.duration =
      Date.parse(this.currentRun.endTime) - Date.parse(this.currentRun.startTime)
    this.currentRun.output = output

    if (this.currentRunPath) {
      // Write each tool call as a separate JSONL entry
      const entries: string[] = []

      // Add run metadata
      entries.push(
        JSON.stringify({
          type: 'run_start',
          ...this.currentRun,
          toolCalls: undefined, // Don't include in summary
        })
      )

      // Add each tool call
      for (const toolCall of this.currentRun.toolCalls) {
        entries.push(
          JSON.stringify({
            type: 'tool_call',
            runId: this.currentRun.id,
            ...toolCall,
          })
        )
      }

      // Add run completion
      entries.push(
        JSON.stringify({
          type: 'run_end',
          runId: this.currentRun.id,
          endTime: this.currentRun.endTime,
          duration: this.currentRun.duration,
          output: this.currentRun.output,
        })
      )

      await fs.writeFile(this.currentRunPath, `${entries.join('\n')}\n`)
    }

    this.currentRun = undefined
    this.currentRunPath = undefined
  }

  /**
   * Get the last recorded run
   */
  async getLastRun(): Promise<AgentRunRecord | null> {
    try {
      const files = await fs.readdir(this.runsDir)
      const runFiles = files
        .filter((f) => f.endsWith('.jsonl'))
        .sort()
        .reverse()

      if (runFiles.length === 0) return null

      const lastRunPath = path.join(this.runsDir, runFiles[0])
      const content = await fs.readFile(lastRunPath, 'utf-8')
      const lines = content.trim().split('\n')

      // Parse the run from JSONL
      let runRecord: Partial<AgentRunRecord> = {}
      const toolCalls: ToolCallRecord[] = []

      for (const line of lines) {
        const entry = JSON.parse(line)
        if (entry.type === 'run_start') {
          runRecord = entry
        } else if (entry.type === 'tool_call') {
          toolCalls.push(entry)
        } else if (entry.type === 'run_end') {
          runRecord.output = entry.output
          runRecord.endTime = entry.endTime
          runRecord.duration = entry.duration
        }
      }

      return {
        ...runRecord,
        toolCalls,
      } as AgentRunRecord
    } catch (error) {
      console.error('[RunRecorder] Error reading last run:', error)
      return null
    }
  }

  /**
   * List all recorded runs
   */
  async listRuns(limit = 10): Promise<string[]> {
    try {
      const files = await fs.readdir(this.runsDir)
      return files
        .filter((f) => f.endsWith('.jsonl'))
        .sort()
        .reverse()
        .slice(0, limit)
        .map((f) => f.replace('.jsonl', ''))
    } catch (error) {
      console.error('[RunRecorder] Error listing runs:', error)
      return []
    }
  }
}

// Export singleton instance
export const runRecorder = new RunRecorder()
