import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeAgent } from '../index'

// Mock LangChain dependencies
vi.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: vi.fn().mockReturnValue({
      pipe: vi.fn().mockReturnValue({
        invoke: vi.fn().mockResolvedValue({ content: 'Mocked response' }),
      }),
    }),
  },
  MessagesPlaceholder: vi.fn().mockImplementation((name) => ({ name })),
}))

vi.mock('langchain/agents', () => ({
  AgentExecutor: vi.fn().mockImplementation((_config) => ({
    invoke: vi.fn().mockResolvedValue({
      output: 'Agent executor response',
      intermediateSteps: [],
    }),
  })),
  createOpenAIToolsAgent: vi.fn().mockResolvedValue('mock-tools-agent'),
  createToolCallingAgent: vi.fn().mockResolvedValue('mock-calling-agent'),
}))

// Mock the model
vi.mock('../model', () => ({
  makeModel: vi.fn().mockReturnValue({
    pipe: vi.fn(),
    invoke: vi.fn().mockResolvedValue({ content: 'Model response' }),
  }),
}))

// Mock memory tools
vi.mock('@scout/memory', () => ({
  MemSearchTool: vi.fn().mockImplementation(() => ({
    name: 'mem-search',
    description: 'Search memory',
    call: vi.fn().mockResolvedValue('Memory search result'),
  })),
  MemUpsertTool: vi.fn().mockImplementation(() => ({
    name: 'mem-upsert',
    description: 'Store in memory',
    call: vi.fn().mockResolvedValue('Memory stored'),
  })),
}))

// Mock other tools
vi.mock('../tools/browser.tool', () => ({
  BrowserGetHtmlTool: vi.fn().mockImplementation(() => ({
    name: 'browser-get-html',
    description: 'Get HTML content',
    call: vi.fn().mockResolvedValue('<html>Mock content</html>'),
  })),
  BrowserNavigateTool: vi.fn().mockImplementation(() => ({
    name: 'browser-navigate',
    description: 'Navigate browser',
    call: vi.fn().mockResolvedValue('Navigated to URL'),
  })),
}))

vi.mock('../tools/parser.tool', () => ({
  ParserReadTool: vi.fn().mockImplementation(() => ({
    name: 'parser-read',
    description: 'Parse content',
    call: vi.fn().mockResolvedValue('Parsed content'),
  })),
}))

vi.mock('../tools/research-web.tool', () => ({
  ResearchWebTool: vi.fn().mockImplementation(() => ({
    name: 'research-web',
    description: 'Research web content',
    call: vi.fn().mockResolvedValue('Web research result'),
  })),
}))

vi.mock('../tools/search.tool', () => ({
  SearchRunTool: vi.fn().mockImplementation(() => ({
    name: 'search-run',
    description: 'Run search',
    call: vi.fn().mockResolvedValue('Search results'),
  })),
}))

vi.mock('../prompts/system', () => ({
  SYSTEM_PROMPT: 'You are a helpful AI assistant.',
}))

