import {
  AgentType,
  BlockType,
  type CodeBlock,
  type Query,
  type QueryResult,
  type Tool,
  type ToolResult,
  generateId,
} from '@agentic-seek/shared'

export class CoderAgent {
  public readonly id: string
  public readonly name = 'Coder Agent'
  public readonly type = AgentType.CODER
  public readonly role =
    'A specialized agent for writing, debugging, and executing code in multiple programming languages'
  public readonly capabilities = [
    'python',
    'javascript',
    'typescript',
    'java',
    'cpp',
    'c',
    'go',
    'rust',
    'php',
    'ruby',
    'swift',
    'kotlin',
    'r',
    'scala',
    'dart',
    'code-execution',
    'debugging',
    'file-operations',
    'testing',
  ]
  public isActive = true

  private tools: Map<string, Tool> = new Map()

  constructor() {
    this.id = generateId()
  }

  addTool(tool: Tool): void {
    this.tools.set(tool.id, tool)
  }

  private extractCodeBlocks(text: string): Array<{ language: string; content: string }> {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
    const blocks: Array<{ language: string; content: string }> = []

    let match: RegExpExecArray | null
    while (true) {
      match = codeBlockRegex.exec(text)
      if (match === null) break
      blocks.push({
        language: match[1] || 'text',
        content: match[2].trim(),
      })
    }

    return blocks
  }

  private async executeTool(toolId: string, input: unknown): Promise<ToolResult> {
    const tool = this.tools.get(toolId)
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`)
    }

    return await tool.execute(input)
  }

  async process(query: Query): Promise<QueryResult> {
    const startTime = Date.now()

    try {
      // Extract code blocks from the query
      const codeBlocks = this.extractCodeBlocks(query.content)

      if (codeBlocks.length === 0) {
        // No code blocks found, provide general coding assistance
        const answer = await this.provideCodingGuidance(query.content)
        return {
          answer,
          reasoning: 'Provided general coding guidance since no code blocks were found',
          agentName: this.name,
          success: true,
          blocks: [],
          status: 'completed',
          executionTime: Date.now() - startTime,
        }
      }

      // Process code blocks
      const processedBlocks: CodeBlock[] = []
      let allSuccessful = true

      for (const block of codeBlocks) {
        try {
          const result = await this.processCodeBlock(block)
          processedBlocks.push(result)

          if (!result.success) {
            allSuccessful = false
          }
        } catch (error) {
          processedBlocks.push({
            id: generateId(),
            type: BlockType.ERROR,
            content: block.content,
            language: block.language,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
            executionTime: 0,
          })
          allSuccessful = false
        }
      }

      // Generate comprehensive response
      const answer = this.generateResponse(query.content, processedBlocks, allSuccessful)

      return {
        answer,
        reasoning: `Processed ${processedBlocks.length} code block(s) with ${allSuccessful ? 'success' : 'some issues'}`,
        agentName: this.name,
        success: allSuccessful,
        blocks: processedBlocks,
        status: 'completed',
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        answer: 'Sorry, I encountered an error while processing your coding request.',
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        agentName: this.name,
        success: false,
        blocks: [],
        status: 'error',
        executionTime: Date.now() - startTime,
      }
    }
  }

  private async provideCodingGuidance(content: string): Promise<string> {
    // Analyze the query to provide relevant coding guidance
    const lowerContent = content.toLowerCase()

    if (lowerContent.includes('debug') || lowerContent.includes('error')) {
      return `I can help you debug your code! Please share the specific code block with the error, and I'll analyze it and suggest fixes. 

For example:
\`\`\`python
# Your code here
print("Hello World")
\`\`\`

Also tell me:
- What error message you're seeing
- What you expected to happen
- What actually happened`
    }

    if (lowerContent.includes('test') || lowerContent.includes('testing')) {
      return `I can help you write and run tests for your code! Let me know:

1. What programming language you're using
2. What functionality you want to test
3. Share your code so I can create appropriate tests

For example, I can create unit tests, integration tests, or help you debug failing tests.`
    }

