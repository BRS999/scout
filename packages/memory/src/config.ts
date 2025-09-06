import type { MemoryConfig } from './types'

export function createMemoryConfig(config: Partial<MemoryConfig> = {}): MemoryConfig {
  return {
    collection_name: config.collection_name || 'scout_memory',
    chromaUrl: config.chromaUrl || process.env.CHROMADB_URL,
    embeddingFunction: config.embeddingFunction,
  }
}
