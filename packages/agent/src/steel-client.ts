import WebSocket from 'ws'

/**
 * Steel Browser API Client
 * Provides a comprehensive TypeScript interface to Steel Browser's REST API
 * Includes advanced features like scraping, session management, and file handling
 */
export class SteelBrowserClient {
  private cdpUrl: string
  private ws: WebSocket | null = null
  private nextId = 1
  private pendingRequests: Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  > = new Map()

  constructor(cdpUrl = 'http://steel-browser:9223') {
    this.cdpUrl = cdpUrl
  }

  /**
   * Connect to CDP WebSocket
   */
  private async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    try {
      // Get the WebSocket debugger URL from CDP
      const response = await fetch(`${this.cdpUrl}/json/list`)
      const targets = await response.json()

      if (!targets || targets.length === 0) {
        throw new Error('No browser targets available')
      }

      const target = targets[0] // Use the first available target
      this.ws = new WebSocket(target.webSocketDebuggerUrl)

      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'))

        this.ws.onopen = () => {
          console.info('[SteelBrowser] CDP WebSocket connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data.toString())

            if (message.id && this.pendingRequests.has(message.id)) {
              const { resolve, reject } = this.pendingRequests.get(message.id)!
              this.pendingRequests.delete(message.id)

              if (message.error) {
                reject(new Error(message.error.message))
              } else {
                resolve(message.result)
              }
            }
          } catch (error) {
            console.error('[SteelBrowser] Error parsing CDP message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[SteelBrowser] CDP WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.info('[SteelBrowser] CDP WebSocket closed')
        }
      })
    } catch (error) {
      console.error('[SteelBrowser] Failed to connect to CDP:', error)
      throw error
    }
  }

  /**
   * Send CDP command
   */
  private async sendCommand(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    await this.connect()

    if (!this.ws) {
      throw new Error('WebSocket not connected')
    }

    const id = this.nextId++
    const command = {
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      this.ws!.send(JSON.stringify(command))

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`CDP command timeout: ${method}`))
        }
      }, 30000)
    })
  }

  /**
   * Disconnect from CDP
   */
  private disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.pendingRequests.clear()
  }

  /**
   * Initialize the browser connection
   */
  async initialize(): Promise<{ success: boolean }> {
    try {
      // Enable required CDP domains
      await this.sendCommand('Page.enable')
      await this.sendCommand('DOM.enable')
      await this.sendCommand('Runtime.enable')
      await this.sendCommand('Input.enable')

      return {
        success: true,
      }
    } catch (error) {
      console.error('[SteelBrowser] Error initializing:', error)
      throw new Error(
        `Failed to initialize browser: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<{ success: boolean; url: string }> {
    try {
      await this.sendCommand('Page.navigate', { url })

      // Wait a bit for navigation to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      return {
        success: true,
        url,
      }
    } catch (error) {
      console.error('[SteelBrowser] Error navigating:', error)
      throw new Error(
        `Failed to navigate to ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get page content
   */
  async getPageContent(): Promise<{ content: string }> {
    try {
      const result = (await this.sendCommand('DOM.getDocument')) as {
        root: { nodeId: number }
      }
      const rootNodeId = result.root.nodeId

      const bodyResult = (await this.sendCommand('DOM.querySelector', {
        nodeId: rootNodeId,
        selector: 'body',
      })) as { nodeId: number }

      const contentResult = (await this.sendCommand('DOM.getOuterHTML', {
        nodeId: bodyResult.nodeId,
      })) as { outerHTML?: string }

      return {
        content: contentResult.outerHTML || '',
      }
    } catch (error) {
      console.error('[SteelBrowser] Error getting page content:', error)
      throw new Error(
        `Failed to get page content: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(
    options: { fullPage?: boolean; format?: 'png' | 'jpeg' } = {}
  ): Promise<{ screenshot: string }> {
    try {
      const format = options.format || 'png'
      const result = (await this.sendCommand('Page.captureScreenshot', {
        format: format.toUpperCase(),
        quality: format === 'jpeg' ? 80 : undefined,
      })) as { data?: string }

      return {
        screenshot: result.data || '',
      }
    } catch (error) {
      console.error('[SteelBrowser] Error taking screenshot:', error)
      throw new Error(
        `Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Click on an element
   */
  async click(selector: string): Promise<{ success: boolean }> {
    try {
      // First find the element
      const docResult = (await this.sendCommand('DOM.getDocument')) as {
        root: { nodeId: number }
      }
      const queryResult = (await this.sendCommand('DOM.querySelector', {
        nodeId: docResult.root.nodeId,
        selector,
      })) as { nodeId: number }

      if (!queryResult.nodeId) {
        throw new Error(`Element not found: ${selector}`)
      }

      // Get the box model to find clickable coordinates
      const boxResult = (await this.sendCommand('DOM.getBoxModel', {
        nodeId: queryResult.nodeId,
      })) as { model?: { content: number[] } }

      if (!boxResult.model) {
        throw new Error(`Cannot get box model for element: ${selector}`)
      }

      // Click at the center of the element
      const content = boxResult.model.content
      const x = (content[0] + content[2] + content[4] + content[6]) / 4
      const y = (content[1] + content[3] + content[5] + content[7]) / 4

      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
      })

      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
      })

      return {
        success: true,
      }
    } catch (error) {
      console.error('[SteelBrowser] Error clicking element:', error)
      throw new Error(
        `Failed to click element ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Type text into an element
   */
  async type(selector: string, text: string): Promise<{ success: boolean }> {
    try {
      // First find and focus the element
      const docResult = (await this.sendCommand('DOM.getDocument')) as {
        root: { nodeId: number }
      }
      const queryResult = (await this.sendCommand('DOM.querySelector', {
        nodeId: docResult.root.nodeId,
        selector,
      })) as { nodeId: number }

      if (!queryResult.nodeId) {
        throw new Error(`Element not found: ${selector}`)
      }

      // Focus the element
      await this.sendCommand('DOM.focus', {
        nodeId: queryResult.nodeId,
      })

      // Clear existing text (Ctrl+A, Delete)
      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        modifiers: 2, // Ctrl key
        key: 'a',
      })

      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        modifiers: 2,
        key: 'a',
      })

      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Delete',
      })

      await this.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Delete',
      })

      // Type the new text
      for (const char of text) {
        await this.sendCommand('Input.dispatchKeyEvent', {
          type: 'keyDown',
          text: char,
        })

        await this.sendCommand('Input.dispatchKeyEvent', {
          type: 'keyUp',
          text: char,
        })
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error('[SteelBrowser] Error typing text:', error)
      throw new Error(
        `Failed to type text into ${selector}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Execute JavaScript in the page context
   */
  async executeScript(script: string): Promise<{ result: unknown }> {
    try {
      const result = (await this.sendCommand('Runtime.evaluate', {
        expression: script,
        returnByValue: true,
      })) as { result?: { value?: unknown } }

      return {
        result: result.result?.value,
      }
    } catch (error) {
      console.error('[SteelBrowser] Error executing script:', error)
      throw new Error(
        `Failed to execute script: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Close the browser connection
   */
  async close(): Promise<{ success: boolean }> {
    try {
      this.disconnect()
      return {
        success: true,
      }
    } catch (error) {
      console.error('[SteelBrowser] Error closing connection:', error)
      throw new Error(
        `Failed to close connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if Steel Browser service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if we can connect to CDP
      const response = await fetch(`${this.cdpUrl}/json/list`)
      const targets = await response.json()
      return Array.isArray(targets) && targets.length > 0
    } catch (error) {
      console.error('[SteelBrowser] Health check failed:', error)
      return false
    }
  }

  /**
   * Execute a multi-step workflow
   */
  async executeWorkflow(
    url: string,
    actions: Array<{
      type: 'navigate' | 'click' | 'type' | 'wait' | 'screenshot' | 'extract'
      selector?: string
      text?: string
      script?: string
      url?: string
      timeout?: number
    }>
  ): Promise<{ results: unknown[] }> {
    const results: unknown[] = []

    try {
      // Initialize the browser connection
      await this.initialize()

      // Execute each action
      for (const action of actions) {
        switch (action.type) {
          case 'navigate': {
            const navResult = await this.navigate(action.url || url)
            results.push({ action: 'navigate', ...navResult })
            break
          }

          case 'click': {
            if (action.selector) {
              const clickResult = await this.click(action.selector)
              results.push({ action: 'click', selector: action.selector, ...clickResult })
            }
            break
          }

          case 'type': {
            if (action.selector && action.text) {
              const typeResult = await this.type(action.selector, action.text)
              results.push({
                action: 'type',
                selector: action.selector,
                text: action.text,
                ...typeResult,
              })
            }
            break
          }

          case 'wait': {
            await new Promise((resolve) => setTimeout(resolve, action.timeout || 1000))
            results.push({ action: 'wait', duration: action.timeout || 1000 })
            break
          }

          case 'screenshot': {
            const screenshotResult = await this.takeScreenshot()
            results.push({ action: 'screenshot', ...screenshotResult })
            break
          }

          case 'extract': {
            const contentResult = await this.getPageContent()
            results.push({ action: 'extract', ...contentResult })
            break
          }
        }
      }

      return { results }
    } catch (error) {
      console.error('[SteelBrowser] Workflow execution failed:', error)
      throw error
    } finally {
      // Always try to close the connection
      try {
        await this.close()
      } catch (closeError) {
        console.warn('[SteelBrowser] Failed to close connection:', closeError)
      }
    }
  }
}

/**
 * Create a Steel Browser client instance
 */
export function createSteelBrowserClient(cdpUrl?: string): SteelBrowserClient {
  return new SteelBrowserClient(cdpUrl)
}

// Steel API Types
export interface SteelSession {
  id: string
  status: 'active' | 'idle' | 'closed'
  created_at: string
  updated_at: string
  context?: Record<string, unknown>
}

export interface SteelScrapeRequest {
  url: string
  formats?: ('html' | 'markdown' | 'links' | 'screenshot')[]
  include_tags?: string[]
  exclude_tags?: string[]
  only_main_content?: boolean
  wait_for?: string
  timeout?: number
  session_id?: string
}

export interface SteelScrapeResponse {
  content: {
    html: string
    [key: string]: unknown
  }
  metadata: {
    statusCode: number
    title: string
    language: string
    urlSource: string
    timestamp: string
    description?: string
    keywords?: string
    author?: string
    [key: string]: unknown
  }
  links: Array<{
    url: string
    text: string
  }>
}

export interface SteelScreenshotRequest {
  url: string
  full_page?: boolean
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
  width?: number
  height?: number
  wait_for?: string
  timeout?: number
  session_id?: string
}

export interface SteelScreenshotResponse {
  success: boolean
  data: {
    screenshot: string
    format: string
    size: number
  }
  session_id?: string
}

export interface SteelPdfRequest {
  url: string
  format?: 'A4' | 'A3' | 'Letter'
  margin?: {
    top?: string
    bottom?: string
    left?: string
    right?: string
  }
  print_background?: boolean
  wait_for?: string
  timeout?: number
  session_id?: string
}

export interface SteelPdfResponse {
  success: boolean
  data: {
    pdf: string
    size: number
    pages: number
  }
  session_id?: string
}

/**
 * Steel API Client using REST API
 * Provides access to all Steel Browser advanced features
 */
export class SteelAPIClient {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl = 'http://steel-browser:3000', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.apiKey = apiKey || process.env.STEEL_API_KEY
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    const config: RequestInit = {
      method,
      headers,
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data)
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Steel API error ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  /**
   * Create a new browser session
   */
  async createSession(options?: {
    extensions?: string[]
    proxy?: string
    user_agent?: string
    timezone?: string
    locale?: string
  }): Promise<{ session: SteelSession }> {
    return this.makeRequest('POST', '/v1/sessions', options)
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<{ session: SteelSession }> {
    return this.makeRequest('GET', `/v1/sessions/${sessionId}`)
  }

  /**
   * Release a session
   */
  async releaseSession(sessionId: string): Promise<{ success: boolean }> {
    return this.makeRequest('POST', `/v1/sessions/${sessionId}/release`)
  }

  /**
   * Scrape webpage content with advanced options
   */
  async scrape(request: SteelScrapeRequest, _sessionId?: string): Promise<SteelScrapeResponse> {
    const data = {
      url: request.url,
      // Steel API uses different parameter names
      formats: request.formats || ['markdown'],
      includeTags: request.include_tags,
      excludeTags: request.exclude_tags,
      onlyMainContent: request.only_main_content,
      waitFor: request.wait_for,
      timeout: request.timeout,
    }
    return this.makeRequest('POST', '/v1/scrape', data)
  }

  /**
   * Take a screenshot with advanced options
   */
  async takeScreenshot(
    request: SteelScreenshotRequest,
    sessionId?: string
  ): Promise<SteelScreenshotResponse> {
    const data = { ...request }
    if (sessionId) {
      data.session_id = sessionId
    }
    return this.makeRequest('POST', '/v1/screenshot', data)
  }

  /**
   * Generate PDF from webpage
   */
  async generatePdf(request: SteelPdfRequest, sessionId?: string): Promise<SteelPdfResponse> {
    const data = { ...request }
    if (sessionId) {
      data.session_id = sessionId
    }
    return this.makeRequest('POST', '/v1/pdf', data)
  }

  /**
   * List all active sessions
   */
  async listSessions(): Promise<{ sessions: SteelSession[] }> {
    return this.makeRequest('GET', '/v1/sessions')
  }

  /**
   * Get session context (cookies, localStorage, etc.)
   */
  async getSessionContext(sessionId: string): Promise<unknown> {
    return this.makeRequest('GET', `/v1/sessions/${sessionId}/context`)
  }

  /**
   * Check if Steel API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple scrape request instead of sessions endpoint
      const testResponse = await fetch(`${this.baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      return testResponse.ok
    } catch {
      return false
    }
  }

  /**
   * Advanced scraping with multiple formats and session persistence
   */
  async scrapeAdvanced(
    url: string,
    options: {
      formats?: ('html' | 'markdown' | 'links' | 'screenshot')[]
      includeTags?: string[]
      excludeTags?: string[]
      onlyMainContent?: boolean
      waitFor?: string
      sessionId?: string
      saveSession?: boolean
    } = {}
  ): Promise<{
    success: boolean
    data: unknown
    sessionId?: string
  }> {
    const {
      formats = ['markdown'],
      includeTags,
      excludeTags,
      onlyMainContent = true,
      waitFor,
      sessionId,
      saveSession = false,
    } = options

    // Create session if needed
    let activeSessionId = sessionId
    if (!activeSessionId && saveSession) {
      const sessionResult = await this.createSession()
      activeSessionId = sessionResult.session.id
    }

    try {
      const scrapeRequest: SteelScrapeRequest = {
        url,
        formats,
        include_tags: includeTags,
        exclude_tags: excludeTags,
        only_main_content: onlyMainContent,
        wait_for: waitFor,
        timeout: 30000,
      }

      const result = await this.scrape(scrapeRequest, activeSessionId)

      // Steel API returns: { content: { html: "..." }, metadata: {...}, links: [...] }
      // Transform to expected format
      return {
        success: true,
        data: {
          html: result.content?.html || '',
          markdown: result.content?.markdown || result.content?.html || '', // Fallback to HTML if no markdown
          links: result.links || [],
          title: result.metadata?.title || '',
          url: result.metadata?.urlSource || scrapeRequest.url,
        },
        sessionId: activeSessionId,
      }
    } catch (error) {
      // Clean up session if we created one and it failed
      if (activeSessionId && !sessionId && saveSession) {
        try {
          await this.releaseSession(activeSessionId)
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error
    }
  }

  /**
   * Extract structured data from webpage
   */
  async extractData(
    url: string,
    selectors: {
      title?: string
      content?: string
      links?: string
      images?: string
      metadata?: string
    },
    sessionId?: string
  ): Promise<{
    success: boolean
    data: {
      title?: string
      content?: string
      links?: Array<{ text: string; href: string }>
      images?: string[]
      metadata?: Record<string, unknown>
    }
  }> {
    const formats: ('html' | 'markdown' | 'links' | 'screenshot')[] = ['markdown']

    if (selectors.links) formats.push('links')
    if (selectors.images) formats.push('screenshot')

    const result = await this.scrapeAdvanced(url, {
      formats,
      sessionId,
      onlyMainContent: true,
    })

    // Parse and structure the extracted data
    const extractedData: Record<string, unknown> = {}
    const data = result.data as unknown as {
      markdown?: string
      links?: unknown
    }

    if (data.markdown) {
      extractedData.content = data.markdown
    }

    if (data.links) {
      extractedData.links = data.links
    }

    // Try to extract title from markdown
    if (data.markdown) {
      const titleMatch = data.markdown.match(/^#\s+(.+)$/m)
      if (titleMatch) {
        extractedData.title = titleMatch[1]
      }
    }

    return {
      success: result.success,
      data: extractedData,
    }
  }
}

/**
 * Create a Steel API client instance
 */
export function createSteelAPIClient(baseUrl?: string, apiKey?: string): SteelAPIClient {
  return new SteelAPIClient(baseUrl, apiKey)
}

/**
 * Default Steel API client for Scout
 */
export const steelAPIClient = createSteelAPIClient(
  process.env.STEEL_API_URL || 'http://steel-browser:3000',
  process.env.STEEL_API_KEY
)

/**
 * Default Steel Browser client for Scout (CDP fallback)
 */
export const steelBrowserClient = createSteelBrowserClient(
  process.env.STEEL_CDP_URL || 'http://steel-browser:9223'
)
