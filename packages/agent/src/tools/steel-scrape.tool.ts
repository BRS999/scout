import { createTool } from '@mastra/core'
import { z } from 'zod'

const steelScrapeSchema = z.object({
  url: z.string().url().describe('The URL of the webpage to scrape'),
  format: z
    .array(z.enum(['html', 'readability', 'cleaned_html', 'markdown']))
    .default(['markdown'])
    .describe('Output formats: html (raw), readability (clean content), cleaned_html (sanitized), markdown (clean markdown)'),
})

export const steelScrapeTool = createTool({
  id: 'steel-scrape',
  description:
    'Scrape a webpage using Steel browser. Returns content in the requested format.',
  inputSchema: steelScrapeSchema,
  execute: async (context) => {
    const {
      url,
      format = ['markdown'],
    } = context.context

    try {
      const steelUrl = process.env.STEEL_BROWSER_URL || 'http://localhost:3003'

      const requestBody = {
        url: url,
        format: format,
      }

      const scrapeResponse = await fetch(`${steelUrl}/v1/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!scrapeResponse.ok) {
        const errorText = await scrapeResponse.text()
        return {
          success: false,
          url: url,
          error: `Steel scraping failed: ${scrapeResponse.status} - ${errorText}`,
        }
      }

      const scrapeResult = await scrapeResponse.json() as {
        content?: {
          html?: string
          readability?: string
          cleaned_html?: string
          markdown?: string
        }
        metadata?: {
          title?: string
          url?: string
          description?: string
          statusCode?: number
        }
      }

      // Get the content based on requested format
      let extractedContent = ''
      let contentType = ''
      
      if (format.includes('markdown') && scrapeResult.content?.markdown) {
        extractedContent = scrapeResult.content.markdown
        contentType = 'markdown'
      } else if (format.includes('readability') && scrapeResult.content?.readability) {
        extractedContent = scrapeResult.content.readability
        contentType = 'readability'
      } else if (format.includes('cleaned_html') && scrapeResult.content?.cleaned_html) {
        extractedContent = scrapeResult.content.cleaned_html
        contentType = 'cleaned_html'
      } else if (format.includes('html') && scrapeResult.content?.html) {
        extractedContent = scrapeResult.content.html
        contentType = 'html'
      }

      if (!extractedContent) {
        return {
          success: false,
          url: url,
          error: `No content could be extracted from this page in the requested format(s): ${format.join(', ')}.`,
        }
      }

      return {
        success: true,
        url: url,
        message: `Successfully scraped ${contentType} content from ${scrapeResult.metadata?.title || url}`,
        contentLength: extractedContent.length,
        title: scrapeResult.metadata?.title,
        finalUrl: scrapeResult.metadata?.url,
      }

    } catch (error) {
      return {
        success: false,
        url: url,
        error: error instanceof Error ? error.message : 'Unknown scraping error',
      }
    }
  },
})