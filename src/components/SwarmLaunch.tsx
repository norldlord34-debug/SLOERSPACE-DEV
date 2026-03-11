'use client'

import { getDefaultWorkingDirectory, openFolderDialog } from '@/lib/desktop'
import { generateId, type AgentCli, type AgentRole, type LaunchSwarmAgent, useStore } from '@/store/useStore'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Bot, Check, Crown, FolderOpen, Hammer,
  MessageSquareText, Plus, Rocket, Search, Settings2, ShieldCheck, Sparkles,
  Target, Upload, Workflow, X
} from 'lucide-react'

const SWARM_STEPS = [
  { id: 'name', label: 'Name', icon: Sparkles, title: 'Name your swarm', description: 'Give your mission a short identity you can find later in the workspace.' },
  { id: 'directory', label: 'Directory', icon: FolderOpen, title: 'Choose a directory', description: 'Select the project folder your swarm agents will work inside.' },
  { id: 'prompt', label: 'Prompt', icon: MessageSquareText, title: 'Swarm prompt', description: 'Describe what the swarm should build, fix, investigate, or ship.' },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen, title: 'Supporting knowledge', description: 'Attach specs, screenshots, notes, logs, or references to guide the swarm.' },
  { id: 'agents', label: 'Agents', icon: Bot, title: 'Agent roster', description: 'Pick a preset, tune roles, and configure how each agent operates.' },
] as const

const CLI_OPTIONS: Array<{ id: AgentCli; label: string; subtitle: string; short: string }> = [
  { id: 'claude', label: 'Claude', subtitle: 'Anthropic', short: 'C' },
  { id: 'codex', label: 'Codex', subtitle: 'OpenAI', short: 'C' },
  { id: 'gemini', label: 'Gemini', subtitle: 'Google', short: 'G' },
  { id: 'opencode', label: 'OpenCode', subtitle: 'TUI', short: 'O' },
  { id: 'cursor', label: 'Cursor', subtitle: 'Agent', short: 'C' },
]

const ROLE_OPTIONS: Array<{ id: AgentRole; label: string; description: string; color: string; icon: typeof Crown }> = [
  { id: 'builder', label: 'Builder', description: 'Implements features and writes code.', color: 'var(--accent)', icon: Hammer },
  { id: 'reviewer', label: 'Reviewer', description: 'Audits quality, regressions, and correctness.', color: 'var(--warning)', icon: ShieldCheck },
  { id: 'scout', label: 'Scout', description: 'Researches context, files, APIs, and constraints.', color: 'var(--secondary)', icon: Search },
  { id: 'coord', label: 'Coord', description: 'Plans, routes, and keeps the mission aligned.', color: 'var(--info)', icon: Crown },
  { id: 'custom', label: 'Custom', description: 'Handles a bespoke role or operator-defined duty.', color: 'var(--text-secondary)', icon: Settings2 },
]

const PRESET_OPTIONS = [
  { total: 5, label: 'Squad', composition: { coord: 1, builder: 2, scout: 1, reviewer: 1, custom: 0 } },
  { total: 10, label: 'Team', composition: { coord: 2, builder: 5, scout: 2, reviewer: 1, custom: 0 } },
  { total: 15, label: 'Platoon', composition: { coord: 2, builder: 8, scout: 3, reviewer: 2, custom: 0 } },
  { total: 20, label: 'Battalion', composition: { coord: 2, builder: 11, scout: 4, reviewer: 3, custom: 0 } },
  { total: 50, label: 'Legion', composition: { coord: 4, builder: 29, scout: 10, reviewer: 7, custom: 0 } },
] as const

const ROLE_ORDER: AgentRole[] = ['coord', 'builder', 'reviewer', 'scout', 'custom']

