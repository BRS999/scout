import {
  AgentType,
  BlockType,
  type Query,
  type QueryResult,
  type Tool,
  generateId,
} from '@agentic-seek/shared'
import type { SearchResult } from '@agentic-seek/tools'

export class BrowserAgent {
  public readonly id: string
  public readonly name = 'Browser Agent'
  public readonly type = AgentType.BROWSER
  public readonly role =
    'A specialized agent for web browsing, information gathering, and autonomous navigation'
  public readonly capabilities = [
    'web-search',
    'web-scraping',
    'content-extraction',
    'link-navigation',
    'form-filling',
    'information-synthesis',
    'data-collection',
  ]
  public isActive = true

  private tools: Map<string, Tool> = new Map()
  private searchHistory: string[] = []
  private notes: string[] = []
  private currentUrl = ''
  private visitedUrls: Set<string> = new Set()

  constructor() {
    this.id = generateId()
  }

  addTool(tool: Tool): void {
    this.tools.set(tool.id, tool)
  }

  async process(query: Query): Promise<QueryResult> {
    const startTime = Date.now()

    try {
      // Reset state for new query
      this.searchHistory = []
      this.notes = []
      this.currentUrl = ''
      this.visitedUrls.clear()

      const userQuery = query.content.trim()

      // Step 1: Perform web search
      const searchResults = await this.performWebSearch(userQuery)

      if (!searchResults || searchResults.length === 0) {
        return {
          answer: `I couldn't find any search results for your query: "${userQuery}". Please try rephrasing your search.`,
          reasoning: 'No search results found',
          agentName: this.name,
          success: false,
          blocks: [],
          status: 'no-results',
          executionTime: Date.now() - startTime,
        }
      }

      // Step 2: Navigate and extract information
      const relevantResults = this.filterRelevantResults(searchResults, userQuery)
      const extractedInfo = await this.navigateAndExtract(relevantResults.slice(0, 3), userQuery)

      // Step 3: Synthesize findings
      const finalAnswer = this.synthesizeFindings(userQuery, extractedInfo)

      return {
        answer: finalAnswer,
        reasoning: `Processed ${relevantResults.length} web pages and extracted ${extractedInfo.length} pieces of information`,
        agentName: this.name,
        success: true,
        blocks: extractedInfo.map((info, _index) => {
          const i = info as { content: string; url: string }
          return {
            id: generateId(),
            type: BlockType.WEB_CONTENT,
            content: i.content,
            language: 'text',
            output: `From: ${i.url}`,
            success: true,
            executionTime: 0,
          }
        }),
        status: 'completed',
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        answer: `Sorry, I encountered an error while browsing the web: ${error instanceof Error ? error.message : 'Unknown error'}`,
        reasoning: `Error during web browsing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        agentName: this.name,
        success: false,
        blocks: [],
        status: 'error',
        executionTime: Date.now() - startTime,
      }
    }
  }

  private async performWebSearch(query: string): Promise<SearchResult[]> {
    const searchTool = this.tools.get('web_search')
    if (!searchTool) {
      throw new Error('Web search tool not available')
    }

    const searchQuery = this.optimizeSearchQuery(query)
    const result = await searchTool.execute(searchQuery)

    // Handle ToolResult structure
    if (result?.success && Array.isArray(result.output)) {
      return result.output
    }

    return []
  }

  private optimizeSearchQuery(query: string): string {
    // Remove common conversational phrases
    const cleaned = query
      .replace(/^(search for|find|look up|browse|go to)/i, '')
      .replace(/(please|can you|could you)/gi, '')
      .trim()

    // Add current year for time-sensitive queries
    const currentYear = new Date().getFullYear()
    if (
      cleaned.toLowerCase().includes('latest') ||
      cleaned.toLowerCase().includes('recent') ||
      cleaned.toLowerCase().includes('current')
    ) {
      return `${cleaned} ${currentYear}`
    }

    return cleaned
  }

  private filterRelevantResults(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase()
    const keywords = queryLower
      .split(' ')
      .filter((word) => word.length > 2)
      .slice(0, 5) // Take top 5 keywords

    return results
      .filter((result) => {
        if (!(result.title || result.snippet)) return false

        const title = (result.title || '').toLowerCase()
        const snippet = (result.snippet || '').toLowerCase()

        // Check if any keyword appears in title or snippet
        return keywords.some((keyword) => title.includes(keyword) || snippet.includes(keyword))
      })
      .slice(0, 5) // Limit to top 5 results
  }

  private async navigateAndExtract(results: SearchResult[], query: string): Promise<unknown[]> {
    const extractedInfo: unknown[] = []

    for (const result of results) {
      try {
        const url = result.link
        if (!url || this.visitedUrls.has(url)) continue

        this.visitedUrls.add(url)
        this.currentUrl = url

        // Extract content from the page
        const content = await this.extractPageContent(url, query)

        if (content && typeof content === 'string') {
          extractedInfo.push({
            url: url,
            title: result.title || 'Untitled',
            content: content,
            timestamp: new Date(),
          })
        }

        // Limit to prevent too many requests
        if (extractedInfo.length >= 3) break
      } catch (error) {
        console.warn(`Failed to extract from ${result.link}:`, error)
      }
    }

    return extractedInfo
  }

  private async extractPageContent(url: string, query: string): Promise<string> {
    const scrapingTool = this.tools.get('web_scraping')
    if (!scrapingTool) {
      return `Unable to extract content from ${url} - scraping tool not available`
    }

    try {
      const result = await scrapingTool.execute({ url, query })
      if (result?.success && result.output) {
        const output = result.output as { content?: string; text?: string }
        return output.content || output.text || ''
      }
      return ''
    } catch (error) {
      return `Failed to extract content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private synthesizeFindings(query: string, extractedInfo: unknown[]): string {
    if (extractedInfo.length === 0) {
      return `I searched the web for "${query}" but couldn't find relevant information. Try rephrasing your query or being more specific.`
    }

    let response = `## 🔍 Web Search Results for "${query}"\n\n`

    extractedInfo.forEach((info, index) => {
      const i = info as { title: string; url: string; content: string }
      response += `### ${index + 1}. ${i.title}\n`
      response += `**Source:** ${i.url}\n\n`
      response += `${this.summarizeContent(i.content, query)}\n\n`
      response += '---\n\n'
    })

    response += '## 📊 Summary\n\n'
    response += `I found ${extractedInfo.length} relevant sources and extracted key information related to your query. `

    if (extractedInfo.length === 1) {
      const firstInfo = extractedInfo[0] as { title: string }
      response += `The most relevant information came from ${firstInfo.title}.`
    } else {
      response +=
        'The information above has been synthesized from multiple sources for comprehensive coverage.'
    }

    return response
  }

  private summarizeContent(content: string, query: string): string {
    if (!content || content.length < 100) {
      return content
    }

    // Simple content summarization - extract first few sentences
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20)
    const relevantSentences = sentences
      .filter((sentence) =>
        query
          .toLowerCase()
          .split(' ')
          .some((word) => sentence.toLowerCase().includes(word) && word.length > 2)
      )
      .slice(0, 3)

    if (relevantSentences.length > 0) {
      return `${relevantSentences.join('. ')}.`
    }

    // Fallback to first few sentences
    return `${sentences.slice(0, 2).join('. ')}.`
  }
}
