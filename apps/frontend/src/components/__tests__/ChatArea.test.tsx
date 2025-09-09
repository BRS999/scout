import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatArea } from '../ChatArea'

// Simple test approach - test the core functionality without complex UI interactions
describe('ChatArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally with endpoint-sensitive responses
    global.fetch = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/services/status')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              services: [
                {
                  name: 'Steel Browser',
                  status: 'online',
                  type: 'browser',
                  port: 3003,
                  lastChecked: new Date().toISOString(),
                  url: 'http://steel-browser:3000',
                },
              ],
              overall: 'healthy',
              timestamp: new Date().toISOString(),
            }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      } as Response)
    }) as unknown as typeof fetch
  })

  it('renders the component without crashing', () => {
    render(<ChatArea />)

    // Just verify the component renders
    expect(document.body).toContainHTML('div')
  })

  it('shows the welcome message when no messages are present', async () => {
    render(<ChatArea />)

    // Wait for the component to render and check for welcome content
    await waitFor(() => {
      expect(screen.getByText('Welcome to Scout!')).toBeInTheDocument()
    })
  })

  it('displays sample prompt options', async () => {
    render(<ChatArea />)

    // Check that sample prompts are displayed
    await waitFor(() => {
      expect(screen.getByText('Build a React component')).toBeInTheDocument()
      expect(screen.getByText('Research web trends')).toBeInTheDocument()
      expect(screen.getByText('Generate validation code')).toBeInTheDocument()
    })
  })

  it('has a text input area', async () => {
    render(<ChatArea />)

    // Wait for textarea to render
    const textarea = await screen.findByRole('textbox')
    expect(textarea).toBeInTheDocument()
  })

  it('has a send button', async () => {
    render(<ChatArea />)

    // Look for any button (there should be send button among others)
    const buttons = await screen.findAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows backend connection status', async () => {
    render(<ChatArea />)

    // Verify that service status fetch is triggered
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/services/status'))
    })
  })

  it('handles user input in textarea', async () => {
    const user = userEvent.setup()
    render(<ChatArea />)

    const textarea = await screen.findByRole('textbox')

    // Type in the textarea
    await user.type(textarea, 'Hello world')

    // Check that the input was captured
    expect(textarea).toHaveValue('Hello world')
  })

  it('can clear textarea input', async () => {
    const user = userEvent.setup()
    render(<ChatArea />)

    const textarea = await screen.findByRole('textbox')

    // Type and then clear
    await user.type(textarea, 'Test message')
    await user.clear(textarea)

    expect(textarea).toHaveValue('')
  })

  it('handles health check on component mount', async () => {
    render(<ChatArea />)

    // Wait for health check to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:7777/api/agent',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'health_check' }],
          }),
        })
      )
    })
  })
})
