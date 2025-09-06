import {
  type Agent as AgentType,
  type AgentType as AgentTypeEnum,
  type MemoryEntry,
  type Query,
  type QueryResult,
  type Tool,
  generateId,
  measureExecutionTime,
} from '@agentic-seek/shared'

export abstract class BaseAgent implements AgentType {
  public readonly id: string
  public readonly name: string
  public readonly type: AgentTypeEnum
  public readonly role: string
  public readonly capabilities: string[]
  public isActive = true

  protected tools: Map<string, Tool> = new Map()
  protected memory: MemoryEntry[] = []
  protected maxMemorySize = 100

  constructor(name: string, type: AgentTypeEnum, role: string, capabilities: string[] = []) {
    this.id = generateId()
    this.name = name
    this.type = type
    this.role = role
    this.capabilities = capabilities
  }

  /**
   * Process a query and return a result
   */
  abstract process(query: Query): Promise<QueryResult>

  /**
   * Add a tool to the agent
   */
  addTool(tool: Tool): void {
    this.tools.set(tool.id, tool)
  }

  /**
   * Remove a tool from the agent
   */
  removeTool(toolId: string): void {
    this.tools.delete(toolId)
  }

  /**
   * Get all available tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Execute a tool by ID
   */
  async executeTool(toolId: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(toolId)
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`)
    }

    if (tool.validate && !tool.validate(input)) {
      throw new Error(`Invalid input for tool ${toolId}`)
    }

    const { result, executionTime } = await measureExecutionTime(() => tool.execute(input))

    // Add to memory
    this.addToMemory('system', `Executed tool ${tool.name}: ${JSON.stringify(result)}`)

    return {
      ...result,
      executionTime,
    }
  }

  /**
   * Add an entry to the agent's memory
   */
  addToMemory(type: 'user' | 'assistant' | 'system', content: string): void {
    const entry: MemoryEntry = {
      id: generateId(),
      type,
      content,
      timestamp: new Date(),
    }

    this.memory.push(entry)

    // Maintain memory size limit
    if (this.memory.length > this.maxMemorySize) {
      this.memory = this.memory.slice(-this.maxMemorySize)
    }
  }

  /**
   * Get the agent's memory
   */
  getMemory(): MemoryEntry[] {
    return [...this.memory]
  }

  /**
   * Clear the agent's memory
   */
  clearMemory(): void {
    this.memory = []
  }

  /**
   * Get memory as formatted context
   */
  getMemoryContext(): string {
    return this.memory.map((entry) => `${entry.type.toUpperCase()}: ${entry.content}`).join('\n')
  }

  /**
   * Stop the agent
   */
  stop(): void {
    this.isActive = false
  }

  /**
   * Check if the agent can handle a specific query type
   */
  canHandle(_query: Query): boolean {
    // Default implementation - override in subclasses for specific logic
    return this.isActive
  }

  /**
   * Extract code blocks from text
   */
  protected extractCodeBlocks(text: string): Array<{
    language: string
    content: string
    fullMatch: string
  }> {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
    const blocks: Array<{
      language: string
      content: string
      fullMatch: string
    }> = []

    let match: RegExpExecArray | null
    while (true) {
      match = codeBlockRegex.exec(text)
      if (match === null) break
      blocks.push({
        language: match[1] || 'text',
        content: match[2].trim(),
        fullMatch: match[0],
      })
    }

    return blocks
  }

  /**
   * Process code blocks and return results
   */
  protected async processCodeBlocks(text: string): Promise<unknown[]> {
    const blocks = this.extractCodeBlocks(text)
    const results: unknown[] = []

    for (const block of blocks) {
      try {
        const result = await this.executeCodeBlock(block)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          block,
        })
      }
    }

    return results
  }

  /**
   * Execute a single code block
   */
  protected async executeCodeBlock(block: {
    language: string
    content: string
  }): Promise<unknown> {
    // Find appropriate tool for the language
    const toolName = `${block.language}_executor`
    const tool = this.tools.get(toolName)

    if (!tool) {
      throw new Error(`No executor found for language: ${block.language}`)
    }

    return await this.executeTool(tool.id, block.content)
  }
}
