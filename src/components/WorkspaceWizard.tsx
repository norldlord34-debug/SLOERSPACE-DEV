'use client'

import { getDefaultWorkingDirectory, getAgentCliResolutions, isTauriApp, openFolderDialog } from '@/lib/desktop'
import { useStore, AgentCli, generateId } from '@/store/useStore'
import type { WorkspacePreset } from '@/store/appStore'
import { useEffect, useRef, useState } from 'react'
import {
  Zap, FolderOpen, Minus, Plus, Terminal, ArrowRight, Rocket, Sparkles,
  Command, Layers3, Cpu, Trash2, BookMarked, ChevronDown, ChevronUp,
} from 'lucide-react'
import { CliLogo, getCliBrand } from '@/components/CliLogo'

const LAYOUTS = [
  { count: 1, label: 'Single', cols: 1, rows: 1, title: 'Single Terminal', description: 'One terminal (default)' },
  { count: 2, label: '2 Sessions', cols: 2, rows: 1, title: '2 Terminals', description: 'Side-by-side horizontal split' },
  { count: 4, label: '4 Sessions', cols: 2, rows: 2, title: '4 Terminals', description: '2 × 2 execution grid' },
  { count: 6, label: '6 Sessions', cols: 3, rows: 2, title: '6 Terminals', description: '3 × 2 execution grid' },
  { count: 8, label: '8 Sessions', cols: 4, rows: 2, title: '8 Terminals', description: '4 × 2 execution grid' },
  { count: 10, label: '10 Sessions', cols: 5, rows: 2, title: '10 Terminals', description: '5 × 2 execution grid' },
  { count: 12, label: '12 Sessions', cols: 4, rows: 3, title: '12 Terminals', description: '4 × 3 execution grid' },
  { count: 14, label: '14 Sessions', cols: 7, rows: 2, title: '14 Terminals', description: '7 × 2 execution grid' },
  { count: 16, label: '16 Sessions', cols: 4, rows: 4, title: '16 Terminals', description: '4 × 4 execution grid' },
] as const

type AgentDef = { id: AgentCli; label: string; desc: string }
const AGENTS: AgentDef[] = [
  { id: 'claude', label: 'Claude', desc: 'claude' },
  { id: 'codex', label: 'Codex', desc: 'codex' },
  { id: 'gemini', label: 'Gemini', desc: 'gemini' },
  { id: 'opencode', label: 'OpenCode', desc: 'opencode' },
  { id: 'cursor', label: 'Cursor', desc: 'cursor' },
  { id: 'droid', label: 'Droid', desc: 'droid' },
  { id: 'copilot', label: 'Copilot', desc: 'copilot' },
]
const VISIBLE_AGENTS = AGENTS.slice(0, 4)
const HIDDEN_AGENTS = AGENTS.slice(4)
const EMPTY_AGENT_CONFIG = (): Record<AgentCli, number> => ({
  claude: 0, codex: 0, gemini: 0, opencode: 0, cursor: 0, droid: 0, copilot: 0,
})

function WizardProgressBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1 rounded-full flex-1 transition-all duration-300"
          style={{ background: i < current ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }} />
      ))}
    </div>
  )
}

