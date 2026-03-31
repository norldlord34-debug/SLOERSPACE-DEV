'use client'

import { getDefaultWorkingDirectory, getAgentCliResolutions, isTauriApp, openFolderDialog } from '@/lib/desktop'
import { useStore, AgentCli } from '@/store/useStore'
import { useEffect, useState } from 'react'
import { FolderOpen, Minus, Plus, Layers3, ArrowLeft, Terminal } from 'lucide-react'
import { CliLogo, getCliBrand } from '@/components/CliLogo'

const TERMINAL_COUNTS = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const

const AGENTS: { id: AgentCli; label: string; desc: string }[] = [
  { id: 'claude', label: 'Claude', desc: 'claude' },
  { id: 'codex', label: 'Codex', desc: 'codex' },
  { id: 'gemini', label: 'Gemini', desc: 'gemini' },
  { id: 'opencode', label: 'OpenCode', desc: 'opencode' },
  { id: 'cursor', label: 'Cursor', desc: 'cursor' },
  { id: 'droid', label: 'Droid', desc: 'droid' },
  { id: 'copilot', label: 'Copilot', desc: 'copilot' },
]

export function CanvasWizard() {
  const { setView, wizardLayout, setWizardLayout, wizardAgentConfig, setWizardAgentConfig, launchCanvas } = useStore()
  const [step, setStep] = useState(0)
  const [workDir, setWorkDir] = useState('')
  const [pathCommand, setPathCommand] = useState('')
  const [customCommand, setCustomCommand] = useState('')
  const [customCommandCount, setCustomCommandCount] = useState(0)

  useEffect(() => {
    void getDefaultWorkingDirectory().then((dir) => {
      setWorkDir(dir)
      setPathCommand(dir)
    })
  }, [])

  const totalNamedAgents = Object.values(wizardAgentConfig).reduce((a, b) => a + b, 0)
  const totalAgents = totalNamedAgents + customCommandCount

  const handleBrowse = async () => {
    if (!isTauriApp()) return
    try {
      const selected = await openFolderDialog()
      if (selected) {
        setWorkDir(selected)
        setPathCommand(selected)
      }
    } catch { /* ignore */ }
  }

  const handlePathGo = () => {
    const trimmed = pathCommand.trim()
    if (trimmed) setWorkDir(trimmed)
  }

  if (step === 0) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6 aurora-bg particle-field" style={{ background: 'radial-gradient(circle at 50% 20%, rgba(40,231,197,0.06), transparent 40%), var(--surface-0)' }}>
        <div className="w-full max-w-[820px] space-y-6">
          <div className="text-center">
            <h1 className="text-[32px] font-bold tracking-[-0.05em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Configure Canvas</h1>
            <p className="mt-2 text-[13px]" style={{ color: 'var(--secondary)' }}>Choose how many terminals to place on your canvas.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Working Directory</div>
              <div className="liquid-glass rounded-[20px] p-4">
                <div className="flex items-center gap-3">
                  <FolderOpen size={16} style={{ color: 'var(--text-muted)' }} />
                  <div className="flex-1 truncate text-[12px] font-mono" style={{ color: 'var(--text-primary)' }}>{workDir || 'Not set'}</div>
                  <button onClick={handleBrowse} className="btn-secondary text-[10px] px-3 py-1.5 uppercase tracking-wider font-bold">Browse</button>
                </div>
              </div>

              <div className="premium-panel rounded-[20px] p-4 space-y-3" style={{ background: 'linear-gradient(180deg, rgba(40,231,197,0.06), transparent)', borderColor: 'rgba(40,231,197,0.14)' }}>
                <div className="flex items-center gap-2">
                  <Terminal size={14} style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={pathCommand}
                    onChange={(e) => setPathCommand(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePathGo() }}
                    placeholder="cd ~/projects/my-app or ../repo"
                    className="flex-1 bg-transparent text-[11px] font-mono outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button onClick={handlePathGo} className="btn-secondary text-[10px] px-3 py-1.5 font-bold">Go</button>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  Use the browser above or jump with terminal-style navigation commands.
                </div>
              </div>

              <div className="premium-panel rounded-[20px] p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(40,231,197,0.08), rgba(79,140,255,0.04))', borderColor: 'rgba(40,231,197,0.18)' }}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(40,231,197,0.12)', border: '1px solid rgba(40,231,197,0.2)' }}>
                  <Layers3 size={20} style={{ color: 'var(--secondary)' }} />
                </div>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{wizardLayout} Terminals</div>
                  <div className="mt-0.5 text-[11px]" style={{ color: 'var(--secondary)' }}>Free-form canvas — drag, resize, and organize freely</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Terminal Count</div>
              <div className="grid grid-cols-3 gap-2 cascade-in">
                {TERMINAL_COUNTS.map((count) => {
                  const active = wizardLayout === count
                  return (
                    <button
                      key={count}
                      onClick={() => setWizardLayout(count)}
                      className="rounded-[16px] border px-4 py-4 text-center hover-lift-3d liquid-glass"
                      style={{
                        background: active ? 'linear-gradient(135deg, rgba(40,231,197,0.16), rgba(79,140,255,0.08))' : 'var(--surface-1)',
                        borderColor: active ? 'var(--secondary)' : 'var(--border)',
                        boxShadow: active ? '0 0 24px rgba(40,231,197,0.14)' : 'none',
                      }}
                    >
                      <div className="text-[18px] font-bold" style={{ color: active ? 'var(--secondary)' : 'var(--text-primary)' }}>{count}</div>
                      <div className="mt-1 text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{count === 1 ? 'session' : 'sessions'}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setView('home')} className="btn-ghost text-[11px] uppercase tracking-[0.14em] flex items-center gap-2">
              <ArrowLeft size={12} /> Back
            </button>
            <button onClick={() => setStep(1)} className="btn-primary text-[12px] px-6 py-2.5 uppercase tracking-wider font-bold flex items-center gap-2">
              Configure Agents
              <Terminal size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6" style={{ background: 'radial-gradient(circle at 50% 20%, rgba(79,140,255,0.06), transparent 40%), var(--surface-0)' }}>
      <div className="w-full max-w-[900px] space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="h-1 w-10 rounded-full" style={{ background: 'var(--accent)' }} />
          <div className="h-1 w-10 rounded-full" style={{ background: 'var(--secondary)' }} />
        </div>

        <div className="text-center">
          <h1 className="text-[28px] font-bold tracking-[-0.05em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>AI Agent Fleet</h1>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Provision agents for your {wizardLayout} canvas terminals.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => {
            const each = Math.floor(wizardLayout / AGENTS.length)
            const rem = wizardLayout % AGENTS.length
            const cfg = { ...wizardAgentConfig }
            AGENTS.forEach((a, i) => { cfg[a.id] = each + (i === 0 ? rem : 0) })
            setWizardAgentConfig(cfg)
          }} className="btn-secondary text-[10px] px-3 py-2 uppercase tracking-wider font-bold">Select All</button>
          <button onClick={() => {
            if (AGENTS.length <= wizardLayout) {
              const cfg = { ...wizardAgentConfig }
              AGENTS.forEach((a) => { cfg[a.id] = 1 })
              setWizardAgentConfig(cfg)
            }
          }} className="btn-secondary text-[10px] px-3 py-2 uppercase tracking-wider font-bold">1 Each</button>
          <button onClick={() => {
            const each = Math.floor(wizardLayout / AGENTS.length)
            const rem = wizardLayout % AGENTS.length
            const cfg = { ...wizardAgentConfig }
            AGENTS.forEach((a, i) => { cfg[a.id] = each + (i === 0 ? rem : 0) })
            setWizardAgentConfig(cfg)
          }} className="btn-secondary text-[10px] px-3 py-2 uppercase tracking-wider font-bold">Fill Evenly</button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            {AGENTS.map((agent) => {
              const count = wizardAgentConfig[agent.id]
              const active = count > 0
              const brand = getCliBrand(agent.id)
              return (
                <div key={agent.id} className="premium-panel flex items-center gap-3 rounded-[18px] p-3 transition-all" style={{ borderColor: active ? 'rgba(163,209,255,0.22)' : 'var(--border)' }}>
                  <button
                    onClick={() => { const c = { ...wizardAgentConfig }; c[agent.id] = active ? 0 : Math.min(1, Math.max(0, wizardLayout - totalAgents + count)); setWizardAgentConfig(c) }}
                    className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all"
                    style={{ background: active ? brand.color : 'rgba(255,255,255,0.08)', border: `2px solid ${active ? brand.color : 'rgba(255,255,255,0.15)'}` }}
                  >
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]" style={{ background: active ? `${brand.color}25` : 'rgba(15,24,37,0.82)' }}>
                    <CliLogo cli={agent.id} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.label}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{agent.desc}</div>
                  </div>
                  <button onClick={() => { const c = { ...wizardAgentConfig }; c[agent.id] = wizardLayout; setWizardAgentConfig(c) }} className="btn-secondary text-[9px] px-2.5 py-1.5 font-bold uppercase tracking-wider">All {wizardLayout}</button>
                  <div className="flex items-center gap-1 rounded-[14px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-1">
                    <button onClick={() => { if (count > 0) { const c = { ...wizardAgentConfig }; c[agent.id] = count - 1; setWizardAgentConfig(c) } }} className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"><Minus size={12} /></button>
                    <span className="w-7 text-center text-[13px] font-bold" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{count}</span>
                    <button onClick={() => { if (totalAgents < wizardLayout) { const c = { ...wizardAgentConfig }; c[agent.id] = count + 1; setWizardAgentConfig(c) } }} className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"><Plus size={12} /></button>
                  </div>
                </div>
              )
            })}

            {/* Custom Command Row */}
            <div className="premium-panel flex flex-col rounded-[18px] transition-all" style={{ borderColor: customCommandCount > 0 ? 'rgba(167,139,250,0.3)' : 'var(--border)' }}>
              <div className="flex items-center gap-3 p-3">
                <button
                  onClick={() => setCustomCommandCount(customCommandCount > 0 ? 0 : Math.min(1, wizardLayout - totalAgents + customCommandCount))}
                  className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all"
                  style={{ background: customCommandCount > 0 ? '#a78bfa' : 'rgba(255,255,255,0.08)', border: `2px solid ${customCommandCount > 0 ? '#a78bfa' : 'rgba(255,255,255,0.15)'}` }}
                >
                  {customCommandCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]" style={{ background: customCommandCount > 0 ? 'rgba(167,139,250,0.18)' : 'rgba(15,24,37,0.82)' }}>
                  <Terminal size={16} style={{ color: customCommandCount > 0 ? '#a78bfa' : 'var(--text-muted)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Custom Command</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Enter any CLI agent or shell command</div>
                </div>
                <button onClick={() => setCustomCommandCount(wizardLayout)} className="btn-secondary text-[9px] px-2.5 py-1.5 font-bold uppercase tracking-wider">All {wizardLayout}</button>
                <div className="flex items-center gap-1 rounded-[14px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-1">
                  <button onClick={() => setCustomCommandCount(Math.max(0, customCommandCount - 1))} className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"><Minus size={12} /></button>
                  <span className="w-7 text-center text-[13px] font-bold" style={{ color: customCommandCount > 0 ? '#a78bfa' : 'var(--text-muted)' }}>{customCommandCount}</span>
                  <button onClick={() => { if (totalAgents < wizardLayout) setCustomCommandCount(customCommandCount + 1) }} className="flex h-7 w-7 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"><Plus size={12} /></button>
                </div>
              </div>
              <div className="px-3 pb-3">
                <input value={customCommand}
                  onChange={(e) => {
                    setCustomCommand(e.target.value)
                    if (e.target.value.trim() && customCommandCount === 0 && totalAgents < wizardLayout) {
                      setCustomCommandCount(1)
                    }
                  }}
                  placeholder="e.g. aider --yes-always, claude --model sonnet"
                  className="w-full rounded-xl border border-[var(--border)] bg-[rgba(9,15,24,0.72)] px-3 py-2 text-[11px] font-mono outline-none placeholder:opacity-40 focus:border-[rgba(167,139,250,0.4)] transition-colors"
                  style={{ color: 'var(--text-primary)' }} />
              </div>
            </div>
          </div>

          <div className="premium-panel rounded-[22px] p-5 h-fit" style={{ background: 'linear-gradient(180deg, rgba(7,12,20,0.82), rgba(6,10,18,0.92))' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Fleet Utilization</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-[28px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{totalAgents}</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/ {wizardLayout} slots</span>
            </div>
            <div className="mt-4 h-1.5 rounded-full" style={{ background: 'var(--surface-3)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (totalAgents / wizardLayout) * 100)}%`, background: totalAgents > wizardLayout ? 'var(--error)' : 'var(--accent)' }} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="h-2 w-2 rounded-full" style={{ background: totalAgents > 0 ? 'var(--accent)' : 'var(--text-muted)' }} />
                {totalAgents > 0 ? `${totalAgents} agents assigned` : 'No agents selected'}
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="h-2 w-2 rounded-full" style={{ background: 'var(--text-muted)' }} />
                Optimal slot density
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setStep(0)} className="btn-ghost text-[11px] uppercase tracking-[0.14em]">Back</button>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              const cfg = { ...wizardAgentConfig }
              AGENTS.forEach((a) => { cfg[a.id] = 0 })
              setWizardAgentConfig(cfg)
              launchCanvas({ workingDirectory: workDir })
            }} className="btn-ghost text-[11px] uppercase tracking-[0.14em]">Skip Agents</button>
            <button onClick={async () => {
              let bootstrapCommands: Partial<Record<AgentCli, string | null>> | undefined
              if (isTauriApp() && totalNamedAgents > 0) {
                try {
                  const cliIds = Object.entries(wizardAgentConfig).filter(([, c]) => c > 0).map(([cli]) => cli)
                  const resolutions = await getAgentCliResolutions(cliIds)
                  bootstrapCommands = Object.fromEntries(resolutions.map((r) => [r.cli, r.bootstrapCommand])) as Partial<Record<AgentCli, string | null>>
                } catch { /* proceed */ }
              }
              launchCanvas({
                workingDirectory: workDir,
                agentBootstrapCommands: bootstrapCommands,
                customBootstrapCommand: customCommandCount > 0 && customCommand.trim() ? customCommand.trim() : undefined,
              })
            }} className="flex items-center gap-2 rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-all" style={{ background: 'linear-gradient(135deg, var(--secondary), var(--accent))', color: '#04111d', boxShadow: '0 8px 32px rgba(40,231,197,0.24)' }}>
              <Layers3 size={14} /> Launch Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
