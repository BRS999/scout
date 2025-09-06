export interface ContentChunk {
  id: string
  text: string
  metadata: ChunkMetadata
  embedding?: number[]
  createdAt: Date
  updatedAt: Date
}

export interface ChunkMetadata {
  source_url?: string
  source_title?: string
  source_author?: string
  source_published?: string
  source_domain?: string
  chunk_index?: number
  chunk_type?: 'paragraph' | 'section' | 'article' | 'code' | 'quote'
  word_count?: number
  language?: string
  tags?: string[]
  relevance_score?: number
  session_id?: string
}

export interface ResearchSession {
  id: string
  query: string
  description?: string
  created_at: Date
  updated_at: Date
  chunk_ids: string[]
  source_urls: string[]
  tags: string[]
  status: 'active' | 'completed' | 'archived'
}

export interface MemoryMatch {
  chunk: ContentChunk
  similarity_score: number
  rank: number
}

export interface VectorSearchOptions {
  query: string
  k?: number
  threshold?: number
  filter?: Record<string, any>
  include_metadata?: boolean
}

export interface MemoryUpsertOptions {
  chunk_size?: number
  chunk_overlap?: number
  generate_embeddings?: boolean
  session_id?: string
  tags?: string[]
}

export interface MemoryConfig {
  chroma_url: string
  sqlite_path: string
  collection_name: string
  embedding_model?: string
  max_chunk_size?: number
  chunk_overlap?: number
}

export interface MemoryStats {
  total_chunks: number
  total_sessions: number
  total_sources: number
  storage_size_mb: number
  oldest_chunk: Date
  newest_chunk: Date
  vector_count?: number
}