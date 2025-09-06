import { type LLMProvider, ProviderType } from '@scout/shared'
import { LMStudioProvider } from './lm-studio-provider'
import { OpenAIProvider } from './openai-provider'

export interface ProviderConfig {
  id: string
  name: string
  type: ProviderType
  model: string
  baseUrl?: string
  apiKey?: string
}

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.type) {
    case ProviderType.OPENAI:
      return new OpenAIProvider(config.id, config.name, config.model, config.baseUrl, config.apiKey)

    case ProviderType.LM_STUDIO:
      return new LMStudioProvider(
        config.id,
        config.name,
        config.model,
        config.baseUrl || 'http://localhost:1234/v1'
      )

    default:
      throw new Error(`Unsupported provider type: ${config.type}`)
  }
}

export function createLMStudioProvider(
  id: string,
  name: string,
  model: string,
  baseUrl = 'http://localhost:1234/v1'
): LMStudioProvider {
  return new LMStudioProvider(id, name, model, baseUrl)
}

export function createOpenAIProvider(
  id: string,
  name: string,
  model: string,
  baseUrl?: string,
  apiKey?: string
): OpenAIProvider {
  return new OpenAIProvider(id, name, model, baseUrl, apiKey)
}
