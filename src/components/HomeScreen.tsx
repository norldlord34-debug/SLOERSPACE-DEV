'use client'

import { useStore } from '@/store/useStore'
import { Terminal, Zap, FolderOpen, ArrowRight, Kanban, Bot, FileText } from 'lucide-react'

export function HomeScreen() {
  const { setView, showOnStartup, setShowOnStartup } = useStore()

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-8 py-8 lg:px-12 max-w-[960px] mx-auto w-full">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 overflow-hidden rounded-[18px] ring-1 ring-white/10 shadow-[0_0_30px_rgba(79,140,255,0.15)]">
            <img src="/LOGO.png" alt="SloerSpace" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-[26px] font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            Build the future.
          </h1>
          <p className="text-[13px] max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Terminal-native workspaces, branded around speed, focus, and coordinated execution.
          </p>
        </div>

        {/* 3 Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { id: 'workspace-wizard' as const, icon: Terminal, label: 'New Workspace', desc: 'Spin up a fresh terminal canvas and start building immediately.', shortcut: '⌘T' },
            { id: 'swarm-launch' as const, icon: Zap, label: 'SloerSwarm', desc: 'Launch a coordinated agent workspace for parallel execution.', shortcut: '⌘S' },
            { id: 'workspace-wizard' as const, icon: FolderOpen, label: 'Open Folder', desc: 'Drop into an existing project and keep momentum without setup friction.', shortcut: '⌘O' },
          ].map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => setView(action.id)}
                className="group relative rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(10,17,28,0.7)', border: '1px solid var(--border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(79,140,255,0.1)' }}>
                    <Icon size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>{action.shortcut}</span>
                </div>
                <h3 className="text-[14px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{action.label}</h3>
                <p className="text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>{action.desc}</p>
              </button>
            )
          })}
        </div>

        {/* Quick Navigation */}
        <div className="mb-8">
          {[
            { view: 'kanban' as const, icon: Kanban, label: 'Kanban Board', desc: 'Open delivery board' },
            { view: 'agents' as const, icon: Bot, label: 'AI Agents', desc: 'Open agent library' },
            { view: 'prompts' as const, icon: FileText, label: 'Prompt Library', desc: 'Open prompt system' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all rounded-xl"
                style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(79,140,255,0.08)' }}>
                  <Icon size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="flex items-center gap-5 text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><span className="premium-kbd text-[8px]">⌘P</span> Search Files</span>
            <span className="flex items-center gap-1"><span className="premium-kbd text-[8px]">⌘D</span> Split Right</span>
            <span className="flex items-center gap-1"><span className="premium-kbd text-[8px]">⌘,</span> Settings</span>
          </div>
          <button
            onClick={() => setShowOnStartup(!showOnStartup)}
            className="flex items-center gap-2 text-[10px] font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.03)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="w-3 h-3 rounded flex items-center justify-center" style={{ background: showOnStartup ? 'var(--accent)' : 'transparent', border: `1.5px solid ${showOnStartup ? 'var(--accent)' : 'var(--text-muted)'}` }}>
              {showOnStartup && <span className="text-white text-[7px]">✓</span>}
            </span>
            Show on startup
          </button>
        </div>
      </div>
    </div>
  )
}
