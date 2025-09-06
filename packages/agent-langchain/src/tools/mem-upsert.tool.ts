import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { getMemory } from '../memory/memory'

/**
 * Memory upsert tool for storing content in vector DB
 */
export class MemUpsertTool extends StructuredTool {
  name = 'mem.upsert'
  description = 'Store content in vector memory for future retrieval'

  schema = z.object({
    text: z.string().describe('The text content to store in memory'),
    meta: z.record(z.any()).optional().describe('Optional metadata to associate with the content'),
    session_id: z.string().optional().describe('Optional research session id for linkage'),
  })

  async _call({ text, meta, session_id }: z.infer<this['schema']>) {
    try {
      const memory = await getMemory()
      const chunks = await memory.upsert(
        text,
        {
          ...(meta || {}),
          source_title: meta?.source_title ?? 'agent:langchain',
          source_url: meta?.source_url,
          tags: Array.isArray(meta?.tags) ? meta.tags : [],
        },
        { session_id }
      )

      const res = {
        success: true,
        stored_at: new Date().toISOString(),
        chunk_count: chunks.length,
        chunk_ids: chunks.map((c) => c.id),
      }
      return JSON.stringify(res)
    } catch (error) {
      console.error('[MemUpsertTool] Error:', error)
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Memory storage failed',
        success: false,
      })
    }
  }
}
