import { ThemeProvider } from '@/lib/theme-provider'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AgenticSeek',
  description: 'AI-powered agent system for coding and research',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="agentic-seek-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
