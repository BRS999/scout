import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatArea } from '../ChatArea'

// Simple test approach - test the core functionality without complex UI interactions
describe('ChatArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally with successful response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    })
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

    // Should show some status indicator
    await waitFor(() => {
      // The component should show "Online" or "Connecting" status
      const statusElement = screen.queryByText('Online') || screen.queryByText('Connecting')
      expect(statusElement).toBeTruthy()
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