function LayoutGlyph({ layout, active }: { layout: typeof LAYOUTS[number]; active: boolean }) {
  const cellCount = Math.min(layout.count, layout.cols * layout.rows)
  const width = Math.min(74, Math.max(38, layout.cols * 11))
  return (
    <div className="grid gap-[3px]"
      style={{ width, gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${layout.rows}, 8px)` }}>
      {Array.from({ length: cellCount }).map((_, index) => (
        <div key={`${layout.count}-${index}`} className="rounded-[4px] transition-all"
          style={{
            background: active ? 'linear-gradient(180deg, rgba(79,140,255,0.88), rgba(99,170,255,0.72))' : 'rgba(255,255,255,0.12)',
            boxShadow: active ? '0 0 14px rgba(79,140,255,0.18)' : 'none',
            border: `1px solid ${active ? 'rgba(163,209,255,0.18)' : 'rgba(255,255,255,0.04)'}`,
          }}
        />
      ))}
    </div>
  )
}

function AgentRow({
  agent, count, maxSlots, usedSlots, onSet,
}: { agent: AgentDef; count: number; maxSlots: number; usedSlots: number; onSet: (v: number) => void }) {
  const brand = getCliBrand(agent.id)
  const active = count > 0
  const remaining = maxSlots - usedSlots
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all"
      style={{ background: active ? 'rgba(255,255,255,0.04)' : 'transparent', border: `1px solid ${active ? 'rgba(163,209,255,0.15)' : 'var(--border)'}` }}>
      <button
        onClick={() => onSet(active ? 0 : Math.min(1, remaining + (active ? count : 0)))}
        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all"
        style={{ background: active ? brand.color : 'rgba(255,255,255,0.08)', border: `2px solid ${active ? brand.color : 'rgba(255,255,255,0.15)'}` }}
      >
        {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </button>
      <div className="flex h-8 w-8 items-center justify-center rounded-[14px] shrink-0"
        style={{ background: active ? brand.color + '22' : 'rgba(15,24,37,0.8)', boxShadow: active ? `0 4px 16px ${brand.color}18` : 'none' }}>
        <CliLogo cli={agent.id} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{agent.label}</div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{agent.desc}</div>
      </div>
      <button onClick={() => onSet(maxSlots)} className="btn-secondary text-[9px] px-2.5 py-1.5 font-bold uppercase tracking-wider shrink-0">
        All {maxSlots}
      </button>
      <div className="flex items-center gap-0.5 rounded-2xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-0.5 shrink-0">
        <button onClick={() => count > 0 && onSet(count - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-secondary)' }}>
          <Minus size={11} />
        </button>
        <span className="w-7 text-center font-mono text-[12px] font-bold" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{count}</span>
        <button onClick={() => remaining > 0 && onSet(count + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-3)]"
          style={{ color: 'var(--text-secondary)' }}>
          <Plus size={11} />
        </button>
      </div>
    </div>
  )
}

function CustomCommandRow({
  count, cmd, maxSlots, usedSlots, onSetCount, onSetCmd,
}: { count: number; cmd: string; maxSlots: number; usedSlots: number; onSetCount: (v: number) => void; onSetCmd: (v: string) => void }) {
  const active = count > 0
  const remaining = maxSlots - usedSlots
  return (
    <div className="rounded-2xl transition-all overflow-hidden"
      style={{ background: active ? 'rgba(255,255,255,0.03)' : 'transparent', border: `1px solid ${active ? 'rgba(163,209,255,0.15)' : 'var(--border)'}` }}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={() => onSetCount(active ? 0 : Math.min(1, remaining + (active ? count : 0)))}
          className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all"
          style={{ background: active ? '#a78bfa' : 'rgba(255,255,255,0.08)', border: `2px solid ${active ? '#a78bfa' : 'rgba(255,255,255,0.15)'}` }}
        >
          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-[14px] shrink-0"
          style={{ background: active ? 'rgba(167,139,250,0.15)' : 'rgba(15,24,37,0.8)' }}>
          <Terminal size={14} style={{ color: active ? '#a78bfa' : 'var(--text-muted)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>Custom Command</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Enter any CLI agent or shell command</div>
        </div>
        <button onClick={() => onSetCount(maxSlots)} className="btn-secondary text-[9px] px-2.5 py-1.5 font-bold uppercase tracking-wider shrink-0">
          All {maxSlots}
        </button>
        <div className="flex items-center gap-0.5 rounded-2xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-0.5 shrink-0">
          <button onClick={() => count > 0 && onSetCount(count - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-3)]"
            style={{ color: 'var(--text-secondary)' }}>
            <Minus size={11} />
          </button>
          <span className="w-7 text-center font-mono text-[12px] font-bold" style={{ color: active ? '#a78bfa' : 'var(--text-muted)' }}>{count}</span>
          <button onClick={() => remaining > 0 && onSetCount(count + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface-3)]"
            style={{ color: 'var(--text-secondary)' }}>
            <Plus size={11} />
          </button>
        </div>
      </div>
      <div className="px-3 pb-3">
        <input value={cmd}
          onChange={(e) => {
            onSetCmd(e.target.value)
            if (e.target.value.trim() && count === 0 && remaining > 0) onSetCount(1)
          }}
          placeholder="e.g. aider --yes-always, claude --model sonnet"
          className="w-full rounded-xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-3 py-2 text-[11px] font-mono outline-none placeholder:opacity-40 focus:border-[rgba(167,139,250,0.4)] transition-colors"
          style={{ color: 'var(--text-primary)' }} />
      </div>
    </div>
  )
}

export function WorkspaceWizard() {
  const {
    setView, wizardStep, setWizardStep, wizardLayout, setWizardLayout,
    wizardAgentConfig, setWizardAgentConfig, launchWorkspace,
    workspacePresets, addWorkspacePreset, removeWorkspacePreset,
  } = useStore()

  const [workDir, setWorkDir] = useState('')
  const [pathJump, setPathJump] = useState('')
  const [showMoreAgents, setShowMoreAgents] = useState(false)
  const [customCommand, setCustomCommand] = useState('')
  const [customCommandCount, setCustomCommandCount] = useState(0)

  const [createPresetMode, setCreatePresetMode] = useState(false)
  const [presetStep, setPresetStep] = useState(0)
  const [presetName, setPresetName] = useState('')
  const [presetLayout, setPresetLayout] = useState(1)
  const [presetDir, setPresetDir] = useState('')
  const [presetAgents, setPresetAgents] = useState<Record<AgentCli, number>>(EMPTY_AGENT_CONFIG())
  const [presetCustomCmd, setPresetCustomCmd] = useState('')
  const [presetCustomCmdCount, setPresetCustomCmdCount] = useState(0)
  const [presetShowMore, setPresetShowMore] = useState(false)
  const presetNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let mounted = true
    void getDefaultWorkingDirectory()
      .then((directory) => {
        if (mounted) { setWorkDir(directory); setPathJump(directory) }
      })
      .catch(() => {
        if (mounted) { setWorkDir('C:\\'); setPathJump('C:\\') }
      })
    return () => { mounted = false }
  }, [])

  const totalNamed = Object.values(wizardAgentConfig).reduce((a, b) => a + b, 0)
  const totalAgents = totalNamed + customCommandCount
  const pct = wizardLayout > 0 ? Math.round((totalAgents / wizardLayout) * 100) : 0
  const selectedLayout = LAYOUTS.find((l) => l.count === wizardLayout) ?? LAYOUTS[0]
  const remainingSlots = Math.max(0, wizardLayout - totalAgents)

  const openCreatePreset = () => {
    setPresetName(''); setPresetLayout(1); setPresetDir(workDir)
    setPresetAgents(EMPTY_AGENT_CONFIG()); setPresetCustomCmd('')
    setPresetCustomCmdCount(0); setPresetStep(0); setCreatePresetMode(true)
    setTimeout(() => presetNameRef.current?.focus(), 80)
  }
  const closeCreatePreset = () => { setCreatePresetMode(false); setPresetStep(0) }

  const savePreset = () => {
    if (!presetName.trim()) return
    addWorkspacePreset({
      id: generateId(), name: presetName.trim(), layoutCount: presetLayout,
      workingDirectory: presetDir, agentConfig: presetAgents,
      customCommand: presetCustomCmd, createdAt: new Date().toISOString(),
    })
    closeCreatePreset()
  }

  const applyPreset = (p: WorkspacePreset) => {
    const cfg = EMPTY_AGENT_CONFIG()
    Object.entries(p.agentConfig).forEach(([k, v]) => {
      if (k in cfg) cfg[k as AgentCli] = v as number
    })
    setWizardLayout(p.layoutCount)
    setWizardAgentConfig(cfg)
    launchWorkspace({
      workingDirectory: p.workingDirectory || workDir,
      agentConfig: cfg,
      customBootstrapCommand: p.customCommand?.trim() || undefined,
      name: p.name,
    })
  }

  const presetTotalAgents = Object.values(presetAgents).reduce((a, b) => a + b, 0) + presetCustomCmdCount
  const presetRemaining = Math.max(0, presetLayout - presetTotalAgents)

  const handleFillAction = (mode: 'all' | 'one' | 'even') => {
    const cfg = EMPTY_AGENT_CONFIG()
    if (mode === 'all') {
      cfg.claude = wizardLayout; setCustomCommandCount(0)
    } else if (mode === 'one') {
      AGENTS.forEach((a, i) => { if (i < wizardLayout) cfg[a.id] = 1 })
    } else {
      const each = Math.floor(wizardLayout / AGENTS.length)
      const rem = wizardLayout % AGENTS.length
      AGENTS.forEach((a, i) => { cfg[a.id] = each + (i === 0 ? rem : 0) })
    }
    setWizardAgentConfig(cfg); setCustomCommandCount(0)
  }

  // ── Step 0: Type selection ───────────────────────────────────────────────────
  if (wizardStep === 0) {
    return (
      <div className="h-full overflow-y-auto px-5 py-6 lg:px-7 lg:py-7">
        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="premium-panel-elevated mesh-overlay p-6 md:p-8 xl:p-10 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="premium-chip" style={{ color: 'var(--warning)' }}>
                <Sparkles size={12} /> Workspace Launchpad
              </div>
              <div className="premium-chip">
                <Command size={12} style={{ color: 'var(--accent)' }} /> Premium Creation Flow
              </div>
            </div>
            <div className="max-w-3xl">
              <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Step 01 · Choose Mode</div>
              <h1 className="mt-3 text-4xl md:text-5xl text-hero" style={{ color: 'var(--text-primary)' }}>
                Launch a premium<br />
                <span className="text-gradient">execution surface.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-[14px] leading-8" style={{ color: 'var(--text-secondary)' }}>
                Create a real SloerSpace workspace with multi-pane desktop terminals and agent assignments, or jump into coordinated SloerSwarm execution.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button onClick={() => setWizardStep(1)}
                className="premium-panel group relative overflow-hidden p-6 text-left transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle at top right, rgba(79,140,255,0.22), transparent 48%)' }} />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(79,140,255,0.9),rgba(40,231,197,0.7))] text-[#04111d] shadow-[0_16px_40px_rgba(79,140,255,0.28)]">
                      <Terminal size={22} />
                    </div>
                    <div className="premium-kbd">Ctrl+T</div>
                  </div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace</div>
                  <p className="mt-2 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Multi-pane desktop terminal grid with real shell execution, workspace tabs and optional AI fleet assignment.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                    Create workspace <ArrowRight size={14} />
                  </div>
                </div>
              </button>
              <button onClick={() => setView('swarm-launch')}
                className="premium-panel group relative overflow-hidden p-6 text-left transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle at top right, rgba(255,191,98,0.24), transparent 48%)' }} />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,var(--warning),var(--error))] text-[#160904] shadow-[0_16px_40px_rgba(255,191,98,0.22)]">
                      <Zap size={20} />
                    </div>
                    <div className="premium-kbd">Ctrl+S</div>
                  </div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSwarm</div>
                  <p className="mt-2 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Coordinated multi-agent orchestration with execution telemetry, mission context and role-based collaboration.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold" style={{ color: 'var(--warning)' }}>
                    Open swarm flow <ArrowRight size={14} />
                  </div>
                </div>
              </button>
            </div>
            <button onClick={() => { setWizardLayout(1); setWizardStep(1) }}
              className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold transition-all"
              style={{ color: 'var(--text-secondary)' }}>
              <span className="premium-kbd">1</span> Quick terminal workspace
            </button>
          </div>
          <div className="grid gap-5">
            <div className="premium-panel p-5 md:p-6 animate-fade-in-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                <Layers3 size={12} style={{ color: 'var(--accent)' }} /> What you get
              </div>
              <div className="space-y-3">
                {[
                  { title: 'Session-isolated workspaces', desc: 'Each tab preserves its own panes, commands and runtime context.' },
                  { title: 'Real desktop command layer', desc: 'Commands run through Tauri instead of mock outputs, with real working directories.' },
                  { title: 'Premium shell ergonomics', desc: 'Large surfaces, glass materials and cockpit hierarchy built for focus.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="rounded-[22px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-4">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</div>
                    <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="premium-panel p-5 md:p-6 animate-fade-in-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                <Cpu size={12} style={{ color: 'var(--warning)' }} /> Ready Stack
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[['Frontend', 'Next.js 14'], ['Runtime', 'React 18'], ['Desktop', 'Tauri']].map(([label, val]) => (
                  <div key={label} className="premium-stat px-3 py-3">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    <div className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  // ── Create Preset sub-wizard ─────────────────────────────────────────────────
  if (createPresetMode) {
    const presetSelectedLayout = LAYOUTS.find((l) => l.count === presetLayout) ?? LAYOUTS[0]
    return (
      <div className="h-full flex items-center justify-center px-4 py-6" style={{ background: 'var(--surface-0)' }}>
        <div className="w-full max-w-[680px] premium-panel-elevated p-7 md:p-9 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <WizardProgressBar total={3} current={presetStep} />

          {presetStep === 0 && (
            <>
              <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk',sans-serif" }}>Create Preset</h2>
              <p className="text-center text-[13px] mb-8" style={{ color: 'var(--text-muted)' }}>Name your preset and choose a layout.</p>
              <div className="mb-4">
                <div className="label mb-2">PRESET NAME</div>
                <input ref={presetNameRef} value={presetName} onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g. My Fleet, Full Stack Setup…"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-4 py-3 text-[14px] outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onKeyDown={(e) => e.key === 'Enter' && presetName.trim() && setPresetStep(1)} />
              </div>
              <div>
                <div className="label mb-2">
                  LAYOUT TEMPLATE{' '}
                  <span style={{ color: 'var(--accent)' }}>
                    {presetSelectedLayout.count === 1 ? '1 TERMINAL' : `${presetSelectedLayout.count} TERMINALS`}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {LAYOUTS.map((l) => {
                    const sel = presetLayout === l.count
                    return (
                      <button key={l.count} onClick={() => setPresetLayout(l.count)}
                        className="rounded-2xl p-2.5 text-center transition-all"
                        style={{
                          background: sel ? 'linear-gradient(180deg,rgba(79,140,255,0.18),rgba(40,231,197,0.06))' : 'rgba(9,15,24,0.72)',
                          border: `1px solid ${sel ? 'rgba(79,140,255,0.4)' : 'var(--border)'}`,
                        }}>
                        <div className="mb-2 flex h-10 items-center justify-center rounded-xl" style={{ background: sel ? 'rgba(8,16,28,0.8)' : 'rgba(255,255,255,0.03)' }}>
                          <LayoutGlyph layout={l} active={sel} />
                        </div>
                        <div className="text-[9px] font-semibold" style={{ color: sel ? 'var(--text-primary)' : 'var(--text-muted)' }}>{l.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button onClick={closeCreatePreset} className="btn-ghost text-[11px] uppercase tracking-[0.16em]">Cancel</button>
                <button onClick={() => setPresetStep(1)} disabled={!presetName.trim()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40">
                  Next <ArrowRight size={13} />
                </button>
              </div>
            </>
          )}

          {presetStep === 1 && (
            <>
              <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk',sans-serif" }}>Working Directory</h2>
              <p className="text-center text-[13px] mb-8" style={{ color: 'var(--text-muted)' }}>Choose the default directory for this preset. You can skip this.</p>
              <div className="premium-panel p-4 space-y-3">
                <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-4 py-3">
                  <FolderOpen size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <input value={presetDir} onChange={(e) => setPresetDir(e.target.value)}
                    className="flex-1 bg-transparent text-[12px] font-mono outline-none" style={{ color: 'var(--text-primary)' }} />
                  <button className="btn-secondary text-[10px] px-3 py-1.5"
                    onClick={() => void openFolderDialog(presetDir || undefined).then((p) => { if (p) setPresetDir(p) })}>
                    Browse
                  </button>
                </div>
                <div className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-4 py-2.5">
                  <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>~ $</span>
                  <input placeholder="cd ../other-project" onChange={(e) => { if (e.target.value.trim()) setPresetDir(e.target.value.replace(/^cd\s+/i, '').trim()) }}
                    className="flex-1 bg-transparent text-[12px] font-mono outline-none placeholder:opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setPresetStep(0)} className="btn-ghost text-[11px] uppercase tracking-[0.16em]">Back</button>
                <button onClick={() => setPresetStep(2)} className="btn-primary flex items-center gap-2">Next <ArrowRight size={13} /></button>
              </div>
            </>
          )}

          {presetStep === 2 && (
            <>
              <h2 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk',sans-serif" }}>Configure Agents</h2>
              <p className="text-center text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
                Assign agents across your {presetLayout} terminal session{presetLayout !== 1 ? 's' : ''}.
              </p>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1.5">
                  {(['all', 'one', 'even'] as const).map((m) => (
                    <button key={m} className="btn-secondary text-[9px] px-3 py-1.5 font-bold uppercase tracking-wider" onClick={() => {
                      const cfg = EMPTY_AGENT_CONFIG()
                      if (m === 'all') { cfg.claude = presetLayout }
                      else if (m === 'one') { AGENTS.forEach((a, i) => { if (i < presetLayout) cfg[a.id] = 1 }) }
                      else { const e = Math.floor(presetLayout / AGENTS.length), r = presetLayout % AGENTS.length; AGENTS.forEach((a, i) => { cfg[a.id] = e + (i === 0 ? r : 0) }) }
                      setPresetAgents(cfg); setPresetCustomCmdCount(0)
                    }}>
                      {m === 'all' ? 'Select All' : m === 'one' ? '1 Each' : 'Fill Evenly'}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{presetTotalAgents}/{presetLayout} slots</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {(presetShowMore ? AGENTS : VISIBLE_AGENTS).map((agent) => {
                  const cnt = presetAgents[agent.id] ?? 0
                  const active = cnt > 0
                  const brand = getCliBrand(agent.id)
                  return (
                    <div key={agent.id} className="flex items-center gap-2 px-3 py-2 rounded-2xl transition-all"
                      style={{ background: active ? 'rgba(255,255,255,0.04)' : 'transparent', border: `1px solid ${active ? 'rgba(163,209,255,0.14)' : 'var(--border)'}` }}>
                      <input type="checkbox" checked={active} onChange={() => {
                        const cfg = { ...presetAgents }
                        cfg[agent.id] = active ? 0 : Math.min(1, presetRemaining + cnt)
                        setPresetAgents(cfg)
                      }} className="w-3.5 h-3.5 rounded accent-[var(--accent)] cursor-pointer shrink-0" />
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg shrink-0"
                        style={{ background: active ? brand.color + '22' : 'rgba(15,24,37,0.8)' }}>
                        <CliLogo cli={agent.id} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{agent.label}</div>
                      </div>
                      <div className="flex items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-0.5 shrink-0">
                        <button onClick={() => { const c = { ...presetAgents }; c[agent.id] = Math.max(0, cnt - 1); setPresetAgents(c) }}
                          className="flex h-5 w-5 items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                          <Minus size={9} />
                        </button>
                        <span className="w-5 text-center font-mono text-[10px] font-bold" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{cnt}</span>
                        <button onClick={() => { if (presetRemaining > 0) { const c = { ...presetAgents }; c[agent.id] = cnt + 1; setPresetAgents(c) } }}
                          className="flex h-5 w-5 items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                          <Plus size={9} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setPresetShowMore(!presetShowMore)}
                className="w-full py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-center transition-colors mb-3"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                {presetShowMore ? 'Show Fewer' : `Show ${HIDDEN_AGENTS.length} More Agents`}
              </button>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <input type="checkbox" checked={presetCustomCmdCount > 0}
                    onChange={() => setPresetCustomCmdCount(presetCustomCmdCount > 0 ? 0 : Math.min(1, presetRemaining + presetCustomCmdCount))}
                    className="w-3.5 h-3.5 rounded accent-[var(--accent)] cursor-pointer shrink-0" />
                  <Terminal size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Custom Command</div>
                    <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Enter any CLI agent or shell command</div>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-0.5 shrink-0">
                    <button onClick={() => setPresetCustomCmdCount(Math.max(0, presetCustomCmdCount - 1))}
                      className="flex h-5 w-5 items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                      <Minus size={9} />
                    </button>
                    <span className="w-5 text-center font-mono text-[10px] font-bold"
                      style={{ color: presetCustomCmdCount > 0 ? '#a78bfa' : 'var(--text-muted)' }}>
                      {presetCustomCmdCount}
                    </span>
                    <button onClick={() => { if (presetRemaining > 0) setPresetCustomCmdCount(presetCustomCmdCount + 1) }}
                      className="flex h-5 w-5 items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                      <Plus size={9} />
                    </button>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <input value={presetCustomCmd} onChange={(e) => setPresetCustomCmd(e.target.value)}
                    placeholder="e.g. aider --yes-always, claude --model sonnet"
                    className="w-full rounded-xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-3 py-2 text-[10px] font-mono outline-none placeholder:opacity-40"
                    style={{ color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setPresetStep(1)} className="btn-ghost text-[11px] uppercase tracking-[0.16em]">Back</button>
                <button onClick={savePreset} disabled={!presetName.trim()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40">
                  <BookMarked size={13} /> Save Preset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Step 1: Configure Layout ─────────────────────────────────────────────────
  if (wizardStep === 1) {
    return (
      <div className="h-full overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
        <div className="mx-auto flex h-full max-w-[1240px] flex-col premium-panel-elevated premium-card-shell p-5 md:p-6 xl:p-7 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <WizardProgressBar total={2} current={1} />
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk',sans-serif" }}>Configure Layout</h1>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Select a template and working directory.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
              <Layers3 size={11} />{wizardLayout} pane{wizardLayout !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
              <div className="premium-panel p-4 shrink-0">
                <div className="label mb-2">WORKING DIRECTORY</div>
                <div className="flex items-center gap-2 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-3 py-2.5">
                  <FolderOpen size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <input type="text" value={workDir} onChange={(e) => { setWorkDir(e.target.value); setPathJump(e.target.value) }}
                    className="flex-1 bg-transparent text-[12px] outline-none font-mono" style={{ color: 'var(--text-primary)' }} />
                  <button className="btn-secondary text-[9px] px-2.5 py-1.5 uppercase tracking-wider shrink-0"
                    onClick={() => void openFolderDialog(workDir || undefined).then((p) => { if (p) { setWorkDir(p); setPathJump(p) } })}>
                    Browse
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-3 py-2">
                  <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>~ $</span>
                  <input type="text" value={pathJump} onChange={(e) => setPathJump(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && pathJump.trim()) setWorkDir(pathJump.trim()) }}
                    placeholder="cd ../other-project"
                    className="flex-1 bg-transparent text-[11px] outline-none font-mono placeholder:opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <button onClick={() => { if (pathJump.trim()) setWorkDir(pathJump.trim()) }}
                    className="shrink-0 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              <div className="premium-panel p-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(6,10,18,0.96),rgba(4,8,14,0.98))] p-3 shrink-0">
                    <div className="grid gap-1.5" style={{
                      gridTemplateColumns: `repeat(${selectedLayout.cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${selectedLayout.rows}, 18px)`,
                      width: Math.min(84, selectedLayout.cols * 16),
                    }}>
                      {Array.from({ length: wizardLayout }).map((_, i) => (
                        <div key={i} className="rounded-[5px] border border-[rgba(163,209,255,0.14)]"
                          style={{ background: `linear-gradient(180deg, rgba(79,140,255,${0.18 + i * 0.012}), rgba(40,231,197,0.05))` }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk',sans-serif" }}>{selectedLayout.title}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selectedLayout.description}</div>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <div className="label mb-2 flex items-center gap-1">
                  <BookMarked size={10} /> PRESETS
                </div>
                <div className="flex flex-wrap gap-2">
                  {workspacePresets.map((preset) => (
                    <div key={preset.id}
                      className="group relative cursor-pointer rounded-2xl border px-3 py-2 transition-all hover:border-[var(--accent)] min-w-[90px]"
                      style={{ background: 'rgba(9,15,24,0.72)', borderColor: 'var(--border)' }}
                      onClick={() => applyPreset(preset)}>
                      <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{preset.name}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {preset.layoutCount === 1 ? 'Single' : `${preset.layoutCount} Sessions`}
                      </div>
                      <div className="text-[8px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        {preset.workingDirectory.split(/[\\/]/).pop() || preset.workingDirectory}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeWorkspacePreset(preset.id) }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                        style={{ color: 'var(--text-muted)' }}>
                        <Trash2 size={9} />
                      </button>
                    </div>
                  ))}
                  <button onClick={openCreatePreset}
                    className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-3 py-2 min-w-[90px] transition-all hover:border-[var(--accent)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <Plus size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">New Preset</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="label mb-1">LAYOUT TEMPLATES</div>
              <div className="grid grid-cols-3 gap-2 flex-1 content-start">
                {LAYOUTS.map((layout) => {
                  const selected = wizardLayout === layout.count
                  return (
                    <button key={layout.count} onClick={() => setWizardLayout(layout.count)}
                      className="rounded-[20px] p-3 text-center transition-all hover-lift-3d"
                      style={{
                        background: selected ? 'linear-gradient(180deg,rgba(79,140,255,0.16),rgba(40,231,197,0.08))' : 'rgba(9,15,24,0.72)',
                        border: `1px solid ${selected ? 'rgba(79,140,255,0.38)' : 'var(--border)'}`,
                        boxShadow: selected ? '0 14px 36px rgba(79,140,255,0.14)' : 'none',
                      }}>
                      <div className="mb-2.5 flex h-11 items-center justify-center rounded-[14px]"
                        style={{ background: selected ? 'rgba(8,16,28,0.78)' : 'rgba(255,255,255,0.03)' }}>
                        <LayoutGlyph layout={layout} active={selected} />
                      </div>
                      <div className="text-[10px] font-semibold" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {layout.label}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
            <button onClick={() => { setWizardStep(0); setView('home') }} className="btn-ghost text-[11px] uppercase tracking-[0.16em]">Cancel</button>
            <button onClick={() => setWizardStep(2)} className="btn-primary flex items-center gap-2" disabled={!workDir.trim()}>
              Configure Agents <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: AI Agent Fleet ───────────────────────────────────────────────────
  return (
    <div className="h-full overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
      <div className="mx-auto h-full max-w-[1240px] grid gap-4 xl:grid-cols-[1fr_260px] animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <div className="premium-panel-elevated flex min-h-0 flex-col p-5 md:p-6">
          <WizardProgressBar total={2} current={2} />
          <h1 className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk',sans-serif" }}>AI Agent Fleet</h1>
          <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>
            Provision agents for your {wizardLayout} terminal session{wizardLayout !== 1 ? 's' : ''}.
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {(['all', 'one', 'even'] as const).map((m) => (
              <button key={m} className="btn-secondary text-[10px] px-3 py-1.5 font-bold uppercase tracking-wider"
                onClick={() => handleFillAction(m)}>
                {m === 'all' ? 'Select All' : m === 'one' ? '1 Each' : 'Fill Evenly'}
              </button>
            ))}
            {totalAgents > 0 && (
              <button onClick={() => { setWizardAgentConfig(EMPTY_AGENT_CONFIG()); setCustomCommandCount(0) }}
                className="btn-ghost text-[10px] px-3 py-1.5 font-bold uppercase tracking-wider" style={{ color: 'var(--error)' }}>
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {VISIBLE_AGENTS.map((agent) => (
              <AgentRow key={agent.id} agent={agent} count={wizardAgentConfig[agent.id] ?? 0}
                maxSlots={wizardLayout} usedSlots={totalAgents}
                onSet={(v) => { const c = { ...wizardAgentConfig }; c[agent.id] = v; setWizardAgentConfig(c) }} />
            ))}

            <button onClick={() => setShowMoreAgents(!showMoreAgents)}
              className="w-full py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {showMoreAgents ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showMoreAgents ? 'Show Fewer' : `Show ${HIDDEN_AGENTS.length} More Agents`}
            </button>

            {showMoreAgents && HIDDEN_AGENTS.map((agent) => (
              <AgentRow key={agent.id} agent={agent} count={wizardAgentConfig[agent.id] ?? 0}
                maxSlots={wizardLayout} usedSlots={totalAgents}
                onSet={(v) => { const c = { ...wizardAgentConfig }; c[agent.id] = v; setWizardAgentConfig(c) }} />
            ))}

            <CustomCommandRow count={customCommandCount} cmd={customCommand}
              maxSlots={wizardLayout} usedSlots={totalAgents}
              onSetCount={setCustomCommandCount} onSetCmd={setCustomCommand} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="premium-panel p-5">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-muted)' }}>FLEET UTILIZATION</div>
            <div className="premium-stat px-4 py-4 mb-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[36px] font-bold leading-none" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk',sans-serif" }}>
                  {totalAgents}
                </span>
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/ {wizardLayout} slots</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)' }} />
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-3 space-y-2">
              <div className="flex items-center gap-2 text-[11px]" style={{ color: totalAgents > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: totalAgents > 0 ? 'var(--success)' : 'var(--text-muted)' }} />
                {totalAgents > 0 ? 'Fleet configured' : 'No agents selected'}
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--text-muted)' }} />
                {remainingSlots === 0 ? 'All slots filled' : `${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining`}
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--text-muted)' }} />
                Optimal slot density
              </div>
            </div>
          </div>

          <div className="premium-panel p-4 space-y-2">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-muted)' }}>Launch</div>
            <button onClick={() => launchWorkspace({ workingDirectory: workDir, agentConfig: EMPTY_AGENT_CONFIG() })}
              className="btn-secondary w-full text-[11px] flex items-center justify-center gap-2">
              <Terminal size={13} /> Without Agents
            </button>
            <button onClick={async () => {
              let bootstrapCommands: Partial<Record<AgentCli, string | null>> | undefined
              if (isTauriApp() && totalNamed > 0) {
                try {
                  const cliIds = Object.entries(wizardAgentConfig).filter(([, c]) => c > 0).map(([cli]) => cli)
                  const resolutions = await getAgentCliResolutions(cliIds)
                  bootstrapCommands = Object.fromEntries(resolutions.map((r) => [r.cli, r.bootstrapCommand])) as Partial<Record<AgentCli, string | null>>
                } catch { /* proceed without bootstrap */ }
              }
              launchWorkspace({
                workingDirectory: workDir,
                agentBootstrapCommands: bootstrapCommands,
                customBootstrapCommand: customCommandCount > 0 && customCommand.trim() ? customCommand.trim() : undefined,
              })
            }} className="btn-primary w-full text-[11px] flex items-center justify-center gap-2" disabled={!workDir.trim()}>
              <Rocket size={13} /> Launch Workspace
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <button onClick={() => setWizardStep(1)} className="btn-ghost text-[10px] uppercase tracking-[0.14em]">Back</button>
            <button onClick={() => launchWorkspace({ workingDirectory: workDir, agentConfig: EMPTY_AGENT_CONFIG() })}
              className="btn-ghost text-[10px] uppercase tracking-[0.14em]">
              Skip Agents
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
