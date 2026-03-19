'use client'

import Image from 'next/image'
import { closeDesktopWindow, getDefaultWorkingDirectory, getTerminalCapabilities, isTauriApp, minimizeDesktopWindow, runTerminalCommand, toggleDesktopWindowMaximize } from '@/lib/desktop'
import { useStore, TerminalShellKind } from '@/store/useStore'
import { Settings, Minus, Square, X, Plus, PanelLeft, Search, ChevronDown, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/Toast'

const VIEW_LABELS = {
  home: 'Overview',
  terminal: 'Terminal Grid',
  kanban: 'Delivery Board',
  agents: 'Agent Library',
  prompts: 'Prompt System',
  settings: 'Executive Settings',
  'workspace-wizard': 'Workspace Launchpad',
  'swarm-launch': 'Swarm Launchpad',
  'swarm-dashboard': 'Swarm Command',
  'login': 'Sign In',
}

type QuickShellOption = {
  id: Exclude<TerminalShellKind, 'auto'>
  label: string
  description: string
  available: boolean
  bootstrapCommand: string | null
}

const DEFAULT_QUICK_SHELL_OPTIONS: QuickShellOption[] = [
  {
    id: 'powershell',
    label: 'PowerShell',
    description: 'Windows shell',
    available: true,
    bootstrapCommand: null,
  },
  {
    id: 'command-prompt',
    label: 'CMD',
    description: 'Classic Windows shell',
    available: true,
    bootstrapCommand: 'cmd',
  },
  {
    id: 'git-bash',
    label: 'Git Bash',
    description: 'Git shell if detected',
    available: false,
    bootstrapCommand: null,
  },
]

function getGitBashBootstrap(stdout: string) {
  const matches = stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const gitBashPath = matches.find((entry) => entry.toLowerCase().includes('git') && entry.toLowerCase().endsWith('bash.exe'))
  if (!gitBashPath) {
    return null
  }

  return `"${gitBashPath}" --login -i`
}

export function TitleBar({ onNavToggle, onCommandPalette }: { onNavToggle: () => void; onCommandPalette?: () => void }) {
  const { workspaceTabs, activeTabId, setActiveTab, removeWorkspaceTab, setView, currentView, setWizardStep, launchQuickShellWorkspace } = useStore()
  const { addToast } = useToast()
  const [showQuickShellMenu, setShowQuickShellMenu] = useState(false)
  const [isDetectingShells, setIsDetectingShells] = useState(false)
  const [quickShellOptions, setQuickShellOptions] = useState(DEFAULT_QUICK_SHELL_OPTIONS)
  const activeWorkspace = workspaceTabs.find((tab) => tab.id === activeTabId) ?? null

  const detectQuickShellOptions = useCallback(async () => {
    if (!isTauriApp()) {
      setQuickShellOptions(DEFAULT_QUICK_SHELL_OPTIONS)
      return
    }

    setIsDetectingShells(true)

    try {
      const cwd = activeWorkspace?.workingDirectory || await getDefaultWorkingDirectory()
      const capabilities = await getTerminalCapabilities().catch(() => null)
      const currentShell = capabilities?.shell?.toLowerCase() ?? ''
      const [pwshResult, powershellResult, bashResult] = await Promise.allSettled([
        runTerminalCommand('where.exe pwsh.exe', cwd, undefined, 8),
        runTerminalCommand('where.exe powershell.exe', cwd, undefined, 8),
        runTerminalCommand('where.exe bash.exe', cwd, undefined, 8),
      ])

      const hasPwsh = pwshResult.status === 'fulfilled' && pwshResult.value.exitCode === 0
      const hasWindowsPowerShell = powershellResult.status === 'fulfilled' && powershellResult.value.exitCode === 0
      const gitBashBootstrap = bashResult.status === 'fulfilled' && bashResult.value.exitCode === 0
        ? getGitBashBootstrap(bashResult.value.stdout)
        : null

      setQuickShellOptions([
        {
          id: 'powershell',
          label: 'PowerShell',
          description: 'Windows shell',
          available: hasPwsh || hasWindowsPowerShell || currentShell.includes('powershell'),
          bootstrapCommand: currentShell.includes('powershell') ? null : hasPwsh ? 'pwsh' : hasWindowsPowerShell ? 'powershell' : null,
        },
        {
          id: 'command-prompt',
          label: 'CMD',
          description: 'Classic Windows shell',
          available: true,
          bootstrapCommand: currentShell.includes('command prompt') || currentShell.includes('cmd') ? null : 'cmd',
        },
        {
          id: 'git-bash',
          label: 'Git Bash',
          description: gitBashBootstrap ? 'Git shell' : 'Not detected on this system',
          available: Boolean(gitBashBootstrap),
          bootstrapCommand: gitBashBootstrap,
        },
      ])
    } catch {
      setQuickShellOptions(DEFAULT_QUICK_SHELL_OPTIONS)
    } finally {
      setIsDetectingShells(false)
    }
  }, [activeWorkspace?.workingDirectory])

  useEffect(() => {
    if (!showQuickShellMenu) {
      return
    }

    void detectQuickShellOptions()
  }, [detectQuickShellOptions, showQuickShellMenu])

  const handleQuickShellLaunch = useCallback(async (option: QuickShellOption) => {
    if (!option.available) {
      addToast(`${option.label} is not available on this system.`, 'warning')
      return
    }

    const workingDirectory = activeWorkspace?.workingDirectory || await getDefaultWorkingDirectory()
    launchQuickShellWorkspace({
      workingDirectory,
      shellKind: option.id,
      shellBootstrapCommand: option.bootstrapCommand,
    })
    setShowQuickShellMenu(false)
    addToast(`${option.label} workspace opened.`, 'success', 2600)
  }, [activeWorkspace?.workingDirectory, addToast, launchQuickShellWorkspace])

  return (
    <div
      className="flex h-[60px] items-center select-none relative z-50 shrink-0 px-3 md:px-4"
      style={{ background: 'linear-gradient(180deg, rgba(8,13,22,0.96), rgba(7,12,20,0.92))', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex h-full shrink-0 items-center gap-2">
        <button onClick={onNavToggle} className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] lg:hidden">
          <PanelLeft size={15} />
        </button>

        <div className="premium-panel flex items-center gap-2.5 rounded-[18px] px-2.5 py-1.5">
          <div className="relative h-8 w-8 overflow-hidden rounded-[14px] ring-1 ring-white/10">
            <Image src="/LOGO.png" alt="SloerSpace" width={32} height={32} className="h-full w-full object-contain" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)]" />
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>SloerSpace Dev</div>
            <div className="text-[12px] font-semibold leading-none" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {VIEW_LABELS[currentView]}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-1 items-center gap-2 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" data-tauri-drag-region>
          {workspaceTabs.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <div
                key={tab.id}
                className={`relative flex h-9 cursor-pointer items-center gap-2 rounded-[16px] border px-3 text-[10px] transition-all group ${
                  isActive
                    ? 'text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
                style={{
                  background: isActive ? 'linear-gradient(135deg, rgba(79,140,255,0.16), rgba(40,231,197,0.08))' : 'rgba(10,17,28,0.52)',
                  borderColor: isActive ? 'rgba(163,209,255,0.18)' : 'rgba(158,197,255,0.08)',
                  boxShadow: isActive ? '0 20px 45px rgba(79,140,255,0.12), inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
                }}
                onClick={() => { setActiveTab(tab.id); setView(tab.view) }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full ring-2 ring-transparent transition-all"
                  style={{
                    backgroundColor: tab.color,
                    boxShadow: isActive ? `0 0 14px ${tab.color}80` : 'none',
                  }}
                />
                <span className="max-w-[110px] truncate font-semibold">{tab.name}</span>
                {tab.paneCount > 1 && (
                  <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 text-[8px] font-mono leading-none text-[var(--text-muted)]">
                    {tab.paneCount}
                  </span>
                )}
                <button
                  className="ml-0.5 rounded-lg p-1 opacity-0 transition-all hover:bg-[var(--error)]/10 hover:text-[var(--error)] group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); removeWorkspaceTab(tab.id) }}
                >
                  <X size={10} />
                </button>
                {isActive && (
                  <div className="absolute inset-x-5 bottom-0 h-px rounded-full gradient-accent opacity-90" />
                )}
              </div>
            )
          })}

          {workspaceTabs.length === 0 && (
            <div className="rounded-full border px-3 py-1.5 text-[10px] font-semibold" style={{ borderColor: 'var(--border)', background: 'rgba(10,17,28,0.58)', color: 'var(--text-muted)' }} data-tauri-drag-region>
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--warning)' }} />
              No active workspaces
            </div>
          )}
        </div>

        <div className="relative flex shrink-0 items-center">
          <div className="flex h-9 items-center overflow-hidden rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)]">
            <button
              className="flex h-full w-9 items-center justify-center text-[var(--text-muted)] transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
              onClick={() => { setWizardStep(1); setView('workspace-wizard') }}
              title="New workspace"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
            <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
            <button
              className="flex h-full w-8 items-center justify-center text-[var(--text-muted)] transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
              onClick={() => setShowQuickShellMenu((current) => !current)}
              title="Open shell workspace"
            >
              {isDetectingShells ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
            </button>
          </div>
          {showQuickShellMenu && (
            <>
              <div className="fixed inset-0 z-[98]" onClick={() => setShowQuickShellMenu(false)} />
              <div
                className="absolute right-0 top-[44px] z-[99] w-[248px] rounded-[20px] border border-[var(--border)] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
                style={{ background: 'linear-gradient(180deg, rgba(8,13,22,0.98), rgba(6,10,18,0.96))' }}
              >
                <div className="px-2.5 pb-1.5 pt-1">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>Open shell workspace</div>
                </div>
                <div className="grid gap-1">
                  {quickShellOptions.map((option) => {
                    const statusLabel = option.available ? 'Ready' : 'Unavailable'

                    return (
                      <button
                        key={option.id}
                        onClick={() => { void handleQuickShellLaunch(option) }}
                        disabled={isDetectingShells || !option.available}
                        className="w-full rounded-[16px] border px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed"
                        style={{
                          borderColor: option.available ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.06)',
                          background: option.available ? 'rgba(10,17,28,0.82)' : 'rgba(255,255,255,0.025)',
                          opacity: isDetectingShells || !option.available ? 0.58 : 1,
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{option.label}</div>
                            <div className="mt-0.5 truncate text-[9px]" style={{ color: 'var(--text-muted)' }}>{option.description}</div>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em]"
                            style={{
                              color: option.available ? 'var(--accent)' : 'var(--text-muted)',
                              background: option.available ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: option.available ? 'var(--accent)' : 'var(--text-muted)' }} />
                            {statusLabel}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          className="hidden md:flex h-9 items-center gap-2 rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-3 text-[10px] text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          onClick={onCommandPalette}
          title="Command Palette (Ctrl+K)"
        >
          <Search size={12} />
          <span className="hidden lg:inline">Search</span>
          <span className="premium-kbd ml-1 text-[8px]">Ctrl+K</span>
        </button>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          onClick={() => setView('settings')}
          title="Settings"
        >
          <Settings size={14} />
        </button>

        <div className="relative z-[100] flex items-center gap-1 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.7)] p-1" style={{ pointerEvents: 'auto' }}>
          <button
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)]"
            onClick={(e) => { e.stopPropagation(); void minimizeDesktopWindow() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Minimize"
          >
            <Minus size={12} />
          </button>
          <button
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)]"
            onClick={(e) => { e.stopPropagation(); void toggleDesktopWindowMaximize() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Maximize or restore"
          >
            <Square size={10} />
          </button>
          <button
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[10px] text-[var(--text-muted)] transition-colors hover:bg-[rgba(255,71,87,0.15)] hover:text-[var(--error)]"
            onClick={(e) => { e.stopPropagation(); void closeDesktopWindow() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
