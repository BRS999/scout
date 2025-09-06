import { type Tool, type ToolResult, ToolType } from '@agentic-seek/shared'

export interface ScrapingOptions {
  url: string
  query?: string
  includeImages?: boolean
  maxContentLength?: number
}

export class WebScraping implements Tool {
  id = 'web_scraping'
  name = 'Web Scraping Tool'
  description = 'Extract text content and relevant information from web pages'
  type = ToolType.WEB_SCRAPER

  private readonly userAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  async execute(input: unknown): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      if (!this.isScrapingOptions(input)) {
        throw new Error('Input must be a ScrapingOptions object with url property')
      }

      const options = input as ScrapingOptions
      const { url, query, maxContentLength = 5000 } = options

      if (!(url && this.isValidUrl(url))) {
        throw new Error('Valid URL is required')
      }

      const content = await this.scrapePage(url, query)
      const processedContent = this.processContent(content, maxContentLength, query)

      return {
        success: true,
        output: {
          url,
          content: processedContent,
          extractedAt: new Date().toISOString(),
          wordCount: processedContent.split(/\s+/).length,
        },
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown scraping error',
        executionTime,
      }
    }
  }

  validate(input: unknown): boolean {
    if (!this.isScrapingOptions(input)) {
      return false
    }

    const options = input as ScrapingOptions
    return !!(options.url && this.isValidUrl(options.url))
  }

  private isScrapingOptions(input: unknown): input is ScrapingOptions {
    return (
      typeof input === 'object' &&
      input !== null &&
      'url' in input &&
      typeof (input as { url?: unknown }).url === 'string'
    )
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return url.startsWith('http://') || url.startsWith('https://')
    } catch {
      return false
    }
  }

  private async scrapePage(url: string, query?: string): Promise<string> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        // Note: In production, you might want to add timeout and retry logic
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      return this.extractTextFromHtml(html)
    } catch (error) {
      console.error('Scraping error:', error)

      // Fallback to mock content for development
      if (process.env.NODE_ENV === 'development') {
        return this.getMockContent(url, query)
      }

      throw error
    }
  }

  private extractTextFromHtml(html: string): string {
    // Simple HTML text extraction (in production, consider using a proper HTML parser)
    const text = html
      // Remove script and style elements
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities (basic)
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()

    return text
  }

  private processContent(content: string, maxLength: number, query?: string): string {
    let processed = content

    // If query is provided, try to extract relevant sections
    if (query) {
      processed = this.extractRelevantContent(content, query)
    }

    // Limit content length
    if (processed.length > maxLength) {
      processed = `${processed.substring(0, maxLength - 3)}...`
    }

    return processed
  }

  private extractRelevantContent(content: string, query: string): string {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10)
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2)

    // Score sentences based on query relevance
    const scoredSentences = sentences.map((sentence) => {
      const sentenceLower = sentence.toLowerCase()
      let score = 0

      for (const word of queryWords) {
        if (sentenceLower.includes(word)) {
          score += 1
        }
      }

      return { sentence: sentence.trim(), score }
    })

    // Return top 5 most relevant sentences
    const relevantSentences = scoredSentences
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.sentence)

    return relevantSentences.length > 0
      ? `${relevantSentences.join('. ')}.`
      : content.substring(0, 1000) // Fallback to first part of content
  }

  private getMockContent(url: string, query?: string): string {
    const domain = new URL(url).hostname
    const topic = query || 'general information'

    return `This is mock content extracted from ${domain} about ${topic}.

    The page contains information related to your search query. In a real implementation,
    this would be the actual text content extracted from the web page using HTML parsing
    and content analysis techniques.

    Key points from the page:
    • Relevant information about ${topic}
    • Additional context and details
    • Links to related resources
    • Contact information or next steps

    This mock content helps demonstrate the web scraping functionality during development.`
  }
}
