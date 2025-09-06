import { type Tool, type ToolResult, ToolType } from '@agentic-seek/shared'

export interface SearchResult {
  title: string
  snippet: string
  link: string
  source?: string
}

export class WebSearch implements Tool {
  id = 'web_search'
  name = 'Web Search Tool'
  description = 'Search the web using SearxNG and return relevant results'
  type = ToolType.WEB_SCRAPER

  private searxngUrl: string
  private userAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  constructor(searxngUrl?: string) {
    this.searxngUrl = searxngUrl || process.env.SEARXNG_BASE_URL || 'http://searxng:8080'
  }

  async execute(input: unknown): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      if (typeof input !== 'string') {
        throw new Error('Input must be a search query string')
      }

      const query = input.trim()
      if (!query) {
        throw new Error('Search query cannot be empty')
      }

      const results = await this.performSearch(query)

      return {
        success: true,
        output: results,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown search error',
        executionTime,
      }
    }
  }

  validate(input: unknown): boolean {
    if (typeof input !== 'string') {
      return false
    }

    const query = input.trim()
    return query.length > 0 && query.length < 500 // Reasonable limits
  }

  private async performSearch(query: string): Promise<SearchResult[]> {
    try {
      const searchUrl = `${this.searxngUrl}/search`

      // SearxNG expects POST requests with form data
      const formData = new URLSearchParams({
        q: query,
        categories: 'general',
        language: 'auto',
        time_range: '',
        safesearch: '0',
        theme: 'simple',
        format: 'json', // Request JSON response
      })

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded',
          Pragma: 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          'User-Agent': this.userAgent,
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        throw new Error(`SearxNG request failed: ${response.status} ${response.statusText}`)
      }

      // Try to parse as JSON first, fallback to HTML
      console.log('Response headers type:', typeof response.headers)
      console.log('Response headers:', response.headers)
      const contentType = (response.headers as any).get ? (response.headers as any).get('content-type') : (response.headers as any)['content-type']
      console.log('SearxNG response content-type:', contentType)

      if (contentType && contentType.includes('application/json')) {
        console.log('Parsing as JSON')
        const jsonData = await response.json() as any
        console.log('JSON data keys:', Object.keys(jsonData))
        console.log('JSON results count:', jsonData.results ? jsonData.results.length : 'no results')
        return this.parseSearchResultsJson(jsonData)
      } else {
        console.log('Parsing as HTML')
        const htmlContent = await response.text()
        return this.parseSearchResultsHtml(htmlContent)
      }
    } catch (error) {
      console.error('Web search error:', error)

      // Check if it's a network/connection error
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error(
          'SearxNG search failed. Did you run start_services.sh? Is Docker still running?'
        )
      }

      // Fallback to a simple mock response for development
      if (process.env.NODE_ENV === 'development') {
        return this.getMockResults(query)
      }

      throw error
    }
  }

  private parseSearchResultsJson(jsonData: any): SearchResult[] {
    const results: SearchResult[] = []

    if (!jsonData.results || !Array.isArray(jsonData.results)) {
      return results
    }

    for (const item of jsonData.results.slice(0, 10)) {
      if (item.url && item.title) {
        results.push({
          link: item.url,
          title: item.title,
          snippet: item.content || '',
          source: item.engine || 'unknown',
        })
      }
    }

    return results
  }

  private parseSearchResultsHtml(htmlContent: string): SearchResult[] {
    const results: SearchResult[] = []
    const articleRegex = /<article[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)<\/article>/gs

    let match: RegExpExecArray | null
    while (results.length < 10) {
      match = articleRegex.exec(htmlContent)
      if (match === null) break
      const result = this.extractResultFromArticle(match[1])
      if (result) {
        results.push(result)
      }
    }

    if (results.length === 0 && htmlContent.includes('No search results')) {
      throw new Error('No search results found')
    }

    return results
  }

  private extractResultFromArticle(articleHtml: string): SearchResult | null {
    const title = this.extractTitle(articleHtml)
    const url = this.extractUrl(articleHtml)
    const snippet = this.extractSnippet(articleHtml)

    if (!(title && url)) return null

    return {
      title,
      snippet,
      link: url,
      source: 'searxng',
    }
  }

  private extractTitle(articleHtml: string): string {
    const titleMatch = articleHtml.match(/<h3[^>]*>(.*?)<\/h3>/s)
    return titleMatch ? this.stripHtmlTags(titleMatch[1]).trim() : 'No Title'
  }

  private extractUrl(articleHtml: string): string {
    const urlMatch = articleHtml.match(/href="([^"]+)"/)
    return urlMatch ? urlMatch[1] : ''
  }

  private extractSnippet(articleHtml: string): string {
    const snippetMatch = articleHtml.match(/<p[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/p>/s)
    return snippetMatch ? this.stripHtmlTags(snippetMatch[1]).trim() : 'No description available'
  }

  private stripHtmlTags(html: string): string {
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  private async validateLink(link: string): Promise<string> {
    // Check if a link is valid and accessible
    if (!link.startsWith('http')) {
      return 'Status: Invalid URL'
    }

    try {
      const response = await fetch(link, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        // Set a timeout for the request
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        const content = await response.text()
        const lowerContent = content.toLowerCase()

        // Check for paywall keywords
        const paywallKeywords = [
          'member-only',
          'access denied',
          'restricted content',
          '404',
          'this page is not working',
        ]

        if (paywallKeywords.some((keyword) => lowerContent.includes(keyword))) {
          return 'Status: Possible Paywall'
        }

        return 'Status: OK'
      }
      if (response.status === 404) {
        return 'Status: 404 Not Found'
      }
      if (response.status === 403) {
        return 'Status: 403 Forbidden'
      }
      return `Status: ${response.status} ${response.statusText}`
    } catch (error) {
      if (error instanceof Error) {
        return `Error: ${error.message}`
      }
      return 'Error: Unknown error'
    }
  }

  private getMockResults(query: string): SearchResult[] {
    // Mock results for development when SearxNG is not available
    return [
      {
        title: `${query} - Example Result 1`,
        snippet: `This is a mock search result for "${query}". In a real implementation, this would contain actual web content.`,
        link: `https://example.com/search/${encodeURIComponent(query)}`,
        source: 'mock',
      },
      {
        title: `Another ${query} Resource`,
        snippet: `Additional information about ${query} from web sources. This demonstrates how search results are structured.`,
        link: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`,
        source: 'mock',
      },
      {
        title: `${query} Documentation`,
        snippet: `Comprehensive guide and documentation for ${query}. Learn more about this topic.`,
        link: `https://docs.example.com/${query}`,
        source: 'mock',
      },
    ]
  }
}

// Convenience function for direct use
export async function webSearch(
  query: string, 
  options: { num_results?: number; searxng_url?: string } = {}
): Promise<SearchResult[]> {
  const searcher = new WebSearch(options.searxng_url)
  const result = await searcher.execute(query)
  
  if (!result.success) {
    throw new Error(result.error || 'Web search failed')
  }
  
  const results = result.output as SearchResult[]
  return options.num_results ? results.slice(0, options.num_results) : results
}