function getTaskTemplate(role: AgentRole, objective: string) {
  const mission = objective.trim() || 'the shared swarm objective'

  if (role === 'coord') return `Coordinate execution for ${mission}. Break the work down, route tasks, and keep agents aligned.`
  if (role === 'builder') return `Implement deliverables for ${mission}. Produce working code and iterate quickly.`
  if (role === 'reviewer') return `Review the output for ${mission}. Validate quality, edge cases, and regressions.`
  if (role === 'scout') return `Research files, APIs, and constraints that matter for ${mission}.`
  return `Handle a custom responsibility in support of ${mission}.`
}

function buildAgentsFromPreset(
  composition: Record<AgentRole, number>,
  cli: AgentCli,
  objective: string,
): LaunchSwarmAgent[] {
  return ROLE_ORDER.flatMap((role) => (
    Array.from({ length: composition[role] ?? 0 }, () => ({
      id: generateId(),
      role,
      cli,
      task: getTaskTemplate(role, objective),
      autoApprove: false,
    }))
  ))
}

function resolvePathCommand(input: string, current: string, fallback: string) {
  const raw = input.trim()

  if (!raw) {
    return current
  }

  const next = raw.replace(/^cd\s+/i, '').trim()

  if (!next || next === '.') {
    return current
  }

  if (next === '~') {
    return fallback
  }

  if (/^[a-zA-Z]:[\\/]/.test(next) || next.startsWith('\\\\')) {
    return next
  }

  const normalizedBase = current || fallback
  const parts = normalizedBase.split(/[\\/]+/).filter(Boolean)
  const isWindows = normalizedBase.includes('\\')
  const prefix = /^[a-zA-Z]:/.test(normalizedBase) ? normalizedBase.slice(0, 2) : ''
  const tokens = next.replace(/^\.?[\\/]/, '').split(/[\\/]+/).filter(Boolean)

  if (next.startsWith('..')) {
    next.split(/[\\/]+/).forEach((token) => {
      if (token === '..') parts.pop()
      if (token !== '..' && token !== '.') parts.push(token)
    })
  } else {
    tokens.forEach((token) => parts.push(token))
  }

  if (isWindows && prefix) {
    return `${prefix}\\${parts.slice(prefix ? 1 : 0).join('\\')}`.replace(/\\+/g, '\\')
  }

  return `/${parts.join('/')}`
}

