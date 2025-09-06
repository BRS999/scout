import {
  type LLMMessage,
  type LLMOptions,
  type LLMProvider,
  type LLMResponse,
  ProviderType,
} from '@scout/shared'
import { OpenAI } from 'openai'

export class OpenAIProvider implements LLMProvider {
  public readonly id: string
  public readonly name: string
  public readonly type: ProviderType
  public readonly models: string[]
  public readonly isAvailable: boolean

  private client: OpenAI
  protected baseUrl?: string
  private apiKey?: string

  constructor(id: string, name: string, model: string, baseUrl?: string, apiKey?: string) {
    this.id = id
    this.name = name
    this.type = ProviderType.OPENAI
    this.models = [model]
    this.baseUrl = baseUrl
    this.apiKey = apiKey

    this.client = new OpenAI({
      apiKey: apiKey || 'not-needed-for-local',
      baseURL: baseUrl,
      dangerouslyAllowBrowser: true,
    })

    this.isAvailable = true // We'll check availability when needed
  }

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    try {
      const completion = (await this.client.chat.completions.create({
        model: options.model || this.models[0],
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        stream: false, // Disable streaming for now
      })) as { choices: unknown[]; usage?: unknown } // Cast to handle type issues

      const choice = (
        completion as { choices: { message?: { content?: string }; finish_reason?: string }[] }
      ).choices[0]
      if (!choice) {
        throw new Error('No completion choices returned')
      }

      const content = choice.message?.content || ''

      return {
        content,
        usage: (
          completion as {
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
          }
        ).usage
          ? {
              promptTokens:
                (
                  completion as {
                    usage?: {
                      prompt_tokens?: number
                      completion_tokens?: number
                      total_tokens?: number
                    }
                  }
                ).usage?.prompt_tokens || 0,
              completionTokens:
                (
                  completion as {
                    usage?: {
                      prompt_tokens?: number
                      completion_tokens?: number
                      total_tokens?: number
                    }
                  }
                ).usage?.completion_tokens || 0,
              totalTokens:
                (
                  completion as {
                    usage?: {
                      prompt_tokens?: number
                      completion_tokens?: number
                      total_tokens?: number
                    }
                  }
                ).usage?.total_tokens || 0,
            }
          : undefined,
        finishReason: choice.finish_reason || undefined,
      }
    } catch (error) {
      console.error('OpenAI provider error:', error)
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async generate(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const messages: LLMMessage[] = [{ role: 'user', content: prompt }]
    return this.chat(messages, options)
  }

  async checkAvailability(): Promise<boolean> {
    try {
      // Try a simple request to check if the server is responding
      await this.chat([{ role: 'user', content: 'Hello' }], { maxTokens: 1 })
      return true
    } catch (error) {
      console.warn('LLM provider availability check failed:', error)
      return false
    }
  }
}
