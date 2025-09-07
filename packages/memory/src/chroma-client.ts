import { ChromaClient } from 'chromadb'
import type { ChromaDBClient } from './types'

// Simple hash-based embedding function for basic text similarity
class SimpleEmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      // Simple character-based hash embedding (384 dimensions for compatibility)
      const embedding = new Array(384).fill(0)
      const chars = text.toLowerCase().split('')

      chars.forEach((char, _i) => {
        const charCode = char.charCodeAt(0)
        const index = charCode % 384
        embedding[index] += 1 / (chars.length || 1)
      })

      // Normalize
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
      return embedding.map((val) => (norm > 0 ? val / norm : 0))
    })
  }
}

export class ChromaDBClientImpl implements ChromaDBClient {
  private client: ChromaClient

  constructor(url?: string) {
    this.client = new ChromaClient({
      path: url || process.env.CHROMADB_URL || 'http://localhost:8000',
    })
  }

  async heartbeat(): Promise<boolean> {
    try {
      await this.client.heartbeat()
      return true
    } catch (error) {
      console.error('ChromaDB heartbeat failed:', error)
      return false
    }
  }

  async createCollection(
    name: string,
    metadata?: Record<string, string | number | boolean | null>
  ) {
    return await this.client.createCollection({
      name,
      metadata,
      embeddingFunction: new SimpleEmbeddingFunction(),
    })
  }

  async getCollection(name: string) {
    return await this.client.getCollection({
      name,
      embeddingFunction: new SimpleEmbeddingFunction(),
    })
  }

  async listCollections() {
    return await this.client.listCollections()
  }

  getClient(): ChromaClient {
    return this.client
  }
}
