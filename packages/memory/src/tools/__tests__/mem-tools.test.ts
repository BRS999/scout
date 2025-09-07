import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemSearchTool } from '../mem-search.tool'
import { MemUpsertTool } from '../mem-upsert.tool'

// Mock the memory system without hoisting issues
vi.mock('../../memory', () => ({
  getMemory: vi.fn().mockResolvedValue({
    search: vi.fn(),
    upsert: vi.fn(),
  }),
}))

describe('Memory Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MemSearchTool', () => {
    it('has correct name and description', () => {
      const tool = new MemSearchTool()
      expect(tool.name).toBe('mem.search')
      expect(tool.description).toBe(
        'Search vector memory for relevant content using semantic similarity'
      )
    })

    it('handles search successfully', async () => {
      const { getMemory } = await import('../../memory')
      const mockMemory = await getMemory()

      const mockResults = [
        {
          chunk: {
            id: '1',
            text: 'Test content',
            metadata: { source: 'test' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          similarity_score: 0.9,
        },
      ]

      vi.mocked(mockMemory.search).mockResolvedValue(mockResults)

      const tool = new MemSearchTool()
      const result = await tool._call({ search_query: 'test' })

      const parsed = JSON.parse(result)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].text).toBe('Test content')
    })

    it('handles empty search results', async () => {
      const { getMemory } = await import('../../memory')
      const mockMemory = await getMemory()

      vi.mocked(mockMemory.search).mockResolvedValue([])

      const tool = new MemSearchTool()
      const result = await tool._call({ search_query: 'nothing' })

      const parsed = JSON.parse(result)
      expect(parsed).toEqual([])
    })
  })

  describe('MemUpsertTool', () => {
    it('has correct name and description', () => {
      const tool = new MemUpsertTool()
      expect(tool.name).toBe('mem.upsert')
      expect(tool.description).toBe('Store content in vector memory for future retrieval')
    })

    it('handles upsert successfully', async () => {
      const { getMemory } = await import('../../memory')
      const mockMemory = await getMemory()

      const mockChunks = [
        {
          id: '1',
          text: 'Stored content',
          metadata: { source: 'agent' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockMemory.upsert).mockResolvedValue(mockChunks)

      const tool = new MemUpsertTool()
      const result = await tool._call({ text: 'Stored content' })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(true)
      expect(parsed.chunk_count).toBe(1)
    })

    it('handles upsert errors', async () => {
      const { getMemory } = await import('../../memory')
      const mockMemory = await getMemory()

      vi.mocked(mockMemory.upsert).mockRejectedValue(new Error('Upsert failed'))

      const tool = new MemUpsertTool()
      const result = await tool._call({ text: 'Failed content' })

      const parsed = JSON.parse(result)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toBe('Upsert failed')
    })
  })
})
