export interface MemoryChunk {
  id: string
  text: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface SearchResult {
  chunk: MemoryChunk
  similarity_score: number
}

export interface MemoryConfig {
  collection_name: string
  chromaUrl?: string
  embeddingFunction?: unknown
}

export interface ChromaDBClient {
  heartbeat(): Promise<boolean>
  createCollection(
    name: string,
    metadata?: Record<string, string | number | boolean | null>
  ): Promise<unknown>
  getCollection(name: string): Promise<unknown>
  listCollections(): Promise<unknown[]>
}

type ChromaMetadata = Record<string, string | number | boolean | null>

export interface ChromaCollection {
  add(params: {
    documents: string[]
    metadatas?: ChromaMetadata[]
    ids: string[]
    embeddings?: number[][]
  }): Promise<void>
  query(params: {
    queryEmbeddings?: number[][]
    nResults: number
  }): Promise<{
    documents: string[][]
    metadatas: ChromaMetadata[][]
    ids: string[][]
    distances?: number[][]
  }>
  get(): Promise<{
    documents: string[]
    metadatas: ChromaMetadata[]
    ids: string[]
  }>
  delete(params: { ids: string[] }): Promise<void>
}

export interface VectorStore {
  initialize(): Promise<void>
  upsert(
    text: string,
    metadata?: Record<string, unknown>,
    options?: { session_id?: string }
  ): Promise<MemoryChunk[]>
  search(query: string, options?: { k?: number }): Promise<SearchResult[]>
  delete(ids: string[]): Promise<void>
  getById(id: string): Promise<MemoryChunk | null>
}
