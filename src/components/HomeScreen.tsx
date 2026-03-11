'use client'

import Image from 'next/image'
import { useStore } from '@/store/useStore'
import { Terminal, Zap, ArrowRight, Kanban, Bot, FileText, Sparkles } from 'lucide-react'

export function HomeScreen() {
  const { setView, setWizardStep, showOnStartup, setShowOnStartup } = useStore()

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-10">
        <div className="mx-auto w-full max-w-[980px]">
        {/* Logo + Title */}
        <div className="text-center mb-10 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center gap-3 rounded-[26px] px-5 py-3 premium-panel premium-card-shell">
            <div className="relative h-14 w-14 overflow-hidden rounded-[18px] ring-1 ring-white/10 shadow-[0_0_36px_rgba(79,140,255,0.18)]">
              <Image src="/LOGO.png" alt="SloerSpace" width={56} height={56} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)]" />
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>SloerSpace</div>
              <div className="mt-1 text-[30px] font-bold leading-none" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                SloerSpace
              </div>
            </div>
          </div>
          <h1 className="mt-7 text-[38px] font-bold mb-3 md:text-[46px]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.05em' }}>
            Build the future.
          </h1>
          <p className="text-[14px] max-w-md mx-auto leading-7" style={{ color: 'var(--text-secondary)' }}>
            Choose how you want to work. Premium desktop terminals, dense layout templates and coordinated execution surfaces built for serious delivery.
          </p>
        </div>

        {/* 3 Action Cards */}
        <div className="grid grid-cols-1 gap-5 mb-10 max-w-[760px] mx-auto w-full sm:grid-cols-2">
          {[
            {
              id: 'workspace-wizard' as const,
              icon: Terminal,
              label: 'SloerSpace',
              eyebrow: 'workspace',
              desc: 'Open a terminal workspace. Split into grids, add AI agents and run everything side by side.',
              shortcut: 'Ctrl+T',
              accent: 'linear-gradient(90deg, rgba(79,140,255,0.98), rgba(40,231,197,0.84))',
              glow: 'radial-gradient(circle at top right, rgba(79,140,255,0.24), transparent 52%)',
            },
            {
              id: 'swarm-launch' as const,
              icon: Zap,
              label: 'SloerSwarm',
              eyebrow: 'multi-agent',
              desc: 'Launch a coordinated team of agents that work together in parallel. You give the goal, they ship the code.',
              shortcut: 'Ctrl+S',
              accent: 'linear-gradient(90deg, rgba(255,191,98,0.98), rgba(255,111,150,0.84))',
              glow: 'radial-gradient(circle at top right, rgba(255,191,98,0.22), transparent 52%)',
            },
          ].map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => {
                  if (action.id === 'workspace-wizard') {
                    setWizardStep(1)
                  }
                  setView(action.id)
                }}
                className="group relative overflow-hidden rounded-[30px] p-6 md:p-7 text-left premium-panel premium-card-shell premium-interactive premium-shine"
              >
                <div className="absolute inset-x-0 top-0 h-px opacity-95" style={{ background: action.accent }} />
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: action.glow }} />
                <div className="relative z-10">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 shadow-[0_18px_40px_rgba(79,140,255,0.16)]" style={{ background: 'rgba(6,10,18,0.88)' }}>
                      <Icon size={18} style={{ color: action.id === 'workspace-wizard' ? 'var(--accent)' : 'var(--warning)' }} />
                    </div>
                    <div className="premium-kbd">{action.shortcut}</div>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>{action.eyebrow}</div>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{action.label}</h3>
                  <p className="mt-4 text-[12px] leading-7" style={{ color: 'var(--text-secondary)' }}>{action.desc}</p>
                  <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold" style={{ color: action.id === 'workspace-wizard' ? 'var(--accent)' : 'var(--warning)' }}>
                    Open surface <ArrowRight size={14} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Quick Navigation */}
        <div className="mb-8 max-w-[860px] mx-auto animate-fade-in-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>
            <Sparkles size={12} style={{ color: 'var(--warning)' }} />
            Operational Surfaces
          </div>
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
                className="w-full flex items-center gap-3 px-4 py-3 transition-all rounded-[20px] premium-panel premium-interactive"
                style={{ marginBottom: '10px' }}
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
        <div className="flex flex-col items-center gap-4 mt-8 animate-fade-in-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
          <div className="flex flex-wrap items-center justify-center gap-5 text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><span className="premium-kbd text-[8px]">Ctrl+N</span> New Terminal</span>
            <span className="flex items-center gap-1"><span className="premium-kbd text-[8px]">Ctrl+D</span> Split Right</span>
            <span className="flex items-center gap-1"><span className="premium-kbd text-[8px]">Ctrl+,</span> Settings</span>
            <span className="hidden md:flex items-center gap-1"><span className="premium-kbd text-[8px]">Ctrl+K</span> Command Palette</span>
          </div>
          <button
            onClick={() => setShowOnStartup(!showOnStartup)}
            className="flex items-center gap-2 text-[10px] font-medium px-4 py-2 rounded-full transition-all premium-panel premium-interactive"
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
    </div>
  )
}
