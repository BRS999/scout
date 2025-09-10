import { createTool } from '@mastra/core'
import { z } from 'zod'

const searxSearchSchema = z.object({
  query: z.string().describe('The search query to execute'),
  categories: z
    .string()
    .default('general')
    .describe(
      'Optional categories to search in (e.g., "general", "news", "images", "videos"). Default is "general"'
    ),
  language: z
    .string()
    .default('auto')
    .describe('Optional language code (e.g., "en", "es", "fr"). Default is "auto"'),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(10)
    .describe('Maximum number of results to return (1-20). Default is 10'),
})

export const searxSearchTool = createTool({
  id: 'searx-search',
  description:
    'Search the web using Searx and return results in JSON format. Useful for finding current information, news, and web content.',
  inputSchema: searxSearchSchema,
  execute: async (context) => {
    const { query, categories = 'general', language = 'auto', limit = 10 } = context.context

    console.info('🔍 Searx tool called with params:', {
      query,
      categories,
      language,
      limit,
    })

    try {
      // Get Searx URL from environment or use default
      const searxUrl = process.env.SEARXNG_BASE_URL || 'http://localhost:8080'

      // Build the search URL with JSON format
      const searchParams = new URLSearchParams({
        q: query,
        categories: categories,
        language: language,
        format: 'json',
        engines: 'duckduckgo,google,bing', // Default engines
      })

      const searchUrl = `${searxUrl}/search?${searchParams.toString()}`

      console.info(`[SearxSearch] Searching for: "${query}" in categories: ${categories}`)

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Scout-Agent/1.0',
        },
      })

      if (!response.ok) {
        throw new Error(`Searx search failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Process and format the results
      const results = data.results?.slice(0, limit) || []

      const formattedResults = results.map(
        (result: {
          title?: string
          url?: string
          content?: string
          excerpt?: string
          engine?: string
          score?: number
        }) => ({
          title: result.title || 'No title',
          url: result.url || '',
          content: result.content || result.excerpt || '',
          engine: result.engine || 'unknown',
          score: result.score || 0,
        })
      )

      console.info('🔍 Searx tool returning results:', {
        success: true,
        query,
        totalResults: data.number_of_results || formattedResults.length,
        resultsCount: formattedResults.length,
        searchUrl,
      })

      return {
        success: true,
        query,
        totalResults: data.number_of_results || formattedResults.length,
        results: formattedResults,
        searchUrl,
      }
    } catch (error) {
      console.error('[SearxSearch] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        query,
        results: [],
      }
    }
  },
})
