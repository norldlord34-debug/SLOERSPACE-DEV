import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SloerSpace Dev',
  description: 'Agentic Development Environment — Multi-pane terminals, AI agent orchestration, and vibe coding.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-surface-0 text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
