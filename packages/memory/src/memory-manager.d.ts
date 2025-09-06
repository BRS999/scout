import type { ChunkMetadata, ContentChunk, MemoryConfig, MemoryMatch, MemoryStats, MemoryUpsertOptions, ResearchSession, VectorSearchOptions } from './types';
export declare class MemoryManager {
    private vectorStore;
    private structuredStore;
    private config;
    private initialized;
    constructor(config?: Partial<MemoryConfig>);
    /**
     * Initialize both storage systems
     */
    initialize(): Promise<void>;
    /**
     * Search memory for relevant content
     */
    search(options: VectorSearchOptions): Promise<MemoryMatch[]>;
    /**
     * Store content with automatic chunking and embedding
     */
    upsert(content: string, metadata: ChunkMetadata, options?: MemoryUpsertOptions): Promise<ContentChunk[]>;
    /**
     * Store multiple content sources at once
     */
    upsertBulk(contentItems: Array<{
        content: string;
        metadata: ChunkMetadata;
    }>, options?: MemoryUpsertOptions): Promise<ContentChunk[]>;
    /**
     * Create and manage research sessions
     */
    createSession(query: string, description?: string, tags?: string[]): Promise<ResearchSession>;
    /**
     * Get research session with all related chunks
     */
    getSession(sessionId: string, includeChunks?: boolean): Promise<ResearchSession | null>;
    /**
     * Search for previous research sessions
     */
    searchSessions(searchTerm: string, limit?: number): Promise<ResearchSession[]>;
    /**
     * Get comprehensive memory statistics
     */
    getStats(): Promise<MemoryStats>;
    /**
     * Clear all memory data (use with caution!)
     */
    clear(): Promise<void>;
    /**
     * Chunk content into smaller pieces for better retrieval
     */
    private chunkContent;
    /**
     * Create a ContentChunk with proper metadata
     */
    private createChunk;
    /**
     * Infer chunk type based on content characteristics
     */
    private inferChunkType;
    /**
     * Mock search results for development
     */
    private getMockSearchResults;
    /**
     * Close connections and cleanup
     */
    close(): Promise<void>;
}
//# sourceMappingURL=memory-manager.d.ts.map