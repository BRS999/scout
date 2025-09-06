import { BaseAgent } from '@agentic-seek/core'
import { AgentType, type Query, type QueryResult } from '@agentic-seek/shared'

export class CasualAgent extends BaseAgent {
  constructor() {
    super(
      'Casual Agent',
      AgentType.CASUAL,
      'A friendly conversational agent for general queries and casual interaction',
      ['conversation', 'general-knowledge', 'casual-chat']
    )
  }

  async process(query: Query): Promise<QueryResult> {
    const startTime = Date.now()

    try {
      // For now, return a simple response
      // In a real implementation, this would call an LLM
      const answer = `Hello! I'm the Casual Agent. You asked: "${query.content}". This is a placeholder response - the full LLM integration will be implemented next.`

      return {
        answer,
        reasoning: 'Processed as a casual conversation query',
        agentName: this.name,
        success: true,
        blocks: [],
        status: 'completed',
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        answer: 'Sorry, I encountered an error processing your request.',
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        agentName: this.name,
        success: false,
        blocks: [],
        status: 'error',
        executionTime: Date.now() - startTime,
      }
    }
  }
}
