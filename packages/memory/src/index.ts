// Core memory management
export { MemoryManager } from './memory-manager'
export { VectorStore } from './vector-store'
export { StructuredStore } from './structured-store'

// Types and interfaces
export type {
  ContentChunk,
  ChunkMetadata,
  ResearchSession,
  MemoryMatch,
  VectorSearchOptions,
  MemoryUpsertOptions,
  MemoryConfig,
  MemoryStats,
} from './types'

import { MemoryManager } from './memory-manager'
// Import types for use in functions
import type { MemoryConfig } from './types'

// Default configuration factory
export const createMemoryConfig = (overrides: Partial<MemoryConfig> = {}): MemoryConfig => {
  return {
    chroma_url: process.env.CHROMADB_URL || 'http://localhost:8000',
    sqlite_path: process.env.SQLITE_PATH || './data/memory.db',
    collection_name: 'research_memory',
    embedding_model: 'default',
    max_chunk_size: 1000,
    chunk_overlap: 100,
    ...overrides,
  }
}

// Convenience factory function
export const createMemoryManager = (config?: Partial<MemoryConfig>) => {
  return new MemoryManager(config ? createMemoryConfig(config) : undefined)
}
