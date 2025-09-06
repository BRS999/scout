import { v4 as uuidv4 } from 'uuid'

// Utility functions for AgenticSeek

export function generateId(): string {
  return uuidv4()
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>'"&]/g, '')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength - 3)}...`
}

export function formatTimestamp(date: Date): string {
  return date.toISOString()
}

export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now()

  return fn().then((result) => ({
    result,
    executionTime: Date.now() - startTime,
  }))
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as unknown as T

  const clonedObj = {} as T
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      clonedObj[key] = deepClone(obj[key])
    }
  }
  return clonedObj
}

export function mergeObjects<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        // Type assertion for recursive merge
        result[key] = mergeObjects(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        )
      } else {
        result[key] = source[key]
      }
    }
  }

  return result as T
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function extractCodeBlocks(text: string): Array<{
  language: string
  content: string
  fullMatch: string
}> {
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
  const blocks: Array<{
    language: string
    content: string
    fullMatch: string
  }> = []

  let match: RegExpExecArray | null
  while (true) {
    match = codeBlockRegex.exec(text)
    if (match === null) break
    blocks.push({
      language: match[1] || 'text',
      content: match[2].trim(),
      fullMatch: match[0],
    })
  }

  return blocks
}

export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Bytes'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export function removeMarkdown(text: string): string {
  let result = text

  // Remove code blocks
  result = result.replace(/```[\s\S]*?```/g, '')
  // Remove inline code
  result = result.replace(/`[^`]*`/g, '')
  // Remove links
  result = result.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  // Remove bold/italic
  result = result.replace(/(\*\*|__)(.*?)\1/g, '$2')
  result = result.replace(/(\*|_)(.*?)\1/g, '$2')
  // Remove headers
  result = result.replace(/^#+\s*/gm, '')

  return result.trim()
}
