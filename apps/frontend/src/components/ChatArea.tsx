'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Code, Search, Send, Sparkles, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SAMPLE_PROMPTS = [
  {
    icon: Code,
    text: 'Build a React component',
    prompt: 'Help me create a React component with search and filtering',
  },
  {
    icon: Search,
    text: 'Research web trends',
    prompt: 'Research latest web development trends and key findings',
  },
  {
    icon: Sparkles,
    text: 'Generate validation code',
    prompt: 'Create a TypeScript email validation function',
  },
]

type BackendStatus = 'connecting' | 'online' | 'offline' | 'error'

export function ChatArea() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('connecting')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content || isLoading || isStreaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)

    // Don't create assistant message yet - let loading bubbles show
    const assistantMessageId = (Date.now() + 1).toString()

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7777'
      const response = await fetch(`${backendUrl}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: content },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body is not readable')
      }

      let accumulatedContent = ''
      let isFirstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'start') {
                // Streaming started, but keep loading until first chunk
                // setIsLoading(false) - moved to first chunk
              } else if (data.type === 'chunk') {
                if (isFirstChunk) {
                  // First chunk received, disable loading indicator and create message
                  setIsLoading(false)
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: data.content,
                    timestamp: new Date(),
                  }
                  accumulatedContent = data.content
                  setMessages((prev) => [...prev, assistantMessage])
                  isFirstChunk = false
                } else {
                  // Subsequent chunks - update existing message
                  accumulatedContent += data.content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg
                    )
                  )
                }
              } else if (data.type === 'error') {
                setIsLoading(false)
                if (!messages.some((msg) => msg.id === assistantMessageId)) {
                  // Create error message if assistant message doesn't exist yet
                  const errorMessage: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: `Sorry, I encountered an error: ${data.message}`,
                    timestamp: new Date(),
                  }
                  setMessages((prev) => [...prev, errorMessage])
                } else {
                  // Update existing message with error
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: `Sorry, I encountered an error: ${data.message}`,
                          }
                        : msg
                    )
                  )
                }
                setIsStreaming(false)
                break
              } else if (data.type === 'done') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, timestamp: new Date(data.timestamp) }
                      : msg
                  )
                )
                setIsStreaming(false)
                break
              }
            } catch (_parseError) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }

      // Quick health check after successful message
      setTimeout(() => checkBackendHealth(), 1000)
    } catch (error) {
      console.error('Error sending message:', error)
      // Check if assistant message exists, if not create one with error
      setMessages((prev) => {
        const hasAssistantMessage = prev.some((msg) => msg.id === assistantMessageId)
        if (!hasAssistantMessage) {
          const errorMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content:
              'Sorry, I encountered an error while processing your request. The backend service might be unavailable.',
            timestamp: new Date(),
          }
          return [...prev, errorMessage]
        }
        return prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  'Sorry, I encountered an error while processing your request. The backend service might be unavailable.',
              }
            : msg
        )
      })
      // Check health immediately on error
      setTimeout(() => checkBackendHealth(), 1000)
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: Allow new line
        return
      }
      // Enter: Send message
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSamplePrompt = (prompt: string) => {
    setInput(prompt)
  }

  // Health check function
  const checkBackendHealth = useCallback(async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7777'

    try {
      // Try to reach the backend with a simple request
      const response = await fetch(`${backendUrl}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'health_check' }],
        }),
        // Short timeout for health check
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        setBackendStatus('online')
      } else {
        setBackendStatus('error')
      }
    } catch (error) {
      console.warn('Backend health check failed:', error)
      setBackendStatus('offline')
    }
  }, [])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  // Initial health check and periodic checks
  useEffect(() => {
    checkBackendHealth()

    // Check health every 60 seconds
    const healthCheckInterval = setInterval(checkBackendHealth, 60000)

    return () => clearInterval(healthCheckInterval)
  }, [checkBackendHealth])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }) // messages dependency removed as effect doesn't use messages content directly

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Scout
            </h1>
            <p className="text-xs text-muted-foreground">AI powered agent system</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {backendStatus === 'online' && 'Online'}
            {backendStatus === 'connecting' && 'Connecting...'}
            {backendStatus === 'offline' && 'Offline'}
            {backendStatus === 'error' && 'Service Error'}
          </div>
          {(backendStatus === 'offline' || backendStatus === 'error') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs hover:bg-muted"
              onClick={checkBackendHealth}
            >
              Retry
            </Button>
          )}
          <div
            className={`w-2 h-2 rounded-full ${
              backendStatus === 'online'
                ? 'bg-green-500 animate-pulse'
                : backendStatus === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : backendStatus === 'offline'
                    ? 'bg-red-500'
                    : 'bg-orange-500 animate-pulse'
            }`}
          />
          <ThemeToggle />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full max-w-2xl shadow-lg border-0 bg-gradient-to-br from-card to-muted/10">
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Welcome to Scout!
                  </h2>
                  <p className="text-muted-foreground mb-8 text-lg">
                    Ask me anything - coding, research, analysis, and more. I'm here to help!
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {SAMPLE_PROMPTS.map((sample, _index) => {
                      const Icon = sample.icon
                      return (
                        <Button
                          key={sample.text}
                          variant="outline"
                          className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200"
                          onClick={() => handleSamplePrompt(sample.prompt)}
                        >
                          <Icon className="w-5 h-5 text-primary" />
                          <span className="text-sm font-medium">{sample.text}</span>
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 animate-in fade-in-10 slide-in-from-bottom-2 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
              )}

              <div
                className={`max-w-[75%] shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-md'
                    : 'bg-card border border-border rounded-2xl rounded-bl-md'
                }`}
              >
                <div className="p-4">
                  {message.role === 'assistant' ? (
                    <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          pre: ({ children }) => (
                            <pre className="bg-background/50 border border-border/50 rounded-lg p-3 overflow-x-auto my-2">
                              {children}
                            </pre>
                          ),
                          code: ({ children, className, ...props }) => (
                            <code
                              className={`${className || ''} bg-background/50 border border-border/50 rounded px-1.5 py-0.5 text-xs`}
                              {...props}
                            >
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                </div>
                <div
                  className={`px-4 pb-2 text-xs opacity-60 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3 animate-in fade-in-10 slide-in-from-bottom-2">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-md shadow-sm p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2 opacity-60">Thinking...</div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-6 border-t border-border bg-gradient-to-r from-background to-muted/5">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={input ? input : 'Ask me anything...'}
                className="min-h-[60px] max-h-[200px] resize-none border-2 border-border/50 rounded-2xl px-4 py-3 text-base shadow-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-background/50 backdrop-blur-sm"
                disabled={isLoading || isStreaming}
                rows={1}
              />
            </div>
            <Button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading || isStreaming}
              variant="default"
              className="h-[60px] w-[60px] rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center p-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
