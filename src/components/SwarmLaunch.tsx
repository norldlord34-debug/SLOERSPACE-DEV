'use client'

import { getAgentCliResolutions, getDefaultWorkingDirectory, isTauriApp, openFolderDialog } from '@/lib/desktop'
import { useToast } from '@/components/Toast'
import { CliLogo } from '@/components/CliLogo'
import { generateId, type AgentCli, type AgentRole, type LaunchSwarmAgent, useStore } from '@/store/useStore'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Bot, Check, ChevronDown, Crown, FolderOpen, Hammer,
  MessageSquareText, Plus, Rocket, Search, Settings2, ShieldCheck, Sparkles,
  Upload, Workflow, X
} from 'lucide-react'

const SWARM_STEPS = [
  { id: 'agents', label: 'Roster', icon: Bot, title: 'Build your roster', description: 'Pick a preset, tune roles, and configure how each agent operates.' },
  { id: 'prompt', label: 'Mission', icon: MessageSquareText, title: 'Swarm mission', description: 'Describe what the swarm should build, fix, investigate, or ship.' },
  { id: 'directory', label: 'Directory', icon: FolderOpen, title: 'Choose a directory', description: 'Select the project folder your swarm agents will work inside.' },
  { id: 'knowledge', label: 'Context', icon: BookOpen, title: 'Supporting context', description: 'Attach specs, screenshots, notes, logs, or references to guide the swarm.' },
  { id: 'name', label: 'Name', icon: Sparkles, title: 'Name your swarm', description: 'Give your mission a short identity you can find later in the workspace.' },
] as const

