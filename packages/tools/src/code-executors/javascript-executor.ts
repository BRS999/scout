import { exec } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { type Tool, type ToolResult, ToolType } from '@agentic-seek/shared'

const execAsync = promisify(exec)

export class JavaScriptExecutor implements Tool {
  id = 'javascript_executor'
  name = 'JavaScript Code Executor'
  description = 'Execute JavaScript/TypeScript code and return the output'
  type = ToolType.CODE_EXECUTOR

  async execute(input: unknown): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      if (typeof input !== 'string') {
        throw new Error('Input must be a string containing JavaScript code')
      }

      const code = input.trim()
      if (!code) {
        throw new Error('Code cannot be empty')
      }

      // Check if this is TypeScript code
      const isTypeScript = this.isTypeScriptCode(code)

      // Create a temporary file for the code
      const tempDir = '/tmp'
      const extension = isTypeScript ? 'ts' : 'js'
      const tempFile = path.join(
        tempDir,
        `js_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`
      )

      await fs.writeFile(tempFile, code, 'utf8')

      let command: string
      if (isTypeScript) {
        // Use tsx or ts-node to run TypeScript
        command = `npx tsx "${tempFile}"`
      } else {
        // Use Node.js to run JavaScript
        command = `node "${tempFile}"`
      }

      // Execute the code
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      })

      // Clean up the temporary file
      await fs.unlink(tempFile).catch(() => {}) // Ignore cleanup errors

      const executionTime = Date.now() - startTime
      const output = stdout || ''
      const error = stderr || ''

      // Check for JavaScript/TypeScript errors
      if (error) {
        return {
          success: false,
          output: output,
          error: this.formatJavaScriptError(error),
          executionTime,
        }
      }

      return {
        success: true,
        output: output.trim(),
        executionTime,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      if (error instanceof Error) {
        if (error.message.includes('Command failed')) {
          // JavaScript execution failed
          const execError = error as { stderr?: string; stdout?: string }
          const stderr = execError.stderr || ''
          const stdout = execError.stdout || ''

          return {
            success: false,
            output: stdout,
            error: this.formatJavaScriptError(stderr || error.message),
            executionTime,
          }
        }

        if (error.message.includes('ETIMEDOUT')) {
          return {
            success: false,
            output: null,
            error: 'JavaScript code execution timed out after 30 seconds',
            executionTime,
          }
        }
      }

      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime,
      }
    }
  }

  validate(input: unknown): boolean {
    if (typeof input !== 'string') {
      return false
    }

    const code = input.trim()
    if (!code) {
      return false
    }

    // Basic validation - check for obviously problematic patterns
    const dangerousPatterns = [
      "require('child_process')",
      'require("child_process")',
      'exec(',
      'spawn(',
      'eval(',
      'Function(',
    ]

    for (const pattern of dangerousPatterns) {
      if (code.includes(pattern)) {
        console.warn(`Warning: Code contains potentially dangerous pattern: ${pattern}`)
      }
    }

    return true
  }

  private isTypeScriptCode(code: string): boolean {
    // Simple heuristic to detect TypeScript
    const tsIndicators = [
      ': string',
      ': number',
      ': boolean',
      ': any',
      ': unknown',
      'interface ',
      'type ',
      'enum ',
      '<',
      'extends ',
      'implements ',
    ]

    return tsIndicators.some((indicator) => code.includes(indicator))
  }

  private formatJavaScriptError(error: string): string {
    // Clean up and format JavaScript/TypeScript error messages
    let formattedError = error

    // Remove the temporary file path from error messages
    formattedError = formattedError.replace(
      /\/tmp\/js_code_\d+_[a-z0-9]+\.(js|ts)/g,
      '<temporary_file>'
    )

    // Add helpful suggestions for common errors
    if (formattedError.includes('SyntaxError')) {
      formattedError += '\n\n💡 **Syntax Error Tips:**\n'
      formattedError += '- Check for missing semicolons or commas\n'
      formattedError += '- Verify matching braces, brackets, and parentheses\n'
      formattedError += '- Check for correct variable declarations (let, const, var)\n'
    }

    if (formattedError.includes('ReferenceError')) {
      formattedError += '\n\n💡 **Reference Error Tips:**\n'
      formattedError += '- Check if variables are declared before use\n'
      formattedError += '- Verify correct spelling of variable/function names\n'
      formattedError += '- Make sure required modules are imported\n'
    }

    if (formattedError.includes('TypeError')) {
      formattedError += '\n\n💡 **Type Error Tips:**\n'
      formattedError += "- Check if you're calling methods on the correct types\n"
      formattedError += '- Verify object properties exist before accessing them\n'
      formattedError += '- Check function parameter types\n'
    }

    if (formattedError.includes('Cannot find module')) {
      formattedError += '\n\n💡 **Module Error Tips:**\n'
      formattedError += '- Install required packages: npm install <package_name>\n'
      formattedError += '- Check if the module name is spelled correctly\n'
      formattedError += '- For local files, use relative paths\n'
    }

    return formattedError
  }
}
