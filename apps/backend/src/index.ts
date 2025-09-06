import 'dotenv/config'
import cors from '@fastify/cors'
import { makeAgent } from '@scout/agent-langchain'
import { ResearchAgent } from '@scout/agents'
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'

// Define types

// NOTE: Old DIY tools and agents moved to LangChain
// WebScraping and BrowserAgent replaced by @scout/agent-langchain tools

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

// NOTE: SimpleLLMProvider moved to LangChain agent
// Old DIY LLM provider - kept for reference but replaced by @scout/agent-langchain

// NOTE: Old tool/agent initialization replaced by LangChain
// Tools and agents now initialized in @scout/agent-langchain package

// Initialize research agent for legacy endpoints
const researchAgent = new ResearchAgent({
  search: {
    searxng_url: process.env.SEARXNG_BASE_URL || 'http://localhost:8080',
    max_results: 10,
  },
  memory: {
    sqlite_path: './data/research_memory.db',
  },
})

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
    const _query: Query = {
      id: generateId(),
      content: queryText,
      timestamp: new Date(),
      userId: 'user',
    }

    // Use ResearchAgent for all queries (migrating to LangChain)
    const result = await researchAgent.research({
      question: queryText,
      description: 'User query from Scout interface',
    })

    return {
      id: generateId(),
      query: queryText,
      result: {
        answer: result.answer,
        reasoning: `Researched using ${result.sources?.length || 0} sources`,
        agent: 'ResearchAgent',
        success: result.confidence ? result.confidence > 0.5 : true,
        executionTime: 1000, // Placeholder
        sources: result.sources,
        confidence: result.confidence,
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
      depth,
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
          total_execution_time: executionTime,
        },
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
      count: sessions.length,
    }
  } catch (error) {
    console.error('Failed to get research sessions:', error)
    return {
      sessions: [],
      count: 0,
      error: 'Failed to load sessions',
    }
  }
})

fastify.get('/research/stats', async (_request: FastifyRequest, _reply: FastifyReply) => {
  try {
    const stats = await researchAgent.getMemoryStats()
    return {
      memory_stats: stats,
      timestamp: new Date().toISOString(),
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
        newest_chunk: new Date(),
      },
      error: 'Failed to load stats',
    }
  }
})

// LangChain Agent route
let langchainAgent: Awaited<ReturnType<typeof makeAgent>> | null = null

// GET /api/agent for health checks or preflight requests
fastify.get('/api/agent', async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.send({
    status: 'ok',
    message: 'LangChain agent endpoint available',
    method: 'POST required for queries',
  })
})
fastify.post('/api/agent', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { messages } = (request.body as { messages?: { role: string; content: string }[] }) ?? {
      messages: [],
    }

    // Initialize agent on first request
    if (!langchainAgent) {
      console.log('🚀 Initializing LangChain agent...')
      // Set environment variables for the agent
      process.env.LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://127.0.0.1:1234/v1'
      process.env.LOCAL_MODEL = process.env.LOCAL_MODEL || 'openai/gpt-oss-20b'
      console.log('Environment variables set:', {
        LMSTUDIO_URL: process.env.LMSTUDIO_URL,
        LOCAL_MODEL: process.env.LOCAL_MODEL,
      })
      langchainAgent = await makeAgent()
      console.log('✅ LangChain agent ready')
    }

    // Convert UI messages to AgentExecutor input (use last user message as input)
    const lastUserMessage = messages?.filter((m) => m.role === 'user').pop()
    const input = lastUserMessage?.content ?? ''

    if (!input) {
      return reply.code(400).send({ error: 'No user message found' })
    }

    console.log(`🤖 Processing agent request: "${input.substring(0, 100)}..."`)

    // Execute agent
    const result = await langchainAgent.invoke({
      input,
    })

    console.log(`✅ Agent response generated (${result.output?.length || 0} chars)`)

    return reply.send({
      id: generateId(),
      content: result.output ?? 'No response generated',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      // Include intermediate steps for debugging if available
      ...(result.intermediateSteps && {
        intermediateSteps: result.intermediateSteps,
      }),
    })
  } catch (error) {
    console.error('❌ Agent error:', error)
    return reply.code(500).send({
      error: 'Agent processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
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
    console.log(`🚀 Scout API server listening on port ${port}`)
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
}

start()