const CLI_OPTIONS: Array<{ id: AgentCli; label: string; subtitle: string; short: string; color: string; icon: string }> = [
  { id: 'claude', label: 'Claude', subtitle: 'Anthropic', short: 'C', color: '#e8956a', icon: '✦' },
  { id: 'codex', label: 'Codex', subtitle: 'OpenAI', short: 'C', color: '#10a37f', icon: '◈' },
  { id: 'gemini', label: 'Gemini', subtitle: 'Google', short: 'G', color: '#4285f4', icon: '✧' },
  { id: 'opencode', label: 'OpenCode', subtitle: 'TUI', short: 'O', color: '#06b6d4', icon: '⟐' },
  { id: 'cursor', label: 'Cursor', subtitle: 'Agent', short: 'C', color: '#a855f7', icon: '⊡' },
  { id: 'droid', label: 'Droid', subtitle: 'Coding', short: 'D', color: '#84cc16', icon: '⬡' },
  { id: 'copilot', label: 'Copilot', subtitle: 'GitHub', short: 'C', color: '#58a6ff', icon: '⊛' },
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

const MISSION_TEMPLATES = [
  {
    label: 'Ship feature',
    prompt: 'Plan and implement the requested feature end to end, split the work across specialists, validate regressions, and prepare the result for operator review.',
  },
  {
    label: 'Forensic audit',
    prompt: 'Audit the project for bugs, missing features, visual mismatches, and integration gaps, then coordinate fixes with clear review ownership.',
  },
  {
    label: 'Release hardening',
    prompt: 'Stabilize the codebase for release: verify critical flows, harden edge cases, reduce regressions, and route final QA through a dedicated reviewer lane.',
  },
  {
    label: 'Deep refactor',
    prompt: 'Refactor the target area with a clear execution plan, preserve behavior, improve maintainability, and require review sign-off before handoff.',
  },
] as const

const SWARM_SKILLS = [
  { id: 'incremental-commits', group: 'Workflow', title: 'Incremental Commits', description: 'Commit small, atomic changes frequently', directive: 'Make small, atomic git commits after each meaningful change. Each commit should be independently valid and have a clear, descriptive message. Never batch unrelated changes into a single commit.' },
  { id: 'refactor-only', group: 'Workflow', title: 'Refactor Only', description: 'Restructure without changing behavior', directive: 'This is a refactoring task: restructure and improve code quality without changing external behavior. Ensure all existing tests still pass. Do not add new features or fix bugs unless directly related to the refactor.' },
  { id: 'monorepo-aware', group: 'Workflow', title: 'Monorepo Aware', description: 'Respect package boundaries and shared types', directive: 'This is a monorepo. Respect package boundaries — shared types belong in shared packages, not duplicated across projects. Check for cross-package imports before making changes. Run affected tests across packages.' },
  { id: 'test-driven', group: 'Quality', title: 'Test-Driven', description: 'Write tests first, then implement to pass them', directive: 'Follow test driven development: write failing tests first, then implement the minimum code to make them pass. Ensure all new code has corresponding test coverage.' },
  { id: 'code-review', group: 'Quality', title: 'Code Review', description: 'Review all changes before committing', directive: 'Before finalizing any changes, perform a thorough self-review: check for bugs, security issues, edge cases, and adherence to project conventions. Leave inline comments explaining non-obvious decisions.' },
  { id: 'documentation', group: 'Quality', title: 'Documentation', description: 'Document all public APIs and complex logic', directive: 'Document all public functions, interfaces, and complex logic. Add JSDoc/TSDoc comments for exported APIs. Update README or relevant docs when behavior changes.' },
  { id: 'security-audit', group: 'Quality', title: 'Security Audit', description: 'Check for vulnerabilities as you build', directive: 'Continuously audit for security vulnerabilities: validate all inputs, prevent injection attacks (SQL, XSS, command), use parameterized queries, avoid exposing sensitive data in logs or responses, and follow OWASP top 10 guidelines.' },
  { id: 'dry-principle', group: 'Quality', title: 'DRY Principle', description: 'Eliminate code duplication aggressively', directive: 'Aggressively eliminate code duplication. Extract shared logic into reusable utilities, hooks, or base classes. When you see similar patterns repeated, consolidate them into a single source of truth.' },
  { id: 'accessibility', group: 'Quality', title: 'Accessibility', description: 'Ensure UI meets WCAG accessibility standards', directive: 'Ensure all UI changes meet WCAG 2.1 AA standards: use semantic HTML, add ARIA labels, ensure keyboard navigability, maintain sufficient color contrast, and test with screen reader compatibility in mind.' },
  { id: 'keep-ci-green', group: 'Ops', title: 'Keep CI Green', description: 'Ensure all checks pass before moving on', directive: 'After every change, run the project linter, type checker, and test suite. Do not proceed to the next task until all CI checks pass. Fix any failures immediately.' },
  { id: 'migration-safe', group: 'Ops', title: 'Migration Safe', description: 'Ensure DB changes are reversible and safe', directive: 'All database changes must be migration-safe: include both up and down migrations, never drop columns in production without a deprecation period, use additive-only schema changes when possible, and test rollbacks.' },
  { id: 'performance', group: 'Analysis', title: 'Performance', description: 'Optimize for speed and efficiency', directive: 'Optimize for performance: minimize unnecessary re-renders, avoid N+1 queries, use appropriate data structures, lazy-load where possible, and profile before and after changes when feasible.' },
] as const

const SWARM_SKILL_GROUPS = ['Workflow', 'Quality', 'Ops', 'Analysis'] as const


type CliDetectionState = 'checking' | 'available' | 'missing' | 'unverified'

const INITIAL_CLI_DETECTION: Record<AgentCli, CliDetectionState> = {
  claude: 'checking',
  codex: 'checking',
  gemini: 'checking',
  opencode: 'checking',
  cursor: 'checking',
  droid: 'checking',
  copilot: 'checking',
}

const EMPTY_CLI_BOOTSTRAP: Record<AgentCli, string | null> = {
  claude: null,
  codex: null,
  gemini: null,
  opencode: null,
  cursor: null,
  droid: null,
  copilot: null,
}

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
  const addRecentProject = useStore((s) => s.addRecentProject)
  const userProfile = useStore((s) => s.userProfile)
  const recentProjects = useStore((s) => s.recentProjects)
  const { addToast } = useToast()
  const [step, setStep] = useState(0)
  const [swarmName, setSwarmName] = useState('')
  const [objective, setObjective] = useState('')
  const [workDir, setWorkDir] = useState('')
  const [defaultDir, setDefaultDir] = useState('')
  const [pathCommand, setPathCommand] = useState('')
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([])
  const [contextNotes, setContextNotes] = useState('')
  const [missionDirectives, setMissionDirectives] = useState<string[]>([])
  const [cliDetection, setCliDetection] = useState<Record<AgentCli, CliDetectionState>>(INITIAL_CLI_DETECTION)
  const [cliBootstrapCommands, setCliBootstrapCommands] = useState<Record<AgentCli, string | null>>(EMPTY_CLI_BOOTSTRAP)
  const [globalCli, setGlobalCli] = useState<AgentCli>('claude')
  const [presetSize, setPresetSize] = useState<number>(5)
  const [agents, setAgents] = useState<LaunchSwarmAgent[]>(() => buildAgentsFromPreset({ coord: 1, builder: 2, scout: 1, reviewer: 1, custom: 0 }, 'claude', ''))
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [isBrowsingDirectory, setIsBrowsingDirectory] = useState(false)
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previousObjectiveRef = useRef('')
  const directorySuggestions = useMemo(
    () => Array.from(new Set([workDir, defaultDir, ...recentProjects].filter(Boolean))).slice(0, 6),
    [defaultDir, recentProjects, workDir],
  )

  const applyWorkDir = (nextDir: string, options?: { syncCommand?: boolean; remember?: boolean }) => {
    const normalized = nextDir.trim()
    if (!normalized) {
      return
    }

    setWorkDir(normalized)

    if (options?.syncCommand ?? true) {
      setPathCommand(normalized)
    }

    if (options?.remember) {
      addRecentProject(normalized)
    }
  }

  useEffect(() => {
    let mounted = true

    void getDefaultWorkingDirectory()
      .then((directory) => {
        if (!mounted) return
        setDefaultDir(directory)
        setWorkDir((current) => current || directory)
        setPathCommand((current) => current || directory)
      })
      .catch(() => {
        if (!mounted) return
        const fallback = 'C:\\'
        setDefaultDir(fallback)
        setWorkDir((current) => current || fallback)
        setPathCommand((current) => current || fallback)
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

  useEffect(() => {
    const previousObjective = previousObjectiveRef.current

    if (previousObjective === objective) {
      return
    }

    setAgents((current) => current.map((agent) => {
      const previousTemplate = getTaskTemplate(agent.role, previousObjective)
      const currentTask = agent.task.trim()

      if (!currentTask || currentTask === previousTemplate) {
        return {
          ...agent,
          task: getTaskTemplate(agent.role, objective),
        }
      }

      return agent
    }))

    previousObjectiveRef.current = objective
  }, [objective])

  useEffect(() => {
    if (!isTauriApp()) {
      setCliDetection({
        claude: 'unverified',
        codex: 'unverified',
        gemini: 'unverified',
        opencode: 'unverified',
        cursor: 'unverified',
        droid: 'unverified',
        copilot: 'unverified',
      })
      setCliBootstrapCommands(EMPTY_CLI_BOOTSTRAP)
      return
    }

    let disposed = false
    setCliDetection((current) => Object.keys(current).reduce((acc, key) => ({
      ...acc,
      [key]: 'checking',
    }), {} as Record<AgentCli, CliDetectionState>))

    void getAgentCliResolutions(CLI_OPTIONS.map((option) => option.id)).then((entries) => {
      if (disposed) {
        return
      }

      const nextDetection = { ...INITIAL_CLI_DETECTION }
      const nextBootstraps = { ...EMPTY_CLI_BOOTSTRAP }

      entries.forEach((entry) => {
        const cli = entry.cli as AgentCli
        nextDetection[cli] = entry.available ? 'available' : 'missing'
        nextBootstraps[cli] = entry.bootstrapCommand
      })

      setCliDetection(nextDetection)
      setCliBootstrapCommands(nextBootstraps)
    }).catch(() => {
      if (disposed) {
        return
      }

      setCliDetection({
        claude: 'unverified',
        codex: 'unverified',
        gemini: 'unverified',
        opencode: 'unverified',
        cursor: 'unverified',
        droid: 'unverified',
        copilot: 'unverified',
      })
      setCliBootstrapCommands(EMPTY_CLI_BOOTSTRAP)
    })

    return () => {
      disposed = true
    }
  }, [])

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
  const objectiveWordCount = objective.trim() ? objective.trim().split(/\s+/).filter(Boolean).length : 0
  const directoryLeaf = workDir.split(/[\\/]/).filter(Boolean).pop() || workDir || 'Unbound'
  const missionProfile = objective.trim().length > 480 ? 'Enterprise mission' : objective.trim().length > 180 ? 'Advanced mission' : objective.trim().length > 0 ? 'Focused mission' : 'Mission draft'
  const knowledgeLabel = knowledgeFiles.length === 0 ? 'No linked files' : knowledgeFiles.length === 1 ? '1 linked file' : `${knowledgeFiles.length} linked files`
  const activePreset = PRESET_OPTIONS.find((preset) => preset.total === presetSize) ?? null
  const activeRoleCount = ROLE_OPTIONS.filter((role) => roleCounts[role.id] > 0).length
  const selectedDirectiveCount = missionDirectives.length
  const selectedDirectiveTitles = missionDirectives.map((directiveId) => (
    SWARM_SKILLS.find((skill) => skill.id === directiveId)?.title ?? directiveId
  ))
  const cliAvailabilitySummary = CLI_OPTIONS.reduce((acc, option) => {
    const state = cliDetection[option.id]

    if (state === 'available') acc.available += 1
    if (state === 'missing') acc.missing += 1
    if (state === 'checking') acc.checking += 1
    if (state === 'unverified') acc.unverified += 1

    return acc
  }, { available: 0, missing: 0, checking: 0, unverified: 0 })
  const unavailableSelectedClis = Array.from(new Set(
    agents
      .map((agent) => agent.cli)
      .filter((cli) => cliDetection[cli] === 'missing'),
  ))

  const canContinue = [
    totalAgents > 0,
    objective.trim().length > 0,
    workDir.trim().length > 0,
    true,
    swarmName.trim().length > 0,
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

  const resolveTaskForRole = (agent: LaunchSwarmAgent, nextRole: AgentRole) => {
    const currentTask = agent.task.trim()
    const currentTemplate = getTaskTemplate(agent.role, objective)

    if (!currentTask || currentTask === currentTemplate) {
      return getTaskTemplate(nextRole, objective)
    }

    return agent.task
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

  const toggleMissionDirective = (directiveId: string) => {
    setMissionDirectives((current) => (
      current.includes(directiveId)
        ? current.filter((item) => item !== directiveId)
        : [...current, directiveId]
    ))
  }

  const handleLaunch = async () => {
    if (!readyToLaunch) return

    let nextBootstraps = cliBootstrapCommands

    if (isTauriApp()) {
      try {
        const selectedCliIds = Array.from(new Set(agents.map((agent) => agent.cli)))
        const resolutions = await getAgentCliResolutions(selectedCliIds)
        nextBootstraps = resolutions.reduce((acc, entry) => {
          if (CLI_OPTIONS.some((option) => option.id === entry.cli)) {
            acc[entry.cli as AgentCli] = entry.bootstrapCommand
          }
          return acc
        }, { ...EMPTY_CLI_BOOTSTRAP })
        setCliBootstrapCommands(nextBootstraps)
        setCliDetection((current) => {
          const next = { ...current }
          resolutions.forEach((entry) => {
            if (CLI_OPTIONS.some((option) => option.id === entry.cli)) {
              next[entry.cli as AgentCli] = entry.available ? 'available' : 'missing'
            }
          })
          return next
        })
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Failed to resolve local agent CLIs.', 'error', 5200)
        return
      }
    }

    addRecentProject(workDir)

    launchSwarm({
      name: swarmName,
      objective,
      workingDirectory: workDir,
      knowledgeFiles,
      contextNotes,
      missionDirectives,
      agents: agents.map((agent) => ({
        ...agent,
        cliBootstrapCommand: nextBootstraps[agent.cli] ?? null,
      })),
    })

    if (agents.some((agent) => !nextBootstraps[agent.cli])) {
      addToast('Some agents launched without a detected local CLI. Those lanes will stay in the shell until you start the tool manually.', 'warning', 6200)
    }
  }

  const handleBrowseDirectory = async () => {
    if (isBrowsingDirectory) return

    setIsBrowsingDirectory(true)
    try {
      const path = await openFolderDialog(workDir || defaultDir || undefined)
      if (path) {
        applyWorkDir(path, { remember: true })
      }
    } finally {
      setIsBrowsingDirectory(false)
    }
  }

  const applyPathCommand = () => {
    const nextDir = resolvePathCommand(pathCommand, workDir, defaultDir || workDir)
    applyWorkDir(nextDir, { syncCommand: true, remember: true })
  }

  const applyMissionTemplate = (template: (typeof MISSION_TEMPLATES)[number]) => {
    setObjective(template.prompt)
    setAgents((current) => current.map((agent) => ({
      ...agent,
      task: getTaskTemplate(agent.role, template.prompt),
    })))
  }

  const renderStepContent = () => {
    const StepIcon = currentStep.icon

    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl blur-xl opacity-40" />
            <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center border border-white/20" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
              <StepIcon size={24} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {currentStep.title}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-white/60">
            {currentStep.description}
          </p>
        </div>

        {step === 4 && (
          <div className="mt-10 grid gap-5 xl:grid-cols-[1.04fr_0.96fr]">
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

            <div className="swarm-panel-soft p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                    Launch review
                  </div>
                  <div className="mt-1 text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Final mission envelope
                  </div>
                </div>
                <div className="premium-chip" style={{ color: readyToLaunch ? 'var(--success)' : 'var(--warning)' }}>
                  <Rocket size={12} />
                  {readyToLaunch ? 'Ready' : 'Pending'}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Roster</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{totalAgents} agents</div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{activeRoleCount} role lanes active</div>
                </div>
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Context</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: knowledgeFiles.length > 0 || selectedDirectiveCount > 0 || contextNotes.trim() ? 'var(--success)' : 'var(--text-primary)' }}>
                    {knowledgeLabel}
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{selectedDirectiveCount} directives · {contextNotes.trim() ? 'notes linked' : 'no notes'}</div>
                </div>
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>CLI readiness</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: unavailableSelectedClis.length > 0 ? 'var(--warning)' : cliAvailabilitySummary.available > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                    {cliAvailabilitySummary.available} detected
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{unavailableSelectedClis.length > 0 ? `Unavailable: ${unavailableSelectedClis.join(', ')}` : 'Selected CLIs pass local probe or remain unverified'}</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'rgba(4,9,18,0.56)' }}>
                <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Operator preview</div>
                <div className="mt-3 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                  {objective.trim() || 'Mission brief pending.'}
                </div>
                {selectedDirectiveTitles.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedDirectiveTitles.slice(0, 6).map((title) => (
                      <span key={title} className="rounded-full px-3 py-1 text-[9px] font-semibold" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>
                        {title}
                      </span>
                    ))}
                  </div>
                )}
                {unavailableSelectedClis.length > 0 && (
                  <div className="mt-4 rounded-2xl px-4 py-3 text-[10px] leading-6" style={{ background: 'rgba(255,191,98,0.08)', color: 'var(--warning)' }}>
                    Unavailable CLIs detected in this roster: {unavailableSelectedClis.join(', ')}. Switch to a detected CLI before launch if you want real local runtime alignment.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="premium-stat px-4 py-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Selected root</div>
                <div className="mt-2 text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{directoryLeaf}</div>
                <div className="mt-1 text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{workDir || 'Awaiting path binding'}</div>
              </div>
              <div className="premium-stat px-4 py-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Home base</div>
                <div className="mt-2 text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{defaultDir || 'Desktop bridge'}</div>
                <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Fallback path for rapid setup</div>
              </div>
              <div className="premium-stat px-4 py-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Repository binding</div>
                <div className="mt-2 text-[13px] font-semibold" style={{ color: workDir.trim() ? 'var(--success)' : 'var(--warning)' }}>
                  {workDir.trim() ? 'Connected' : 'Pending'}
                </div>
                <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Agents inherit this path at launch</div>
              </div>
            </div>
            <div className="swarm-panel-soft swarm-hover-lift p-5 md:p-6">
              <div className="swarm-input-shell flex items-center gap-3 px-4 py-3.5">
                <FolderOpen size={16} style={{ color: 'var(--accent)' }} />
                <input
                  value={workDir}
                  onChange={(e) => applyWorkDir(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] font-mono outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleBrowseDirectory}
                  disabled={isBrowsingDirectory}
                  className="btn-secondary text-[10px] px-4 py-2"
                >
                  {isBrowsingDirectory ? 'Opening…' : 'Browse'}
                </button>
                <button
                  onClick={() => defaultDir && applyWorkDir(defaultDir, { remember: true })}
                  disabled={!defaultDir}
                  className="btn-secondary text-[10px] px-4 py-2"
                >
                  Default
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span className="premium-kbd">tab</span>
                <span>Paste or browse to the repository root the swarm will operate in.</span>
              </div>
              {directorySuggestions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {directorySuggestions.map((path) => (
                    <button
                      key={path}
                      onClick={() => applyWorkDir(path, { remember: true })}
                      className="rounded-full border px-3 py-1.5 text-[9px] font-semibold transition-all swarm-hover-lift"
                      style={{
                        borderColor: workDir === path ? 'rgba(79,140,255,0.28)' : 'rgba(255,255,255,0.08)',
                        background: workDir === path ? 'rgba(79,140,255,0.12)' : 'rgba(4,9,18,0.56)',
                        color: workDir === path ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {path}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="swarm-panel-soft p-5 md:p-6">
              <div className="swarm-input-shell flex items-center gap-3 px-4 py-3.5">
                <span className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>{'>'}_$</span>
                <input
                  value={pathCommand}
                  onChange={(e) => setPathCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applyPathCommand()
                    }
                  }}
                  placeholder="cd ~/projects/my-app or ../repo"
                  className="flex-1 bg-transparent text-[12px] font-mono outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  onClick={applyPathCommand}
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

        {step === 1 && (
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="swarm-panel-soft p-6 md:p-8 lg:p-9">
              <div className="mb-4 flex flex-wrap gap-2">
                {MISSION_TEMPLATES.map((template) => (
                  <button
                    key={template.label}
                    onClick={() => applyMissionTemplate(template)}
                    className="rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-all swarm-hover-lift"
                    style={{
                      borderColor: objective === template.prompt ? 'rgba(79,140,255,0.3)' : 'rgba(255,255,255,0.08)',
                      background: objective === template.prompt ? 'rgba(79,140,255,0.1)' : 'rgba(4,9,18,0.56)',
                      color: objective === template.prompt ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
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

            {/* Swarm Skills */}
            <div className="mt-8 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.12)' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/40">Swarm Skills</div>
                  <div className="text-sm text-white/60">{selectedDirectiveCount} skills enabled</div>
                </div>
              </div>

              {SWARM_SKILL_GROUPS.map((group) => {
                const groupColor = group === 'Workflow' ? '#2ed573' : group === 'Quality' ? '#a855f7' : group === 'Ops' ? '#ffbf62' : '#4f8cff'
                const groupSkills = SWARM_SKILLS.filter((skill) => skill.group === group)

                return (
                  <div key={group} className="mb-6">
                    <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: groupColor }}>{group}</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {groupSkills.map((skill) => {
                        const active = missionDirectives.includes(skill.id)
                        const expanded = expandedSkillId === skill.id

                        return (
                          <div key={skill.id} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${expanded ? 'sm:col-span-2' : ''}`}
                            style={{
                              borderColor: active ? 'rgba(79,140,255,0.3)' : 'rgba(255,255,255,0.08)',
                              background: active ? 'rgba(79,140,255,0.08)' : 'rgba(255,255,255,0.03)',
                            }}>
                            <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                              onClick={() => setExpandedSkillId(expanded ? null : skill.id)}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${groupColor}20` }}>
                                  <Workflow size={14} style={{ color: groupColor }} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white truncate">{skill.title}</div>
                                  {!expanded && <div className="text-xs text-white/40 truncate">{skill.description}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleMissionDirective(skill.id) }}
                                  className="relative w-10 h-6 rounded-full transition-all duration-300"
                                  style={{ background: active ? 'rgba(79,140,255,0.5)' : 'rgba(255,255,255,0.15)' }}
                                >
                                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300"
                                    style={{ left: active ? '22px' : '2px' }} />
                                </button>
                                <ChevronDown size={14} className="text-white/40 transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                              </div>
                            </div>

                            {expanded && (
                              <div className="px-4 pb-4">
                                <div className="text-sm text-white/60 mb-4">{skill.description}</div>
                                <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquareText size={12} className="text-white/40" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">Agent Directive</span>
                                  </div>
                                  <div className="text-xs leading-relaxed text-white/50 font-mono">{skill.directive}</div>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ background: `${groupColor}20`, color: groupColor }}>{group}</span>
                                  <button
                                    onClick={() => toggleMissionDirective(skill.id)}
                                    className="text-xs font-semibold transition-all hover:opacity-80"
                                    style={{ color: active ? 'var(--error)' : 'var(--accent)' }}
                                  >
                                    {active ? 'Disable Skill' : 'Enable Skill'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-3xl mx-auto space-y-5">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleKnowledgeSelection(e.target.files)} />

            {/* File upload area */}
            <div onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border border-dashed py-10 cursor-pointer text-center transition-all duration-300 hover:border-white/20"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="mx-auto mb-3 h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,140,255,0.12)' }}>
                <Upload size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="text-sm font-semibold text-white">Add context files</div>
              <div className="mt-1 text-xs text-white/40">Drag & drop or click to attach PDFs, logs, specs, or images.</div>
            </div>

            {/* Attached files */}
            {knowledgeFiles.length > 0 && (
              <div className="space-y-2">
                {knowledgeFiles.map((file) => (
                  <div key={file} className="flex items-center gap-3 rounded-xl border px-4 py-2.5"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <BookOpen size={14} style={{ color: 'var(--accent)' }} />
                    <span className="flex-1 text-xs font-mono truncate text-white/70">{file}</span>
                    <button onClick={() => setKnowledgeFiles((c) => c.filter((f) => f !== file))}
                      className="text-white/30 hover:text-white/60 transition-all"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Operator notes */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Operator Notes (optional)</div>
              <textarea
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                placeholder="Add release constraints, priorities, or review expectations..."
                className="w-full min-h-[100px] rounded-xl border px-4 py-3 text-xs leading-relaxed outline-none resize-none"
                style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Quick Presets */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3 text-white/40">Quick Presets</div>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.total}
                    onClick={() => applyPreset(preset.total)}
                    className="rounded-2xl border py-4 text-center transition-all duration-300 hover:scale-[1.03]"
                    style={{
                      borderColor: presetSize === preset.total ? 'rgba(79,140,255,0.4)' : 'rgba(255,255,255,0.1)',
                      background: presetSize === preset.total ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="text-2xl font-bold" style={{ color: presetSize === preset.total ? '#4f8cff' : 'white' }}>{preset.total}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/40 mt-1">{preset.label}</div>
                  </button>
                ))}
              </div>
              {activePreset && (
                <div className="mt-2 text-center text-xs text-white/40 font-mono">
                  {Object.entries(activePreset.composition).filter(([, count]) => count > 0).map(([role, count]) => `${count} ${role}${count !== 1 ? 's' : ''}`).join(' · ')}
                </div>
              )}
            </div>

            {/* CLI Agent for All */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3 text-white/40">CLI Agent for All</div>
              <div className="flex flex-wrap gap-2">
                {CLI_OPTIONS.map((option) => {
                  const isActive = globalCli === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleGlobalCliChange(option.id)}
                      className="inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.03]"
                      style={{
                        borderColor: isActive ? `${option.color}66` : 'rgba(255,255,255,0.1)',
                        background: isActive ? `${option.color}18` : 'rgba(255,255,255,0.03)',
                        color: isActive ? option.color : 'rgba(255,255,255,0.7)',
                        boxShadow: isActive ? `0 4px 20px ${option.color}22` : 'none',
                      }}
                    >
                      <span className="h-6 w-6 rounded-lg flex items-center justify-center"
                        style={{ background: isActive ? `${option.color}30` : 'rgba(255,255,255,0.08)' }}>
                        <CliLogo cli={option.id} size={16} />
                      </span>
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Role Summary Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {ROLE_OPTIONS.filter((role) => roleCounts[role.id] > 0).map((role) => {
                const RoleIcon = role.icon
                return (
                  <span key={role.id} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ background: `${role.color}20`, color: role.color }}>
                    <RoleIcon size={12} />
                    {roleCounts[role.id]} {role.label}{roleCounts[role.id] !== 1 ? 's' : ''}
                  </span>
                )
              })}
              <span className="ml-auto text-xs font-mono text-white/40">{totalAgents} total</span>
            </div>

            {/* Agent List */}
            <div className="space-y-2">
              {agents.map((agent, index) => {
                const roleMeta = ROLE_OPTIONS.find((r) => r.id === agent.role) ?? ROLE_OPTIONS[0]
                const RoleIcon = roleMeta.icon
                const cliMeta = CLI_OPTIONS.find((c) => c.id === agent.cli) ?? CLI_OPTIONS[0]
                const isOpen = selectedAgentId === agent.id

                return (
                  <div key={agent.id} className="rounded-2xl border overflow-hidden transition-all duration-300"
                    style={{
                      borderColor: isOpen ? 'rgba(79,140,255,0.3)' : 'rgba(255,255,255,0.08)',
                      background: isOpen ? 'rgba(79,140,255,0.06)' : 'rgba(255,255,255,0.03)',
                    }}>
                    {/* Agent header row */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setSelectedAgentId(isOpen ? null : agent.id)}>
                      <span className="text-xs font-mono text-white/30 w-5 shrink-0">{index + 1}</span>
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${roleMeta.color}20` }}>
                        <RoleIcon size={16} style={{ color: roleMeta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white uppercase">{roleMeta.label}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: cliMeta.color }}><CliLogo cli={agent.cli} size={14} /> {cliMeta.label}</span>
                          {agent.autoApprove && (
                            <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>⚡ Auto</span>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveAgent(agent.id) }}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
                        <X size={14} />
                      </button>
                      <ChevronDown size={16} className="text-white/30 transition-transform duration-300 shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                    </div>

                    {/* Expanded config */}
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4">
                        {/* Role selector */}
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Role</div>
                          <div className="flex flex-wrap gap-1.5">
                            {ROLE_OPTIONS.map((role) => {
                              const RI = role.icon
                              return (
                                <button key={role.id}
                                  onClick={() => updateAgent(agent.id, { role: role.id, task: resolveTaskForRole(agent, role.id) })}
                                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all"
                                  style={{
                                    borderColor: agent.role === role.id ? `${role.color}66` : 'rgba(255,255,255,0.08)',
                                    background: agent.role === role.id ? `${role.color}18` : 'transparent',
                                    color: agent.role === role.id ? role.color : 'rgba(255,255,255,0.6)',
                                  }}>
                                  <RI size={12} /> {role.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* CLI selector */}
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">CLI</div>
                          <div className="flex flex-wrap gap-1.5">
                            {CLI_OPTIONS.map((opt) => (
                              <button key={opt.id}
                                onClick={() => updateAgent(agent.id, { cli: opt.id })}
                                className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all"
                                style={{
                                  borderColor: agent.cli === opt.id ? `${opt.color}66` : 'rgba(255,255,255,0.08)',
                                  background: agent.cli === opt.id ? `${opt.color}18` : 'transparent',
                                  color: agent.cli === opt.id ? opt.color : 'rgba(255,255,255,0.6)',
                                }}>
                                <CliLogo cli={opt.id} size={14} /> {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Auto-approve toggle */}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <button onClick={() => updateAgent(agent.id, { autoApprove: !agent.autoApprove })}
                            className="relative w-12 h-7 rounded-full transition-all duration-300"
                            style={{ background: agent.autoApprove ? 'rgba(46,213,115,0.5)' : 'rgba(255,255,255,0.15)' }}>
                            <div className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300"
                              style={{ left: agent.autoApprove ? '26px' : '2px' }} />
                          </button>
                          <div>
                            <span className="text-xs font-semibold text-white">Auto-approve</span>
                            <span className="block text-xs text-white/40">Skip permission prompts</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}

              <button onClick={handleAddAgent}
                className="w-full rounded-2xl border border-dashed py-3 text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white/60 hover:border-white/20 transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <span className="inline-flex items-center gap-2"><Plus size={14} /> Add Agent</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden bg-black">
      {/* 3D Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900" />
        <div className="absolute top-10 left-10 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-6 lg:px-8 lg:py-8">
        <div className="max-w-5xl mx-auto">
          {/* Wizard step navigation */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {SWARM_STEPS.map((item, index) => {
              const complete = index < step
              const active = index === step
              const StIcon = item.icon

              return (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => { if (index <= step) setStep(index) }}
                    className="group relative inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-500 hover:scale-105"
                    style={{
                      borderColor: active ? 'rgba(79,140,255,0.4)' : complete ? 'rgba(46,213,115,0.3)' : 'rgba(255,255,255,0.1)',
                      background: active ? 'rgba(79,140,255,0.15)' : complete ? 'rgba(46,213,115,0.1)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#4f8cff' : complete ? '#2ed573' : 'rgba(255,255,255,0.5)',
                      backdropFilter: 'blur(12px)',
                      boxShadow: active ? '0 8px 32px rgba(79,140,255,0.2)' : 'none',
                    }}
                  >
                    {complete ? <Check size={12} /> : <StIcon size={12} />}
                    {item.label}
                  </button>
                  {index < SWARM_STEPS.length - 1 && (
                    <div className="w-6 h-px" style={{ background: complete ? 'rgba(46,213,115,0.3)' : 'rgba(255,255,255,0.1)' }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="mb-8 mx-auto max-w-md">
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #4f8cff, #28e7c5)' }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span>Step {step + 1} of {SWARM_STEPS.length}</span>
              <span>{progressPercent}% complete</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Profile', value: missionProfile, detail: `${objectiveWordCount} words` },
              { label: 'Directory', value: directoryLeaf, detail: workDir || 'Awaiting path' },
              { label: 'Context', value: knowledgeLabel, detail: `${selectedDirectiveCount} directives` },
              { label: 'Fleet', value: readyToLaunch ? 'Ready' : 'Configuring', detail: `${totalAgents} agents`, ready: readyToLaunch },
            ].map((stat) => (
              <div key={stat.label} className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-[1.02]" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative p-4">
                  <div className="text-xs font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
                  <div className="mt-2 text-base font-bold text-white truncate">{stat.value}</div>
                  <div className="mt-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Step content */}
          {renderStepContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 shrink-0 px-5 py-4 lg:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {step === 0 ? (
              <button onClick={() => setView('home')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition-all">
                Cancel
              </button>
            ) : (
              <button onClick={() => setStep((current) => Math.max(0, current - 1))} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition-all inline-flex items-center gap-2">
                <ArrowLeft size={12} /> Back
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span>{swarmName.trim() || 'Untitled'}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{totalAgents} agents</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{progressPercent}%</span>
          </div>

          {step === SWARM_STEPS.length - 1 ? (
            <button
              onClick={handleLaunch}
              disabled={!readyToLaunch}
              className="relative overflow-hidden rounded-2xl px-8 py-3 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-500 hover:scale-105 inline-flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #4f8cff, #28e7c5)', color: '#04111d', boxShadow: readyToLaunch ? '0 12px 40px rgba(79,140,255,0.3)' : 'none' }}
            >
              <Rocket size={14} /> Launch Swarm
            </button>
          ) : (
            <button
              onClick={() => canContinue && setStep((current) => Math.min(SWARM_STEPS.length - 1, current + 1))}
              disabled={!canContinue}
              className="rounded-2xl px-8 py-3 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-500 hover:scale-105 inline-flex items-center gap-2"
              style={{ background: 'rgba(79,140,255,0.2)', color: '#4f8cff', border: '1px solid rgba(79,140,255,0.3)' }}
            >
              Next <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
