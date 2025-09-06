import { exec } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { type Tool, type ToolResult, ToolType } from '@agentic-seek/shared'

const execAsync = promisify(exec)

export class PythonExecutor implements Tool {
  id = 'python_executor'
  name = 'Python Code Executor'
  description = 'Execute Python code and return the output'
  type = ToolType.CODE_EXECUTOR

  async execute(input: unknown): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      if (typeof input !== 'string') {
        throw new Error('Input must be a string containing Python code')
      }

      const code = input.trim()
      if (!code) {
        throw new Error('Code cannot be empty')
      }

      // Create a temporary file for the Python code
      const tempDir = '/tmp'
      const tempFile = path.join(
        tempDir,
        `python_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`
      )

      await fs.writeFile(tempFile, code, 'utf8')

      // Execute the Python code
      const { stdout, stderr } = await execAsync(`python3 "${tempFile}"`, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      })

      // Clean up the temporary file
      await fs.unlink(tempFile).catch(() => {}) // Ignore cleanup errors

      const executionTime = Date.now() - startTime
      const output = stdout || ''
      const error = stderr || ''

      // Check for common Python errors and provide helpful feedback
      if (error) {
        return {
          success: false,
          output: output,
          error: this.formatPythonError(error),
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
          // Python execution failed
          const execError = error as { stderr?: string; stdout?: string }
          const stderr = execError.stderr || ''
          const stdout = execError.stdout || ''

          return {
            success: false,
            output: stdout,
            error: this.formatPythonError(stderr || error.message),
            executionTime,
          }
        }

        if (error.message.includes('ETIMEDOUT')) {
          return {
            success: false,
            output: null,
            error: 'Python code execution timed out after 30 seconds',
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
    if (code.includes('import os') && (code.includes('system(') || code.includes('popen('))) {
      // This might be dangerous, but we'll allow it for now with a warning
      console.warn('Warning: Code contains system calls which could be dangerous')
    }

    return true
  }

  private formatPythonError(error: string): string {
    // Clean up and format Python error messages for better readability
    let formattedError = error

    // Remove the temporary file path from error messages
    formattedError = formattedError.replace(
      /\/tmp\/python_code_\d+_[a-z0-9]+\.py/g,
      '<temporary_file>'
    )

    // Add helpful suggestions for common errors
    if (formattedError.includes('SyntaxError')) {
      formattedError += '\n\n💡 **Syntax Error Tips:**\n'
      formattedError +=
        '- Check for missing colons (:) after function definitions and control statements\n'
      formattedError += '- Verify proper indentation (Python uses indentation for code blocks)\n'
      formattedError += '- Check for mismatched parentheses, brackets, or quotes\n'
    }

    if (formattedError.includes('IndentationError')) {
      formattedError += '\n\n💡 **Indentation Error Tips:**\n'
      formattedError += '- Python uses indentation to define code blocks\n'
      formattedError += '- Use consistent indentation (4 spaces recommended)\n'
      formattedError += "- Don't mix tabs and spaces\n"
    }

    if (formattedError.includes('NameError')) {
      formattedError += '\n\n💡 **Name Error Tips:**\n'
      formattedError += '- Check if variables are defined before use\n'
      formattedError += '- Verify correct spelling of variable/function names\n'
      formattedError += '- Make sure required modules are imported\n'
    }

    if (formattedError.includes('ModuleNotFoundError')) {
      formattedError += '\n\n💡 **Module Error Tips:**\n'
      formattedError += '- Install required packages: pip install <package_name>\n'
      formattedError += '- Check if the module name is spelled correctly\n'
      formattedError += '- Some modules need to be installed system-wide\n'
    }

    return formattedError
  }
}
