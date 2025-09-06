import 'dotenv/config'
import cors from '@fastify/cors'
import { makeAgent } from '@scout/agent-langchain'
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'

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
    const port = process.env.PORT || 7777
    await fastify.listen({ port: Number(port), host: '0.0.0.0' })
    console.log(`🚀 Scout API server listening on port ${port}`)
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
}

start()
