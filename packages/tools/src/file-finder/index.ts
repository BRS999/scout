import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { type Tool, type ToolResult, ToolType } from '@scout/shared'

export class FileFinder implements Tool {
  id = 'file-finder'
  name = 'File Finder'
  description = 'Find and read files in the workspace'
  type = ToolType.FILE_SYSTEM

  async execute(input: unknown): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      if (typeof input !== 'object' || input === null) {
        throw new Error('Input must be an object with search parameters')
      }

      const params = input as {
        action?: 'find' | 'read'
        pattern?: string
        path?: string
      }

      const action = params.action || 'find'

      if (action === 'find') {
        const pattern = params.pattern || '*'
        const searchPath = params.path || process.cwd()

        // Simple file search implementation
        const results = await this.findFiles(searchPath, pattern)

        return {
          success: true,
          output: {
            files: results,
            count: results.length,
          },
          executionTime: Date.now() - startTime,
        }
      }
      if (action === 'read') {
        const filePath = params.path
        if (!filePath) {
          throw new Error('File path is required for read action')
        }

        const content = await fs.readFile(filePath, 'utf-8')

        return {
          success: true,
          output: {
            path: filePath,
            content: content,
            size: content.length,
          },
          executionTime: Date.now() - startTime,
        }
      }
      throw new Error(`Unknown action: ${action}`)
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      }
    }
  }

  validate(input: unknown): boolean {
    if (typeof input !== 'object' || input === null) {
      return false
    }

    const params = input as Record<string, unknown>
    const action = params.action

    if (action === 'find') {
      return typeof params.pattern === 'string'
    }
    if (action === 'read') {
      return typeof params.path === 'string'
    }

    return false
  }

  private async findFiles(searchPath: string, pattern: string): Promise<string[]> {
    try {
      const files: string[] = []

      const scan = async (dir: string): Promise<void> => {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)

          if (entry.isDirectory()) {
            if (this.shouldScanDirectory(entry.name)) {
              await scan(fullPath)
            }
          } else if (entry.isFile()) {
            if (this.matchesPattern(entry.name, pattern)) {
              files.push(fullPath)
            }
          }
        }
      }

      await scan(searchPath)
      return files
    } catch (error) {
      console.error('Error scanning files:', error)
      return []
    }
  }

  private shouldScanDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', '.next']
    return !skipDirs.includes(dirName)
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    return pattern === '*' || filename.includes(pattern) || filename.endsWith(pattern)
  }
}
