import cors from '@fastify/cors'
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'
import { OpenAI } from 'openai'
import { WebSearch } from '@agentic-seek/tools'
import { ResearchAgent } from '@agentic-seek/agents'

// Define types
interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Mock implementations - keeping simple for now
class PythonExecutor {
  id = 'python_executor'
  name = 'Python Executor'
  async execute(_input: string) {
    return { success: true, output: 'Mock Python output', executionTime: 100 }
  }
}

class JavaScriptExecutor {
  id = 'javascript_executor'
  name = 'JavaScript Executor'
  async execute(_input: string) {
    return { success: true, output: 'Mock JavaScript output', executionTime: 100 }
  }
}


class WebScraping {
  id = 'web_scraping'
  name = 'Web Scraping'
  async execute(options: unknown) {
    const opts = options as { url?: string; query?: string }
    return {
      success: true,
      output: {
        content: `Mock scraped content from ${opts.url} about ${opts.query || 'general topic'}. This demonstrates the web scraping functionality that extracts relevant information from web pages.`,
        extractedAt: new Date().toISOString(),
      },
      executionTime: 150,
    }
  }
}

class CoderAgent {
  name = 'Coder Agent'
  tools: unknown[] = []

  addTool(tool: unknown) {
    this.tools.push(tool)
  }

  async process(query: unknown) {
    const q = query as { content: string }
    console.log('CoderAgent processing query:', q.content)
    try {
      // Check if this query might benefit from web search (e.g., latest library versions, current best practices)
      const needsSearch = this.shouldUseSearch(q.content)

      let systemPrompt =
        'You are a specialized coding assistant. Help users with programming tasks, code review, debugging, and implementation. You have access to Python and JavaScript execution tools.'

      if (needsSearch) {
        systemPrompt +=
          '\n\nYou also have access to web search capabilities. If the user is asking about current technologies, library versions, or recent developments, use the available search results to provide the most up-to-date information.'
      }

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: q.content,
        },
      ]

      console.log('Making LLM call with messages:', messages)
      const llmResponse = await llmProvider.chat(messages, {
        temperature: 0.7,
        maxTokens: 2048,
      })

