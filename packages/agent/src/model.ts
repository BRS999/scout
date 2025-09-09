import { ChatOpenAI } from '@langchain/openai'

/**
 * Create a ChatOpenAI model configured for LM Studio
 */
export function makeModel() {
  return new ChatOpenAI({
    temperature: 0.2,
    modelName: process.env.LOCAL_MODEL ?? 'Llama-3.1-8B-Instruct',
    openAIApiKey: process.env.LMSTUDIO_API_KEY ?? 'lm-studio',
    configuration: {
      baseURL: process.env.LMSTUDIO_URL ?? 'http://127.0.0.1:1234/v1',
    },
    modelKwargs: {
      reasoning_effort: 'low',
    },
  })
}

/**
 * Create a model with custom configuration
 */
export function makeModelWithConfig(config: {
  temperature?: number
  modelName?: string
  baseURL?: string
  apiKey?: string
  reasoningEffort?: 'low' | 'medium' | 'high'
}) {
  return new ChatOpenAI({
    temperature: config.temperature ?? 0.2,
    modelName: config.modelName ?? process.env.LOCAL_MODEL ?? 'Llama-3.1-8B-Instruct',
    openAIApiKey: config.apiKey ?? process.env.LMSTUDIO_API_KEY ?? 'lm-studio',
    configuration: {
      baseURL: config.baseURL ?? process.env.LMSTUDIO_URL ?? 'http://127.0.0.1:1234/v1',
    },
    modelKwargs: {
      reasoning_effort: config.reasoningEffort ?? 'low',
    },
  })
}
