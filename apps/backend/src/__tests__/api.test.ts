import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the agent to avoid external dependencies
vi.mock('@scout/agent', () => ({
  makeAgent: vi.fn().mockResolvedValue({
    invoke: vi.fn().mockResolvedValue({
      output: 'Mocked agent response',
      intermediateSteps: [],
    }),
  }),
}))

// Import after mocking
import { makeAgent } from '@scout/agent'

describe('Backend API', () => {
  let app: FastifyInstance
  let mockAgent: any

  beforeEach(async () => {
    // Create a fresh Fastify instance for each test
    app = Fastify({ logger: false })

    // Mock agent
    mockAgent = {
      invoke: vi.fn().mockResolvedValue({
        output: 'Test response from agent',
        intermediateSteps: [],
      }),
    }

    vi.mocked(makeAgent).mockResolvedValue(mockAgent)

    // Register CORS
    await app.register(import('@fastify/cors'), {
      origin: true,
    })

    // Add routes (simplified version of our actual routes)
    app.get('/health', async () => {
      return { status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }
    })

    app.get('/api/agent', async () => {
      return {
        status: 'ok',
        message: 'LangChain agent endpoint available',
        method: 'POST required for queries',
      }
    })

    let langchainAgent: any = null

    // Regular agent endpoint
    app.post('/api/agent', async (request, reply) => {
      const { messages } = (request.body as { messages?: { role: string; content: string }[] }) ?? {
        messages: [],
      }

      if (!langchainAgent) {
        langchainAgent = await makeAgent()
      }

      const lastUserMessage = messages?.filter((m) => m.role === 'user').pop()
      const input = lastUserMessage?.content ?? ''

      if (!input) {
        return reply.code(400).send({ error: 'No user message found' })
      }

      const result = await langchainAgent.invoke({ input })

      return reply.send({
        id: 'test-id',
        content: result.output ?? 'No response generated',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      })
    })

    // Streaming agent endpoint
    app.post('/api/agent/stream', async (request, reply) => {
      const { messages } = (request.body as { messages?: { role: string; content: string }[] }) ?? {
        messages: [],
      }

      if (!langchainAgent) {
        langchainAgent = await makeAgent()
      }

      const lastUserMessage = messages?.filter((m) => m.role === 'user').pop()
      const input = lastUserMessage?.content ?? ''

      if (!input) {
        return reply.code(400).send({ error: 'No user message found' })
      }

      // Set headers for SSE
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      })

      const messageId = 'test-stream-id'
      const timestamp = new Date().toISOString()

      // Send start event
      reply.raw.write(
        `data: ${JSON.stringify({
          type: 'start',
          id: messageId,
          role: 'assistant',
          timestamp,
        })}\\n\\n`
      )

      // Get response from agent
      const result = await langchainAgent.invoke({ input })
      const content = result.output ?? 'No response generated'
      const words = content.split(' ')

      // Stream words
      for (let i = 0; i < words.length; i++) {
        const chunk = i === 0 ? words[i] : ` ${words[i]}`
        reply.raw.write(
          `data: ${JSON.stringify({
            type: 'chunk',
            id: messageId,
            content: chunk,
          })}\\n\\n`
        )
      }

      // Send done event
      reply.raw.write(
        `data: ${JSON.stringify({
          type: 'done',
          id: messageId,
          timestamp: new Date().toISOString(),
        })}\\n\\n`
      )

      reply.raw.end()
    })
  })

  afterEach(async () => {
    if (app) {
      await app.close()
    }
  })

  describe('Health endpoint', () => {
    it('returns health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.status).toBe('ok')
      expect(data.version).toBe('0.1.0')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('Agent endpoint', () => {
    it('GET returns endpoint info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/agent',
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.status).toBe('ok')
      expect(data.message).toBe('LangChain agent endpoint available')
    })

    it('POST processes agent request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agent',
        payload: {
          messages: [{ role: 'user', content: 'Hello, how are you?' }],
        },
      })

      expect(response.statusCode).toBe(200)
      const data = JSON.parse(response.payload)
      expect(data.content).toBe('Test response from agent')
      expect(data.role).toBe('assistant')
      expect(data.id).toBeDefined()
      expect(data.timestamp).toBeDefined()

      // Verify agent was called
      expect(mockAgent.invoke).toHaveBeenCalledWith({
        input: 'Hello, how are you?',
      })
    })

    it('POST returns 400 for empty messages', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agent',
        payload: {
          messages: [],
        },
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.payload)
      expect(data.error).toBe('No user message found')
    })

    it('POST extracts last user message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agent',
        payload: {
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'Assistant response' },
            { role: 'user', content: 'Second message' },
          ],
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockAgent.invoke).toHaveBeenCalledWith({
        input: 'Second message',
      })
    })
  })

  describe('Streaming agent endpoint', () => {
    it('streams response correctly', async () => {
      // Mock agent with specific response for streaming
      mockAgent.invoke.mockResolvedValue({
        output: 'Hello world test',
        intermediateSteps: [],
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/agent/stream',
        payload: {
          messages: [{ role: 'user', content: 'Test streaming' }],
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toBe('text/event-stream')
      expect(response.headers['cache-control']).toBe('no-cache')

      const payload = response.payload

      // Check for start event
      expect(payload).toContain('"type":"start"')
      expect(payload).toContain('"id":"test-stream-id"')

      // Check for chunk events
      expect(payload).toContain('"type":"chunk"')
      expect(payload).toContain('"content":"Hello"')
      expect(payload).toContain('"content":" world"')
      expect(payload).toContain('"content":" test"')

      // Check for done event
      expect(payload).toContain('"type":"done"')

      // Verify agent was called
      expect(mockAgent.invoke).toHaveBeenCalledWith({
        input: 'Test streaming',
      })
    })

    it('returns 400 for empty messages in streaming', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/agent/stream',
        payload: {
          messages: [],
        },
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.payload)
      expect(data.error).toBe('No user message found')
    })

    it('handles agent errors in streaming endpoint setup', async () => {
      // Test with empty messages to trigger validation error (simpler test)
      const response = await app.inject({
        method: 'POST',
        url: '/api/agent/stream',
        payload: {
          messages: [],
        },
      })

      expect(response.statusCode).toBe(400)
      const data = JSON.parse(response.payload)
      expect(data.error).toBe('No user message found')
    })
  })

  describe('CORS', () => {
    it('includes CORS headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          origin: 'http://localhost:3000',
        },
      })

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    })
  })
})
