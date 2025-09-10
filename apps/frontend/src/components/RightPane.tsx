'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, Code, Monitor, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Block {
  tool_type: string
  block: string
  feedback: string
  success: boolean
}

interface ResponseData {
  blocks?: { [key: string]: Block }
  screenshot?: string
  screenshotTimestamp?: number
  done?: boolean
  answer?: string
  agent_name?: string
  status?: string
  uid?: string
}

interface RightPaneProps {
  onClose: () => void
}

type ViewType = 'blocks' | 'screenshot'

export function RightPane({ onClose }: RightPaneProps) {
  const [currentView, setCurrentView] = useState<ViewType>('blocks')
  const [responseData, setResponseData] = useState<ResponseData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLatestAnswer = async () => {
      try {
        const backendUrl =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
        const response = await fetch(`${backendUrl}/latest_answer`)
        if (response.ok) {
          const data = await response.json()
          setResponseData((prev) => ({
            ...prev,
            blocks: data.blocks || prev?.blocks || null,
            done: data.done,
            answer: data.answer,
            agent_name: data.agent_name,
            status: data.status,
            uid: data.uid,
          }))
        }
      } catch (error) {
        console.error('Error fetching latest answer:', error)
      }
    }

    const fetchScreenshot = async () => {
      try {
        const backendUrl =
          typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
        const timestamp = new Date().getTime()
        const response = await fetch(
          `${backendUrl}/screenshots/updated_screen.png?timestamp=${timestamp}`
        )

        if (response.ok) {
          const blob = await response.blob()
          const imageUrl = URL.createObjectURL(blob)
          setResponseData((prev) => {
            if (prev?.screenshot && prev.screenshot !== 'placeholder.png') {
              URL.revokeObjectURL(prev.screenshot)
            }
            return {
              ...prev,
              screenshot: imageUrl,
              screenshotTimestamp: new Date().getTime(),
            }
          })
        }
      } catch (error) {
        console.error('Error fetching screenshot:', error)
        setResponseData((prev) => ({
          ...prev,
          screenshot: 'placeholder.png',
          screenshotTimestamp: new Date().getTime(),
        }))
      }
    }

    // Fetch data every 3 seconds
    const intervalId = setInterval(() => {
      fetchLatestAnswer()
      fetchScreenshot()
    }, 3000)

    return () => clearInterval(intervalId)
  }, [])

  const handleGetScreenshot = async () => {
    try {
      setCurrentView('screenshot')
    } catch (_err) {
      setError('Browser not in use')
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border min-h-[73px]">
        <h2 className="text-lg font-semibold">Computer View</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* View Selector */}
      <div className="flex p-4 space-x-2">
        <Button
          variant={currentView === 'blocks' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentView('blocks')}
          className="flex-1"
        >
          <Code className="w-4 h-4 mr-2" />
          Editor View
        </Button>
        <Button
          variant={currentView === 'screenshot' ? 'default' : 'outline'}
          size="sm"
          onClick={
            responseData?.screenshot ? () => setCurrentView('screenshot') : handleGetScreenshot
          }
          className="flex-1"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Browser View
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {error && (
          <div className="p-4 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {currentView === 'blocks' ? (
          <div className="space-y-4">
            {responseData?.blocks && Object.values(responseData.blocks).length > 0 ? (
              Object.values(responseData.blocks).map((block, index) => (
                <div
                  key={`${block.tool_type}-${index}`}
                  className="p-4 bg-muted rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Tool: {block.tool_type}
                    </p>
                    <div className="flex items-center space-x-2 shrink-0">
                      {block.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded shrink-0 ${
                          block.success
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {block.success ? 'Success' : 'Failure'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-background p-3 rounded border border-border mb-2">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{block.block}</pre>
                  </div>

                  {block.feedback && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Feedback:</strong> {block.feedback}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No tool in use</p>
                <p className="text-sm">No file opened</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            {responseData?.screenshot ? (
              <img
                src={responseData.screenshot}
                alt="Browser Screenshot"
                className="max-w-full max-h-full object-contain rounded-lg border border-border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src =
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNWMtMS42NTYgMC0zLTEuMzQ0LTMtM3MtMS4zNDQtMy0zLTNBMCAwIDAgMCAxMiAxMWMxLjY1NiAwIDMgMS4zNDQgMyAzUzEzLjY1NiAxNSAxMiAxNVoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTEyIDE5QzEwLjM0MyAxOSA5IDE3LjY1NyA5IDE2UzEuMzQzIDEzIDMgMTNjMS42NTcgMCAzIDEuMzQzIDMgM3MxLjM0MyAzIDMgM0gxMnoiIGZpbGw9IiM5Q0E0QUYiLz4KPHN2Zz4K'
                  console.error('Failed to load screenshot')
                }}
                key={responseData?.screenshotTimestamp || 'default'}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No screenshot available</p>
                <p className="text-sm">Browser view will appear here when available</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Status Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="shrink-0">Status: {responseData?.status || 'Ready'}</span>
          {responseData?.agent_name && (
            <span className="shrink-0">Agent: {responseData.agent_name}</span>
          )}
        </div>
      </div>
    </div>
  )
}
