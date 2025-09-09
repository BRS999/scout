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
    const startTime = Date.now()
    console.info(`🔧 [ParserReadTool] Parsing HTML from ${url} (${html.length} characters)`)

    try {
      const dom = new JSDOM(html, { url })
      const reader = new Readability(dom.window.document)
      const article = reader.parse()

      if (!article) {
        console.info('⚠️ [ParserReadTool] Readability failed, falling back to basic extraction')
        const fallbackText = dom.window.document.body?.textContent?.substring(0, 1000) || ''
        const endTime = Date.now()

        console.info(`✅ [ParserReadTool] Completed with fallback in ${endTime - startTime}ms`)
        return JSON.stringify({
          error: 'Failed to parse article content',
          title: dom.window.document.title || url,
          text: fallbackText,
          lang: dom.window.document.documentElement?.lang || 'unknown',
          links: [],
          executionTime: endTime - startTime,
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

      const endTime = Date.now()
      console.info(
        `✅ [ParserReadTool] Completed in ${endTime - startTime}ms - ${payload.text.length} characters, ${links.length} links extracted`
      )

      return JSON.stringify({
        ...payload,
        executionTime: endTime - startTime,
      })
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [ParserReadTool] Failed after ${endTime - startTime}ms:`, error)
      return JSON.stringify({
        error: `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        title: url,
        text: '',
        lang: 'unknown',
        links: [],
        executionTime: endTime - startTime,
      })
    }
  }
}