describe('Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset environment variables
    process.env.NODE_ENV = undefined
  })

  describe('makeAgent', () => {
    it('creates an agent with all tools', async () => {
      const agent = await makeAgent()

      expect(agent).toBeDefined()
      expect(agent.invoke).toBeDefined()
      expect(typeof agent.invoke).toBe('function')
    })

    it('accepts string input', async () => {
      const agent = await makeAgent()

      const result = await agent.invoke({ input: 'Hello, how are you?' })

      expect(result).toBeDefined()
      expect(result.output).toBeDefined()
      expect(typeof result.output).toBe('string')
    })

    it('accepts object input with input property', async () => {
      const agent = await makeAgent()

      const result = await agent.invoke({ input: 'Test message' })

      expect(result).toBeDefined()
      expect(result.output).toBeDefined()
      expect(typeof result.output).toBe('string')
    })

    it('includes all required tools', async () => {
      const { MemSearchTool, MemUpsertTool } = await import('@scout/memory')
      const { BrowserNavigateTool, BrowserGetHtmlTool } = await import('../tools/browser.tool')
      const { ParserReadTool } = await import('../tools/parser.tool')
      const { ResearchWebTool } = await import('../tools/research-web.tool')
      const { SearchRunTool } = await import('../tools/search.tool')

      await makeAgent()

      // Verify all tool classes were instantiated
      expect(SearchRunTool).toHaveBeenCalled()
      expect(BrowserNavigateTool).toHaveBeenCalled()
      expect(BrowserGetHtmlTool).toHaveBeenCalled()
      expect(ParserReadTool).toHaveBeenCalled()
      expect(ResearchWebTool).toHaveBeenCalled()
      expect(MemSearchTool).toHaveBeenCalled()
      expect(MemUpsertTool).toHaveBeenCalled()
    })

    it('handles agent creation failure gracefully', async () => {
      const { createToolCallingAgent } = await import('langchain/agents')

      // Mock both agent creation functions to fail
      vi.mocked(createToolCallingAgent).mockRejectedValue(new Error('Tool calling failed'))

      const { createOpenAIToolsAgent } = await import('langchain/agents')
      vi.mocked(createOpenAIToolsAgent).mockRejectedValue(new Error('OpenAI tools failed'))

      const agent = await makeAgent()

      expect(agent).toBeDefined()
      expect(agent.invoke).toBeDefined()
    })

    it('uses verbose mode in development', async () => {
      process.env.NODE_ENV = 'development'

      const { AgentExecutor, createToolCallingAgent } = await import('langchain/agents')

      // Make sure the agent creation succeeds so AgentExecutor is called
      const mockAgent = {
        invoke: vi.fn().mockResolvedValue({ output: 'Mock response' }),
      }
      vi.mocked(createToolCallingAgent).mockResolvedValue(mockAgent as unknown as never)

      await makeAgent()

      // Verify that AgentExecutor was called with verbose: true
      const calls = vi.mocked(AgentExecutor).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toEqual(
        expect.objectContaining({
          verbose: true,
        })
      )

      // Reset for other tests
      process.env.NODE_ENV = undefined
    })

    it('handles runtime tool-calling errors', async () => {
      const { AgentExecutor } = await import('langchain/agents')

      // Mock AgentExecutor to fail on invoke
      const mockExecutor = {
        invoke: vi.fn().mockRejectedValue(new Error('Runtime tool error')),
      }
      vi.mocked(AgentExecutor).mockImplementation(() => mockExecutor as unknown as never)

      const agent = await makeAgent()
      const result = await agent.invoke({ input: 'Test message' })

      expect(result).toBeDefined()
      expect(typeof result.output).toBe('string')
      expect(Array.isArray(result.intermediateSteps)).toBe(true)
    })

    it('escapes system prompt correctly', async () => {
      const { ChatPromptTemplate } = await import('@langchain/core/prompts')

      await makeAgent()

      // Verify ChatPromptTemplate was called with escaped braces
      expect(ChatPromptTemplate.fromMessages).toHaveBeenCalledWith([
        ['system', 'You are a helpful AI assistant.'],
        ['human', '{input}'],
        expect.objectContaining({ name: 'agent_scratchpad' }),
      ])
    })

    it('creates fallback chain when all agent creation fails', async () => {
      const { createToolCallingAgent, createOpenAIToolsAgent } = await import('langchain/agents')

      // Mock both to fail
      vi.mocked(createToolCallingAgent).mockRejectedValue(new Error('Tool calling failed'))
      vi.mocked(createOpenAIToolsAgent).mockRejectedValue(new Error('OpenAI failed'))

      // Mock the entire agent creation to fail
      const { AgentExecutor } = await import('langchain/agents')
      vi.mocked(AgentExecutor).mockImplementation(() => {
        throw new Error('Agent executor failed')
      })

      const agent = await makeAgent()

      expect(agent).toBeDefined()
      expect(agent.invoke).toBeDefined()

      // Test the fallback chain
      const result = await agent.invoke({ input: 'Test fallback' })
      expect(result).toBeDefined()
      expect(typeof result.output).toBe('string')
      expect(Array.isArray(result.intermediateSteps)).toBe(true)
    })

    it('handles errors in fallback chain gracefully', async () => {
      const { createToolCallingAgent, createOpenAIToolsAgent, AgentExecutor } = await import(
        'langchain/agents'
      )
      const { makeModel } = await import('../model')
      const { ChatPromptTemplate } = await import('@langchain/core/prompts')

      // Mock everything to fail
      vi.mocked(createToolCallingAgent).mockRejectedValue(new Error('Tool calling failed'))
      vi.mocked(createOpenAIToolsAgent).mockRejectedValue(new Error('OpenAI failed'))
      vi.mocked(AgentExecutor).mockImplementation(() => {
        throw new Error('Agent executor failed')
      })

      // Mock model chain to fail
      const mockChain = {
        invoke: vi.fn().mockRejectedValue(new Error('Chain failed')),
      }
      const mockModel = {
        pipe: vi.fn().mockReturnValue(mockChain),
      }
      vi.mocked(makeModel).mockReturnValue(mockModel as unknown as never)

      // Mock prompt template to return the chain
      vi.mocked(ChatPromptTemplate.fromMessages).mockReturnValue({
        pipe: vi.fn().mockReturnValue(mockChain),
      } as unknown as never)

      const agent = await makeAgent()
      const result = await agent.invoke({ input: 'Test error handling' })

      expect(result).toBeDefined()
      expect(typeof result.output).toBe('string')
      expect(result.output).toContain('Error: Chain failed')
      expect(Array.isArray(result.intermediateSteps)).toBe(true)
    })
  })
})
