'use client'

import Image from 'next/image'
import { closeDesktopWindow, isDesktopWindowFullscreen, minimizeDesktopWindow, toggleDesktopWindowFullscreen, toggleDesktopWindowMaximize } from '@/lib/desktop'
import { useStore, ThemeId } from '@/store/useStore'
import { Settings, Minus, Square, X, Plus, PanelLeft, Command, Sparkles, Search, Clock, Palette, Expand, Shrink } from 'lucide-react'
import { useState, useEffect } from 'react'

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

export function TitleBar({ onNavToggle, onCommandPalette }: { onNavToggle: () => void; onCommandPalette?: () => void }) {
  const { workspaceTabs, activeTabId, setActiveTab, removeWorkspaceTab, setView, currentView, theme, setTheme, setWizardStep } = useStore()
  const [clock, setClock] = useState('')
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const THEMES: ThemeId[] = [
    'sloerspace','github-dark','catppuccin-mocha','rose-pine','one-dark-pro','nord',
    'dracula','everforest-dark','poimandres','oled-dark','neon-tech','synthwave',
    'catppuccin-latte','github-light','rose-pine-dawn',
  ]

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false

    void isDesktopWindowFullscreen().then((fullscreen) => {
      if (!cancelled) {
        setIsFullscreen(fullscreen)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className="h-[72px] flex items-center select-none shrink-0 relative z-50 px-4 md:px-5"
      style={{ background: 'linear-gradient(180deg, rgba(8,13,22,0.96), rgba(7,12,20,0.92))', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center h-full gap-3 shrink-0">
        <button onClick={onNavToggle} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] lg:hidden">
          <PanelLeft size={15} />
        </button>

        <div className="premium-panel flex items-center gap-3 px-3 py-2">
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl ring-1 ring-white/10 animate-pulse-glow" style={{ animationDuration: '4s' }}>
            <Image src="/LOGO.png" alt="SloerSpace" width={40} height={40} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)]" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>SloerSpace Dev</div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {VIEW_LABELS[currentView]}
            </div>
          </div>
        </div>

        <div className="hidden xl:flex premium-chip">
          <Sparkles size={12} style={{ color: 'var(--warning)' }} />
          Premium Shell
        </div>
      </div>

      <div className="flex items-center h-full overflow-x-auto flex-1 gap-2 px-4" data-tauri-drag-region>
        {workspaceTabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`h-11 px-4 flex items-center gap-2.5 text-[11px] cursor-pointer rounded-[18px] transition-all group relative border ${
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
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-transparent transition-all"
                style={{
                  backgroundColor: tab.color,
                  boxShadow: isActive ? `0 0 14px ${tab.color}80` : 'none',
                }}
              />
              <span className="truncate max-w-[130px] font-semibold">{tab.name}</span>
              {tab.paneCount > 0 && (
                <span className="text-[9px] text-[var(--text-muted)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded-full font-mono leading-none border border-[var(--border)]">
                  {tab.paneCount}
                </span>
              )}
              <button
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--error)] transition-all ml-0.5 p-1 rounded-lg hover:bg-[var(--error)]/10"
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

        <button
          className="h-11 w-11 flex items-center justify-center rounded-[18px] border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all shrink-0"
          onClick={() => { setWizardStep(1); setView('workspace-wizard') }}
          title="New workspace"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>

        {workspaceTabs.length === 0 && (
          <div className="premium-chip" data-tauri-drag-region>
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--warning)' }} />
            No active workspaces
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
          <Clock size={11} />
          {clock}
        </div>

        <button
          className="hidden md:flex h-10 items-center gap-2 px-3 rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] text-[11px]"
          onClick={onCommandPalette}
          title="Command Palette (Ctrl+K)"
        >
          <Search size={12} />
          Search
          <span className="premium-kbd text-[9px] ml-1">Ctrl+K</span>
        </button>

        <div className="relative">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
            onClick={() => setShowThemePicker(!showThemePicker)}
            title="Switch theme"
          >
            <Palette size={14} />
          </button>
          {showThemePicker && (
            <>
              <div className="fixed inset-0 z-[98]" onClick={() => setShowThemePicker(false)} />
              <div className="absolute right-0 top-12 z-[99] w-56 rounded-2xl border border-[var(--border)] p-2 max-h-80 overflow-y-auto" style={{ background: 'var(--surface-1)' }}>
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); setShowThemePicker(false) }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium transition-all hover:bg-[var(--surface-3)]"
                    style={{ color: theme === t ? 'var(--accent)' : 'var(--text-secondary)' }}
                  >
                    <span className="h-3 w-3 rounded-full border border-[var(--border)]" style={{ background: theme === t ? 'var(--accent)' : 'var(--surface-3)' }} />
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2 premium-chip">
          <Command size={11} style={{ color: 'var(--accent)' }} />
          {workspaceTabs.length.toString().padStart(2, '0')} workspaces
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          onClick={() => setView('settings')}
          title="Settings"
        >
          <Settings size={14} />
        </button>

        <div className="flex items-center gap-1 rounded-[20px] border border-[var(--border)] bg-[rgba(9,15,24,0.7)] p-1 relative z-[100]" style={{ pointerEvents: 'auto' }}>
          <button
            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-3)] rounded-xl transition-colors cursor-pointer"
            onClick={async (e) => {
              e.stopPropagation()
              const fullscreen = await toggleDesktopWindowFullscreen()
              setIsFullscreen(fullscreen)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Shrink size={11} /> : <Expand size={11} />}
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-3)] rounded-xl transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); void minimizeDesktopWindow() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Minimize"
          >
            <Minus size={12} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-3)] rounded-xl transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); void toggleDesktopWindowMaximize() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Maximize or restore"
          >
            <Square size={10} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:bg-[rgba(255,71,87,0.15)] hover:text-[var(--error)] rounded-xl transition-colors cursor-pointer"
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
