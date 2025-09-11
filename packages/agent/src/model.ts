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
