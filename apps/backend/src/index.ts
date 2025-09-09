// Load environment variables from the monorepo root .env in both dev and docker
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

// Try common locations: container/root cwd and dev monorepo root
const envCandidates = [
  path.resolve(process.cwd(), '../../.env'), // e.g., from apps/backend -> repo/.env during dev
]

for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p })
    break
  }
}
import cors from '@fastify/cors'
import { makeAgent } from '@scout/agent'
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'

interface AgentResult {
  output: string
  intermediateSteps?: unknown[]
  toolUsage?: unknown
  executionTime?: number
  toolsUsed?: number
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

// Routes
fastify.get('/health', async (_request: FastifyRequest, _reply: FastifyReply) => {
  return { status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }
})

// Service status endpoint
fastify.get('/api/services/status', async (_request: FastifyRequest, _reply: FastifyReply) => {
  const services = [
    {
      name: 'Steel Browser',
      url: process.env.STEEL_BROWSER_URL || 'http://steel-browser:3000',
      status: 'unknown',
      port: 3003,
      type: 'browser',
    },
    {
      name: 'SearX Search',
      url: process.env.SEARXNG_BASE_URL || 'http://searxng:8080',
      status: 'unknown',
      port: 8080,
      type: 'search',
    },
    {
      name: 'ChromaDB',
      url: process.env.CHROMADB_URL || 'http://chromadb:8000',
      status: 'unknown',
      port: 8000,
      type: 'database',
    },
    {
      name: 'Redis',
      url: 'http://redis:6379',
      status: 'unknown',
      port: 6379,
      type: 'cache',
    },
  ]

  // Helper functions for service health checks
  const checkSteelBrowserHealth = async (): Promise<boolean> => {
    const apiUrl = process.env.STEEL_API_URL || 'http://steel-browser:3000'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(`${apiUrl}/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      })
      const data = await response.json()
      return response.ok && !!data?.id
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const checkChromaDBHealth = async (url: string): Promise<boolean> => {
    try {
      const { ChromaClient } = await import('chromadb')
      const client = new ChromaClient({ path: url })
      await client.heartbeat()
      return true
    } catch {
      return false
    }
  }

  const checkStandardServiceHealth = async (url: string): Promise<boolean> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Scout-Service-Checker/1.0' },
      })
      return response.ok
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // Check each service status
  const serviceChecks = await Promise.all(
    services.map(async (service) => {
      try {
        let isHealthy = false

        switch (service.name) {
          case 'Steel Browser':
            isHealthy = await checkSteelBrowserHealth()
            break
          case 'ChromaDB':
            isHealthy = await checkChromaDBHealth(service.url)
            break
          case 'Redis':
            isHealthy = true // Assume Redis is healthy since it's internal
            break
          default:
            isHealthy = await checkStandardServiceHealth(service.url)
            break
        }

        return {
          ...service,
          status: isHealthy ? 'online' : 'offline',
          lastChecked: new Date().toISOString(),
        }
      } catch (error) {
        return {
          ...service,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString(),
        }
      }
    })
  )

  return {
    services: serviceChecks,
    timestamp: new Date().toISOString(),
    overall: serviceChecks.every((s) => s.status === 'online') ? 'healthy' : 'degraded',
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
    const result = (await langchainAgent.invoke({
      input,
    })) as AgentResult

    console.log(`✅ Agent response generated (${result.output?.length || 0} chars)`)

    return reply.send({
      id: generateId(),
      content: result.output ?? 'No response generated',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      // Include intermediate steps for debugging if available
      ...(result.intermediateSteps && {
        intermediateSteps: result.intermediateSteps,
        intermediateStepsCount: result.intermediateSteps.length,
      }),
      // Include tool usage information
      ...(result.toolUsage
        ? {
            toolUsage: result.toolUsage,
            executionTime: result.executionTime,
            toolsUsed: result.toolsUsed,
          }
        : {}),
    })
  } catch (error) {
    console.error('❌ Agent error:', error)
    return reply.code(500).send({
      error: 'Agent processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Helper functions for streaming endpoint
const initializeAgentIfNeeded = async () => {
  if (!langchainAgent) {
    console.log('🚀 Initializing LangChain agent...')
    process.env.LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://127.0.0.1:1234/v1'
    process.env.LOCAL_MODEL = process.env.LOCAL_MODEL || 'openai/gpt-oss-20b'
    console.log('Environment variables set:', {
      LMSTUDIO_URL: process.env.LMSTUDIO_URL,
      LOCAL_MODEL: process.env.LOCAL_MODEL,
    })
    langchainAgent = await makeAgent()
    console.log('✅ LangChain agent ready')
  }
}

const extractUserInput = (messages?: { role: string; content: string }[]) => {
  const lastUserMessage = messages?.filter((m) => m.role === 'user').pop()
  return lastUserMessage?.content ?? ''
}

const sendSSEMessage = (reply: FastifyReply, data: unknown) => {
  reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
}

const streamAgentResponse = async (reply: FastifyReply, input: string, messageId: string) => {
  const result = (await langchainAgent!.invoke({ input })) as AgentResult
  const content = result.output ?? 'No response generated'
  const words = typeof content === 'string' ? content.split(' ') : []

  // Stream word by word for better UX
  for (let i = 0; i < words.length; i++) {
    if (reply.raw.destroyed) {
      console.log(`[Streaming] Connection destroyed, stopping stream for ${messageId}`)
      break
    }

    const chunk = i === 0 ? words[i] : ` ${words[i]}`
    sendSSEMessage(reply, {
      type: 'chunk',
      id: messageId,
      content: chunk,
    })

    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  // Send completion message
  sendSSEMessage(reply, {
    type: 'done',
    id: messageId,
    timestamp: new Date().toISOString(),
    ...(result.intermediateSteps ? { intermediateSteps: result.intermediateSteps } : {}),
    ...(result.toolUsage
      ? {
          toolUsage: result.toolUsage as unknown,
          executionTime: result.executionTime,
          toolsUsed: result.toolsUsed,
        }
      : {}),
  })

  console.log(`✅ Streaming agent response completed (${content.length} chars)`)
}

// Streaming agent endpoint
fastify.post('/api/agent/stream', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { messages } = (request.body as { messages?: { role: string; content: string }[] }) ?? {
      messages: [],
    }

    await initializeAgentIfNeeded()
    const input = extractUserInput(messages)

    if (!input) {
      return reply.code(400).send({ error: 'No user message found' })
    }

    console.log(`🤖 Processing streaming agent request: "${input.substring(0, 100)}..."`)

    // Set headers for SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    })

    const messageId = generateId()
    const timestamp = new Date().toISOString()

    // Send initial message
    sendSSEMessage(reply, {
      type: 'start',
      id: messageId,
      role: 'assistant',
      timestamp,
    })

    try {
      await streamAgentResponse(reply, input, messageId)
    } catch (streamError) {
      console.error('❌ Streaming agent error:', streamError)
      sendSSEMessage(reply, {
        type: 'error',
        id: messageId,
        error: 'Agent processing failed',
        message: streamError instanceof Error ? streamError.message : 'Unknown error',
      })
    }

    reply.raw.end()
  } catch (error) {
    console.error('❌ Streaming setup error:', error)
    return reply.code(500).send({
      error: 'Streaming setup failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 7777
    await fastify.listen({ port: Number(port), host: '0.0.0.0' })
    console.log(`🚀 Scout API server listening on port ${port}`)
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
}

start()
