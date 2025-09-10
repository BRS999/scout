import { createOpenAI } from '@ai-sdk/openai'

/**
 * Create an LLM model configured for LM Studio using AI SDK
 */
export function makeModel() {
  const openaiClient = createOpenAI({
    baseURL: process.env.LMSTUDIO_URL ?? 'http://127.0.0.1:1234/v1',
    apiKey: process.env.LMSTUDIO_API_KEY ?? 'lm-studio',
  })

  return openaiClient(process.env.LOCAL_MODEL ?? 'gpt-4o-mini')
}

/**
 * Create a model with custom configuration
 */
export function makeModelWithConfig(config: {
  temperature?: number
  modelName?: string
  baseURL?: string
  apiKey?: string
}) {
  const openaiClient = createOpenAI({
    baseURL: config.baseURL ?? process.env.LMSTUDIO_URL ?? 'http://127.0.0.1:1234/v1',
    apiKey: config.apiKey ?? process.env.LMSTUDIO_API_KEY ?? 'lm-studio',
  })

  return openaiClient(config.modelName ?? process.env.LOCAL_MODEL ?? 'gpt-4o-mini')
}
