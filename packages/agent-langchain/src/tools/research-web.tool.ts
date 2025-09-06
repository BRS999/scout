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
    allow_domains: z
      .array(z.string())
      .optional()
      .describe('Optional domain allowlist (substrings)'),
    disallow_domains: z
      .array(z.string())
      .optional()
      .describe('Optional domain blocklist (substrings)'),
  })

  async _call({
    query,
    max_pages,
    variants,
    allow_domains,
    disallow_domains,
  }: z.infer<this['schema']>) {
    const searxBase =
      process.env.SEARNX_URL ||
      process.env.SEARXNG_URL ||
      process.env.SEARXNG_BASE_URL ||
      'http://localhost:8080'

    const queries = [query, ...(variants || [])]
    if (!variants || variants.length === 0) {
      // Basic helpful variants
      queries.push(`${query} 2024 review`)
      queries.push(`${query} 2025 update`)
      queries.push(`${query} best sources`)
    }

    const seen = new Set<string>()
    const results: ResultItem[] = []
    const errors: string[] = []

    try {
      for (const q of queries) {
        const url = new URL('/search', searxBase.endsWith('/') ? searxBase : `${searxBase}/`)
        url.searchParams.set('format', 'json')
        url.searchParams.set('q', q)

        const resp = await fetch(url.toString())
        const ct = resp.headers.get('content-type') || ''
        if (!(resp.ok && ct.includes('application/json'))) {
          const preview = await resp.text().catch(() => '')
          errors.push(
            `Search '${q}' failed: ${resp.status} ${resp.statusText} ${ct} ${preview.substring(0, 120)}`
          )
          continue
        }
        const data = await resp.json()
        const items: Record<string, unknown>[] = Array.isArray(data?.results) ? data.results : []
        for (const r of items) {
          const urlStr = String(r.url || '')
          if (!urlStr || seen.has(urlStr)) continue
          seen.add(urlStr)
          results.push({
            title: String(r.title || ''),
            url: urlStr,
            snippet: String(r.content || r.snippet || ''),
            score: Number(r.score || r.relevance_score || 0.5),
          })
        }
      }

      // Sort by score, then dedupe by hostname
      results.sort((a, b) => (b.score || 0) - (a.score || 0))
      const picked: ResultItem[] = []
      const hostSeen = new Set<string>()
      for (const r of results) {
        try {
          const host = new URL(r.url).hostname
          if (allow_domains?.length) {
            const ok = allow_domains.some((d) => host.includes(d))
            if (!ok) continue
          }
          if (disallow_domains?.length) {
            const bad = disallow_domains.some((d) => host.includes(d))
            if (bad) continue
          }
          if (hostSeen.has(host)) continue
          hostSeen.add(host)
          picked.push(r)
        } catch {
          continue
        }
        if (picked.length >= (max_pages ?? 3)) break
      }

      // Fetch + parse selected pages
      const parsed: Array<{ title: string; url: string; text: string; excerpt?: string }> = []
      for (const p of picked) {
        try {
          const res = await fetch(p.url, { redirect: 'follow' })
          const ct = res.headers.get('content-type') || ''
          if (!ct.includes('text/html')) {
            errors.push(`Non-HTML content at ${p.url}: ${ct}`)
            continue
          }
          const html = await res.text()
          const dom = new JSDOM(html, { url: p.url })
          const reader = new Readability(dom.window.document)
          const article = reader.parse()
          if (!article) {
            parsed.push({
              title: p.title || p.url,
              url: p.url,
              text: dom.window.document.body?.textContent?.slice(0, 2000) || '',
            })
          } else {
            parsed.push({
              title: article.title || p.title || p.url,
              url: p.url,
              text: article.textContent || '',
              excerpt: article.excerpt,
            })
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e)
          errors.push(`Fetch/parse failed for ${p.url}: ${errorMessage}`)
        }
      }

      // Naive synthesis (LLM will do better with this structured context)
      const findings = parsed.map((p) => ({
        title: p.title,
        url: p.url,
        excerpt: (p.excerpt || p.text.slice(0, 400)).trim(),
      }))

      const payload = {
        query,
        pages_fetched: parsed.length,
        findings,
        sources: picked.map((p) => p.url),
        errors,
      }
      return JSON.stringify(payload)
    } catch (error) {
      console.error('[ResearchWebTool] Error:', error)
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Deep research failed',
        results: [],
      })
    }
  }
}
