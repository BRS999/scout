import { StructuredTool } from '@langchain/core/tools'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { z } from 'zod'

/**
 * Content parser tool using Readability and JSDOM
 */
export class ParserReadTool extends StructuredTool {
  name = 'parser.read'
  description = 'Turn raw HTML into clean article text with title/links/lang.'

  schema = z.object({
    html: z.string().describe('The raw HTML content to parse'),
    url: z.string().url().describe('The source URL of the HTML content'),
  })

  async _call({ html, url }: z.infer<this['schema']>) {
    try {
      const dom = new JSDOM(html, { url })
      const reader = new Readability(dom.window.document)
      const article = reader.parse()

      if (!article) {
        return JSON.stringify({
          error: 'Failed to parse article content',
          title: dom.window.document.title || url,
          text: dom.window.document.body?.textContent?.substring(0, 1000) || '',
          lang: dom.window.document.documentElement?.lang || 'unknown',
          links: [],
        })
      }

      // Extract links from the parsed content
      const links = [...dom.window.document.querySelectorAll('a')]
        .map((a) => a.href)
        .filter((href) => href?.startsWith('http'))
        .slice(0, 100) // Limit to 100 links

      const payload = {
        title: article.title || dom.window.document.title || url,
        text: article.textContent || '',
        lang: article.lang || dom.window.document.documentElement?.lang || 'unknown',
        links: links,
        excerpt: article.excerpt,
        byline: article.byline,
        publishedTime: article.publishedTime,
        source_url: url,
      }

      return JSON.stringify(payload)
    } catch (error) {
      console.error('[ParserReadTool] Error parsing HTML:', error)
      return JSON.stringify({
        error: `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        title: url,
        text: '',
        lang: 'unknown',
        links: [],
      })
    }
  }
}
