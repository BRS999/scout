'use client'

import { ChatArea } from '@/components/ChatArea'
import { useState } from 'react'

export default function Home() {
  const [_isRightPaneOpen, _setIsRightPaneOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea />
      </div>
    </div>
  )
}
