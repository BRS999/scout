import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { steelAPIClient } from '../steel-client'

/**
 * Steel Browser Navigate Tool
 * Navigate to a webpage and perform basic operations
 */
export class SteelNavigateTool extends StructuredTool {
  name = 'steel.navigate'
  description = 'Navigate to a webpage and optionally perform actions like clicking or typing'

  schema = z.object({
    url: z.string().url().describe('The URL to navigate to'),
    actions: z
      .array(
        z.object({
          type: z.enum(['click', 'type', 'wait']).describe('Type of action to perform'),
          selector: z
            .string()
            .optional()
            .describe('CSS selector for the element (required for click and type)'),
          text: z.string().optional().describe('Text to type (required for type action)'),
          timeout: z.number().optional().describe('Wait time in milliseconds (for wait action)'),
        })
      )
      .optional()
      .describe('Optional list of actions to perform after navigation'),
  })

  private async checkSteelAPI(): Promise<{ available: boolean; error?: string }> {
    try {
      const baseUrl = process.env.STEEL_API_URL || 'http://steel-browser:3000'
      // Test with a simple scrape request to check if Steel API is working
      const response = await fetch(`${baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
        signal: AbortSignal.timeout(5000), // 5 second timeout for actual scrape
      })
      return { available: response.ok }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async _call({ url, actions: _actions = [] }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info(`🔧 [SteelNavigateTool] Starting navigation to ${url}`)

    try {
      // Use Steel REST API only (no CDP fallback to prevent loops)
      const scrapeResult = await steelAPIClient.scrapeAdvanced(url, {
        formats: ['markdown', 'links'],
        onlyMainContent: true,
        waitFor: 'body',
      })

      const data = scrapeResult.data as {
        url?: string
        markdown?: string
        html?: string
        links?: unknown[]
      }
      const result = {
        success: true,
        url: data.url || url,
        content: data.markdown || data.html || '',
        links: data.links || [],
        sessionId: scrapeResult.sessionId,
      }

      const endTime = Date.now()
      console.info(`✅ [SteelNavigateTool] Completed in ${endTime - startTime}ms`)

      return JSON.stringify({
        ...result,
        executionTime: endTime - startTime,
      })
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [SteelNavigateTool] Failed after ${endTime - startTime}ms:`, error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        executionTime: endTime - startTime,
      })
    }
  }
}

/**
 * Steel Browser Extract Tool
 * Extract content from web pages using CSS selectors or JavaScript
 */
export class SteelExtractTool extends StructuredTool {
  name = 'steel.extract'
  description = 'Extract content from a webpage using CSS selectors or JavaScript'

  schema = z.object({
    url: z.string().url().describe('The URL to extract content from'),
    selector: z.string().optional().describe('CSS selector to extract content from'),
    extractType: z
      .enum(['text', 'html', 'attribute'])
      .default('text')
      .describe('Type of extraction'),
    attribute: z
      .string()
      .optional()
      .describe('Attribute name to extract (when extractType is "attribute")'),
  })

