'use client'

import { ChatArea } from '@/components/ChatArea'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'
import { SidebarInset } from '@/components/ui/sidebar'
import { useState } from 'react'

export default function Home() {
  const [_isRightPaneOpen, _setIsRightPaneOpen] = useState(true)

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <ChatArea />
        </main>
      </SidebarInset>
    </>
  )
}
