// Main exports
export { MemoryManager } from './memory-manager'
export { ChromaVectorStore } from './vector-store'
export { ChromaDBClientImpl } from './chroma-client'
export { createMemoryConfig } from './config'
export { getMemory } from './memory'

// Types
export type {
  MemoryChunk,
  SearchResult,
  MemoryConfig,
  ChromaDBClient,
  VectorStore,
} from './types'

// Tools
export { MemSearchTool } from './tools/mem-search.tool'
export { MemUpsertTool } from './tools/mem-upsert.tool'
