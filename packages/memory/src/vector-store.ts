import { v4 as uuidv4 } from 'uuid'
import type { ContentChunk, MemoryMatch, VectorSearchOptions } from './types'

export class VectorStore {
  private client: any
  private collectionName: string
  private collection: any = null
  private chromaUrl: string
  private useMock: boolean

  constructor(chromaUrl = 'http://localhost:8000', collectionName = 'research_memory') {
    this.chromaUrl = chromaUrl
    this.collectionName = collectionName
    this.useMock = (process.env.MEMORY_VECTOR_BACKEND || '').toLowerCase() === 'mock'
  }

  // Initialize Chroma client and collection
  async initialize(): Promise<void> {
    if (this.collection) return
    if (this.useMock) {
      this.collection = { mock: true }
      return
    }

    // Dynamic import to remain compatible with CJS build
    const chroma = await import('chromadb')
    const { ChromaClient } = chroma

    this.client = new ChromaClient({ path: this.chromaUrl })

    try {
      if (this.client.heartbeat) {
        await this.client.heartbeat()
      }
    } catch (err) {
      // Heartbeat may fail if endpoint blocks it; continue and let operations surface errors
      // eslint-disable-next-line no-console
      console.warn('Chroma heartbeat failed (continuing):', err)
    }

    this.collection = await this.client.getOrCreateCollection({ name: this.collectionName })
  }

  // Search for similar chunks
  async search(options: VectorSearchOptions): Promise<MemoryMatch[]> {
    if (!this.collection) {
      await this.initialize()
    }
    if (this.useMock) {
      return this.getMockSearchResults(options.query, options.k || 5)
    }
    const k = options.k || 5
    const queryEmbedding = await this.generateEmbedding(options.query)

    const result = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
      where: options.filter || undefined,
      include: ['metadatas', 'documents', 'distances'],
    })

    const matches: MemoryMatch[] = []
    const ids = (result.ids?.[0] || []) as string[]
    const documents = (result.documents?.[0] || []) as string[]
    const metadatas = (result.metadatas?.[0] || []) as any[]
    const distances = (result.distances?.[0] || []) as number[]

    for (let i = 0; i < ids.length; i++) {
      const meta = metadatas[i] || {}
      const doc = documents[i] || ''
      const distance = typeof distances[i] === 'number' ? distances[i] : 1
      const similarity = 1 / (1 + distance)

      matches.push({
        chunk: {
          id: ids[i],
          text: doc,
          metadata: this.normalizeMetadata(meta),
          createdAt: meta.createdAt ? new Date(meta.createdAt) : new Date(),
          updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : new Date(),
        },
        similarity_score: similarity,
        rank: i + 1,
      })
    }

    return matches
  }

  // Upsert chunks with embeddings
  async upsert(chunks: ContentChunk[]): Promise<void> {
    if (!this.collection) {
      await this.initialize()
    }
    if (!chunks.length) return
    if (this.useMock) {
      return
    }

    const ids = chunks.map((c) => c.id || uuidv4())
    const documents = chunks.map((c) => c.text)
    const embeddings = await Promise.all(
      chunks.map((c) =>
        c.embedding ? Promise.resolve(c.embedding) : this.generateEmbedding(c.text)
      )
    )
    const metadatas = chunks.map((c) => this.prepareMetadata(c))

    await this.collection.add({ ids, documents, embeddings, metadatas })
  }

  async delete(chunkIds: string[]): Promise<void> {
    if (!this.collection) {
      await this.initialize()
    }
    if (!chunkIds.length) return
    if (this.useMock) return
    await this.collection.delete({ ids: chunkIds })
  }

  async getStats(): Promise<{ count: number; collection_name: string }> {
    if (!this.collection) {
      await this.initialize()
    }
    const count = this.useMock ? 0 : await this.collection.count()
    return { count, collection_name: this.collectionName }
  }

  // Local deterministic embedding to avoid external services
  private async generateEmbedding(text: string): Promise<number[]> {
    return this.createSimpleEmbedding(text)
  }

  private createSimpleEmbedding(text: string): number[] {
    const embedding = new Array(384).fill(0)
    const words = text.toLowerCase().split(/\s+/)
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j)
        const index = (charCode + i * 31 + j * 17) % embedding.length
        embedding[index] += 0.1
      }
    }
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0))
  }

  private prepareMetadata(c: ContentChunk) {
    return {
      ...(c.metadata || {}),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  private normalizeMetadata(meta: any) {
    const m = { ...(meta || {}) }
    if (m.tags && Array.isArray(m.tags)) {
      m.tags = m.tags.map((t: any) => String(t))
    }
    return m
  }

  async clear(): Promise<void> {
    if (!this.collection) {
      await this.initialize()
    }
    if (this.useMock) return
    await this.client.deleteCollection({ name: this.collectionName })
    this.collection = await this.client.getOrCreateCollection({ name: this.collectionName })
  }

  // Mock search results helper
  private getMockSearchResults(query: string, k: number): MemoryMatch[] {
    const mock: MemoryMatch[] = []
    for (let i = 0; i < Math.min(k, 3); i++) {
      mock.push({
        chunk: {
          id: uuidv4(),
          text: `Mock result ${i + 1} for "${query}"`,
          metadata: {
            source_title: 'mock',
            source_url: 'mock://',
            chunk_type: 'paragraph',
            word_count: 10,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        similarity_score: 0.9 - i * 0.1,
        rank: i + 1,
      })
    }
    return mock
  }
}
