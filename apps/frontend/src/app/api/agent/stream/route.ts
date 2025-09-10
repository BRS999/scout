import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Import the agent stream function
    const { createAgentStream } = await import('@scout/agent')

    const body = await request.json()
    const { messages, threadId, resourceId, memoryOptions } = body as {
      messages?: { role: string; content: string }[]
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

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    console.log(`🤖 Processing Mastra streaming request with ${messages.length} messages`)

    // Use the agent stream handler from the agent package with memory options
    const stream = await createAgentStream(messages, {
      threadId,
      resourceId,
      memoryOptions,
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('❌ Mastra streaming endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Mastra agent streaming failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
