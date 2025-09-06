import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { ChunkMetadata } from '@agentic-seek/memory'

export interface ParsedContent {
  title: string
  content: string
  textContent: string
  length: number
  excerpt: string
  byline?: string
  siteName?: string
  publishedTime?: string
  lang?: string
  dir?: string
  metadata: ChunkMetadata
}

export class ReadabilityParser {
  /**
   * Parse HTML content using Mozilla Readability
   */
  static async parseHtml(html: string, url: string): Promise<ParsedContent> {
    try {
      // Create JSDOM instance
      const dom = new JSDOM(html, { url })
      const document = dom.window.document

      // Run Readability
      const reader = new Readability(document)
      const article = reader.parse()

      if (!article) {
        throw new Error('Failed to parse article with Readability')
      }

      // Extract additional metadata from the document
      const metadata = this.extractMetadata(document, url)

      return {
        title: article.title || 'Untitled',
        content: article.content || '',
        textContent: article.textContent || '',
        length: article.length || 0,
        excerpt: article.excerpt || '',
        byline: article.byline || undefined,
        siteName: article.siteName || undefined,
        publishedTime: article.publishedTime || undefined,
        lang: article.lang || metadata.language || 'en',
        dir: article.dir || undefined,
        metadata: {
          source_url: url,
          source_title: article.title || 'Untitled',
          source_author: article.byline || metadata.source_author,
          source_published: article.publishedTime || metadata.source_published,
          source_domain: new URL(url).hostname,
          word_count: article.textContent?.split(/\s+/).length || 0,
          language: article.lang || metadata.language || 'en',
          chunk_type: 'article',
          ...metadata
        }
      }
    } catch (error) {
      console.error('Readability parsing error:', error)
      
      // Fallback to basic HTML parsing
      return this.fallbackParse(html, url)
    }
  }

  /**
   * Extract metadata from HTML document
   */
  private static extractMetadata(document: Document, url: string): Partial<ChunkMetadata> {
    const metadata: Partial<ChunkMetadata> = {}

    // Open Graph metadata
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    const ogAuthor = document.querySelector('meta[property="og:author"]')?.getAttribute('content')
    const ogPublished = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')
    const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')

    // Twitter Card metadata
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
    const twitterCreator = document.querySelector('meta[name="twitter:creator"]')?.getAttribute('content')

    // Standard HTML metadata
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content')
    const author = document.querySelector('meta[name="author"]')?.getAttribute('content')
    const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')
    const language = document.querySelector('html')?.getAttribute('lang') ||
                    document.querySelector('meta[http-equiv="Content-Language"]')?.getAttribute('content')

    // JSON-LD structured data
    const jsonLd = this.extractJsonLd(document)

    // Populate metadata with priority order
    metadata.source_title = ogTitle || twitterTitle || document.title || 'Untitled'
    metadata.source_author = ogAuthor || twitterCreator || author || jsonLd.author
    metadata.source_published = ogPublished || jsonLd.datePublished
    metadata.language = language || 'en'
    
    if (keywords) {
      metadata.tags = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
    }

    return metadata
  }

  /**
   * Extract JSON-LD structured data
   */
  private static extractJsonLd(document: Document): any {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '{}')
        
        // Handle both single objects and arrays
        const structured = Array.isArray(data) ? data[0] : data
        
        if (structured['@type'] === 'Article' || structured['@type'] === 'NewsArticle') {
          return {
            author: structured.author?.name || structured.author,
            datePublished: structured.datePublished,
            dateModified: structured.dateModified,
            publisher: structured.publisher?.name
          }
        }
      } catch (error) {
        // Skip invalid JSON-LD
        continue
      }
    }

    return {}
  }

  /**
   * Fallback parser when Readability fails
   */
  private static fallbackParse(html: string, url: string): ParsedContent {
    const dom = new JSDOM(html, { url })
    const document = dom.window.document

    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, nav, header, footer, aside')
    scripts.forEach(el => el.remove())

    // Get the main content area
    const contentSelectors = [
      'main',
      'article', 
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main'
    ]

    let contentElement: Element | null = null
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector)
      if (contentElement) break
    }

    // Fallback to body if no main content found
    if (!contentElement) {
      contentElement = document.body
    }

    const textContent = contentElement?.textContent?.trim() || ''
    const metadata = this.extractMetadata(document, url)

    return {
      title: document.title || metadata.source_title || 'Untitled',
      content: contentElement?.innerHTML || '',
      textContent,
      length: textContent.length,
      excerpt: textContent.substring(0, 200) + '...',
      lang: metadata.language || 'en',
      metadata: {
        source_url: url,
        source_title: document.title || 'Untitled',
        source_domain: new URL(url).hostname,
        word_count: textContent.split(/\s+/).length,
        language: metadata.language || 'en',
        chunk_type: 'article',
        ...metadata
      }
    }
  }

  /**
   * Clean and normalize text content
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines
      .trim()
  }

  /**
   * Extract key sentences from content
   */
  static extractKeySentences(content: string, maxSentences = 5): string[] {
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300)  // Filter reasonable sentence lengths

    // Simple scoring based on sentence length and position
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      score: sentence.length * (index < 3 ? 1.5 : 1) // Boost early sentences
    }))

    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .map(item => item.sentence)
  }
}

// Convenience function for direct use
export async function readabilityParser(
  html: string, 
  url?: string
): Promise<ParsedContent> {
  return ReadabilityParser.parseHtml(html, url || 'https://example.com')
}