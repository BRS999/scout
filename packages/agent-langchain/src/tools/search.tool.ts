import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Search tool that integrates with SEAR-NX
 */
export class SearchRunTool extends StructuredTool {
  name = 'search.run'
  description = 'SEAR-NX search: returns {title,url,snippet,score}[] for web search queries'

  schema = z.object({
    // primary names
    query: z.string().describe('The search query to perform').optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(8)
      .describe('Maximum number of results to return')
      .optional(),
    // aliases used in some prompts/examples
    q: z.string().optional(),
    k: z.number().int().min(1).max(20).optional(),
  })

  async _call(args: z.infer<this['schema']>) {
    const query = args.query ?? args.q
    const limit = args.limit ?? args.k ?? 8

    const searxBase =
      process.env.SEARNX_URL ||
      process.env.SEARXNG_URL ||
      process.env.SEARXNG_BASE_URL ||
      'http://localhost:8080'

    try {
      if (!query) throw new Error("Missing 'query' (or 'q') parameter")

      // Build proper SearxNG JSON endpoint: /search?format=json&q=...
      const url = new URL('/search', searxBase.endsWith('/') ? searxBase : `${searxBase}/`)
      url.searchParams.set('format', 'json')
      url.searchParams.set('q', query)

      const response = await fetch(url.toString())
      const ct = response.headers.get('content-type') || ''

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(
          `SEAR-NX search failed: ${response.status} ${response.statusText}${ct.includes('html') ? ' (HTML response)' : ''} ${body ? `- body: ${body.substring(0, 200)}` : ''}`
        )
      }

      if (!ct.includes('application/json')) {
        const preview = await response.text().catch(() => '')
        throw new Error(`Expected JSON but got '${ct}'. Preview: ${preview.substring(0, 160)}`)
      }

      const data = await response.json()

      const raw = Array.isArray(data?.results) ? data.results : []
      const results = raw.map((result: Record<string, unknown>) => ({
        title: String(result.title || ''),
        url: String(result.url || ''),
        snippet: String(result.content || result.snippet || ''),
        score: Number(result.score || result.relevance_score || 0.5),
      }))

      const sliced = results.slice(0, typeof limit === 'number' ? limit : 8)

      return JSON.stringify(sliced)
    } catch (error) {
      console.error('[SearchRunTool] Error:', error)
      return JSON.stringify({
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: [],
      })
    }
  }
}
