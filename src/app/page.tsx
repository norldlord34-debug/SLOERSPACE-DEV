'use client'

import { useStore } from '@/store/useStore'
import { TitleBar } from '@/components/TitleBar'
import { HomeScreen } from '@/components/HomeScreen'
import { TerminalView } from '@/components/TerminalView'
import { KanbanBoard } from '@/components/KanbanBoard'
import { AgentsPage } from '@/components/AgentsPage'
import { PromptsPage } from '@/components/PromptsPage'
import { SettingsPage } from '@/components/SettingsPage'
import { WorkspaceWizard } from '@/components/WorkspaceWizard'
import { SwarmLaunch } from '@/components/SwarmLaunch'
import { SwarmDashboard } from '@/components/SwarmDashboard'
import { NavigationMenu } from '@/components/NavigationMenu'
import { CommandPalette } from '@/components/CommandPalette'
import { StatusBar } from '@/components/StatusBar'
import { LoginPage } from '@/components/LoginPage'
import { UpgradeModal } from '@/components/UpgradeModal'
import { ToastProvider } from '@/components/Toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useState, useEffect, useCallback } from 'react'

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  return hydrated
}

export default function App() {
  const hydrated = useHydrated()
  const { currentView, setView, isLoggedIn } = useStore()
  const [navOpen, setNavOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setCommandPaletteOpen((v) => !v)
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); setView('home') }
    if ((e.ctrlKey || e.metaKey) && e.key === '1') { e.preventDefault(); setView('terminal') }
    if ((e.ctrlKey || e.metaKey) && e.key === '2') { e.preventDefault(); setView('kanban') }
    if ((e.ctrlKey || e.metaKey) && e.key === '3') { e.preventDefault(); setView('agents') }
    if ((e.ctrlKey || e.metaKey) && e.key === '4') { e.preventDefault(); setView('prompts') }
    if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); setView('settings') }
  }, [setView])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  if (!hydrated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#03060c' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl animate-pulse" style={{ background: 'rgba(79,140,255,0.3)' }} />
          <div className="text-[11px] font-mono tracking-widest uppercase" style={{ color: 'rgba(79,140,255,0.6)' }}>Loading SloerSpace…</div>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!isLoggedIn) {
    return (
      <ToastProvider>
        <div className="h-screen w-screen overflow-hidden">
          <LoginPage />
        </div>
      </ToastProvider>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'home': return <HomeScreen />
      case 'terminal': return <TerminalView />
      case 'kanban': return <KanbanBoard />
      case 'agents': return <AgentsPage />
      case 'prompts': return <PromptsPage />
      case 'settings': return <SettingsPage />
      case 'workspace-wizard': return <WorkspaceWizard />
      case 'swarm-launch': return <SwarmLaunch />
      case 'swarm-dashboard': return <SwarmDashboard />
      case 'login': return <LoginPage />
      default: return <HomeScreen />
    }
  }

  return (
    <ToastProvider>
    <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
      <TitleBar onNavToggle={() => setNavOpen(!navOpen)} onCommandPalette={() => setCommandPaletteOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <NavigationMenu isOpen={navOpen} onClose={() => setNavOpen(false)} />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>{renderView()}</ErrorBoundary>
        </main>
      </div>
      <StatusBar />
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
    </ToastProvider>
  )
}