export function SwarmLaunch() {
  const setView = useStore((s) => s.setView)
  const launchSwarm = useStore((s) => s.launchSwarm)
  const userProfile = useStore((s) => s.userProfile)
  const [step, setStep] = useState(0)
  const [swarmName, setSwarmName] = useState('')
  const [objective, setObjective] = useState('')
  const [workDir, setWorkDir] = useState('')
  const [defaultDir, setDefaultDir] = useState('')
  const [pathCommand, setPathCommand] = useState('')
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([])
  const [globalCli, setGlobalCli] = useState<AgentCli>('claude')
  const [presetSize, setPresetSize] = useState<number>(5)
  const [agents, setAgents] = useState<LaunchSwarmAgent[]>(() => buildAgentsFromPreset({ coord: 1, builder: 2, scout: 1, reviewer: 1, custom: 0 }, 'claude', ''))
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let mounted = true

    void getDefaultWorkingDirectory()
      .then((directory) => {
        if (!mounted) return
        setDefaultDir(directory)
        setWorkDir((current) => current || directory)
      })
      .catch(() => {
        if (!mounted) return
        const fallback = 'C:\\'
        setDefaultDir(fallback)
        setWorkDir((current) => current || fallback)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!swarmName.trim() && userProfile.username) {
      setSwarmName(userProfile.username)
    }
  }, [swarmName, userProfile.username])

  useEffect(() => {
    if (!selectedAgentId && agents[0]) {
      setSelectedAgentId(agents[0].id)
      return
    }

    if (selectedAgentId && !agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(agents[0]?.id ?? null)
    }
  }, [agents, selectedAgentId])

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  )
  const selectedRoleMeta = useMemo(
    () => ROLE_OPTIONS.find((role) => role.id === selectedAgent?.role) ?? null,
    [selectedAgent],
  )
  const selectedCliMeta = useMemo(
    () => CLI_OPTIONS.find((option) => option.id === selectedAgent?.cli) ?? null,
    [selectedAgent],
  )

  const roleCounts = useMemo(
    () => ROLE_ORDER.reduce((acc, role) => ({ ...acc, [role]: agents.filter((agent) => agent.role === role).length }), {
      coord: 0,
      builder: 0,
      reviewer: 0,
      scout: 0,
      custom: 0,
    } as Record<AgentRole, number>),
    [agents],
  )

  const totalAgents = agents.length
  const currentStep = SWARM_STEPS[step]
  const progressPercent = Math.round(((step + 1) / SWARM_STEPS.length) * 100)
  const readyToLaunch = swarmName.trim().length > 0 && objective.trim().length > 0 && workDir.trim().length > 0 && totalAgents > 0

  const canContinue = [
    swarmName.trim().length > 0,
    workDir.trim().length > 0,
    objective.trim().length > 0,
    true,
    totalAgents > 0,
  ][step]

  const applyPreset = (size: number, cli = globalCli) => {
    const preset = PRESET_OPTIONS.find((item) => item.total === size) ?? PRESET_OPTIONS[0]
    const nextAgents = buildAgentsFromPreset(
      {
        coord: preset.composition.coord,
        builder: preset.composition.builder,
        reviewer: preset.composition.reviewer,
        scout: preset.composition.scout,
        custom: preset.composition.custom,
      },
      cli,
      objective,
    )

    setPresetSize(size)
    setAgents(nextAgents)
    setSelectedAgentId(nextAgents[0]?.id ?? null)
  }

  const updateAgent = (id: string, updates: Partial<LaunchSwarmAgent>) => {
    setAgents((current) => current.map((agent) => agent.id === id ? { ...agent, ...updates } : agent))
  }

  const handleGlobalCliChange = (cli: AgentCli) => {
    setGlobalCli(cli)
    setAgents((current) => current.map((agent) => ({ ...agent, cli })))
  }

  const handleAddAgent = () => {
    const nextAgent: LaunchSwarmAgent = {
      id: generateId(),
      role: 'builder',
      cli: globalCli,
      task: getTaskTemplate('builder', objective),
      autoApprove: false,
    }

    setAgents((current) => [...current, nextAgent])
    setSelectedAgentId(nextAgent.id)
    setPresetSize(0)
  }

  const handleRemoveAgent = (id: string) => {
    setAgents((current) => current.filter((agent) => agent.id !== id))
  }

  const handleKnowledgeSelection = (files: FileList | null) => {
    if (!files) return

    const incoming = Array.from(files).map((file) => file.name)
    setKnowledgeFiles((current) => [...current, ...incoming.filter((file) => !current.includes(file))])
  }

  const handleLaunch = () => {
    if (!readyToLaunch) return

    launchSwarm({
      name: swarmName,
      objective,
      workingDirectory: workDir,
      knowledgeFiles,
      agents,
    })
  }

  const renderStepContent = () => {
    const StepIcon = currentStep.icon

    return (
      <div className="w-full max-w-5xl mx-auto animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <div className="premium-chip" style={{ color: 'var(--accent)' }}>
              <StepIcon size={12} />
              Step {step + 1}
            </div>
            <div className="premium-chip">
              <Workflow size={12} style={{ color: 'var(--text-secondary)' }} />
              {progressPercent}% ready
            </div>
          </div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] border animate-float"
            style={{
              borderColor: 'rgba(79,140,255,0.24)',
              background: 'radial-gradient(circle at top, rgba(79,140,255,0.18), rgba(6,10,18,0.94))',
              boxShadow: '0 18px 48px rgba(24,103,255,0.18)',
            }}>
            <StepIcon size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            {currentStep.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[13px] leading-7" style={{ color: 'var(--text-secondary)' }}>
            {currentStep.description}
          </p>
          <div className="mt-5 h-[3px] w-full max-w-md overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full animate-gradient"
              style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--accent), var(--secondary))' }}
            />
          </div>
        </div>

        {step === 0 && (
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="swarm-panel-soft swarm-hover-lift p-6 md:p-8 lg:p-10">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--text-muted)' }}>
                Mission identity
              </div>
              <input
                value={swarmName}
                onChange={(e) => setSwarmName(e.target.value)}
                placeholder="Give this swarm a name"
                className="w-full rounded-2xl border bg-[rgba(5,10,18,0.86)] px-5 py-4 text-center text-[18px] font-semibold outline-none transition-all focus:scale-[1.01]"
                style={{ borderColor: 'rgba(170,221,255,0.12)', color: 'var(--text-primary)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
              />
              <div className="mt-4 flex items-center justify-center gap-3 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>{swarmName.trim().length || 0} chars</span>
                <span>•</span>
                <span>{userProfile.username || 'operator'} workspace</span>
              </div>
              <div className="mt-4 rounded-2xl px-4 py-3 text-[11px] leading-6" style={{ background: 'rgba(79,140,255,0.08)', color: 'var(--text-secondary)' }}>
                Use a short operational label. It will appear in workspace tabs, terminal panes, and swarm history.
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            <div className="swarm-panel-soft swarm-hover-lift p-5 md:p-6">
              <div className="swarm-input-shell flex items-center gap-3 px-4 py-3.5">
                <FolderOpen size={16} style={{ color: 'var(--accent)' }} />
                <input
                  value={workDir}
                  onChange={(e) => setWorkDir(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] font-mono outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  onClick={() => {
                    void openFolderDialog(workDir || undefined).then((path) => {
                      if (path) setWorkDir(path)
                    })
                  }}
                  className="btn-secondary text-[10px] px-4 py-2"
                >
                  Browse
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span className="premium-kbd">tab</span>
                <span>Paste or browse to the repository root the swarm will operate in.</span>
              </div>
            </div>

            <div className="swarm-panel-soft p-5 md:p-6">
              <div className="swarm-input-shell flex items-center gap-3 px-4 py-3.5">
                <span className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>{'>'}_$</span>
                <input
                  value={pathCommand}
                  onChange={(e) => setPathCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const nextDir = resolvePathCommand(pathCommand, workDir, defaultDir || workDir)
                      setWorkDir(nextDir)
                      setPathCommand('')
                    }
                  }}
                  placeholder="cd ~/projects/my-app or ../repo"
                  className="flex-1 bg-transparent text-[12px] font-mono outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  onClick={() => {
                    const nextDir = resolvePathCommand(pathCommand, workDir, defaultDir || workDir)
                    setWorkDir(nextDir)
                    setPathCommand('')
                  }}
                  className="btn-secondary text-[10px] px-4 py-2"
                >
                  Go
                </button>
              </div>
              <div className="mt-3 text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                Use the browser above or jump with terminal-style navigation commands.
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="swarm-panel-soft p-6 md:p-8 lg:p-9">
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="What should this swarm accomplish? Agents will read this as their mission brief."
                className="w-full min-h-[200px] rounded-[22px] border bg-[rgba(3,8,16,0.92)] px-5 py-4 text-[13px] leading-7 outline-none resize-none transition-all"
                style={{ borderColor: 'rgba(79,140,255,0.18)', color: 'var(--text-primary)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
              />
              <div className="mt-3 flex items-center justify-between rounded-2xl px-4 py-3"
                style={{ background: 'rgba(79,140,255,0.08)', color: 'var(--text-muted)' }}>
                <div className="text-[10px] font-medium">Shared with all agents so they can coordinate and stay aligned.</div>
                <div className="text-[10px] font-mono">{objective.trim().length} chars</div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-10 max-w-4xl mx-auto">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleKnowledgeSelection(e.target.files)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="swarm-panel-soft swarm-grid-backdrop swarm-hover-lift p-8 md:p-10 cursor-pointer"
              style={{ borderStyle: 'dashed' }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
                  <Upload size={18} />
                </div>
                <div className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Add context files
                </div>
                <div className="mt-2 max-w-lg text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                  Attach PDFs, logs, specs, screenshots, or notes to give the swarm a shared brain before launch.
                </div>
              </div>
            </div>

            {knowledgeFiles.length > 0 && (
              <div className="mt-5 swarm-panel-soft p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-muted)' }}>
                  Attached context
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {knowledgeFiles.map((file) => (
                    <div key={file} className="flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all"
                      style={{ borderColor: 'var(--border)', background: 'rgba(5,10,18,0.78)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)' }}>
                      <BookOpen size={14} style={{ color: 'var(--accent)' }} />
                      <div className="min-w-0 flex-1 text-[11px] font-mono truncate" style={{ color: 'var(--text-primary)' }}>{file}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setKnowledgeFiles((current) => current.filter((item) => item !== file))
                        }}
                        className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-10 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="swarm-panel-soft p-5 md:p-6">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-muted)' }}>
                Quick presets
              </div>
              <div className="grid gap-2 sm:grid-cols-5">
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.total}
                    onClick={() => applyPreset(preset.total)}
                    className="rounded-2xl border px-4 py-3 text-left transition-all swarm-hover-lift"
                    style={{
                      borderColor: presetSize === preset.total ? 'rgba(79,140,255,0.4)' : 'var(--border)',
                      background: presetSize === preset.total ? 'rgba(79,140,255,0.12)' : 'rgba(4,9,18,0.56)',
                    }}
                  >
                    <div className="text-[16px] font-bold" style={{ color: presetSize === preset.total ? 'var(--accent)' : 'var(--text-primary)' }}>{preset.total}</div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{preset.label}</div>
                  </button>
                ))}
              </div>

              <div className="mt-5 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                CLI agent for all
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-5">
                {CLI_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleGlobalCliChange(option.id)}
                    className="rounded-2xl border px-4 py-3 text-left transition-all swarm-hover-lift"
                    style={{
                      borderColor: globalCli === option.id ? 'rgba(79,140,255,0.38)' : 'var(--border)',
                      background: globalCli === option.id ? 'rgba(79,140,255,0.1)' : 'rgba(4,9,18,0.56)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl"
                        style={{ background: globalCli === option.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: globalCli === option.id ? '#04111d' : 'var(--text-secondary)' }}>
                        <span className="text-[10px] font-bold">{option.short}</span>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{option.label}</div>
                        <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>{option.subtitle}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {ROLE_OPTIONS.filter((role) => roleCounts[role.id] > 0).map((role) => (
                  <span key={role.id} className="rounded-full px-3 py-1 text-[10px] font-semibold"
                    style={{ background: `${role.color}22`, color: role.color }}>
                    {roleCounts[role.id]} {role.label}{roleCounts[role.id] !== 1 ? 's' : ''}
                  </span>
                ))}
                <span className="ml-auto text-[10px] font-mono self-center" style={{ color: 'var(--text-muted)' }}>{totalAgents} total</span>
              </div>

              <div className="mt-5 max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {agents.map((agent, index) => {
                  const roleMeta = ROLE_OPTIONS.find((role) => role.id === agent.role) ?? ROLE_OPTIONS[0]
                  const cliMeta = CLI_OPTIONS.find((cli) => cli.id === agent.cli) ?? CLI_OPTIONS[0]

                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition-all swarm-hover-lift"
                      style={{
                        borderColor: selectedAgentId === agent.id ? 'rgba(79,140,255,0.34)' : 'var(--border)',
                        background: selectedAgentId === agent.id ? 'rgba(79,140,255,0.1)' : 'rgba(5,10,18,0.72)',
                        boxShadow: selectedAgentId === agent.id ? '0 18px 46px rgba(79,140,255,0.16)' : 'none',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-5 shrink-0 text-[10px] font-mono pt-0.5" style={{ color: 'var(--text-muted)' }}>{index + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em]"
                              style={{ background: `${roleMeta.color}22`, color: roleMeta.color }}>
                              {roleMeta.label}
                            </span>
                            <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>{cliMeta.label}</span>
                            {agent.autoApprove && (
                              <span className="rounded-full px-2.5 py-1 text-[9px] font-semibold" style={{ background: 'rgba(46,213,115,0.12)', color: 'var(--success)' }}>
                                Auto
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                            {agent.task}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveAgent(agent.id)
                          }}
                          className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleAddAgent}
                className="mt-4 w-full rounded-2xl border border-dashed px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] transition-all swarm-hover-lift"
                style={{ borderColor: 'rgba(79,140,255,0.28)', color: 'var(--accent)' }}
              >
                <span className="inline-flex items-center gap-2"><Plus size={13} /> Add agent</span>
              </button>
            </div>

            <div className="swarm-panel-soft p-5 md:p-6">
              {selectedAgent ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                        Agent configuration
                      </div>
                      <div className="mt-1 text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                        Selected agent
                      </div>
                    </div>
                    <div className="premium-chip" style={{ color: 'var(--accent)' }}>
                      <Workflow size={12} />
                      {selectedAgent.role}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="premium-stat px-4 py-3">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Role</div>
                      <div className="mt-2 text-[12px] font-semibold" style={{ color: selectedRoleMeta?.color || 'var(--text-primary)' }}>
                        {selectedRoleMeta?.label || selectedAgent.role}
                      </div>
                    </div>
                    <div className="premium-stat px-4 py-3">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>CLI</div>
                      <div className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {selectedCliMeta?.label || selectedAgent.cli}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
                      CLI agent
                    </div>
                    <div className="grid gap-2 grid-cols-2">
                      {CLI_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => updateAgent(selectedAgent.id, { cli: option.id })}
                          className="rounded-2xl border px-3 py-3 text-left transition-all swarm-hover-lift"
                          style={{
                            borderColor: selectedAgent.cli === option.id ? 'rgba(79,140,255,0.38)' : 'var(--border)',
                            background: selectedAgent.cli === option.id ? 'rgba(79,140,255,0.1)' : 'rgba(4,9,18,0.6)',
                          }}
                        >
                          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{option.label}</div>
                          <div className="text-[9px] font-mono uppercase mt-1" style={{ color: 'var(--text-muted)' }}>{option.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
                      Role
                    </div>
                    <div className="grid gap-2 grid-cols-2">
                      {ROLE_OPTIONS.map((role) => {
                        const RoleIcon = role.icon
                        return (
                          <button
                            key={role.id}
                            onClick={() => updateAgent(selectedAgent.id, { role: role.id, task: selectedAgent.task.trim() || getTaskTemplate(role.id, objective) })}
                            className="rounded-2xl border px-3 py-3 text-left transition-all swarm-hover-lift"
                            style={{
                              borderColor: selectedAgent.role === role.id ? `${role.color}66` : 'var(--border)',
                              background: selectedAgent.role === role.id ? `${role.color}14` : 'rgba(4,9,18,0.6)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <RoleIcon size={13} style={{ color: role.color }} />
                              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{role.label}</span>
                            </div>
                            <div className="mt-2 text-[10px] leading-5" style={{ color: 'var(--text-secondary)' }}>{role.description}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
                      Task
                    </div>
                    <textarea
                      value={selectedAgent.task}
                      onChange={(e) => updateAgent(selectedAgent.id, { task: e.target.value })}
                      placeholder="Optional task or instructions for this agent..."
                      className="w-full min-h-[120px] rounded-2xl border bg-[rgba(4,9,18,0.74)] px-4 py-3 text-[12px] leading-6 outline-none resize-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <label className="mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer"
                    style={{ borderColor: 'var(--border)', background: 'rgba(4,9,18,0.62)' }}>
                    <span className="relative flex h-5 w-5 items-center justify-center rounded-md border"
                      style={{
                        borderColor: selectedAgent.autoApprove ? 'var(--success)' : 'var(--text-muted)',
                        background: selectedAgent.autoApprove ? 'rgba(46,213,115,0.16)' : 'transparent',
                      }}>
                      {selectedAgent.autoApprove && <Check size={12} style={{ color: 'var(--success)' }} />}
                    </span>
                    <span>
                      <span className="block text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Auto-approve</span>
                      <span className="block text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Skip permission prompts for this agent when supported.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedAgent.autoApprove}
                      onChange={(e) => updateAgent(selectedAgent.id, { autoApprove: e.target.checked })}
                      className="sr-only"
                    />
                  </label>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-center px-6">
                  <div>
                    <div className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>No agent selected</div>
                    <div className="mt-2 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                      Pick an agent from the roster to edit CLI, role, task, and permissions.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden swarm-shell">
      <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-7 lg:py-7 swarm-content">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {SWARM_STEPS.map((item, index) => {
              const complete = index < step
              const active = index === step

              return (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (index <= step) setStep(index)
                    }}
                    className="swarm-step-pill text-[9px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      borderColor: active ? 'rgba(79,140,255,0.34)' : complete ? 'rgba(46,213,115,0.24)' : 'rgba(255,255,255,0.08)',
                      background: active ? 'rgba(79,140,255,0.14)' : complete ? 'rgba(46,213,115,0.1)' : 'rgba(7,12,20,0.42)',
                      color: active ? 'var(--accent)' : complete ? 'var(--success)' : 'var(--text-muted)',
                      boxShadow: active ? '0 12px 36px rgba(79,140,255,0.16)' : 'none',
                    }}
                  >
                    {complete ? <Check size={10} /> : <span>{index + 1}</span>}
                    {item.label}
                  </button>
                  {index < SWARM_STEPS.length - 1 && (
                    <span className="swarm-step-connector" />
                  )}
                </div>
              )
            })}
          </div>

          {renderStepContent()}
        </div>
      </div>

      <div className="shrink-0 px-5 py-4 lg:px-7 swarm-content">
        <div className="max-w-6xl mx-auto swarm-floating-footer px-5 py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {step === 0 ? (
                <button onClick={() => setView('home')} className="btn-ghost text-[11px]">Cancel</button>
              ) : (
                <button onClick={() => setStep((current) => Math.max(0, current - 1))} className="btn-ghost text-[11px] inline-flex items-center gap-2">
                  <ArrowLeft size={12} /> Back
                </button>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              <span>STEP {step + 1} OF {SWARM_STEPS.length}</span>
              <span>•</span>
              <span>{progressPercent}%</span>
              <span>•</span>
              <span>{swarmName.trim() || 'Untitled swarm'}</span>
              <span>•</span>
              <span>{totalAgents} agents</span>
              {knowledgeFiles.length > 0 && (
                <>
                  <span>•</span>
                  <span>{knowledgeFiles.length} files</span>
                </>
              )}
            </div>

            {step === SWARM_STEPS.length - 1 ? (
              <button
                onClick={handleLaunch}
                disabled={!readyToLaunch}
                className="btn-primary inline-flex items-center gap-2 text-[12px] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--accent), rgba(40,231,197,0.82))', color: '#04111d', minWidth: '160px', justifyContent: 'center' }}
              >
                <Rocket size={14} /> Launch Swarm
              </button>
            ) : (
              <button
                onClick={() => canContinue && setStep((current) => Math.min(SWARM_STEPS.length - 1, current + 1))}
                disabled={!canContinue}
                className="btn-primary inline-flex items-center gap-2 text-[12px] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ minWidth: '128px', justifyContent: 'center' }}
              >
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="premium-stat px-4 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Swarm</div>
              <div className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{swarmName.trim() || 'Pending name'}</div>
            </div>
            <div className="premium-stat px-4 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Directory</div>
              <div className="mt-2 text-[11px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>{workDir || 'Not set'}</div>
            </div>
            <div className="premium-stat px-4 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Roster</div>
              <div className="mt-2 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{totalAgents} configured agents</div>
            </div>
            <div className="premium-stat px-4 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Mission</div>
              <div className="mt-2 flex items-center gap-2 text-[12px] font-semibold" style={{ color: readyToLaunch ? 'var(--success)' : 'var(--warning)' }}>
                <Target size={13} />
                {readyToLaunch ? 'Ready to launch' : 'Needs input'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
