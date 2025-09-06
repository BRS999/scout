import type { LLMMessage, LLMOptions, LLMResponse } from '@agentic-seek/shared'
import { OpenAIProvider } from './openai-provider'

export class LMStudioProvider extends OpenAIProvider {
  constructor(id: string, name: string, model: string, baseUrl = 'http://localhost:1234/v1') {
    super(id, name, model, baseUrl)
    // Note: type is inherited from OpenAIProvider, but we identify as LM_STUDIO
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    // LM Studio uses OpenAI-compatible API, so we can use the parent implementation
    return super.chat(messages, options)
  }

  async checkAvailability(): Promise<boolean> {
    try {
      // LM Studio typically runs on localhost:1234
      const response = await fetch('http://localhost:1234/v1/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.warn(`LM Studio server responded with status: ${response.status}`)
        return false
      }

      const data = (await response.json()) as { data?: unknown }
      return data?.data != null && Array.isArray(data.data as unknown)
    } catch (error) {
      console.warn('LM Studio availability check failed:', error)
      return false
    }
  }
}
