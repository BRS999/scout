import { mastra } from './mastra'

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Create a streaming response for the Mastra agent with memory support
 */
export async function createAgentStream(
  messages: { role: string; content: string }[],
  options?: {
    threadId?: string
    resourceId?: string
    memoryOptions?: {
      lastMessages?: number
      semanticRecall?: {
        topK?: number
        messageRange?: number
      }
    }
  }
): Promise<ReadableStream<Uint8Array>> {
  return new ReadableStream({
    start(controller) {
      const writer = {
        write: (chunk: Uint8Array) => {
          controller.enqueue(chunk)
        },
      }

      const messageId = generateId()

      // Process the streaming response
      streamAgentResponse(writer, messages, messageId, options)
        .then(() => {
          controller.close()
        })
        .catch((error) => {
          console.error('❌ Streaming error:', error)
          controller.error(error)
        })
    },
  })
}

async function streamAgentResponse(
  writer: { write: (chunk: Uint8Array) => void },
  messages: { role: string; content: string }[],
  messageId: string,
  options?: {
    threadId?: string
    resourceId?: string
    memoryOptions?: {
      lastMessages?: number
      semanticRecall?: {
        topK?: number
        messageRange?: number
      }
    }
  }
) {
  try {
    // Send start event
    const startData = `data: ${JSON.stringify({
      type: 'start',
      id: messageId,
      timestamp: new Date().toISOString(),
    })}\n\n`
    writer.write(new TextEncoder().encode(startData))

    const agent = mastra.getAgent('scoutAgent')

    const startTime = Date.now()

    // Extract the last user message content for Mastra
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
    const userInput = lastUserMessage?.content || ''

    // Prepare memory options
    const memoryOptions = options?.memoryOptions || {}
    const threadId = options?.threadId || `thread_${Date.now()}`
    const resourceId = options?.resourceId || `resource_${Date.now()}`

    // Use Mastra streaming with memory
    const stream = await agent.stream(userInput, {
      memory: {
        thread: threadId,
        resource: resourceId,
      },
      memoryOptions: {
        lastMessages: memoryOptions.lastMessages || 10,
        semanticRecall: {
          topK: memoryOptions.semanticRecall?.topK ?? 3,
          messageRange: memoryOptions.semanticRecall?.messageRange ?? 2,
        },
      },
    })

    // Stream text chunks
    for await (const chunk of stream.textStream) {
      const chunkData = `data: ${JSON.stringify({
        type: 'chunk',
        id: messageId,
        content: chunk,
        timestamp: new Date().toISOString(),
      })}\n\n`
      writer.write(new TextEncoder().encode(chunkData))
    }

    const endTime = Date.now()

    // Send done event
    const doneData = `data: ${JSON.stringify({
      type: 'done',
      id: messageId,
      executionTime: endTime - startTime,
      memory: {
        threadId: threadId,
        resourceId: resourceId,
      },
      timestamp: new Date().toISOString(),
    })}\n\n`
    writer.write(new TextEncoder().encode(doneData))
  } catch (error) {
    console.error('❌ Mastra streaming error:', error)
    const errorData = `data: ${JSON.stringify({
      type: 'error',
      id: messageId,
      error: 'Mastra agent processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })}\n\n`
    writer.write(new TextEncoder().encode(errorData))
  }
}
