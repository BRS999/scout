import { MemoryManager, createMemoryConfig } from '@agentic-seek/memory'
import { webSearch } from '@agentic-seek/tools'
import { webScraping } from '@agentic-seek/tools'
import { readabilityParser } from '@agentic-seek/tools'
import type { 
  ResearchQuery, 
  ResearchResult,
  ContentChunk,
  MemoryMatch 
} from '@agentic-seek/shared'

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
  search_results: any[]
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
        ...config.memory
      },
      search: {
        max_results: 10,
        searxng_url: process.env.SEARXNG_BASE_URL || 'http://localhost:8080',
        ...config.search
      },
      synthesis: {
        max_chunks: 20,
        min_similarity: 0.6,
        ...config.synthesis
      }
    }

    // Initialize memory manager
    this.memory = new MemoryManager(createMemoryConfig({
      chroma_url: this.config.memory.chroma_url,
      sqlite_path: this.config.memory.sqlite_path,
      collection_name: this.config.memory.collection_name
    }))
  }

  async initialize(): Promise<void> {
    await this.memory.initialize()
    console.log('ResearchAgent initialized with memory system')
  }

  /**
   * Main research workflow
   */
  async research(query: ResearchQuery): Promise<ResearchResult> {
    console.log(`Starting research for: "${query.question}"`)

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
      synthesis_ready: false
    }

    try {
      // Phase 1: Memory Recall
      console.log('Phase 1: Checking existing memory...')
      const memoryResults = await this.recallFromMemory(query.question)
      state.memory_matches = memoryResults
      
      // Phase 2: Determine if new search is needed
      const needsSearch = this.shouldSearchWeb(memoryResults, query)
      
      if (needsSearch) {
        console.log('Phase 2: Searching web for new information...')
        const searchResults = await this.searchWeb(query.question)
        state.search_results = searchResults

        // Phase 3: Extract content from promising sources
        console.log('Phase 3: Extracting content from sources...')
        const scrapedContent = await this.extractContent(searchResults)
        state.scraped_content = scrapedContent

        // Phase 4: Store new learnings in memory
        console.log('Phase 4: Storing new content in memory...')
        await this.storeInMemory(scrapedContent, session.id)
      }

      // Phase 5: Synthesize final answer
      console.log('Phase 5: Synthesizing comprehensive answer...')
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
        chunks_stored: state.scraped_content.length
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
        threshold: this.config.synthesis.min_similarity
      })

      if (matches.length > 0) {
        console.log(`Found ${matches.length} relevant memories for query`)
        matches.forEach((match, i) => {
          console.log(`  ${i + 1}. ${match.chunk.metadata.source_title || 'Untitled'} (${Math.round(match.similarity_score * 100)}%)`)
        })
      } else {
        console.log('No existing memories found for this query')
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
      console.log('No memory results - web search needed')
      return true
    }

    // Check if we have sufficient high-quality results
    const highQualityResults = memoryResults.filter(m => m.similarity_score >= 0.8)
    if (highQualityResults.length < 3) {
      console.log(`Only ${highQualityResults.length} high-quality memory results - searching for more`)
      return true
    }

    // Check if memory results are recent (for time-sensitive queries)
    if (query.require_recent) {
      const recentResults = memoryResults.filter(m => {
        const age = Date.now() - m.chunk.createdAt.getTime()
        return age < 7 * 24 * 60 * 60 * 1000 // Less than 7 days old
      })
      
      if (recentResults.length === 0) {
        console.log('No recent memory results for time-sensitive query - web search needed')
        return true
      }
    }

    console.log('Sufficient memory results found - skipping web search')
    return false
  }

  /**
   * Phase 2: Search the web for new information
   */
  private async searchWeb(query: string): Promise<any[]> {
    try {
      const results = await webSearch(query, {
        num_results: this.config.search.max_results,
        searxng_url: this.config.search.searxng_url
      })

      console.log(`Web search returned ${results.length} results`)
      return results
    } catch (error) {
      console.error('Web search failed:', error)
      return []
    }
  }

  /**
   * Phase 3: Extract and parse content from web sources
   */
  private async extractContent(searchResults: any[]): Promise<ContentChunk[]> {
    const chunks: ContentChunk[] = []
    
    // Limit to top results to avoid overwhelming the system
    const topResults = searchResults.slice(0, 5)
    
    for (const result of topResults) {
      try {
        console.log(`Extracting content from: ${result.url}`)
        
        // Scrape the webpage
        const scrapedData = await webScraping(result.url)
        
        // Parse with Readability for clean content
        const parsedContent = await readabilityParser(scrapedData.content)
        
        // Store the content with metadata for chunking
        const contentChunks = await this.memory.upsert(
          parsedContent.textContent,
          {
            source_url: result.url,
            source_title: parsedContent.title || result.title,
            source_author: parsedContent.byline,
            source_published: parsedContent.publishedTime,
            source_domain: new URL(result.url).hostname,
            chunk_type: 'article',
            tags: [result.engine] // Tag with search engine used
          }
        )
        
        chunks.push(...contentChunks)
        
      } catch (error) {
        console.error(`Failed to extract content from ${result.url}:`, error)
        // Continue with other sources
      }
    }
    
    console.log(`Extracted ${chunks.length} content chunks from ${topResults.length} sources`)
    return chunks
  }

  /**
   * Phase 4: Store content chunks in memory
   */
  private async storeInMemory(chunks: ContentChunk[], sessionId: string): Promise<void> {
    if (chunks.length === 0) return
    
    try {
      // Chunks are already stored via memory.upsert() in extractContent
      // Just link them to the current session
      for (const chunk of chunks) {
        // This is handled automatically by the memory manager
      }
      
      console.log(`Stored ${chunks.length} chunks in memory for session ${sessionId}`)
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
    const allContent = [
      ...state.memory_matches.map(m => m.chunk),
      ...state.scraped_content
    ]
    
    if (allContent.length === 0) {
      return {
        answer: "I wasn't able to find sufficient information to answer your question. Please try rephrasing or providing more specific details.",
        sources: [],
        confidence: 0.1
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
    const sources = [...new Set(
      topContent
        .map(c => c.metadata.source_url)
        .filter(Boolean)
    )] as string[]
    
    // Calculate confidence based on source quality and quantity
    const confidence = Math.min(0.95, Math.max(0.3, 
      (topContent.length / 10) * 0.7 + 
      (sources.length / 5) * 0.3
    ))
    
    // Create synthesis (for now, a structured summary)
    const answer = this.createSynthesis(state.current_query, topContent)
    
    return {
      answer,
      sources,
      confidence
    }
  }

  /**
   * Create a structured synthesis from content chunks
   */
  private createSynthesis(query: string, chunks: ContentChunk[]): string {
    if (chunks.length === 0) {
      return "No relevant content found to answer your question."
    }
    
    // Group chunks by source
    const sourceGroups = chunks.reduce((groups, chunk) => {
      const source = chunk.metadata.source_title || chunk.metadata.source_domain || 'Unknown Source'
      if (!groups[source]) groups[source] = []
      groups[source].push(chunk)
      return groups
    }, {} as Record<string, ContentChunk[]>)
    
    let synthesis = `Based on my research, here's what I found regarding "${query}":\n\n`
    
    // Add key findings from each source
    Object.entries(sourceGroups).forEach(([source, sourceChunks], index) => {
      synthesis += `**${index + 1}. ${source}:**\n`
      
      // Get the most relevant chunk from this source
      const topChunk = sourceChunks[0]
      const preview = topChunk.text.length > 300 
        ? topChunk.text.substring(0, 300) + '...'
        : topChunk.text
        
      synthesis += `${preview}\n\n`
    })
    
    // Add memory context if available
    const memoryChunks = chunks.filter(c => !c.metadata.source_url?.startsWith('http'))
    if (memoryChunks.length > 0) {
      synthesis += `**From Previous Research:**\n`
      synthesis += `I also found ${memoryChunks.length} relevant pieces from previous research sessions that support these findings.\n\n`
    }
    
    synthesis += `*This synthesis is based on ${chunks.length} content pieces from ${Object.keys(sourceGroups).length} sources.*`
    
    return synthesis
  }

  /**
   * Get research session history
   */
  async getSessionHistory(limit: number = 10): Promise<any[]> {
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
    console.log('ResearchAgent cleaned up')
  }
}

// Export types for external use
export type { ResearchQuery, ResearchResult } from '@agentic-seek/shared'