import '@testing-library/jest-dom'

// Mock ResizeObserver for UI tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:7777'

// Mock fetch for tests
global.fetch = vi.fn()

// Mock TextDecoder/TextEncoder for streaming tests
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

// Mock ReadableStream for streaming tests
if (!global.ReadableStream) {
  global.ReadableStream = class ReadableStream {
    constructor(source: unknown) {
      this._source = source
    }

    getReader() {
      return {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        cancel: vi.fn(),
        releaseLock: vi.fn(),
      }
    }

    _source: unknown
  }
}
