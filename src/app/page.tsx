'use client'

import { getDefaultWorkingDirectory } from '@/lib/desktop'
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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  return hydrated
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export default function App() {
  const hydrated = useHydrated()
  const currentView = useStore((s) => s.currentView)
  const setView = useStore((s) => s.setView)
  const isLoggedIn = useStore((s) => s.isLoggedIn)
  const showOnStartup = useStore((s) => s.showOnStartup)
  const workspaceTabs = useStore((s) => s.workspaceTabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const removeWorkspaceTab = useStore((s) => s.removeWorkspaceTab)
  const terminalSessions = useStore((s) => s.terminalSessions)
  const removePane = useStore((s) => s.removePane)
  const setActivePane = useStore((s) => s.setActivePane)
  const launchQuickShellWorkspace = useStore((s) => s.launchQuickShellWorkspace)
  const addPaneToActiveWorkspace = useStore((s) => s.addPaneToActiveWorkspace)
  const setActiveWorkspaceSplitDirection = useStore((s) => s.setActiveWorkspaceSplitDirection)
  const setWizardStep = useStore((s) => s.setWizardStep)
  const [navOpen, setNavOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const startupRoutingHandledRef = useRef(false)
  const activeWorkspace = useMemo(
    () => workspaceTabs.find((tab) => tab.id === activeTabId) ?? null,
    [workspaceTabs, activeTabId],
  )
  const activeTerminalPanes = useMemo(
    () => (activeTabId ? (terminalSessions[activeTabId] ?? []) : []),
    [activeTabId, terminalSessions],
  )
  const activePane = useMemo(
    () => activeTerminalPanes.find((pane) => pane.isActive) ?? activeTerminalPanes[0] ?? null,
    [activeTerminalPanes],
  )

  useEffect(() => {
    if (!isLoggedIn) {
      startupRoutingHandledRef.current = false
    }
  }, [isLoggedIn])

  const openQuickWorkspace = useCallback(async () => {
    const workingDirectory = activeWorkspace?.workingDirectory || await getDefaultWorkingDirectory()
    launchQuickShellWorkspace({ workingDirectory })
  }, [activeWorkspace?.workingDirectory, launchQuickShellWorkspace])

  const cycleWorkspace = useCallback((direction: 1 | -1) => {
    if (workspaceTabs.length === 0 || !activeTabId) {
      return
    }

    const currentIndex = workspaceTabs.findIndex((tab) => tab.id === activeTabId)
    if (currentIndex === -1) {
      return
    }

    const nextIndex = (currentIndex + direction + workspaceTabs.length) % workspaceTabs.length
    setActiveTab(workspaceTabs[nextIndex].id)
  }, [activeTabId, setActiveTab, workspaceTabs])

  const cyclePane = useCallback((direction: 1 | -1) => {
    if (activeTerminalPanes.length <= 1 || !activePane) {
      return
    }

    const currentIndex = activeTerminalPanes.findIndex((pane) => pane.id === activePane.id)
    if (currentIndex === -1) {
      return
    }

    const nextIndex = (currentIndex + direction + activeTerminalPanes.length) % activeTerminalPanes.length
    setActivePane(activeTerminalPanes[nextIndex].id)
    setView('terminal')
  }, [activePane, activeTerminalPanes, setActivePane, setView])

  useEffect(() => {
    if (!hydrated || !isLoggedIn || startupRoutingHandledRef.current) {
      return
    }

    startupRoutingHandledRef.current = true

    if (showOnStartup || currentView !== 'home') {
      return
    }

    if (activeWorkspace) {
      setView(activeWorkspace.view)
      return
    }

    const fallbackWorkspace = workspaceTabs[workspaceTabs.length - 1]
    if (fallbackWorkspace) {
      setActiveTab(fallbackWorkspace.id)
      setView(fallbackWorkspace.view)
      return
    }

    setWizardStep(1)
    setView('workspace-wizard')
  }, [
    activeWorkspace,
    currentView,
    hydrated,
    isLoggedIn,
    setActiveTab,
    setView,
    setWizardStep,
    showOnStartup,
    workspaceTabs,
  ])

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) {
      return
    }

    const hasModifier = e.ctrlKey || e.metaKey
    if (!hasModifier) {
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setCommandPaletteOpen((v) => !v)
      return
    }

    if (e.shiftKey && (e.key === 'W' || e.key === 'w')) {
      e.preventDefault()
      if (activeTabId) {
        removeWorkspaceTab(activeTabId)
      }
      return
    }

    if (e.shiftKey && (e.key === ']' || e.code === 'BracketRight')) {
      e.preventDefault()
      cycleWorkspace(1)
      return
    }

    if (e.shiftKey && (e.key === '[' || e.code === 'BracketLeft')) {
      e.preventDefault()
      cycleWorkspace(-1)
      return
    }

    if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault()
      if (activeWorkspace?.kind === 'terminal') {
        setActiveWorkspaceSplitDirection('vertical')
        addPaneToActiveWorkspace({ splitDirection: 'vertical' })
        setView('terminal')
      }
      return
    }

    if (e.key === 'h') { e.preventDefault(); setView('home'); return }
    if (e.key === '1') { e.preventDefault(); setView('terminal'); return }
    if (e.key === '2') { e.preventDefault(); setView('kanban'); return }
    if (e.key === '3') { e.preventDefault(); setView('agents'); return }
    if (e.key === '4') { e.preventDefault(); setView('prompts'); return }
    if (e.key === ',') { e.preventDefault(); setView('settings'); return }
    if (e.key === 's' || e.key === 'S') { e.preventDefault(); setView('swarm-launch'); return }
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault()
      setWizardStep(1)
      void openQuickWorkspace()
      return
    }
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      if (activeWorkspace?.kind === 'terminal') {
        addPaneToActiveWorkspace({ splitDirection: activeWorkspace.splitDirection ?? 'vertical' })
        setView('terminal')
      } else {
        void openQuickWorkspace()
      }
      return
    }
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault()
      if (activeWorkspace?.kind === 'terminal') {
        setActiveWorkspaceSplitDirection('horizontal')
        addPaneToActiveWorkspace({ splitDirection: 'horizontal' })
        setView('terminal')
      }
      return
    }
    if (e.key === 'w' || e.key === 'W') {
      e.preventDefault()
      if (activeWorkspace?.kind === 'terminal' && activePane && activeTerminalPanes.length > 1) {
        removePane(activePane.id)
      }
      return
    }
    if (e.key === ']' || e.code === 'BracketRight') {
      e.preventDefault()
      cyclePane(1)
      return
    }
    if (e.key === '[' || e.code === 'BracketLeft') {
      e.preventDefault()
      cyclePane(-1)
    }
  }, [
    activePane,
    activeTabId,
    activeTerminalPanes.length,
    activeWorkspace?.kind,
    activeWorkspace?.splitDirection,
    addPaneToActiveWorkspace,
    cyclePane,
    cycleWorkspace,
    openQuickWorkspace,
    removePane,
    removeWorkspaceTab,
    setActiveWorkspaceSplitDirection,
    setView,
    setWizardStep,
  ])

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
        <NavigationMenu isOpen={navOpen} onClose={() => setNavOpen(false)} hideDesktop={currentView === 'terminal'} />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>{renderView()}</ErrorBoundary>
        </main>
      </div>
      {currentView !== 'terminal' && <StatusBar />}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
    </ToastProvider>
  )
}
