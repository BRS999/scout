import type { ChunkMetadata, ContentChunk, MemoryStats, ResearchSession } from './types';
export declare class StructuredStore {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    /**
     * Initialize the database with required tables
     */
    initialize(): Promise<void>;
    /**
     * Create a new research session
     */
    createSession(query: string, description?: string, tags?: string[]): Promise<ResearchSession>;
    /**
     * Get research session by ID
     */
    getSession(sessionId: string): Promise<ResearchSession | null>;
    /**
     * Store source information
     */
    upsertSource(url: string, metadata: Partial<ChunkMetadata>): Promise<string>;
    /**
     * Store content chunk with metadata
     */
    storeChunk(chunk: ContentChunk, sessionId?: string): Promise<void>;
    /**
     * Link a chunk to a research session
     */
    private linkChunkToSession;
    /**
     * Get chunks for a research session
     */
    getSessionChunks(sessionId: string): Promise<ContentChunk[]>;
    /**
     * Get memory statistics
     */
    getStats(): Promise<MemoryStats>;
    /**
     * Search sessions by query or tags
     */
    searchSessions(searchTerm: string, limit?: number): Promise<ResearchSession[]>;
    /**
     * Close the database connection
     */
    close(): Promise<void>;
}
//# sourceMappingURL=structured-store.d.ts.map