    if (lowerContent.includes('optimize') || lowerContent.includes('performance')) {
      return `I can help optimize your code for better performance! Share your code and let me know:

1. What specific performance issues you're facing
2. What metrics are important (speed, memory, CPU usage)
3. Any constraints or requirements

I'll analyze your code and suggest optimizations while maintaining readability and functionality.`
    }

    // General coding assistance
    return `I'm here to help with your coding needs! I can:

🔧 **Execute Code** in multiple languages (Python, JavaScript, TypeScript, Java, C++, Go, Rust, etc.)
🐛 **Debug Errors** and provide detailed solutions
📝 **Write & Review** code with best practices
🧪 **Create Tests** for your applications
⚡ **Optimize Performance** and efficiency
📁 **Handle Files** - create, read, modify, and organize

To get started, just share your code in a code block like this:

\`\`\`python
def hello_world():
    print("Hello, World!")

hello_world()
\`\`\`

What would you like to work on?`
  }

  private async processCodeBlock(block: { language: string; content: string }): Promise<CodeBlock> {
    const blockId = generateId()
    const startTime = Date.now()

    try {
      // Find appropriate tool for the language
      const toolName = `${block.language}_executor`
      const tool = this.tools.get(toolName)

      if (!tool) {
        return {
          id: blockId,
          type: BlockType.ERROR,
          content: block.content,
          language: block.language,
          error: `No executor found for language: ${block.language}. Supported languages: ${Array.from(this.tools.keys()).join(', ')}`,
          success: false,
          executionTime: Date.now() - startTime,
        }
      }

      // Execute the code using the appropriate tool
      const result = await this.executeTool(tool.id, block.content)

      return {
        id: blockId,
        type: BlockType.CODE,
        content: block.content,
        language: block.language,
        output: result.output as string,
        success: result.success,
        executionTime: result.executionTime,
      }
    } catch (error) {
      return {
        id: blockId,
        type: BlockType.ERROR,
        content: block.content,
        language: block.language,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        success: false,
        executionTime: Date.now() - startTime,
      }
    }
  }

  private generateResponse(
    _originalQuery: string,
    blocks: CodeBlock[],
    allSuccessful: boolean
  ): string {
    let response = ''

    // Analyze the results
    const successfulBlocks = blocks.filter((block) => block.success)
    const failedBlocks = blocks.filter((block) => !block.success)

    if (allSuccessful) {
      response += '✅ **All code executed successfully!**\n\n'
    } else {
      response += `⚠️ **Some issues found:** ${successfulBlocks.length}/${blocks.length} blocks executed successfully.\n\n`
    }

    // Provide detailed feedback for each block
    blocks.forEach((block, index) => {
      response += `**Block ${index + 1}** (${block.language}):\n`

      if (block.success) {
        response += '✅ **Success**\n'
        if (block.output) {
          response += `**Output:**\n\`\`\`\n${block.output}\n\`\`\`\n`
        }
      } else {
        response += '❌ **Failed**\n'
        if (block.error) {
          response += `**Error:** ${block.error}\n`
        }
      }

      response += '\n'
    })

    // Provide additional guidance if there were failures
    if (failedBlocks.length > 0) {
      response += '## 🔧 **Suggestions for Failed Code:**\n\n'

      failedBlocks.forEach((block, _index) => {
        response += `**Block ${blocks.indexOf(block) + 1}:**\n`

        if (block.language === 'python' && block.error?.includes('SyntaxError')) {
          response += '- Check for syntax errors (missing colons, incorrect indentation, etc.)\n'
        } else if (block.language === 'javascript' && block.error?.includes('ReferenceError')) {
          response += '- Check for undefined variables or functions\n'
        } else if (
          block.error?.includes('ModuleNotFoundError') ||
          block.error?.includes('Cannot find module')
        ) {
          response += '- Install required dependencies or check import paths\n'
        } else {
          response += '- Review the error message and check your code logic\n'
        }

        response += '\n'
      })
    }

    // Add helpful next steps
    response += '## 🚀 **Next Steps:**\n\n'
    response += '- **Test your code** with different inputs\n'
    response += '- **Add error handling** for production use\n'
    response += '- **Write unit tests** to ensure reliability\n'
    response += '- **Optimize performance** if needed\n\n'

    response += 'Need help with any of these aspects? Just let me know!'

    return response
  }
}
