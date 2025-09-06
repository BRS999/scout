const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k
        let desc = Object.getOwnPropertyDescriptor(m, k)
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: () => m[k] }
        }
        Object.defineProperty(o, k2, desc)
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? (o, v) => {
        Object.defineProperty(o, 'default', { enumerable: true, value: v })
      }
    : (o, v) => {
        o.default = v
      })
const __importStar =
  (this && this.__importStar) ||
  (() => {
    let ownKeys = (o) => {
      ownKeys =
        Object.getOwnPropertyNames ||
        ((o) => {
          const ar = []
          for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k
          return ar
        })
      return ownKeys(o)
    }
    return (mod) => {
      if (mod?.__esModule) return mod
      const result = {}
      if (mod != null)
        for (let k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i])
      __setModuleDefault(result, mod)
      return result
    }
  })()
Object.defineProperty(exports, '__esModule', { value: true })
exports.VectorStore = void 0
const uuid_1 = require('uuid')
class VectorStore {
  client = null
  collectionName
  collection = null
  chromaUrl
  useMock
  constructor(chromaUrl = 'http://localhost:8000', collectionName = 'research_memory') {
    this.chromaUrl = chromaUrl
    this.collectionName = collectionName
    this.useMock = (process.env.MEMORY_VECTOR_BACKEND || '').toLowerCase() === 'mock'
  }
  // Initialize Chroma client and collection
  async initialize() {
    if (this.collection) return
    if (this.useMock) {
      this.collection = { mock: true }
      return
    }
    // Dynamic import to remain compatible with CJS build
    const chroma = await Promise.resolve().then(() => __importStar(require('chromadb')))
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
  async search(options) {
    if (!this.collection) {
      await this.initialize()
    }
    if (this.useMock) {
      return this.getMockSearchResults(options.query, options.k || 5)
    }
    if ('mock' in this.collection) {
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
    const matches = []
    const ids = result.ids?.[0] || []
    const documents = result.documents?.[0] || []
    const metadatas = result.metadatas?.[0] || []
    const distances = result.distances?.[0] || []
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
  async upsert(chunks) {
    if (!this.collection) {
      await this.initialize()
    }
    if (!chunks.length) return
    if (this.useMock || 'mock' in this.collection) {
      return
    }
    const ids = chunks.map((c) => c.id || uuid_1.v4())
    const documents = chunks.map((c) => c.text)
    const embeddings = await Promise.all(
      chunks.map((c) =>
        c.embedding ? Promise.resolve(c.embedding) : this.generateEmbedding(c.text)
      )
    )
    const metadatas = chunks.map((c) => this.prepareMetadata(c))
    await this.collection.add({
      ids,
      documents,
      embeddings,
      metadatas: metadatas,
    })
  }
  async delete(chunkIds) {
    if (!this.collection) {
      await this.initialize()
    }
    if (!chunkIds.length) return
    if (this.useMock || 'mock' in this.collection) return
    await this.collection.delete({ ids: chunkIds })
  }
  async getStats() {
    if (!this.collection) {
      await this.initialize()
    }
    const count = this.useMock || 'mock' in this.collection ? 0 : await this.collection.count()
    return { count, collection_name: this.collectionName }
  }
  // Local deterministic embedding to avoid external services
  async generateEmbedding(text) {
    return this.createSimpleEmbedding(text)
  }
  createSimpleEmbedding(text) {
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
  prepareMetadata(c) {
    return {
      ...(c.metadata || {}),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }
  normalizeMetadata(meta) {
    const m = { ...(meta || {}) }
    if (m.tags && Array.isArray(m.tags)) {
      m.tags = m.tags.map((t) => String(t))
    }
    return m
  }
  async clear() {
    if (!this.collection) {
      await this.initialize()
    }
    if (this.useMock) return
    await this.client.deleteCollection({ name: this.collectionName })
    this.collection = await this.client.getOrCreateCollection({ name: this.collectionName })
  }
  // Mock search results helper
  getMockSearchResults(query, k) {
    const mock = []
    for (let i = 0; i < Math.min(k, 3); i++) {
      mock.push({
        chunk: {
          id: uuid_1.v4(),
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
exports.VectorStore = VectorStore
//# sourceMappingURL=vector-store.js.map
