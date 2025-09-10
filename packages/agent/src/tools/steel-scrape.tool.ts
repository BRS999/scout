import { createTool } from '@mastra/core'
import { z } from 'zod'

const steelScrapeSchema = z.object({
  url: z.string().url().describe('The URL of the webpage to scrape'),
  formats: z
    .array(z.enum(['html', 'markdown', 'links', 'screenshot']))
    .default(['markdown'])
    .describe('Output formats to generate'),
  onlyMainContent: z
    .boolean()
    .default(true)
    .describe('Extract only main content, ignore headers/footers'),
  waitFor: z.string().default('body').describe('CSS selector to wait for before scraping'),
})

export const steelScrapeTool = createTool({
  id: 'steel-scrape',
  description:
    'Scrape a webpage using Steel browser. Returns the content in the requested format(s).',
  inputSchema: steelScrapeSchema,
  execute: async (context) => {
    const {
      url,
      formats = ['markdown'],
      onlyMainContent = true,
      waitFor = 'body',
    } = context.context

    console.info('🌐 Steel scrape tool called for URL:', url, 'formats:', formats.join(', '))

    try {
      // Get Steel browser URL from environment
      const steelUrl = process.env.STEEL_BROWSER_URL || 'http://steel-browser:3000'

      console.info('🔄 Scraping page content...')

      // Use the /v1/scrape endpoint which seems to be the main scraping endpoint
      const scrapeResponse = await fetch(`${steelUrl}/v1/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          formats: formats,
          onlyMainContent: onlyMainContent,
          waitFor: waitFor,
        }),
      })

      if (!scrapeResponse.ok) {
        const errorText = await scrapeResponse.text()
        throw new Error(`Steel scraping failed: ${scrapeResponse.status} - ${errorText}`)
      }

      const scrapeResult = await scrapeResponse.json()

      console.info('✅ Scraping completed successfully')

      // Structure the response based on what was requested
      const result: {
        success: boolean
        url: string
        scrapedAt: string
        formats: string[]
        data: Record<string, unknown>
        html?: string
        markdown?: string
        links?: unknown[]
        screenshot?: string
        title?: string
        finalUrl?: string
        metadata?: Record<string, unknown>
      } = {
        success: true,
        url: url,
        scrapedAt: new Date().toISOString(),
        formats: [],
        data: {},
      }

      // Add the requested formats to the result
      if (formats.includes('html') && scrapeResult.html) {
        result.html = scrapeResult.html
      }
      if (formats.includes('markdown') && scrapeResult.markdown) {
        result.markdown = scrapeResult.markdown
      }
      if (formats.includes('links') && scrapeResult.links) {
        result.links = scrapeResult.links
      }
      if (formats.includes('screenshot') && scrapeResult.screenshot) {
        result.screenshot = scrapeResult.screenshot
      }

      // Add metadata if available
      if (scrapeResult.title) {
        result.title = scrapeResult.title
      }
      if (scrapeResult.url) {
        result.finalUrl = scrapeResult.url
      }

      return result
    } catch (error) {
      console.error('❌ Steel scraping error:', error)
      return {
        success: false,
        url: url,
        error: error instanceof Error ? error.message : 'Unknown scraping error',
      }
    }
  },
})
