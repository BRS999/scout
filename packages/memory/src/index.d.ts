export { MemoryManager } from './memory-manager';
export { VectorStore } from './vector-store';
export { StructuredStore } from './structured-store';
export type { ContentChunk, ChunkMetadata, ResearchSession, MemoryMatch, VectorSearchOptions, MemoryUpsertOptions, MemoryConfig, MemoryStats, } from './types';
import { MemoryManager } from './memory-manager';
import type { MemoryConfig } from './types';
export declare const createMemoryConfig: (overrides?: Partial<MemoryConfig>) => MemoryConfig;
export declare const createMemoryManager: (config?: Partial<MemoryConfig>) => MemoryManager;
//# sourceMappingURL=index.d.ts.map