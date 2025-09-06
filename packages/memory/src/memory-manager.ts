import type { MemoryChunk, MemoryConfig, SearchResult } from './types'
import { ChromaVectorStore } from './vector-store'

export class MemoryManager {
  private vectorStore: ChromaVectorStore
  private initialized = false

  constructor(config: MemoryConfig) {
    this.vectorStore = new ChromaVectorStore(config)
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    await this.vectorStore.initialize()
    this.initialized = true
  }

  async upsert(
    text: string,
    metadata: Record<string, unknown> = {},
    options: { session_id?: string } = {}
  ): Promise<MemoryChunk[]> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized')
    }

    return await this.vectorStore.upsert(text, metadata, options)
  }

  async search(
    query: string,
    options: { k?: number; threshold?: number } = {}
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized')
    }

    return await this.vectorStore.search(query, options)
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized')
    }

    return await this.vectorStore.delete(ids)
  }

  async getById(id: string): Promise<MemoryChunk | null> {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized')
    }

    return await this.vectorStore.getById(id)
  }
}
