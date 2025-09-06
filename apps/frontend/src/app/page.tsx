'use client'

import { ChatArea } from '@/components/ChatArea'
import { RightPane } from '@/components/RightPane'
import { useState } from 'react'

export default function Home() {
  const [isRightPaneOpen, setIsRightPaneOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea />
      </div>

      {/* Right Pane */}
      {isRightPaneOpen && (
        <div className="w-80 border-l border-border">
          <RightPane onClose={() => setIsRightPaneOpen(false)} />
        </div>
      )}

      {/* Toggle Right Pane Button */}
      {!isRightPaneOpen && (
        <button
          type="button"
          onClick={() => setIsRightPaneOpen(true)}
          className="fixed top-20 right-4 z-50 p-2 bg-primary text-primary-foreground rounded-md shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Open right pane"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <title>Open right pane</title>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
