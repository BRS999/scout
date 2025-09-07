import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChromaDBClientImpl } from '../chroma-client'
import { createMemoryConfig } from '../config'
import { MemoryManager } from '../memory-manager'
import { MemSearchTool } from '../tools/mem-search.tool'
import { MemUpsertTool } from '../tools/mem-upsert.tool'
import { ChromaVectorStore } from '../vector-store'

// Mock ChromaDB client
const mockCollection = {
  add: vi.fn(),
  query: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockChromaClient = {
  heartbeat: vi.fn().mockResolvedValue(true),
  createCollection: vi.fn().mockResolvedValue(mockCollection),
  getCollection: vi.fn().mockResolvedValue(mockCollection),
  listCollections: vi.fn().mockResolvedValue([]),
}

vi.mock('chromadb', () => ({
  ChromaClient: vi.fn().mockImplementation(() => mockChromaClient),
}))

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123'),
}))

// Simple mock for getMemory function
let mockMemoryInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  upsert: vi.fn(),
  search: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
}

vi.mock('../memory', () => ({
  getMemory: vi.fn(() => Promise.resolve(mockMemoryInstance)),
}))

describe('Memory System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock instance for each test
    mockMemoryInstance = {
      initialize: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn(),
      search: vi.fn(),
      delete: vi.fn(),
      getById: vi.fn(),
    }
  })

  describe('ChromaDBClientImpl', () => {
    it('creates client with default URL', () => {
      const client = new ChromaDBClientImpl()
      expect(client).toBeDefined()
    })

    it('performs heartbeat check', async () => {
      const client = new ChromaDBClientImpl()
      mockChromaClient.heartbeat.mockResolvedValue(true)

      const result = await client.heartbeat()

      expect(result).toBe(true)
    })
  })

  describe('ChromaVectorStore', () => {
    let store: ChromaVectorStore

    beforeEach(() => {
      const config = createMemoryConfig({ collection_name: 'test-collection' })
      store = new ChromaVectorStore(config)
    })

    it('initializes successfully', async () => {
      mockChromaClient.heartbeat.mockResolvedValue(true)
      mockChromaClient.getCollection.mockResolvedValue(mockCollection)

      await store.initialize()

      expect(mockChromaClient.heartbeat).toHaveBeenCalled()
    })

    it('upserts documents', async () => {
      mockChromaClient.heartbeat.mockResolvedValue(true)
      mockChromaClient.getCollection.mockResolvedValue(mockCollection)
      mockCollection.add.mockResolvedValue(undefined)

      await store.initialize()
      const result = await store.upsert('Test content', { source: 'test' })

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Test content')
    })
  })

  describe('MemoryManager', () => {
    let manager: MemoryManager

    beforeEach(() => {
      const config = createMemoryConfig({ collection_name: 'test-memories' })
      manager = new MemoryManager(config)
    })

    it('initializes successfully', async () => {
      mockChromaClient.heartbeat.mockResolvedValue(true)
      mockChromaClient.getCollection.mockResolvedValue(mockCollection)

      await manager.initialize()

      // No error should be thrown
    })

    it('throws error when not initialized', async () => {
      await expect(manager.upsert('test')).rejects.toThrow('MemoryManager not initialized')
      await expect(manager.search('test')).rejects.toThrow('MemoryManager not initialized')
    })
  })

  describe('Memory Tools', () => {
    describe('MemSearchTool', () => {
      it('has correct name and description', () => {
        const tool = new MemSearchTool()

        expect(tool.name).toBe('mem.search')
        expect(tool.description).toBe(
          'Search vector memory for relevant content using semantic similarity'
        )
      })

      it('searches memory successfully with search_query parameter', async () => {
        const mockSearchResults = [
          {
            chunk: {
              id: 'chunk1',
              text: 'User prefers TypeScript over JavaScript',
              metadata: { source: 'conversation' },
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
            similarity_score: 0.9,
          },
        ]

        mockMemoryInstance.search.mockResolvedValue(mockSearchResults)

        const tool = new MemSearchTool()
        const result = await tool._call({ search_query: 'TypeScript preferences' })

        const parsed = JSON.parse(result)
        expect(parsed).toHaveLength(1)
        expect(parsed[0].text).toBe('User prefers TypeScript over JavaScript')
      })

      it('handles empty search results', async () => {
        mockMemoryInstance.search.mockResolvedValue([])

        const tool = new MemSearchTool()
        const result = await tool._call({ search_query: 'nonexistent topic' })

        const parsed = JSON.parse(result)
        expect(parsed).toEqual([])
      })

      it('handles missing query parameter', async () => {
        const tool = new MemSearchTool()
        const result = await tool._call({})

        const parsed = JSON.parse(result)
        expect(parsed.error).toContain("Missing 'search_query'")
      })
    })

    describe('MemUpsertTool', () => {
      it('has correct name and description', () => {
        const tool = new MemUpsertTool()

        expect(tool.name).toBe('mem.upsert')
        expect(tool.description).toBe('Store content in vector memory for future retrieval')
      })

      it('stores content in memory', async () => {
        const mockChunks = [
          {
            id: 'chunk-123',
            text: 'Important information to remember',
            metadata: { source: 'agent' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]

        mockMemoryInstance.upsert.mockResolvedValue(mockChunks)

        const tool = new MemUpsertTool()
        const result = await tool._call({ text: 'Important information to remember' })

        const parsed = JSON.parse(result)
        expect(parsed.success).toBe(true)
        expect(parsed.chunk_count).toBe(1)
      })

      it('handles storage errors', async () => {
        mockMemoryInstance.upsert.mockRejectedValue(new Error('Storage system unavailable'))

        const tool = new MemUpsertTool()
        const result = await tool._call({ text: 'This should fail' })

        const parsed = JSON.parse(result)
        expect(parsed.success).toBe(false)
        expect(parsed.error).toBe('Storage system unavailable')
      })
    })
  })
})
