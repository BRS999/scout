import { StructuredTool } from '@langchain/core/tools'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import { z } from 'zod'

type ResultItem = { title: string; url: string; snippet: string; score: number }

export class ResearchWebTool extends StructuredTool {
  name = 'research.web'
  description =
    'Deep web research: multi-query search, fetch+parse top pages, and return findings with citations.'

  schema = z.object({
    query: z.string().describe('Primary research question'),
    max_pages: z.number().int().min(1).max(6).default(3).optional(),
    variants: z.array(z.string()).optional().describe('Additional query variants to search'),
    block_domains: z
      .array(z.string())
      .optional()
      .describe('Optional domain blacklist (substrings)'),
    allow_domains: z
      .array(z.string())
      .optional()
      .describe('Optional domain allowlist (substrings) - overrides blacklist'),
  })

  private buildSearchQueries(query: string, variants?: string[]): string[] {
    const queries = [query, ...(variants || [])]
    if (!variants || variants.length === 0) {
      // Basic helpful variants
      queries.push(`${query} 2024 review`)
      queries.push(`${query} 2025 update`)
      queries.push(`${query} best sources`)
    }
    return queries
  }

  private async performSearch(searxBase: string, query: string): Promise<ResultItem[]> {
    const url = new URL('/search', searxBase.endsWith('/') ? searxBase : `${searxBase}/`)
    url.searchParams.set('format', 'json')
    url.searchParams.set('q', query)

    const resp = await fetch(url.toString())
    const ct = resp.headers.get('content-type') || ''
    if (!(resp.ok && ct.includes('application/json'))) {
      const preview = await resp.text().catch(() => '')
      throw new Error(
        `Search '${query}' failed: ${resp.status} ${resp.statusText} ${ct} ${preview.substring(0, 120)}`
      )
    }

    const data = await resp.json()
    const items: Record<string, unknown>[] = Array.isArray(data?.results) ? data.results : []
    const results: ResultItem[] = []

    for (const r of items) {
      const urlStr = String(r.url || '')
      if (!urlStr) continue
      results.push({
        title: String(r.title || ''),
        url: urlStr,
        snippet: String(r.content || r.snippet || ''),
        score: Number(r.score || r.relevance_score || 0.5),
      })
    }

    return results
  }

  private filterResultsByDomain(
    results: ResultItem[],
    block_domains?: string[],
    allow_domains?: string[]
  ): ResultItem[] {
    const picked: ResultItem[] = []
    const hostSeen = new Set<string>()

    for (const r of results) {
      try {
        const host = new URL(r.url).hostname
        if (this.isDomainAllowed(host, block_domains, allow_domains) && !hostSeen.has(host)) {
          hostSeen.add(host)
          picked.push(r)
        }
      } catch {
        // Skip invalid URLs
      }
    }

    return picked
  }

  private isDomainAllowed(
    host: string,
    block_domains?: string[],
    allow_domains?: string[]
  ): boolean {
    // Allowlist takes precedence - if specified, only allow those domains
    if (allow_domains?.length) {
      const allowed = allow_domains.some((d) => host.includes(d))
      if (!allowed) return false
    }

    // Check blacklist - block specified domains
    if (block_domains?.length) {
      const blocked = block_domains.some((d) => host.includes(d))
      if (blocked) return false
    }

    return true
  }

  private async fetchAndParsePage(
    url: string
  ): Promise<{ title: string; url: string; text: string; excerpt?: string }> {
    const res = await fetch(url, { redirect: 'follow' })
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html')) {
      throw new Error(`Non-HTML content: ${ct}`)
    }

    const html = await res.text()
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      return {
        title: url,
        url,
        text: dom.window.document.body?.textContent?.slice(0, 2000) || '',
      }
    }

    return {
      title: article.title || url,
      url,
      text: article.textContent || '',
      excerpt: article.excerpt,
    }
  }

  private formatResults(
    query: string,
    parsed: Array<{ title: string; url: string; text: string; excerpt?: string }>,
    picked: ResultItem[],
    errors: string[]
  ) {
    const findings = parsed.map((p) => ({
      title: p.title,
      url: p.url,
      excerpt: (p.excerpt || p.text.slice(0, 400)).trim(),
    }))

    return {
      query,
      pages_fetched: parsed.length,
      findings,
      sources: picked.map((p) => p.url),
      errors,
    }
  }

  async _call({
    query,
    max_pages,
    variants,
    block_domains,
    allow_domains,
  }: z.infer<this['schema']>) {
    const startTime = Date.now()
    const effectiveMaxPages = max_pages ?? 3

    console.info(
      `🔧 [ResearchWebTool] Starting deep research: "${query}" (max_pages: ${effectiveMaxPages})`
    )

    const searxBase =
      process.env.SEARNX_URL ||
      process.env.SEARXNG_URL ||
      process.env.SEARXNG_BASE_URL ||
      'http://localhost:8080'

    const queries = this.buildSearchQueries(query, variants)
    console.info(`🔍 [ResearchWebTool] Generated ${queries.length} search queries:`, queries)

    const seen = new Set<string>()
    const results: ResultItem[] = []
    const errors: string[] = []

    try {
      for (const q of queries) {
        const searchResults = await this.performSearch(searxBase, q)
        for (const result of searchResults) {
          if (!seen.has(result.url)) {
            seen.add(result.url)
            results.push(result)
          }
        }
      }

      // Sort by score, then dedupe by hostname
      results.sort((a, b) => (b.score || 0) - (a.score || 0))
      const picked = this.filterResultsByDomain(results, block_domains, allow_domains)

      // Limit results to max_pages
      const limited = picked.slice(0, max_pages ?? 3)

      // Fetch + parse selected pages
      const parsed: Array<{ title: string; url: string; text: string; excerpt?: string }> = []
      for (const p of limited) {
        const parsedPage = await this.fetchAndParsePage(p.url)
        parsed.push({
          ...parsedPage,
          title: parsedPage.title || p.title || p.url,
        })
      }

      // Format results
      const payload = this.formatResults(query, parsed, picked, errors)
      const endTime = Date.now()

      console.info(
        `✅ [ResearchWebTool] Completed in ${endTime - startTime}ms - ${parsed.length} pages fetched, ${picked.length} sources found`
      )

      return JSON.stringify({
        ...payload,
        executionTime: endTime - startTime,
      })
    } catch (error) {
      const endTime = Date.now()
      console.error(`❌ [ResearchWebTool] Failed after ${endTime - startTime}ms:`, error)
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Deep research failed',
        results: [],
        executionTime: endTime - startTime,
      })
    }
  }
}
