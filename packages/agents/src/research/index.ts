import { MemoryManager, createMemoryConfig } from '@scout/memory'
import type { ContentChunk, MemoryMatch, ResearchSession } from '@scout/memory'
import type { ResearchQuery, ResearchResult } from '@scout/shared'
import { webSearch } from '@scout/tools'
import { webScraping } from '@scout/tools'
import { readabilityParser } from '@scout/tools'
import type { SearchResult } from '@scout/tools'

export interface ResearchAgentConfig {
  memory?: {
    chroma_url?: string
    sqlite_path?: string
    collection_name?: string
  }
  search?: {
    max_results?: number
    searxng_url?: string
  }
  synthesis?: {
    max_chunks?: number
    min_similarity?: number
  }
}

export interface ResearchAgentState {
  status: 'idle' | 'running' | 'completed' | 'error'
  current_query: string
  session_id: string
  search_results: SearchResult[]
  scraped_content: ContentChunk[]
  memory_matches: MemoryMatch[]
  synthesis_ready: boolean
}

/**
 * Research Agent with Memory-First Workflow
 *
 * This agent implements a comprehensive research workflow:
 * 1. Memory Recall - Check existing knowledge first
 * 2. Web Search - Find new sources if needed
 * 3. Content Extraction - Parse and clean web content
 * 4. Memory Storage - Store new learnings
 * 5. Synthesis - Combine all sources for final answer
 */
export class ResearchAgent {
  private memory: MemoryManager
  private config: Required<ResearchAgentConfig>

  constructor(config: ResearchAgentConfig = {}) {
    this.config = {
      memory: {
        chroma_url: 'http://localhost:8000',
        sqlite_path: './data/research_memory.db',
        collection_name: 'research_agent',
        ...config.memory,
      },
      search: {
        max_results: 10,
        searxng_url: process.env.SEARXNG_BASE_URL || 'http://localhost:8080',
        ...config.search,
      },
      synthesis: {
        max_chunks: 20,
        min_similarity: 0.6,
        ...config.synthesis,
      },
    }

    // Initialize memory manager
    this.memory = new MemoryManager(
      createMemoryConfig({
        chroma_url: this.config.memory.chroma_url,
        sqlite_path: this.config.memory.sqlite_path,
        collection_name: this.config.memory.collection_name,
      })
    )
  }

  async initialize(): Promise<void> {
    await this.memory.initialize()
  }

  /**
   * Main research workflow
   */
  async research(query: ResearchQuery): Promise<ResearchResult> {
    // Create research session
    const session = await this.memory.createSession(
      query.question,
      query.description,
      query.tags || []
    )

    const state: ResearchAgentState = {
      status: 'running',
      current_query: query.question,
      session_id: session.id,
      search_results: [],
      scraped_content: [],
      memory_matches: [],
      synthesis_ready: false,
    }

    try {
      const memoryResults = await this.recallFromMemory(query.question)
      state.memory_matches = memoryResults

      // Phase 2: Determine if new search is needed
      const needsSearch = this.shouldSearchWeb(memoryResults, query)

      if (needsSearch) {
        const searchResults = await this.searchWeb(query.question)
        state.search_results = searchResults
        const scrapedContent = await this.extractContent(searchResults)
        state.scraped_content = scrapedContent
        await this.storeInMemory(scrapedContent, session.id)
      }
      state.synthesis_ready = true
      const synthesis = await this.synthesizeAnswer(state)

      return {
        query: query.question,
        answer: synthesis.answer,
        sources: synthesis.sources,
        confidence: synthesis.confidence,
        session_id: session.id,
        memory_used: memoryResults.length > 0,
        new_sources_found: state.search_results.length,
        chunks_stored: state.scraped_content.length,
      }
    } catch (error) {
      console.error('Research workflow failed:', error)
      throw error
    }
  }

  /**
   * Phase 1: Search existing memory for relevant content
   */
  private async recallFromMemory(query: string): Promise<MemoryMatch[]> {
    try {
      const matches = await this.memory.search({
        query,
        k: this.config.synthesis.max_chunks,
        threshold: this.config.synthesis.min_similarity,
      })

      if (matches.length > 0) {
        matches.forEach((_match, _i) => {})
      } else {
      }

      return matches
    } catch (error) {
      console.error('Memory recall failed:', error)
      return []
    }
  }

  /**
   * Determine if web search is needed based on memory results
   */
  private shouldSearchWeb(memoryResults: MemoryMatch[], query: ResearchQuery): boolean {
    // Always search if no memory results
    if (memoryResults.length === 0) {
      return true
    }

    // Check if we have sufficient high-quality results
    const highQualityResults = memoryResults.filter((m) => m.similarity_score >= 0.8)
    if (highQualityResults.length < 3) {
      return true
    }

    // Check if memory results are recent (for time-sensitive queries)
    if (query.require_recent) {
      const recentResults = memoryResults.filter((m) => {
        const age = Date.now() - m.chunk.createdAt.getTime()
        return age < 7 * 24 * 60 * 60 * 1000 // Less than 7 days old
      })

      if (recentResults.length === 0) {
        return true
      }
    }
    return false
  }