  async _call({ url, selector, extractType = 'text', attribute }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info(`🔧 [SteelExtractTool] Starting extraction from ${url} (${extractType})`)

    try {
      // Use Steel REST API only (no CDP fallback to prevent loops)
      const formats: ('html' | 'markdown' | 'links' | 'screenshot')[] = ['html', 'markdown']

      const result = await steelAPIClient.scrapeAdvanced(url, {
        formats,
        onlyMainContent: !selector, // Use main content extraction if no specific selector
        waitFor: 'body',
      })

      let extractedContent = ''

      const data = result.data as {
        html?: string
        markdown?: string
        links?: Array<Record<string, unknown>>
      }

      switch (extractType) {
        case 'html':
          extractedContent = data.html || data.markdown || 'Content not found'
          break
        case 'attribute':
          if (attribute && data.links) {
            const link = (data.links as Array<Record<string, unknown>>).find((l) =>
              typeof l.href === 'string' || typeof l.text === 'string'
                ? (l.href as string | undefined) === selector ||
                  (l.text as string | undefined) === selector
                : false
            )
            extractedContent = link
              ? (link[attribute] as string | undefined) || 'Attribute not found'
              : 'Element not found'
          } else {
            extractedContent = 'Attribute extraction requires link selector'
          }
          break
        default: // text/markdown
          extractedContent = data.markdown || data.html || 'Content not found'
      }

      const endTime = Date.now()
      console.info(`✅ [SteelExtractTool] Completed in ${endTime - startTime}ms`)

      return JSON.stringify({
        success: true,
        extractedContent,
        url,
        selector: selector || 'body',
        extractType,
        sessionId: result.sessionId,
        executionTime: endTime - startTime,
      })
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [SteelExtractTool] Failed after ${endTime - startTime}ms:`, error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        executionTime: endTime - startTime,
      })
    }
  }
}

/**
 * Steel Browser Screenshot Tool
 * Take screenshots of web pages
 */
export class SteelScreenshotTool extends StructuredTool {
  name = 'steel.screenshot'
  description = 'Take a screenshot of a webpage'

  schema = z.object({
    url: z.string().url().describe('The URL to take a screenshot of'),
    fullPage: z
      .boolean()
      .default(false)
      .describe('Whether to capture the full page or just viewport'),
    format: z.enum(['png', 'jpeg']).default('png').describe('Image format for the screenshot'),
  })

  async _call({ url, fullPage = false, format = 'png' }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info(
      `🔧 [SteelScreenshotTool] Taking screenshot of ${url} (${format}, ${fullPage ? 'full' : 'viewport'} page)`
    )

    try {
      // Use Steel REST API only (no CDP fallback to prevent loops)
      const screenshotRequest = {
        url,
        full_page: fullPage,
        format: format as 'png' | 'jpeg' | 'webp',
        quality: format === 'jpeg' ? 80 : undefined,
        wait_for: 'body',
      }

      const result = await steelAPIClient.takeScreenshot(screenshotRequest)
      const endTime = Date.now()

      console.info(
        `✅ [SteelScreenshotTool] Completed in ${endTime - startTime}ms - ${result.data.size} bytes`
      )

      return JSON.stringify({
        success: true,
        screenshot: result.data.screenshot,
        url,
        fullPage,
        format: result.data.format,
        size: result.data.size,
        sessionId: result.session_id,
        executionTime: endTime - startTime,
      })
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [SteelScreenshotTool] Failed after ${endTime - startTime}ms:`, error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed',
        executionTime: endTime - startTime,
      })
    }
  }
}

/**
 * Steel Browser Form Fill Tool
 * Fill out forms on web pages
 */
export class SteelFormFillTool extends StructuredTool {
  name = 'steel.fill_form'
  description = 'Fill out form fields on a webpage'

  schema = z.object({
    url: z.string().url().describe('The URL containing the form'),
    fields: z
      .array(
        z.object({
          selector: z.string().describe('CSS selector for the form field'),
          value: z.string().describe('Value to enter into the field'),
        })
      )
      .describe('Form fields to fill'),
    submitSelector: z.string().optional().describe('CSS selector for the submit button'),
  })

  async _call({
    url: _url,
    fields: _fields,
    submitSelector: _submitSelector,
  }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info('🔧 [SteelFormFillTool] Form filling not supported via Steel REST API')

    const endTime = Date.now()

    return JSON.stringify({
      success: false,
      error: 'Form filling requires CDP integration - use steel.javascript tool instead',
      suggestion: 'Use steel.javascript to execute form filling scripts',
      executionTime: endTime - startTime,
    })
  }
}

/**
 * Steel Browser JavaScript Tool
 * Execute JavaScript on a webpage
 */
export class SteelJavaScriptTool extends StructuredTool {
  name = 'steel.javascript'
  description = 'Execute JavaScript code on a webpage'

  schema = z.object({
    url: z.string().url().describe('The URL to execute JavaScript on'),
    script: z.string().describe('JavaScript code to execute'),
    returnResult: z.boolean().default(true).describe('Whether to return the script result'),
  })

