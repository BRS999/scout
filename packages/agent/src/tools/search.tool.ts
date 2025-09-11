import { createTool } from '@mastra/core'
import { z } from 'zod'

interface SearxSearchResult {
  title: string
  url: string
  content: string
  engine: string
}

interface SearxSearchResponse {
  results: SearxSearchResult[]
  number_of_results?: number
}

export const searxSearchTool = createTool({
  id: 'Get Web Search Results',
  inputSchema: z.object({
    query: z.string().describe('The search query to execute'),
    limit: z.number().min(1).max(20).default(10).describe('Maximum number of results to return'),
  }),
  description: 'Search the web using Searx and return results',
  execute: async ({ context }) => {
    const { query, limit = 10 } = context

    try {
      // Use Searx search API
      const searxUrl = process.env.SEARXNG_BASE_URL || 'http://localhost:8080'
      const searchUrl = `${searxUrl}/search?q=${encodeURIComponent(query)}&format=json&engines=duckduckgo,google,bing`

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Scout-Agent/1.0',
        },
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as SearxSearchResponse

      // Process and format results
      const results = (data.results || []).slice(0, limit).map((result: SearxSearchResult) => ({
        title: result.title || 'No title',
        url: result.url || '',
        content: result.content || '',
        engine: result.engine || 'unknown',
      }))

      return {
        success: true,
        query,
        totalResults: data.number_of_results || results.length,
        results,
      }
    } catch (error) {
      console.error('[SearxSearch] Error:', error)
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : 'Search failed',
        results: [],
      }
    }
  },
})