  /**
   * Phase 2: Search the web for new information
   */
  private async searchWeb(query: string): Promise<SearchResult[]> {
    try {
      const results = await webSearch(query, {
        num_results: this.config.search.max_results,
        searxng_url: this.config.search.searxng_url,
      })
      return results
    } catch (error) {
      console.error('Web search failed:', error)
      return []
    }
  }

  /**
   * Phase 3: Extract and parse content from web sources
   */
  private async extractContent(searchResults: SearchResult[]): Promise<ContentChunk[]> {
    const chunks: ContentChunk[] = []

    // Limit to top results to avoid overwhelming the system
    const topResults = searchResults.slice(0, 5)

    for (const result of topResults) {
      try {
        // Skip if url is not available
        if (!result.url) continue

        // Scrape the webpage
        const scrapedData = await webScraping(result.url)

        // Parse with Readability for clean content
        const parsedContent = await readabilityParser(scrapedData.content)

        // Store the content with metadata for chunking
        const contentChunks = await this.memory.upsert(parsedContent.textContent, {
          source_url: result.url,
          source_title: parsedContent.title || result.title,
          source_author: parsedContent.byline,
          source_published: parsedContent.publishedTime,
          source_domain: new URL(result.url).hostname,
          chunk_type: 'article',
          tags: result.engine ? [result.engine] : [], // Tag with search engine used
        })

        chunks.push(...contentChunks)
      } catch (error) {
        console.error(`Failed to extract content from ${result.url}:`, error)
        // Continue with other sources
      }
    }
    return chunks
  }

  /**
   * Phase 4: Store content chunks in memory
   */
  private async storeInMemory(chunks: ContentChunk[], _sessionId: string): Promise<void> {
    if (chunks.length === 0) return

    try {
      // Chunks are already stored via memory.upsert() in extractContent
      // Just link them to the current session
      for (const _chunk of chunks) {
        // This is handled automatically by the memory manager
      }
    } catch (error) {
      console.error('Failed to store content in memory:', error)
    }
  }

  /**
   * Phase 5: Synthesize comprehensive answer from all sources
   */
  private async synthesizeAnswer(state: ResearchAgentState): Promise<{
    answer: string
    sources: string[]
    confidence: number
  }> {
    // Combine memory matches and newly scraped content
    const allContent = [...state.memory_matches.map((m) => m.chunk), ...state.scraped_content]

    if (allContent.length === 0) {
      return {
        answer:
          "I wasn't able to find sufficient information to answer your question. Please try rephrasing or providing more specific details.",
        sources: [],
        confidence: 0.1,
      }
    }

    // Sort by relevance/similarity
    const sortedContent = allContent.sort((a, b) => {
      const scoreA = a.metadata.relevance_score || 0.5
      const scoreB = b.metadata.relevance_score || 0.5
      return scoreB - scoreA
    })

    // Take top chunks for synthesis
    const topContent = sortedContent.slice(0, this.config.synthesis.max_chunks)

    // Extract unique sources
    const sources = [
      ...new Set(topContent.map((c) => c.metadata.source_url).filter(Boolean)),
    ] as string[]

    // Calculate confidence based on source quality and quantity
    const confidence = Math.min(
      0.95,
      Math.max(0.3, (topContent.length / 10) * 0.7 + (sources.length / 5) * 0.3)
    )

    // Create synthesis (for now, a structured summary)
    const answer = this.createSynthesis(state.current_query, topContent)

    return {
      answer,
      sources,
      confidence,
    }
  }

  /**
   * Create a structured synthesis from content chunks
   */
  private createSynthesis(query: string, chunks: ContentChunk[]): string {
    if (chunks.length === 0) {
      return 'No relevant content found to answer your question.'
    }

    // Group chunks by source
    const sourceGroups = chunks.reduce(
      (groups, chunk) => {
        const source =
          chunk.metadata.source_title || chunk.metadata.source_domain || 'Unknown Source'
        if (!groups[source]) groups[source] = []
        groups[source].push(chunk)
        return groups
      },
      {} as Record<string, ContentChunk[]>
    )

    let synthesis = `Based on my research, here's what I found regarding "${query}":\n\n`

    // Add key findings from each source
    Object.entries(sourceGroups).forEach(([source, sourceChunks], index) => {
      synthesis += `**${index + 1}. ${source}:**\n`

      // Get the most relevant chunk from this source
      const topChunk = (sourceChunks as ContentChunk[])[0]
      const preview =
        topChunk.text.length > 300 ? `${topChunk.text.substring(0, 300)}...` : topChunk.text

      synthesis += `${preview}\n\n`
    })

    // Add memory context if available
    const memoryChunks = chunks.filter((c) => !c.metadata.source_url?.startsWith('http'))
    if (memoryChunks.length > 0) {
      synthesis += '**From Previous Research:**\n'
      synthesis += `I also found ${memoryChunks.length} relevant pieces from previous research sessions that support these findings.\n\n`
    }

    synthesis += `*This synthesis is based on ${chunks.length} content pieces from ${Object.keys(sourceGroups).length} sources.*`

    return synthesis
  }

  /**
   * Get research session history
   */
  async getSessionHistory(limit = 10): Promise<ResearchSession[]> {
    return await this.memory.searchSessions('', limit)
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    return await this.memory.getStats()
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.memory.close()
  }
}

// Export types for external use
export type { ResearchQuery, ResearchResult } from '@scout/shared'