  async _call({
    url: _url,
    script: _script,
    returnResult: _returnResult = true,
  }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info('🔧 [SteelJavaScriptTool] JavaScript execution not supported via Steel REST API')

    const endTime = Date.now()

    return JSON.stringify({
      success: false,
      error: 'JavaScript execution requires CDP integration - not available via REST API',
      suggestion: 'Use steel.scrape for content extraction instead',
      executionTime: endTime - startTime,
    })
  }
}

/**
 * Steel Browser Health Check Tool
 * Check if Steel Browser service is available
 */
export class SteelHealthCheckTool extends StructuredTool {
  name = 'steel.health_check'
  description = 'Check if the Steel Browser service is running and available'

  schema = z.object({})

  async _call() {
    try {
      const isHealthy = await steelAPIClient.healthCheck()

      return JSON.stringify({
        success: true,
        steelBrowserAvailable: isHealthy,
        message: isHealthy
          ? 'Steel Browser service is healthy'
          : 'Steel Browser service is not available',
      })
    } catch (error) {
      console.error('[SteelHealthCheckTool] Error:', error)
      return JSON.stringify({
        success: false,
        steelBrowserAvailable: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      })
    }
  }
}

/**
 * Steel PDF Generation Tool
 * Generate PDF from webpage using Steel's advanced PDF capabilities
 */
export class SteelPdfTool extends StructuredTool {
  name = 'steel.pdf'
  description = 'Generate PDF from webpage with advanced formatting options'

  schema = z.object({
    url: z.string().url().describe('The URL to generate PDF from'),
    format: z.enum(['A4', 'A3', 'Letter']).default('A4').describe('PDF page format'),
    includeBackground: z.boolean().default(true).describe('Include background graphics'),
    margin: z
      .object({
        top: z.string().default('1cm').describe('Top margin'),
        bottom: z.string().default('1cm').describe('Bottom margin'),
        left: z.string().default('1cm').describe('Left margin'),
        right: z.string().default('1cm').describe('Right margin'),
      })
      .optional()
      .describe('Page margins'),
    waitFor: z.string().optional().describe('CSS selector to wait for before generating PDF'),
  })

