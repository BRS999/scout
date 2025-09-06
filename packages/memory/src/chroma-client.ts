import { ChromaClient } from 'chromadb'
import type { ChromaDBClient } from './types'

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
    })
  }

  async getCollection(name: string) {
    return await this.client.getCollection({
      name,
    })
  }

  async listCollections() {
    return await this.client.listCollections()
  }

  getClient(): ChromaClient {
    return this.client
  }
}
