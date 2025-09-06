import { v4 as uuidv4 } from 'uuid'
import { ChromaDBClientImpl } from './chroma-client'
import type {
  ChromaCollection,
  MemoryChunk,
  MemoryConfig,
  SearchResult,
  VectorStore,
} from './types'

export class ChromaVectorStore implements VectorStore {
  private client: ChromaDBClientImpl
  private collection: ChromaCollection | null = null
  private config: MemoryConfig

  constructor(config: MemoryConfig) {
    this.config = config
    this.client = new ChromaDBClientImpl(config.chromaUrl)
  }

  private convertMetadataForChroma(
    metadata: Record<string, unknown>
  ): Record<string, string | number | boolean | null> {
    const result: Record<string, string | number | boolean | null> = {}

    for (const [key, value] of Object.entries(metadata)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        result[key] = value
      } else if (value instanceof Date) {
        result[key] = value.toISOString()
      } else {
        // Convert other types to string
        result[key] = String(value)
      }
    }

    return result
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const isConnected = await this.client.heartbeat()
      if (!isConnected) {
        throw new Error('Failed to connect to ChromaDB')
      }

      // Get or create collection
      try {
        this.collection = (await this.client.getCollection(
          this.config.collection_name
        )) as ChromaCollection
      } catch (_error) {
        // Collection doesn't exist, create it
        this.collection = (await this.client.createCollection(this.config.collection_name, {
          description: 'Scout memory collection for storing user facts and search results',
        })) as ChromaCollection
      }

      console.debug(`✅ ChromaDB collection '${this.config.collection_name}' ready`)
    } catch (error) {
      console.error('Failed to initialize ChromaDB vector store:', error)
      throw error
    }
  }

  async upsert(
    text: string,
    metadata: Record<string, unknown> = {},
    options: { session_id?: string } = {}
  ): Promise<MemoryChunk[]> {
    if (!this.collection) {
      throw new Error('Vector store not initialized')
    }

    const chunkId = uuidv4()
    const now = new Date()

    const chunk: MemoryChunk = {
      id: chunkId,
      text,
      metadata: {
        ...metadata,
        session_id: options.session_id,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      createdAt: now,
      updatedAt: now,
    }

    // Prepare data for ChromaDB
    const documents = [text]
    const metadatas = [this.convertMetadataForChroma(chunk.metadata || {})]
    const ids = [chunkId]

    // Provide dummy embeddings with the correct dimension (384 is ChromaDB's default)
    // In a real implementation, you'd use a proper embedding model
    const embeddings = [new Array(384).fill(0).map((_, _i) => Math.random())] // Dummy 384-dimensional embedding

    await this.collection!.add({
      documents,
      metadatas,
      ids,
      embeddings,
    })

    return [chunk]
  }

  async search(_query: string, options: { k?: number } = {}): Promise<SearchResult[]> {
    if (!this.collection) {
      throw new Error('Vector store not initialized')
    }

    const k = options.k || 5

    try {
      const queryEmbeddings = [new Array(384).fill(0).map(() => Math.random())]
      const results = await this.collection!.query({ queryEmbeddings, nResults: k })

      if (!results.documents?.[0]) return []

      const searchResults: SearchResult[] = []
      for (let i = 0; i < results.documents[0].length; i++) {
        const chunk: MemoryChunk = {
          id: results.ids[0][i],
          text: results.documents[0][i],
          metadata: results.metadatas?.[0]?.[i] || {},
          createdAt: new Date(
            (results.metadatas?.[0]?.[i]?.created_at as string | number) || Date.now()
          ),
          updatedAt: new Date(
            (results.metadatas?.[0]?.[i]?.updated_at as string | number) || Date.now()
          ),
        }
        searchResults.push({
          chunk,
          similarity_score: results.distances?.[0]?.[i] || 0,
        })
      }

      return searchResults.sort((a, b) => a.similarity_score - b.similarity_score)
    } catch (error) {
      // Simple fallback: return empty results for now
      console.warn('Vector search failed:', error instanceof Error ? error.message : String(error))
      return []
    }
  }

  async delete(ids: string[]): Promise<void> {
    if (!this.collection) {
      throw new Error('Vector store not initialized')
    }

    await this.collection!.delete({
      ids,
    })
  }

  async getById(id: string): Promise<MemoryChunk | null> {
    if (!this.collection) {
      throw new Error('Vector store not initialized')
    }

    try {
      const result = await this.collection!.get()

      if (result.documents && result.documents.length > 0) {
        return {
          id,
          text: result.documents[0],
          metadata: result.metadatas ? result.metadatas[0] : {},
          createdAt: new Date((result.metadatas?.[0]?.created_at as string | number) || Date.now()),
          updatedAt: new Date((result.metadatas?.[0]?.updated_at as string | number) || Date.now()),
        }
      }
    } catch (error) {
      console.error('Failed to get chunk by ID:', error)
    }

    return null
  }
}