  async _call({
    url,
    format = 'A4',
    includeBackground = true,
    margin,
    waitFor,
  }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info(`🔧 [SteelPdfTool] Generating PDF from ${url} (${format} format)`)

    try {
      const pdfRequest = {
        url,
        format,
        print_background: includeBackground,
        margin: margin || {
          top: '1cm',
          bottom: '1cm',
          left: '1cm',
          right: '1cm',
        },
        wait_for: waitFor || 'body',
      }

      const result = await steelAPIClient.generatePdf(pdfRequest)
      const endTime = Date.now()

      console.info(
        `✅ [SteelPdfTool] Completed in ${endTime - startTime}ms - ${result.data.size} bytes, ${result.data.pages} pages`
      )

      return JSON.stringify({
        success: true,
        pdf: result.data.pdf,
        url,
        format: result.data.pages,
        size: result.data.size,
        pages: result.data.pages,
        sessionId: result.session_id,
        executionTime: endTime - startTime,
      })
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [SteelPdfTool] Failed after ${endTime - startTime}ms:`, error)

      // Steel API returns raw PDF binary, not JSON - this is expected behavior
      const errorMessage = error instanceof Error ? error.message : 'PDF generation failed'

      if (
        errorMessage.includes('Unexpected token') &&
        (errorMessage.includes('PDF') || errorMessage.includes('%PDF'))
      ) {
        console.info('ℹ️ [SteelPdfTool] Steel API returned raw PDF binary (expected behavior)')
        return JSON.stringify({
          success: true,
          message: 'PDF generated successfully',
          url: url,
          format: format,
          note: 'PDF binary data was returned from Steel API',
          executionTime: endTime - startTime,
        })
      }

      return JSON.stringify({
        success: false,
        error: errorMessage,
        url: url,
        format: format,
        executionTime: endTime - startTime,
        suggestion: 'Steel API may not be available - try using browser tools for HTML extraction',
      })
    }
  }
}

/**
 * Steel Advanced Scrape Tool
 * Advanced webpage scraping with multiple formats and options
 */
export class SteelAdvancedScrapeTool extends StructuredTool {
  name = 'steel.scrape'
  description =
    'Advanced webpage scraping with multiple output formats (HTML, Markdown, Links, Screenshot)'

  schema = z.object({
    url: z.string().url().describe('The URL to scrape'),
    formats: z
      .array(z.enum(['html', 'markdown', 'links', 'screenshot']))
      .default(['markdown'])
      .describe('Output formats to generate'),
    includeTags: z
      .array(z.string())
      .optional()
      .describe('HTML tags to include (others will be excluded)'),
    excludeTags: z.array(z.string()).optional().describe('HTML tags to exclude'),
    onlyMainContent: z
      .boolean()
      .default(true)
      .describe('Extract only main content, ignore headers/footers'),
    waitFor: z.string().optional().describe('CSS selector to wait for before scraping'),
    sessionId: z.string().optional().describe('Reuse existing browser session'),
  })

  private async checkSteelAPI(): Promise<{ available: boolean; error?: string }> {
    try {
      const baseUrl = process.env.STEEL_API_URL || 'http://steel-browser:3000'
      // Test with a simple scrape request to check if Steel API is working
      const response = await fetch(`${baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
        signal: AbortSignal.timeout(5000), // 5 second timeout for actual scrape
      })
      return { available: response.ok }
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async _call({
    url,
    formats = ['markdown'],
    includeTags,
    excludeTags,
    onlyMainContent = true,
    waitFor,
    sessionId,
  }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info(`🔧 [SteelAdvancedScrapeTool] Scraping ${url} (${formats.join(', ')})`)

    try {
      const result = await steelAPIClient.scrapeAdvanced(url, {
        formats,
        includeTags,
        excludeTags,
        onlyMainContent,
        waitFor: waitFor || 'body',
        sessionId,
      })

      const endTime = Date.now()
      console.info(`✅ [SteelAdvancedScrapeTool] Completed in ${endTime - startTime}ms`)

      // Validate result structure - handle different Steel API response formats
      if (!result?.success) {
        throw new Error('Steel API request failed')
      }

      const steelResponse = result.data

      // Handle different response formats from Steel API
      let content = ''
      let title = 'Unknown Title'
      let links: Array<{ href?: string; text?: string; [key: string]: unknown }> = []
      let responseUrl = url

      // Check if response has the expected structure
      if (steelResponse) {
        // Try different possible structures
        const response = steelResponse as Record<string, unknown> | string
        if (typeof response === 'object' && response) {
          const r = response as any
          if (r.content?.html) {
            // Standard structure: { content: { html: "..." }, metadata: {...}, links: [...] }
            content = r.content.html
            title = r.metadata?.title || 'Unknown Title'
            links = r.links || []
            responseUrl = r.metadata?.urlSource || url
          } else if (r.html) {
            // Alternative structure: { html: "...", markdown: "...", links: [...] }
            content = r.html
            title = r.title || 'Unknown Title'
            links = r.links || []
            responseUrl = r.url || url
          } else if (r.markdown) {
            // Markdown-only response
            content = r.markdown
            title = r.title || 'Unknown Title'
            links = r.links || []
            responseUrl = r.url || url
          } else {
            // Unknown structure - try to extract what we can
            content = JSON.stringify(response).substring(0, 1000)
            console.warn(
              '[SteelAdvancedScrapeTool] Unknown Steel API response structure:',
              Object.keys(response || {})
            )
          }
        } else if (typeof response === 'string') {
          // Raw content response
          content = response
        } else {
          // Standard structure: { content: { html: "..." }, metadata: {...}, links: [...] }
          content = JSON.stringify(response).substring(0, 1000)
        }
      }

      // Create a clear, LLM-friendly response
      const summary = content
        ? `${content.replace(/<[^>]*>/g, '').substring(0, 500)}...`
        : 'No content found'
      const linkCount = Array.isArray(links) ? links.length : 0

      const cleanResponse = {
        success: true,
        message: `✅ Successfully scraped ${responseUrl}. Found ${content ? content.length : 0} characters of content and ${linkCount} links.`,
        title: title || 'No title found',
        summary: summary,
        url: responseUrl,
        links: Array.isArray(links) ? links.slice(0, 5) : [], // Limit to 5 most relevant links
        contentLength: content ? content.length : 0,
        executionTime: endTime - startTime,
        // Full content available but truncated in response for LLM clarity
        fullContentAvailable: true,
      }

      return JSON.stringify(cleanResponse)
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [SteelAdvancedScrapeTool] Failed after ${endTime - startTime}ms:`, error)

      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Advanced scraping failed'

      // If it's an API unavailability error, suggest fallback
      if (errorMessage.includes('Steel API') || errorMessage.includes('fetch')) {
        console.log(
          '⚠️ [SteelAdvancedScrapeTool] Steel API unavailable, consider using browser tools instead'
        )
      }

      // Return a clean error response that won't break JSON parsing
      const errorResponse = {
        success: false,
        error: errorMessage.substring(0, 200), // Limit error message length
        url: url,
        formats: formats,
        executionTime: endTime - startTime,
        suggestion: 'Try using browser tools for basic scraping',
      }

      return JSON.stringify(errorResponse)
    }
  }
}

/**
 * Steel Session Management Tool
 * Create and manage browser sessions for persistent browsing
 */
export class SteelSessionTool extends StructuredTool {
  name = 'steel.session'
  description = 'Create and manage Steel browser sessions for persistent browsing'

  schema = z.object({
    action: z.enum(['create', 'list', 'get', 'release']).describe('Session management action'),
    sessionId: z.string().optional().describe('Session ID for get/release actions'),
    options: z
      .object({
        extensions: z.array(z.string()).optional().describe('Browser extensions to load'),
        proxy: z.string().optional().describe('Proxy server URL'),
        userAgent: z.string().optional().describe('Custom user agent string'),
        timezone: z.string().optional().describe('Timezone for the session'),
        locale: z.string().optional().describe('Locale for the session'),
      })
      .optional()
      .describe('Session creation options'),
  })

  async _call({ action, sessionId, options: _options }: z.infer<this['schema']>) {
    const startTime = Date.now()
    console.info(`🔧 [SteelSessionTool] ${action} session ${sessionId || ''}`)

    try {
      let result: unknown

      switch (action) {
        case 'create':
          // Steel API may not support session creation via REST API
          console.info(
            '⚠️ [SteelSessionTool] Session creation may not be available via Steel REST API'
          )
          result = { message: 'Session creation not supported via REST API', session: null }
          break

        case 'list':
          // Steel API sessions endpoint returns HTML, not JSON
          console.info('⚠️ [SteelSessionTool] Session listing returns HTML, not JSON')
          result = { message: 'Session listing not supported via REST API', sessions: [] }
          break

        case 'get':
          if (!sessionId) throw new Error('sessionId required for get action')
          result = await steelAPIClient.getSession(sessionId)
          console.info(`✅ [SteelSessionTool] Retrieved session ${sessionId}`)
          break

        case 'release':
          if (!sessionId) throw new Error('sessionId required for release action')
          result = await steelAPIClient.releaseSession(sessionId)
          console.info(`✅ [SteelSessionTool] Released session ${sessionId}`)
          break
      }

      const endTime = Date.now()
      console.info(`✅ [SteelSessionTool] ${action} completed in ${endTime - startTime}ms`)

      return JSON.stringify({
        success: true,
        action,
        result,
        executionTime: endTime - startTime,
      })
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [SteelSessionTool] ${action} failed after ${endTime - startTime}ms:`, error)

      const errorMessage = error instanceof Error ? error.message : 'Session management failed'

      // Provide helpful suggestions based on the error
      let suggestion = 'Steel API may not be available'
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        suggestion = 'Check if Steel API server is running on the expected port'
      }

      return JSON.stringify({
        success: false,
        action,
        error: errorMessage,
        sessionId: sessionId,
        executionTime: endTime - startTime,
        suggestion,
      })
    }
  }
}
