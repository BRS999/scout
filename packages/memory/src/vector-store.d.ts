import type { ContentChunk, MemoryMatch, VectorSearchOptions } from './types';
export declare class VectorStore {
    private client;
    private collectionName;
    private collection;
    private chromaUrl;
    private useMock;
    constructor(chromaUrl?: string, collectionName?: string);
    initialize(): Promise<void>;
    search(options: VectorSearchOptions): Promise<MemoryMatch[]>;
    upsert(chunks: ContentChunk[]): Promise<void>;
    delete(chunkIds: string[]): Promise<void>;
    getStats(): Promise<{
        count: number;
        collection_name: string;
    }>;
    private generateEmbedding;
    private createSimpleEmbedding;
    private prepareMetadata;
    private normalizeMetadata;
    clear(): Promise<void>;
    private getMockSearchResults;
}
//# sourceMappingURL=vector-store.d.ts.map