      console.log('LLM response received:', `${llmResponse.content.substring(0, 100)}...`)
      return {
        answer: llmResponse.content,
        reasoning: 'Generated response using LLM Studio with GPT-OSS and optional web search',
        agentName: this.name,
        success: true,
        blocks: [],
        status: 'completed',
        executionTime: 500,
      }
    } catch (error) {
      console.error('CoderAgent LLM error:', error)
      console.error('Error details:', error instanceof Error ? error.stack : error)
      return {
        answer: `Error processing coding query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        reasoning: 'LLM processing failed',
        agentName: this.name,
        success: false,
        blocks: [],
        status: 'error',
        executionTime: 100,
      }
    }
  }

  private shouldUseSearch(query: string): boolean {
    const searchKeywords = [
      'latest',
      'current',
      'newest',
      'recent',
      'version',
      'update',
      'best practices',
      'modern',
      'popular',
      'trending',
      'framework',
      'library',
      'tool',
      '2024',
      '2025',
    ]

    const lowerQuery = query.toLowerCase()
    return searchKeywords.some((keyword) => lowerQuery.includes(keyword))
  }
}

class BrowserAgent {
  name = 'Browser Agent'
  tools: unknown[] = []

  addTool(tool: unknown) {
    this.tools.push(tool)
  }

  async process(query: unknown) {
    const q = query as { content: string }
    try {
      // First, generate an optimized search query using LLM
      const searchQuery = await this.generateSearchQuery(q.content)
      console.log('Generated search query:', searchQuery)

      const searchTool = this.tools.find((t: any) => t.id === 'web_search')
      if (!searchTool) {
        throw new Error('Web search tool not available')
      }

      // Perform the search
      const searchResults = await (searchTool as any).execute(searchQuery)

      if (!(searchResults.success && searchResults.output) || searchResults.output.length === 0) {
        return {
          answer: `I couldn't find relevant information for "${q.content}". The search didn't return any results.`,
          reasoning: 'Search failed or returned no results',
          agentName: this.name,
          success: false,
          blocks: [],
          status: 'error',
          executionTime: 100,
        }
      }

      // Use LLM to synthesize the results
      const synthesisPrompt = this.createSynthesisPrompt(q.content, searchResults.output)
      const synthesisResult = await llmProvider.chat(
        [
          {
            role: 'user',
            content: synthesisPrompt,
          },
        ],
        {
          temperature: 0.7,
          maxTokens: 1500,
        }
      )

      const finalAnswer = synthesisResult.content

      return {
        answer: finalAnswer,
        reasoning: `Generated optimized search query "${searchQuery}" and synthesized ${searchResults.output.length} results using LLM`,
        agentName: this.name,
        success: true,
        blocks: [],
        status: 'completed',
        executionTime: 800,
      }
    } catch (error) {
      console.error('BrowserAgent error:', error)
      return {
        answer: `Error processing web query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        reasoning: 'LLM processing failed',
        agentName: this.name,
        success: false,
        blocks: [],
        status: 'error',
        executionTime: 100,
      }
    }
  }

  private async generateSearchQuery(userQuery: string): Promise<string> {
    const prompt = `You are an expert at creating effective search engine queries. Given the user's question, create a concise, effective search query that will return the most relevant results.

User's question: "${userQuery}"

Create a search query that:
- Uses specific keywords
- Includes relevant context
- Avoids unnecessary words
- Is optimized for search engines

Return only the search query, nothing else.`

    try {
      const response = await llmProvider.chat(
        [
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.3,
          maxTokens: 100,
        }
      )

      return response.content.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
    } catch (error) {
      console.error('Error generating search query:', error)
      return userQuery // Fallback to original query
    }
  }

  private createSynthesisPrompt(userQuery: string, searchResults: any[]): string {
    const resultsText = searchResults
      .slice(0, 8)
      .map(
        (result, index) =>
          `${index + 1}. Title: ${result.title}\n   Snippet: ${result.snippet}\n   Source: ${result.link}`
      )
      .join('\n\n')

    return `Based on the following search results, provide a comprehensive and accurate answer to the user's question.

User's question: "${userQuery}"

Search Results:
${resultsText}

Please provide:
1. A direct answer to the question
2. Key facts and information from the sources
3. Source citations where relevant
4. If the information is insufficient, clearly state what additional information would be needed

Structure your response naturally and conversationally, as if you're explaining this to someone. Include specific details and avoid generic statements.`
  }

  private shouldUseSearch(_query: string): boolean {
    // BrowserAgent always uses search since it's the search agent
    return true
  }

  // Alternative LLM-powered method (commented out for now)
  async processWithLLM(query: any) {
    try {
      // First perform web search
      const searchTool = this.tools.find((t: any) => t.id === 'web_search')
      let searchResults: any = { success: false, output: [] }

      if (searchTool) {
        searchResults = await (searchTool as any).execute(query.content)
      }

      // Prepare context from search results
      let searchContext = ''
      if (searchResults.success && searchResults.output && searchResults.output.length > 0) {
        searchContext = searchResults.output
          .map(
            (result: any, index: number) =>
              `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.link}`
          )
          .join('\n\n')
      }

      // Use LLM to synthesize response
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: `You are a specialized web browsing assistant. You have access to web search and scraping tools. Based on the provided search results, give a comprehensive and helpful answer to the user's query. If the search results are insufficient, mention that you can perform additional searches.`,
        },
        {
          role: 'user',
          content: `Query: ${(query as any).content}\n\n${searchContext ? `Search Results:\n${searchContext}` : 'No search results available.'}\n\nPlease provide a comprehensive answer based on the available information.`,
        },
      ]

      const llmResponse = await llmProvider.chat(messages, {
        temperature: 0.7,
        maxTokens: 2048,
      })

      return {
        answer: llmResponse.content,
        reasoning: 'Used web search and LLM synthesis for comprehensive answer',
        agentName: this.name,
        success: true,
        blocks: [],
        status: 'completed',
        executionTime: 800,
      }
    } catch (error) {
      console.error('BrowserAgent LLM error:', error)
      return {
        answer: `Error processing web query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        reasoning: 'LLM processing failed',
        agentName: this.name,
        success: false,
        blocks: [],
        status: 'error',
        executionTime: 100,
      }
    }
  }
}

interface Query {
  id: string
  content: string
  timestamp: Date
  userId?: string
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

const fastify = Fastify({
  logger: true,
})

// Register plugins
fastify.register(cors, {
  origin: true, // Allow all origins for development
})

// MCP-like SearxNG Tool for LLM integration
class SearxNGTool {
  private webSearch: WebSearch

  constructor(webSearchInstance: WebSearch) {
    this.webSearch = webSearchInstance
  }

  // MCP-like tool definition
  getToolDefinition() {
    return {
      name: 'search_web',
      description:
        'Search the web using SearxNG for current information, news, tutorials, and general knowledge queries',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to perform',
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5,
          },
        },
        required: ['query'],
      },
    }
  }

  // Execute the tool
  async execute(query: string, maxResults = 5) {
    try {
      const results = await this.webSearch.execute(query)

      if (!(results.success && results.output)) {
        return {
          success: false,
          error: 'Search failed',
          results: [],
        }
      }

      // Format results for LLM consumption
      const outputArray = Array.isArray(results.output) ? results.output : []
      const formattedResults = outputArray
        .slice(0, maxResults)
        .map((result: any, index: number) => ({
          rank: index + 1,
          title: result.title,
          snippet: result.snippet,
          url: result.link,
          source: result.source,
        }))

      return {
        success: true,
        query: query,
        total_results: outputArray.length,
        returned_results: formattedResults.length,
        results: formattedResults,
        execution_time: results.executionTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
      }
    }
  }
}

// Simple LLM Provider for LLM Studio
class SimpleLLMProvider {
  private client: OpenAI
  private searxngTool: SearxNGTool

  constructor(baseUrl = 'http://localhost:1234/v1', searxngTool: SearxNGTool) {
    this.client = new OpenAI({
      apiKey: 'not-needed-for-local',
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
    })
    this.searxngTool = searxngTool
  }

  async chat(messages: any[], options: any = {}) {
    try {
      // Check if the query needs web search
      const lastMessage = messages[messages.length - 1]
      const needsSearch = this.shouldUseSearch(lastMessage.content)

      if (needsSearch) {
        // Perform search and add results to context
        const searchQuery = await this.generateSearchQuery(lastMessage.content)
        const searchResults = await this.searxngTool.execute(searchQuery, 5)

        if (searchResults.success && searchResults.results.length > 0) {
          // Add search results to the messages
          const searchContext = this.formatSearchResults(searchResults)
          messages.push({
            role: 'system',
            content: `Here are the relevant web search results for the user's query:\n\n${searchContext}\n\nUse this information to provide a comprehensive and accurate answer.`,
          })
        }
      }

      const completion = (await this.client.chat.completions.create({
        model: options.model || process.env.LLM_STUDIO_MODEL || 'gpt-oss',
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        stream: false,
      })) as any

      const choice = completion.choices[0]
      if (!choice) {
        throw new Error('No completion choices returned')
      }

      const content = choice.message?.content || ''

      return {
        content,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
        finishReason: choice.finish_reason || undefined,
      }
    } catch (error) {
      console.error('LLM error:', error)
      throw error
    }
  }

  private shouldUseSearch(query: string): boolean {
    const searchKeywords = [
      'current',
      'latest',
      'recent',
      'news',
      'today',
      'now',
      'what is',
      'how to',
      'explain',
      'tell me about',
      'search for',
      'find',
      'look up',
      'information about',
    ]

    const lowerQuery = query.toLowerCase()
    return searchKeywords.some((keyword) => lowerQuery.includes(keyword))
  }

  private async generateSearchQuery(userQuery: string): Promise<string> {
    // Extract key terms for search
    const prompt = `Create a concise search query for: "${userQuery}"

Return only the search query, no explanations.`

    try {
      const response = (await this.client.chat.completions.create({
        model: 'gpt-oss',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 50,
      })) as any

      return response.choices[0]?.message?.content?.trim() || userQuery
    } catch (_error) {
      return userQuery // Fallback
    }
  }

  private formatSearchResults(searchResults: any): string {
    return searchResults.results
      .map(
        (result: any) =>
          `${result.rank}. ${result.title}\n   ${result.snippet}\n   Source: ${result.url}`
      )
      .join('\n\n')
  }
}

