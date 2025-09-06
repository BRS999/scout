Object.defineProperty(exports, '__esModule', { value: true })
exports.MemoryManager = void 0
const uuid_1 = require('uuid')
const structured_store_1 = require('./structured-store')
const vector_store_1 = require('./vector-store')
class MemoryManager {
  vectorStore
  structuredStore
  config
  initialized = false
  constructor(config = {}) {
    this.config = {
      chroma_url: config.chroma_url || process.env.CHROMADB_URL || 'http://localhost:8000',
      sqlite_path: config.sqlite_path || process.env.SQLITE_PATH || './data/memory.db',
      collection_name: config.collection_name || 'research_memory',
      embedding_model: config.embedding_model || 'default',
      max_chunk_size: config.max_chunk_size || 1000,
      chunk_overlap: config.chunk_overlap || 100,
    }
    this.vectorStore = new vector_store_1.VectorStore(
      this.config.chroma_url,
      this.config.collection_name
    )
    this.structuredStore = new structured_store_1.StructuredStore(this.config.sqlite_path)
  }
  /**
   * Initialize both storage systems
   */
  async initialize() {
    if (this.initialized) return
    try {
      await Promise.all([this.vectorStore.initialize(), this.structuredStore.initialize()])
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize MemoryManager:', error)
      throw error
    }
  }
  /**
   * Search memory for relevant content
   */
  async search(options) {
    if (!this.initialized) {
      await this.initialize()
    }
    try {
      // First search vector store for semantic similarity
      const vectorMatches = await this.vectorStore.search(options)
      // Enhance matches with structured data if needed
      for (const match of vectorMatches) {
        // Add any additional metadata from structured store if needed
        if (match.chunk.metadata.source_url) {
          // Could enhance with source reliability, access count, etc.
        }
      }
      return vectorMatches
    } catch (error) {
      console.error('Memory search error:', error)
      // Fallback to mock results in development
      if (process.env.NODE_ENV === 'development') {
        return this.getMockSearchResults(options.query, options.k || 5)
      }
      throw error
    }
  }
  /**
   * Store content with automatic chunking and embedding
   */
  async upsert(content, metadata, options = {}) {
    if (!this.initialized) {
      await this.initialize()
    }
    try {
      // Chunk the content
      const chunks = this.chunkContent(content, metadata, options)
      // Store in both vector and structured stores
      await Promise.all([
        this.vectorStore.upsert(chunks),
        ...chunks.map((chunk) => this.structuredStore.storeChunk(chunk, options.session_id)),
      ])
      return chunks
    } catch (error) {
      console.error('Memory upsert error:', error)
      throw error
    }
  }
  /**
   * Store multiple content sources at once
   */
  async upsertBulk(contentItems, options = {}) {
    const allChunks = []
    for (const item of contentItems) {
      const chunks = await this.upsert(item.content, item.metadata, options)
      allChunks.push(...chunks)
    }
    return allChunks
  }
  /**
   * Create and manage research sessions
   */
  async createSession(query, description, tags = []) {
    if (!this.initialized) {
      await this.initialize()
    }
    return await this.structuredStore.createSession(query, description, tags)
  }
  /**
   * Get research session with all related chunks
   */
  async getSession(sessionId, includeChunks = false) {
    if (!this.initialized) {
      await this.initialize()
    }
    const session = await this.structuredStore.getSession(sessionId)
    if (session && includeChunks) {
      const chunks = await this.structuredStore.getSessionChunks(sessionId)
      session.chunk_ids = chunks.map((c) => c.id)
      session.source_urls = Array.from(
        new Set(chunks.map((c) => c.metadata.source_url).filter(Boolean))
      )
    }
    return session
  }
  /**
   * Search for previous research sessions
   */
  async searchSessions(searchTerm, limit = 10) {
    if (!this.initialized) {
      await this.initialize()
    }
    return await this.structuredStore.searchSessions(searchTerm, limit)
  }
  /**
   * Get comprehensive memory statistics
   */
  async getStats() {
    if (!this.initialized) {
      await this.initialize()
    }
    const [structuredStats, vectorStats] = await Promise.all([
      this.structuredStore.getStats(),
      this.vectorStore.getStats(),
    ])
    return {
      ...structuredStats,
      vector_count: vectorStats.count,
    }
  }
  /**
   * Clear all memory data (use with caution!)
   */
  async clear() {
    if (!this.initialized) {
      await this.initialize()
    }
    await Promise.all([
      this.vectorStore.clear(),
      // Note: We don't clear structured store as it has more complex relationships
    ])
  }
  /**
   * Chunk content into smaller pieces for better retrieval
   */
  chunkContent(content, metadata, options) {
    const maxSize = options.chunk_size || this.config.max_chunk_size || 1000
    const overlap = options.chunk_overlap || this.config.chunk_overlap || 100
    const chunks = []
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    let currentChunk = ''
    let chunkIndex = 0
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim()
      if (trimmedSentence.length === 0) continue
      // If adding this sentence would exceed max size, finalize current chunk
      if (currentChunk.length + trimmedSentence.length > maxSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk, metadata, chunkIndex))
        chunkIndex++
        // Start new chunk with overlap from previous
        const words = currentChunk.split(/\s+/)
        const overlapWords = words.slice(-Math.floor(overlap / 10)) // Rough overlap
        currentChunk = `${overlapWords.join(' ')} ${trimmedSentence}`
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
      }
    }
    // Add final chunk if there's content
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk, metadata, chunkIndex))
    }
    return chunks
  }
  /**
   * Create a ContentChunk with proper metadata
   */
  createChunk(text, metadata, index) {
    const now = new Date()
    return {
      id: uuid_1.v4(),
      text: text.trim(),
      metadata: {
        ...metadata,
        chunk_index: index,
        word_count: text.split(/\s+/).length,
        chunk_type: this.inferChunkType(text),
      },
      createdAt: now,
      updatedAt: now,
    }
  }
  /**
   * Infer chunk type based on content characteristics
   */
  inferChunkType(text) {
    if (text.includes('```') || text.includes('function') || text.includes('const ')) {
      return 'code'
    }
    if (text.startsWith('>') || text.includes('"')) {
      return 'quote'
    }
    if (text.includes('#') && text.length < 200) {
      return 'section'
    }
    return 'paragraph'
  }
  /**
   * Mock search results for development
   */
  getMockSearchResults(query, k) {
    const mockChunks = []
    for (let i = 0; i < Math.min(k, 3); i++) {
      mockChunks.push({
        chunk: {
          id: uuid_1.v4(),
          text: `Mock memory result ${i + 1} for "${query}". This represents previously stored research content that would be relevant to your current query.`,
          metadata: {
            source_title: `Mock Source ${i + 1}`,
            source_url: `https://example.com/mock-${i + 1}`,
            chunk_type: 'paragraph',
            word_count: 25,
            relevance_score: 0.8 - i * 0.1,
          },
          createdAt: new Date(Date.now() - i * 86400000), // i days ago
          updatedAt: new Date(),
        },
        similarity_score: 0.85 - i * 0.1,
        rank: i + 1,
      })
    }
    return mockChunks
  }
  /**
   * Close connections and cleanup
   */
  async close() {
    if (this.initialized) {
      await this.structuredStore.close()
      this.initialized = false
    }
  }
}
exports.MemoryManager = MemoryManager
//# sourceMappingURL=memory-manager.js.map
