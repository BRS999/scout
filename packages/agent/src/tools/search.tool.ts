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
    const startTime = Date.now()
    const query = args.query ?? args.q
    const limit = args.limit ?? args.k ?? 8

    console.info(`🔧 [SearchRunTool] Starting search: "${query}" (limit: ${limit})`)

    const searxBase =
      process.env.SEARNX_URL ||
      process.env.SEARXNG_URL ||
      process.env.SEARXNG_BASE_URL ||
      'http://localhost:8080'

    try {
      if (!query) throw new Error("Missing 'query' (or 'q') parameter")

      const url = this.buildSearchUrl(searxBase, query)
      console.info(`🔍 [SearchRunTool] Fetching from: ${url.toString()}`)

      const response = await fetch(url.toString())
      this.validateResponse(response)

      const data = await response.json()

      const raw = Array.isArray(data?.results) ? data.results : []
      const results = raw.map((result: Record<string, unknown>) => ({
        title: String(result.title || ''),
        url: String(result.url || ''),
        snippet: String(result.content || result.snippet || ''),
        score: Number(result.score || result.relevance_score || 0.5),
      }))

      const sliced = results.slice(0, typeof limit === 'number' ? limit : 8)

      const endTime = Date.now()
      console.info(
        `✅ [SearchRunTool] Completed in ${endTime - startTime}ms - ${sliced.length} results found`
      )

      return JSON.stringify(sliced)
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [SearchRunTool] Failed after ${endTime - startTime}ms:`, error)
      return JSON.stringify({
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: [],
        executionTime: endTime - startTime,
      })
    }
  }

  private buildSearchUrl(searxBase: string, query: string): URL {
    const url = new URL('/search', searxBase.endsWith('/') ? searxBase : `${searxBase}/`)
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', query)
    return url
  }

  private async validateResponse(response: Response): Promise<void> {
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
  }
}
