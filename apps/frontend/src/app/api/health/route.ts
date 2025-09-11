import { NextResponse } from 'next/server'

interface Service {
  name: string
  url: string | undefined
  status: 'online' | 'offline' | 'error'
  type: 'browser' | 'search' | 'database'
  port: number
  lastChecked: string
}

interface ServiceConfig {
  name: string
  url: string | undefined
  port: number
  type: 'browser' | 'search' | 'database'
  healthCheck: (url: string) => Promise<'online' | 'offline' | 'error'>
}

interface ServiceStatusData {
  services: Service[]
  overall: 'healthy' | 'degraded'
  timestamp: string
}

// Health check functions for different service types
async function checkBrowserHealth(url: string): Promise<'online' | 'offline' | 'error'> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Steel Browser doesn't have a /health endpoint, do a simple HTTP check
    // Since it returns 404 for unknown routes but is running, any response means it's up
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Scout-Service-Check/1.0',
      },
    })
    clearTimeout(timeoutId)

    // If we get any HTTP response (even 404), the service is running
    if (response.status !== 0) {
      return 'online'
    }
    return 'error'
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'offline' // Timeout
    }
    return 'error'
  }
}

async function checkSearchHealth(url: string): Promise<'online' | 'offline' | 'error'> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Scout-Service-Check/1.0',
      },
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      return 'online'
    }
    return 'error'
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'offline'
    }
    return 'error'
  }
}

async function checkDatabaseHealth(url: string): Promise<'online' | 'offline' | 'error'> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // ChromaDB v1 API is deprecated, use a simple HTTP check instead
    // Check if we can reach the server (even if it returns 404, it means it's running)
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD', // HEAD request is lighter than GET
    })
    clearTimeout(timeoutId)

    // ChromaDB responds with various status codes but if we get any response, it's running
    if (response.status !== 0) {
      return 'online'
    }
    return 'error'
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'offline' // Timeout
    }
    return 'error'
  }
}

export async function GET() {
  const now = new Date()
  const timestamp = now.toISOString()

  // Define services with their configuration from environment variables
  const serviceConfigs: ServiceConfig[] = [
    {
      name: 'Steel Browser',
      url: process.env.STEEL_BROWSER_URL,
      port: 3003,
      type: 'browser' as const,
      healthCheck: checkBrowserHealth,
    },
    {
      name: 'SearX Search',
      url: process.env.SEARXNG_URL,
      port: 8080,
      type: 'search' as const,
      healthCheck: checkSearchHealth,
    },
    {
      name: 'ChromaDB',
      url: process.env.CHROMADB_URL,
      port: 8000,
      type: 'database' as const,
      healthCheck: checkDatabaseHealth,
    },
  ].filter((config) => config.url) // Only include services with configured URLs

  // Check health of all services
  const services: Service[] = await Promise.all(
    serviceConfigs.map(async (config) => {
      const status = await config.healthCheck(config.url!)
      return {
        name: config.name,
        url: config.url,
        status,
        type: config.type,
        port: config.port,
        lastChecked: timestamp,
      }
    })
  )

  // Determine overall health
  const onlineCount = services.filter((s) => s.status === 'online').length
  const totalCount = services.length
  const overall: 'healthy' | 'degraded' = onlineCount === totalCount ? 'healthy' : 'degraded'

  const response: ServiceStatusData = {
    services,
    overall,
    timestamp,
  }

  return NextResponse.json(response)
}
