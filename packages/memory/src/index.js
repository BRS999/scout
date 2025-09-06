Object.defineProperty(exports, '__esModule', { value: true })
exports.createMemoryManager =
  exports.createMemoryConfig =
  exports.StructuredStore =
  exports.VectorStore =
  exports.MemoryManager =
    void 0
// Core memory management
const memory_manager_1 = require('./memory-manager')
Object.defineProperty(exports, 'MemoryManager', {
  enumerable: true,
  get: () => memory_manager_1.MemoryManager,
})
const vector_store_1 = require('./vector-store')
Object.defineProperty(exports, 'VectorStore', {
  enumerable: true,
  get: () => vector_store_1.VectorStore,
})
const structured_store_1 = require('./structured-store')
Object.defineProperty(exports, 'StructuredStore', {
  enumerable: true,
  get: () => structured_store_1.StructuredStore,
})
const memory_manager_2 = require('./memory-manager')
// Default configuration factory
const createMemoryConfig = (overrides = {}) => {
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
exports.createMemoryConfig = createMemoryConfig
// Convenience factory function
const createMemoryManager = (config) => {
  return new memory_manager_2.MemoryManager(config ? exports.createMemoryConfig(config) : undefined)
}
exports.createMemoryManager = createMemoryManager
//# sourceMappingURL=index.js.map