// Initialize tools first
const pythonExecutor = new PythonExecutor()
const jsExecutor = new JavaScriptExecutor()
const webSearch = new WebSearch(process.env.SEARXNG_BASE_URL)
const webScraping = new WebScraping()

// Initialize SearxNG tool with webSearch instance
const searxngTool = new SearxNGTool(webSearch)

// Initialize LLM Provider with searxng tool
const llmProvider = new SimpleLLMProvider(
  process.env.LLM_STUDIO_BASE_URL || 'http://host.docker.internal:1234/v1',
  searxngTool
)

// Initialize agents
const coderAgent = new CoderAgent()
const browserAgent = new BrowserAgent()
const researchAgent = new ResearchAgent({
  search: {
    searxng_url: process.env.SEARXNG_BASE_URL || 'http://localhost:8080',
    max_results: 10
  },
  memory: {
    sqlite_path: './data/research_memory.db'
  }
})

// Register tools with agents
coderAgent.addTool(pythonExecutor)
coderAgent.addTool(jsExecutor)

browserAgent.addTool(webSearch)
browserAgent.addTool(webScraping)

// Routes
fastify.get('/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
  return { status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }
})

fastify.post('/query', async (request: FastifyRequest, reply: FastifyReply) => {
  const { query: queryText } = request.body as { query: string }

  if (!queryText) {
    return reply.code(400).send({ error: 'Query is required' })
  }

  try {
    const query: Query = {
      id: generateId(),
      content: queryText,
      timestamp: new Date(),
      userId: 'user',
    }

    // Intelligent agent routing based on query analysis
    let selectedAgent: CoderAgent | BrowserAgent = coderAgent
    const lowerQuery = queryText.toLowerCase()

    // Keywords that indicate web search is needed
    const searchKeywords = [
      'search',
      'find',
      'what is',
      'how to',
      'information about',
      'tell me about',
      'explain',
      'who is',
      'when did',
      'where is',
      'why does',
      'how does',
      'latest',
      'recent',
      'current',
      'news about',
      'article about',
      'guide to',
      'tutorial',
      'documentation',
      'examples of',
      'best practices',
      'tips for',
    ]

    // Check for search intent
    const needsSearch = searchKeywords.some((keyword) => lowerQuery.includes(keyword))

    // Check for specific coding/programming terms that should stay with coder agent
    const codingKeywords = [
      'function',
      'class',
      'variable',
      'import',
      'export',
      'const',
      'let',
      'var',
      'debug',
      'error',
      'exception',
      'syntax',
      'compile',
      'build',
      'run',
      'execute',
      'algorithm',
      'data structure',
      'api',
      'endpoint',
      'database',
      'query',
      'file',
      'directory',
      'path',
      'install',
      'package',
      'module',
      'library',
    ]

    const isCodingQuery = codingKeywords.some((keyword) => lowerQuery.includes(keyword))

    // Route to BrowserAgent for web search queries, keep with CoderAgent for coding tasks
    if (needsSearch && !isCodingQuery) {
      selectedAgent = browserAgent
    }

    const result = await selectedAgent.process(query)

    return {
      id: generateId(),
      query: queryText,
      result: {
        answer: result.answer,
        reasoning: result.reasoning,
        agent: result.agentName,
        success: result.success,
        executionTime: result.executionTime,
        blocks: result.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          language: block.language,
          content: block.content,
          output: block.output,
          error: block.error,
          success: block.success,
        })),
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Query processing error:', error)
    return reply.code(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.post('/tools/file-finder', async (_request: FastifyRequest, _reply: FastifyReply) => {
  // Simple mock response for now
  return {
    success: true,
    data: ['mock-file-1.txt', 'mock-file-2.js'],
    executionTime: 50,
  }
})

// Research endpoint
fastify.post('/research', async (request: FastifyRequest, reply: FastifyReply) => {
  const { question, description, tags, require_recent, depth } = request.body as {
    question: string
    description?: string
    tags?: string[]
    require_recent?: boolean
    depth?: 'shallow' | 'medium' | 'deep'
  }

  if (!question) {
    return reply.code(400).send({ error: 'Question is required' })
  }

  try {
    const startTime = Date.now()
    
    // Perform research using the research agent
    const result = await researchAgent.research({
      question,
      description,
      tags,
      require_recent,
      depth
    })

    const executionTime = Date.now() - startTime

    return {
      id: generateId(),
      question,
      result: {
        answer: result.answer,
        sources: result.sources,
        confidence: result.confidence,
        session_id: result.session_id,
        memory_used: result.memory_used,
        new_sources_found: result.new_sources_found,
        chunks_stored: result.chunks_stored,
        metadata: {
          ...result.metadata,
          total_execution_time: executionTime
        }
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Research processing error:', error)
    return reply.code(500).send({
      error: 'Research failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Research session endpoints
fastify.get('/research/sessions', async (_request: FastifyRequest, _reply: FastifyReply) => {
  try {
    const sessions = await researchAgent.getSessionHistory(20)
    return {
      sessions,
      count: sessions.length
    }
  } catch (error) {
    console.error('Failed to get research sessions:', error)
    return {
      sessions: [],
      count: 0,
      error: 'Failed to load sessions'
    }
  }
})

fastify.get('/research/stats', async (_request: FastifyRequest, _reply: FastifyReply) => {
  try {
    const stats = await researchAgent.getMemoryStats()
    return {
      memory_stats: stats,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to get memory stats:', error)
    return {
      memory_stats: {
        total_chunks: 0,
        total_sessions: 0,
        total_sources: 0,
        storage_size_mb: 0,
        oldest_chunk: new Date(),
        newest_chunk: new Date()
      },
      error: 'Failed to load stats'
    }
  }
})

// Start server
const start = async () => {
  try {
    // Initialize research agent
    try {
      await researchAgent.initialize()
      console.log('✅ Research agent initialized successfully')
    } catch (error) {
      console.warn('⚠️ Research agent initialization failed:', error)
      console.warn('Research functionality will be limited')
    }

    const port = process.env.PORT || 7777
    await fastify.listen({ port: Number(port), host: '0.0.0.0' })
    console.log(`🚀 AgenticSeek API server listening on port ${port}`)
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
}

start()
