'use client'

import { ServiceStatus } from '@/components/ServiceStatus'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Clock, Code, Search, Send, Sparkles, User, Wrench, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  toolUsage?: Array<{
    tool: string
    input: unknown
    output: unknown
    timestamp: Date
    duration?: number
  }>
  executionTime?: number
  toolsUsed?: number
}

interface StreamingData {
  type: 'start' | 'chunk' | 'error' | 'done'
  content?: string
  message?: string
  timestamp?: string
  toolUsage?: Array<{
    tool: string
    input: unknown
    output: unknown
    timestamp: Date
    duration?: number
  }>
  executionTime?: number
  toolsUsed?: number
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
  const [_backendStatus, setBackendStatus] = useState<BackendStatus>('connecting')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const createUserMessage = (content: string): Message => ({
    id: Date.now().toString(),
    role: 'user',
    content,
    timestamp: new Date(),
  })

  const createAssistantMessage = (
    id: string,
    content: string,
    toolUsage?: Message['toolUsage'],
    executionTime?: number,
    toolsUsed?: number
  ): Message => ({
    id,
    role: 'assistant',
    content,
    timestamp: new Date(),
    toolUsage,
    executionTime,
    toolsUsed,
  })

  const updateMessageContent = (messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, content: newContent } : msg))
    )
  }

  const updateMessageMetadata = (messageId: string, metadata: Partial<Message>) => {
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, ...metadata } : msg)))
  }

  const applyChunkFirst = (
    id: string,
    data: StreamingData
  ): { accumulatedContent: string; isFirstChunk: boolean } => {
    setIsLoading(false)
    const assistantMessage = createAssistantMessage(
      id,
      data.content || '',
      data.toolUsage,
      data.executionTime,
      data.toolsUsed
    )
    setMessages((prev) => [...prev, assistantMessage])
    return { accumulatedContent: data.content || '', isFirstChunk: false }
  }

  const applyChunk = (
    id: string,
    accumulated: string,
    delta?: string
  ): { accumulatedContent: string; isFirstChunk: boolean } => {
    const newContent = accumulated + (delta || '')
    updateMessageContent(id, newContent)
    return { accumulatedContent: newContent, isFirstChunk: false }
  }

  type StreamingChunkResult = {
    accumulatedContent: string
    isFirstChunk: boolean
    shouldBreak?: boolean
  }

  const handleStreamingChunk = (
    data: StreamingData,
    assistantMessageId: string,
    accumulatedContent: string,
    isFirstChunk: boolean
  ): StreamingChunkResult => {
    switch (data.type) {
      case 'chunk':
        return isFirstChunk
          ? applyChunkFirst(assistantMessageId, data)
          : applyChunk(assistantMessageId, accumulatedContent, data.content)
      case 'error':
        handleStreamingError(assistantMessageId, data.message || 'Unknown error')
        return { accumulatedContent, isFirstChunk, shouldBreak: true }
      case 'done':
        updateMessageMetadata(assistantMessageId, {
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          toolUsage: data.toolUsage,
          executionTime: data.executionTime,
          toolsUsed: data.toolsUsed,
        })
        setIsStreaming(false)
        return { accumulatedContent, isFirstChunk, shouldBreak: true }
      default:
        return { accumulatedContent, isFirstChunk }
    }
  }

  const handleStreamingError = (assistantMessageId: string, errorMessage: string) => {
    setIsLoading(false)
    const hasAssistantMessage = messages.some((msg) => msg.id === assistantMessageId)

    if (!hasAssistantMessage) {
      const errorMsg = createAssistantMessage(
        assistantMessageId,
        `Sorry, I encountered an error: ${errorMessage}`
      )
      setMessages((prev) => [...prev, errorMsg])
    } else {
      updateMessageContent(assistantMessageId, `Sorry, I encountered an error: ${errorMessage}`)
    }
    setIsStreaming(false)
  }

  const createErrorMessage = (assistantMessageId: string): Message => ({
    id: assistantMessageId,
    role: 'assistant',
    content:
      'Sorry, I encountered an error while processing your request. The backend service might be unavailable.',
    timestamp: new Date(),
  })

  const processLine = (
    line: string,
    assistantMessageId: string,
    accumulatedContent: string,
    isFirstChunk: boolean
  ) => {
    if (!line.startsWith('data: ')) return { accumulatedContent, isFirstChunk, shouldBreak: false }
    try {
      const data = JSON.parse(line.slice(6))
      const result = handleStreamingChunk(
        data,
        assistantMessageId,
        accumulatedContent,
        isFirstChunk
      )
      return { ...result, shouldBreak: Boolean(result.shouldBreak) }
    } catch (_parseError) {
      console.warn('Failed to parse SSE data:', line)
      return { accumulatedContent, isFirstChunk, shouldBreak: false }
    }
  }

  const processStreamingResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantMessageId: string
  ) => {
    const decoder = new TextDecoder()
    let accumulatedContent = ''
    let isFirstChunk = true

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        const res = processLine(line, assistantMessageId, accumulatedContent, isFirstChunk)
        accumulatedContent = res.accumulatedContent
        isFirstChunk = res.isFirstChunk
        if (res.shouldBreak) return
      }
    }
  }

  const handleMessageError = (assistantMessageId: string) => {
    console.error('Error sending message')
    const hasAssistantMessage = messages.some((msg) => msg.id === assistantMessageId)

    if (!hasAssistantMessage) {
      const errorMessage = createErrorMessage(assistantMessageId)
      setMessages((prev) => [...prev, errorMessage])
    } else {
      updateMessageContent(
        assistantMessageId,
        'Sorry, I encountered an error while processing your request. The backend service might be unavailable.'
      )
    }
    setTimeout(() => checkBackendHealth(), 1000)
  }

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content || isLoading || isStreaming) return

    const userMessage = createUserMessage(content)
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)

    const assistantMessageId = (Date.now() + 1).toString()

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7777'
      const response = await fetch(`${backendUrl}/api/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      await processStreamingResponse(reader, assistantMessageId)
      setTimeout(() => checkBackendHealth(), 1000)
    } catch (_error) {
      handleMessageError(assistantMessageId)
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
          <ServiceStatus />
          <ThemeToggle />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="w-full bg-gradient-to-b from-card to-muted/10 max-w-2xl shadow-lg border-0">
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

                {/* Tool Usage Information */}
                {message.role === 'assistant' && (message.toolUsage || message.executionTime) && (
                  <div className="px-4 pb-2">
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      {message.executionTime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{message.executionTime}ms</span>
                        </div>
                      )}
                      {message.toolsUsed !== undefined && (
                        <div className="flex items-center space-x-1">
                          <Wrench className="h-3 w-3" />
                          <span>
                            {message.toolsUsed} tool{message.toolsUsed !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {message.toolUsage && message.toolUsage.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Zap className="h-3 w-3" />
                          <span>Debug info</span>
                        </div>
                      )}
                    </div>

                    {/* Tool Usage Details */}
                    {message.toolUsage && message.toolUsage.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Tool usage details
                          </summary>
                          <div className="mt-2 space-y-2 pl-4 border-l-2 border-muted">
                            {message.toolUsage.map((usage, index) => (
                              <div
                                key={`${usage.tool}-${usage.timestamp.getTime()}-${index}`}
                                className="bg-muted/30 rounded p-2"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-foreground">{usage.tool}</span>
                                  {usage.duration && (
                                    <span className="text-muted-foreground">
                                      {usage.duration}ms
                                    </span>
                                  )}
                                </div>
                                {usage.input != null && (
                                  <div className="text-muted-foreground">
                                    <strong>Input:</strong>{' '}
                                    {JSON.stringify(usage.input).substring(0, 100)}
                                    {JSON.stringify(usage.input).length > 100 && '...'}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}

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
