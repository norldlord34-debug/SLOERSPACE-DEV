'use client'

import Image from 'next/image'
import { getDefaultWorkingDirectory, getAgentCliResolutions, isTauriApp, openFolderDialog } from '@/lib/desktop'
import { useStore, AgentCli } from '@/store/useStore'
import { useEffect, useState } from 'react'
import { Zap, FolderOpen, Minus, Plus, Terminal, ArrowRight, Rocket, Bot, Check, Sparkles, Command, Layers3, Cpu } from 'lucide-react'

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

const AGENTS: { id: AgentCli; label: string; desc: string }[] = [
  { id: 'claude', label: 'Claude', desc: 'Anthropic' },
  { id: 'codex', label: 'Codex CLI', desc: 'OpenAI' },
  { id: 'gemini', label: 'Gemini CLI', desc: 'Google' },
  { id: 'opencode', label: 'OpenCode', desc: 'TUI' },
  { id: 'cursor', label: 'Cursor', desc: 'Agent' },
]

function StepBar({ step }: { step: number }) {
  const steps = ['Type', 'Layout', 'Agents']

  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-all"
            style={{
              background: i <= step ? 'linear-gradient(135deg, var(--accent), rgba(40,231,197,0.82))' : 'rgba(13,21,34,0.72)',
              color: i <= step ? '#04111d' : 'var(--text-muted)',
              border: `1px solid ${i <= step ? 'rgba(163,209,255,0.18)' : 'var(--border)'}`,
              boxShadow: i === step ? '0 0 20px rgba(79,140,255,0.18)' : 'none',
            }}
          >
            {i < step ? <Check size={12} /> : i + 1}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s}</span>
          {i < steps.length - 1 && <div className="h-px w-10" style={{ background: i < step ? 'linear-gradient(90deg, var(--accent), var(--secondary))' : 'var(--surface-4)' }} />}
        </div>
      ))}
    </div>
  )
}

