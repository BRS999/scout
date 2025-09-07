import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { getMemory } from '../memory'

/**
 * Memory search tool for vector DB operations
 */
export class MemSearchTool extends StructuredTool {
  name = 'mem.search'
  description = 'Search vector memory for relevant content using semantic similarity'

  schema = z.object({
    // canonical
    search_query: z.string().optional(),
    max_results: z.number().int().min(1).max(20).default(5).optional(),
    threshold: z.number().min(0).max(1).default(0.5).optional(),
    // aliases
    query: z.string().optional(),
    k: z.number().int().min(1).max(20).optional(),
  })

  async _call(args: Record<string, unknown>) {
    const search_query = (args.search_query ?? args.query) as string
    const max_results = (args.max_results ?? args.k ?? 5) as number

    try {
      if (!search_query) {
        throw new Error("Missing 'search_query' (or 'query') parameter")
      }

      const memory = await getMemory()
      const matches = await memory.search(search_query, { k: max_results })

      const payload = matches.map((m) => ({
        id: m.chunk.id,
        text: m.chunk.text,
        similarity_score: m.similarity_score,
        metadata: m.chunk.metadata,
        created_at: m.chunk.createdAt.toISOString(),
        updated_at: m.chunk.updatedAt.toISOString(),
      }))

      return JSON.stringify(payload)
    } catch (error) {
      console.error('[MemSearchTool] Error:', error)
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Memory search failed',
        results: [],
      })
    }
  }
}