function LayoutGlyph({ layout, active }: { layout: typeof LAYOUTS[number]; active: boolean }) {
  const cellCount = Math.min(layout.count, layout.cols * layout.rows)
  const width = Math.min(74, Math.max(38, layout.cols * 11))

  return (
    <div
      className="grid gap-[3px]"
      style={{
        width,
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, 8px)`,
      }}
    >
      {Array.from({ length: cellCount }).map((_, index) => (
        <div
          key={`${layout.count}-${index}`}
          className="rounded-[4px] transition-all"
          style={{
            background: active
              ? 'linear-gradient(180deg, rgba(79,140,255,0.88), rgba(99,170,255,0.72))'
              : 'rgba(255,255,255,0.12)',
            boxShadow: active ? '0 0 14px rgba(79,140,255,0.18)' : 'none',
            border: `1px solid ${active ? 'rgba(163,209,255,0.18)' : 'rgba(255,255,255,0.04)'}`,
          }}
        />
      ))}
    </div>
  )
}

export function WorkspaceWizard() {
  const { setView, wizardStep, setWizardStep, wizardLayout, setWizardLayout, wizardAgentConfig, setWizardAgentConfig, launchWorkspace } = useStore()
  const [workDir, setWorkDir] = useState('')
  const [pathJump, setPathJump] = useState('')

  useEffect(() => {
    let mounted = true

    void getDefaultWorkingDirectory()
      .then((directory) => {
        if (mounted) {
          setWorkDir(directory)
          setPathJump(directory)
        }
      })
      .catch(() => {
        if (mounted) {
          setWorkDir('C:\\')
          setPathJump('C:\\')
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const totalAgents = Object.values(wizardAgentConfig).reduce((a, b) => a + b, 0)
  const pct = wizardLayout > 0 ? Math.round((totalAgents / wizardLayout) * 100) : 0
  const selectedLayout = LAYOUTS.find((layout) => layout.count === wizardLayout) ?? LAYOUTS[0]
  const previewColumns = selectedLayout.cols
  const previewRows = selectedLayout.rows
  const remainingSlots = Math.max(0, wizardLayout - totalAgents)

  if (wizardStep === 0) {
    return (
      <div className="h-full overflow-y-auto px-5 py-6 lg:px-7 lg:py-7">
        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="premium-panel-elevated mesh-overlay p-6 md:p-8 xl:p-10 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="premium-chip" style={{ color: 'var(--warning)' }}>
                <Sparkles size={12} />
                Workspace Launchpad
              </div>
              <div className="premium-chip">
                <Command size={12} style={{ color: 'var(--accent)' }} />
                Premium Creation Flow
              </div>
            </div>

            <div className="max-w-3xl">
              <StepBar step={0} />
              <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Step 01 · Choose Mode</div>
              <h1 className="mt-3 text-4xl md:text-5xl text-hero" style={{ color: 'var(--text-primary)' }}>
                Launch a premium
                <br />
                <span className="text-gradient">execution surface.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-[14px] leading-8" style={{ color: 'var(--text-secondary)' }}>
                Create a real SloerSpace workspace with multi-pane desktop terminals and agent assignments, or jump into coordinated SloerSwarm execution.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button
                onClick={() => { setWizardStep(1) }}
                className="premium-panel group relative overflow-hidden p-6 text-left transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle at top right, rgba(79,140,255,0.22), transparent 48%)' }} />
                <div className="relative z-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-12 w-12 overflow-hidden rounded-[18px] border border-white/10 shadow-[0_16px_40px_rgba(79,140,255,0.2)]">
                      <Image src="/LOGO.png" alt="SloerSpace" width={48} height={48} className="h-full w-full object-cover" />
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

              <button
                onClick={() => setView('swarm-launch')}
                className="premium-panel group relative overflow-hidden p-6 text-left transition-all duration-300 hover:-translate-y-1"
              >
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

            <button
              onClick={() => { setWizardLayout(1); setWizardStep(1) }}
              className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold transition-all"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="premium-kbd">1</span>
              Quick terminal workspace
            </button>
          </div>

          <div className="grid gap-5">
            <div className="premium-panel p-5 md:p-6 animate-fade-in-up opacity-0 delay-100">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                <Layers3 size={12} style={{ color: 'var(--accent)' }} />
                What you get
              </div>
              <div className="space-y-3">
                <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-4">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Session-isolated workspaces</div>
                  <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>Each tab preserves its own panes, commands and runtime context.</div>
                </div>
                <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-4">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Real desktop command layer</div>
                  <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>Commands run through Tauri instead of mock outputs, with real working directories.</div>
                </div>
                <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-4">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Premium shell ergonomics</div>
                  <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>Large surfaces, glass materials and cockpit hierarchy built for focus.</div>
                </div>
              </div>
            </div>

            <div className="premium-panel p-5 md:p-6 animate-fade-in-up opacity-0 delay-200">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                <Cpu size={12} style={{ color: 'var(--warning)' }} />
                Ready Stack
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="premium-stat px-3 py-3">
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Frontend</div>
                  <div className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Next.js 14</div>
                </div>
                <div className="premium-stat px-3 py-3">
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Runtime</div>
                  <div className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>React 18</div>
                </div>
                <div className="premium-stat px-3 py-3">
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Desktop</div>
                  <div className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Tauri</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (wizardStep === 1) {
    return (
      <div className="h-full overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
        <div className="mx-auto flex h-full max-w-[1240px] flex-col premium-panel-elevated premium-card-shell p-5 md:p-6 xl:p-7 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <StepBar step={1} />
              <h1 className="mt-4 text-3xl md:text-4xl text-hero" style={{ color: 'var(--text-primary)' }}>
                Configure Layout
              </h1>
              <p className="mt-2 text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                Select a density and working directory before the agent step.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
              <Layers3 size={11} />
              {wizardLayout} panes
            </div>
          </div>

          <div className="mt-5 grid min-h-0 flex-1 gap-5 xl:grid-cols-[0.98fr_1.02fr]">
            <div className="grid content-start gap-4">
              <div className="premium-panel p-4">
                <div className="label">Working Directory</div>
                <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(79,140,255,0.12)] text-[var(--accent)]">
                    <FolderOpen size={16} />
                  </div>
                  <input
                    type="text"
                    value={workDir}
                    onChange={(e) => setWorkDir(e.target.value)}
                    className="flex-1 bg-transparent text-[12px] outline-none font-mono"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button
                    className="btn-secondary text-[10px] px-4 py-2 uppercase tracking-[0.18em]"
                    onClick={() => {
                      void openFolderDialog(workDir || undefined).then((path) => {
                        if (path) {
                          setWorkDir(path)
                          setPathJump(path)
                        }
                      })
                    }}
                  >
                    Browse
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-4 py-3">
                  <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>~ $</span>
                  <input
                    type="text"
                    value={pathJump}
                    onChange={(e) => setPathJump(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pathJump.trim()) {
                        setWorkDir(pathJump.trim())
                      }
                    }}
                    placeholder="cd ~/projects/my-app or ../repo"
                    className="flex-1 bg-transparent text-[12px] outline-none font-mono placeholder:opacity-40"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button
                    className="rounded-[12px] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all"
                    style={{
                      background: pathJump.trim() ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      color: pathJump.trim() ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    onClick={() => {
                      if (pathJump.trim()) {
                        setWorkDir(pathJump.trim())
                      }
                    }}
                  >
                    Go
                  </button>
                </div>

                <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                  Use Browse or paste a terminal-style path jump.
                </div>
              </div>

              <div className="premium-panel p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(6,10,18,0.96),rgba(4,8,14,0.98))] p-4 sm:min-w-[180px]">
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${previewColumns}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${previewRows}, 34px)`,
                      }}
                    >
                      {Array.from({ length: wizardLayout }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-[12px] border border-[rgba(163,209,255,0.14)]"
                          style={{
                            background: `linear-gradient(180deg, rgba(79,140,255,${0.16 + (index * 0.015)}), rgba(40,231,197,0.06))`,
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Selected Template</div>
                    <div className="mt-2 text-[20px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                      {selectedLayout.title}
                    </div>
                    <div className="mt-2 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                      {selectedLayout.description}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
                      <Layers3 size={11} />
                      {wizardLayout} active sessions
                    </div>
                  </div>
                </div>
              </div>

              <div className="premium-panel p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Launch Summary</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="premium-stat px-4 py-3">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Pane Count</div>
                    <div className="mt-2 text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{wizardLayout}</div>
                  </div>
                  <div className="premium-stat px-4 py-3">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Directory</div>
                    <div className="mt-2 break-all text-[11px] font-mono leading-6" style={{ color: 'var(--text-secondary)' }}>{workDir || 'Not set'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Layout Templates</div>
                  <div className="mt-1 text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Select density</div>
                </div>
                <div className="premium-chip">
                  <Layers3 size={12} style={{ color: 'var(--accent)' }} />
                  Precision Grid
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {LAYOUTS.map((layout) => {
                  const selected = wizardLayout === layout.count

                  return (
                    <button
                      key={layout.count}
                      onClick={() => setWizardLayout(layout.count)}
                      className="rounded-[20px] p-3 text-center transition-all premium-interactive"
                      style={{
                        background: selected ? 'linear-gradient(180deg, rgba(79,140,255,0.16), rgba(40,231,197,0.08))' : 'rgba(9,15,24,0.72)',
                        border: `1px solid ${selected ? 'rgba(79,140,255,0.36)' : 'var(--border)'}`,
                        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: selected ? '0 18px 46px rgba(79,140,255,0.16)' : 'none',
                      }}
                    >
                      <div className="mb-3 flex h-12 items-center justify-center rounded-[16px]" style={{ background: selected ? 'rgba(8,16,28,0.78)' : 'rgba(255,255,255,0.03)' }}>
                        <LayoutGlyph layout={layout} active={selected} />
                      </div>
                      <div className="text-[10px] font-semibold">{layout.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-5">
            <button
              onClick={() => { setWizardStep(0); setView('home') }}
              className="btn-ghost text-[11px] uppercase tracking-[0.16em]"
            >
              Cancel
            </button>
            <button onClick={() => setWizardStep(2)} className="btn-primary flex items-center gap-2" disabled={!workDir.trim()}>
              Configure Agents <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
      <div className="mx-auto grid h-full max-w-[1260px] gap-4 xl:grid-cols-[1.02fr_0.98fr] animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <div className="premium-panel-elevated flex min-h-0 flex-col p-5 md:p-6 xl:p-7">
          <StepBar step={2} />
          <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Step 03 · Agent Fleet</div>
          <h1 className="mt-2 text-3xl md:text-4xl text-hero" style={{ color: 'var(--text-primary)' }}>
            Assign agents
            <br />
            <span className="text-gradient">to every slot.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
            Provision agents for your {wizardLayout} terminal sessions without leaving the launch screen.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => {
              const each = Math.floor(wizardLayout / AGENTS.length)
              const rem = wizardLayout % AGENTS.length
              const cfg: Record<AgentCli, number> = { claude: each + rem, codex: each, gemini: each, opencode: each, cursor: each }
              setWizardAgentConfig(cfg)
            }} className="btn-secondary text-[10px] px-3 py-2 uppercase tracking-wider font-bold">Select All</button>
            <button onClick={() => {
              const cfg: Record<AgentCli, number> = { claude: 1, codex: 1, gemini: 1, opencode: 1, cursor: 0 }
              const total = Object.values(cfg).reduce((a, b) => a + b, 0)
              if (total <= wizardLayout) setWizardAgentConfig(cfg)
            }} className="btn-secondary text-[10px] px-3 py-2 uppercase tracking-wider font-bold">1 Each</button>
            <button onClick={() => {
              const each = Math.floor(wizardLayout / AGENTS.length)
              const rem = wizardLayout % AGENTS.length
              const cfg: Record<AgentCli, number> = { claude: each + rem, codex: each, gemini: each, opencode: each, cursor: each }
              setWizardAgentConfig(cfg)
            }} className="btn-secondary text-[10px] px-3 py-2 uppercase tracking-wider font-bold">Fill Evenly</button>
            {totalAgents > 0 && (
              <button onClick={() => setWizardAgentConfig({ claude: 0, codex: 0, gemini: 0, opencode: 0, cursor: 0 })}
                className="btn-ghost text-[10px] px-3 py-2 uppercase tracking-wider font-bold" style={{ color: 'var(--error)' }}>Clear</button>
            )}
          </div>

          <div className="mt-4 grid gap-2.5">
            {AGENTS.map((agent) => {
              const count = wizardAgentConfig[agent.id]
              const active = count > 0

              return (
                <div key={agent.id} className="premium-panel flex items-center gap-3 p-3 transition-all"
                  style={{ borderColor: active ? 'rgba(163,209,255,0.22)' : 'var(--border)' }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px]"
                    style={{
                      background: active ? 'linear-gradient(135deg, rgba(79,140,255,0.92), rgba(40,231,197,0.82))' : 'rgba(15,24,37,0.82)',
                      color: active ? '#04111d' : 'var(--text-muted)',
                      boxShadow: active ? '0 16px 34px rgba(79,140,255,0.18)' : 'none',
                    }}>
                    <Bot size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.label}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{agent.desc}</div>
                  </div>

                  <button
                    onClick={() => {
                      const c = { ...wizardAgentConfig }
                      c[agent.id] = wizardLayout
                      setWizardAgentConfig(c)
                    }}
                    className="btn-secondary text-[10px] px-3 py-2 font-bold uppercase tracking-wider"
                  >
                    All {wizardLayout}
                  </button>

                  <div className="flex items-center gap-1 rounded-[16px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-1">
                    <button onClick={() => {
                      if (count > 0) {
                        const c = { ...wizardAgentConfig }
                        c[agent.id] = count - 1
                        setWizardAgentConfig(c)
                      }
                    }} className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)]">
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center font-mono text-[12px] font-bold" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{count}</span>
                    <button onClick={() => {
                      if (totalAgents < wizardLayout) {
                        const c = { ...wizardAgentConfig }
                        c[agent.id] = count + 1
                        setWizardAgentConfig(c)
                      }
                    }} className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)]">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="premium-panel p-5 md:p-6 xl:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Fleet Status</div>
                <div className="mt-1 text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Launch readiness</div>
              </div>
              <div className="premium-chip" style={{ color: pct === 100 ? 'var(--success)' : 'var(--warning)' }}>
                {pct === 100 ? 'Ready' : 'Configuring'}
              </div>
            </div>

            <div className="premium-stat px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Assigned</div>
              <div className="mt-2 text-4xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                {totalAgents}
                <span className="ml-2 text-lg font-medium" style={{ color: 'var(--text-muted)' }}>/ {wizardLayout}</span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full gradient-accent transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 text-[11px] font-mono" style={{ color: pct === 100 ? 'var(--success)' : 'var(--text-secondary)' }}>
                {pct === 100 ? 'Fleet ready for launch' : `${remainingSlots} slots remaining`}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="premium-stat px-4 py-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Layout</div>
                <div className="mt-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{wizardLayout} panes</div>
              </div>
              <div className="premium-stat px-4 py-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Working Dir</div>
                <div className="mt-2 text-[11px] font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{workDir}</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-[10px]" style={{ color: totalAgents > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: totalAgents > 0 ? 'var(--success)' : 'var(--text-muted)' }} />
                {totalAgents > 0 ? 'Fleet configured' : 'No agents selected'}
              </div>
              <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text-muted)' }} />
                Optimal slot density
              </div>
            </div>
          </div>

          <div className="premium-panel p-5 md:p-6 xl:p-7">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Launch Actions</div>
            <div className="space-y-3">
              <button onClick={() => {
                const emptyAgentConfig = { claude: 0, codex: 0, gemini: 0, opencode: 0, cursor: 0 }
                setWizardAgentConfig(emptyAgentConfig)
                launchWorkspace({ workingDirectory: workDir, agentConfig: emptyAgentConfig })
              }} className="btn-secondary w-full text-[12px] flex items-center justify-center gap-2">
                <Terminal size={14} /> Launch without agents
              </button>
              <button onClick={async () => {
                let bootstrapCommands: Partial<Record<string, string | null>> | undefined
                if (isTauriApp() && totalAgents > 0) {
                  try {
                    const cliIds = Object.entries(wizardAgentConfig).filter(([, count]) => count > 0).map(([cli]) => cli)
                    const resolutions = await getAgentCliResolutions(cliIds)
                    bootstrapCommands = Object.fromEntries(resolutions.map((r) => [r.cli, r.bootstrapCommand]))
                  } catch { /* proceed without bootstrap */ }
                }
                launchWorkspace({ workingDirectory: workDir, agentBootstrapCommands: bootstrapCommands })
              }} className="btn-primary w-full text-[12px] flex items-center justify-center gap-2" disabled={!workDir.trim()}>
                <Rocket size={14} /> Launch Workspace
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button onClick={() => setWizardStep(1)} className="btn-ghost text-[11px] uppercase tracking-[0.14em]">Back</button>
              <button onClick={() => {
                const emptyAgentConfig = { claude: 0, codex: 0, gemini: 0, opencode: 0, cursor: 0 }
                setWizardAgentConfig(emptyAgentConfig)
                launchWorkspace({ workingDirectory: workDir, agentConfig: emptyAgentConfig })
              }} className="btn-ghost text-[11px] uppercase tracking-[0.14em]">Skip Agents</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
