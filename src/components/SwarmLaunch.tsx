'use client'

import { getAgentCliResolutions, getDefaultWorkingDirectory, isTauriApp, openFolderDialog } from '@/lib/desktop'
import { useToast } from '@/components/Toast'
import { generateId, type AgentCli, type AgentRole, type LaunchSwarmAgent, useStore } from '@/store/useStore'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Bot, Check, Crown, FolderOpen, Hammer,
  MessageSquareText, Plus, Rocket, Search, Settings2, ShieldCheck, Sparkles,
  Target, Upload, Workflow, X, ChevronDown, Cpu, Layers3, Terminal
} from 'lucide-react'

const SWARM_STEPS = [
  { id: 'agents', label: 'Roster', icon: Bot, title: 'Build your roster', description: 'Pick a preset, tune roles, and configure how each agent operates.' },
  { id: 'prompt', label: 'Mission', icon: MessageSquareText, title: 'Swarm mission', description: 'Describe what the swarm should build, fix, investigate, or ship.' },
  { id: 'directory', label: 'Directory', icon: FolderOpen, title: 'Choose a directory', description: 'Select the project folder your swarm agents will work inside.' },
  { id: 'knowledge', label: 'Context', icon: BookOpen, title: 'Supporting context', description: 'Attach specs, screenshots, notes, logs, or references to guide the swarm.' },
  { id: 'name', label: 'Name', icon: Sparkles, title: 'Name your swarm', description: 'Give your mission a short identity you can find later in the workspace.' },
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
  { id: 'incremental-commits', group: 'Workflow', title: 'Incremental commits', description: 'Ship small validated changes frequently.' },
  { id: 'refactor-only', group: 'Workflow', title: 'Refactor only', description: 'Restructure safely without changing behavior.' },
  { id: 'monorepo-aware', group: 'Workflow', title: 'Monorepo aware', description: 'Respect package boundaries and shared tooling.' },
  { id: 'test-driven', group: 'Quality', title: 'Test-driven', description: 'Write tests, then implement and verify.' },
  { id: 'code-review', group: 'Quality', title: 'Code review', description: 'Route all changes through a review lane.' },
  { id: 'documentation', group: 'Quality', title: 'Documentation', description: 'Document public APIs and operator-visible changes.' },
  { id: 'security-audit', group: 'Quality', title: 'Security audit', description: 'Check for vulnerabilities while building.' },
  { id: 'keep-ci-green', group: 'Ops', title: 'Keep CI green', description: 'Protect validation and release posture.' },
  { id: 'migration-safe', group: 'Ops', title: 'Migration safe', description: 'Keep data and rollout changes reversible.' },
  { id: 'performance', group: 'Analysis', title: 'Performance', description: 'Optimize for speed and efficiency.' },
] as const

const SWARM_SKILL_GROUPS = ['Workflow', 'Quality', 'Ops', 'Analysis'] as const

const SWARM_HERO_SIGNALS: Array<{ label: string; value: string; detail: string; icon: typeof Sparkles }> = [
  { label: 'Mission graph', value: 'Shared execution map', detail: 'One objective, one roster, one control surface.', icon: Layers3 },
  { label: 'Real runtime', value: 'Terminal-backed lanes', detail: 'Agents launch into real CLI sessions, not mock cards.', icon: Terminal },
  { label: 'Operator control', value: 'Brief, route, review', detail: 'The operator can steer, audit, and stop the mission at any time.', icon: Cpu },
] as const

const SWARM_WORKFLOW_COLUMNS: Array<{ label: string; title: string; body: string; icon: typeof Sparkles }> = [
  { label: 'Brief', title: 'Write one mission, not five disconnected prompts.', body: 'The whole swarm inherits the same objective, directory, and linked knowledge before execution starts.', icon: MessageSquareText },
  { label: 'Compose', title: 'Specialists are assigned by role instead of improvising.', body: 'Coordinators, builders, scouts, reviewers, and custom lanes each get explicit responsibilities.', icon: Bot },
  { label: 'Execute', title: 'Work moves in parallel with visible routing and handoffs.', body: 'The dashboard keeps execution and coordination synchronized while preserving operator visibility.', icon: Workflow },
  { label: 'Review', title: 'Results come back through a review-aware delivery loop.', body: 'Reviewer lanes, live activity, and operator messaging reduce silent drift and missed regressions.', icon: ShieldCheck },
] as const

const SWARM_ADVANTAGES: Array<{ title: string; body: string; icon: typeof Sparkles }> = [
  { title: 'One shared directory', body: 'Every agent boots with the same project root so execution never drifts into disconnected contexts.', icon: FolderOpen },
  { title: 'Linked knowledge files', body: 'Screenshots, specs, logs, and notes stay attached to the mission instead of living outside the workflow.', icon: BookOpen },
  { title: 'Clear role lanes', body: 'Specialized lanes create predictable handoffs between planning, implementation, research, and review.', icon: Crown },
  { title: 'Live operator review', body: 'The operator can send directives, focus a lane, or stop the whole mission without losing session state.', icon: Sparkles },
  { title: 'Real terminal surfaces', body: 'Swarm execution is tied to actual terminal panes, which keeps the system grounded in real command runtime.', icon: Terminal },
  { title: 'Enterprise posture', body: 'The flow is optimized for shipping work with clarity, auditability, and less coordination overhead.', icon: Target },
] as const

const SWARM_FAQ = [
  {
    id: 'when',
    question: 'When should I use SloerSwarm instead of a single terminal workspace?',
    answer: 'Use Swarm when the work benefits from explicit coordination: implementation plus review, research plus execution, or larger missions that need parallel lanes with operator oversight.',
  },
  {
    id: 'roles',
    question: 'Do roles actually change how the mission behaves?',
    answer: 'Yes. Roles shape task defaults, lane grouping, dashboard visualization, and the operator’s mental model of who is responsible for what inside the mission.',
  },
  {
    id: 'knowledge',
    question: 'What counts as supporting knowledge?',
    answer: 'Specs, screenshots, bug reports, logs, release notes, and any files that should travel with the mission so every agent shares the same context.',
  },
  {
    id: 'control',
    question: 'Can I still intervene once the swarm is active?',
    answer: 'Yes. The dashboard keeps operator messaging, lane focus, live activity, and stop controls available throughout the session.',
  },
] as const

const SWARM_PLAYBOOK_SECTIONS = [
  {
    title: 'The problem with solo agents',
    body: 'Single-agent loops often blur planning, implementation, research, and review into one stream. That works for quick tasks, but larger missions usually need clearer ownership and better visibility.',
  },
  {
    title: 'One shared mission, one directory',
    body: 'SloerSwarm starts from a single objective and a single working directory so the whole team works from the same operational source of truth.',
  },
  {
    title: 'Specialized roles, not generic agents',
    body: 'Coordination, build work, research, review, and custom duties can be assigned deliberately. That creates cleaner handoffs and a more senior-team execution pattern.',
  },
  {
    title: 'Context files are part of the operating model',
    body: 'Knowledge is not an afterthought. Screenshots, specs, and notes become mission inputs so every lane can operate with the same context envelope.',
  },
  {
    title: 'Operator stays in control',
    body: 'The operator can launch, direct, filter, review, and halt the swarm without losing situational awareness. The goal is leverage, not blind delegation.',
  },
] as const

type CliDetectionState = 'checking' | 'available' | 'missing' | 'unverified'

const INITIAL_CLI_DETECTION: Record<AgentCli, CliDetectionState> = {
  claude: 'checking',
  codex: 'checking',
  gemini: 'checking',
  opencode: 'checking',
  cursor: 'checking',
}

const EMPTY_CLI_BOOTSTRAP: Record<AgentCli, string | null> = {
  claude: null,
  codex: null,
  gemini: null,
  opencode: null,
  cursor: null,
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
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(SWARM_FAQ[0]?.id ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wizardRef = useRef<HTMLDivElement>(null)
  const playbookRef = useRef<HTMLDivElement>(null)
  const faqRef = useRef<HTMLDivElement>(null)
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
      })
      setCliBootstrapCommands(EMPTY_CLI_BOOTSTRAP)
    })

    return () => {
      disposed = true
    }
  }, [])

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
  const preferredAvailableCli = CLI_OPTIONS.find((option) => cliDetection[option.id] === 'available')?.id ?? null

  const getCliDetectionMeta = (cli: AgentCli) => {
    const state = cliDetection[cli]

    if (state === 'available') {
      return { label: 'Detected', color: 'var(--success)' }
    }

    if (state === 'missing') {
      return { label: 'Not found', color: 'var(--error)' }
    }

    if (state === 'checking') {
      return { label: 'Checking', color: 'var(--warning)' }
    }

    return { label: 'Unverified', color: 'var(--text-muted)' }
  }

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

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          </div>
        )}

        {step === 3 && (
          <div className="mt-10 grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Linked files</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: knowledgeFiles.length > 0 ? 'var(--success)' : 'var(--text-primary)' }}>{knowledgeLabel}</div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Screenshots, logs, specs, notes</div>
                </div>
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Directives</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: selectedDirectiveCount > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>{selectedDirectiveCount}</div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Mission guardrails enabled</div>
                </div>
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Operator notes</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: contextNotes.trim() ? 'var(--success)' : 'var(--text-primary)' }}>
                    {contextNotes.trim() ? 'Attached' : 'Optional'}
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{contextNotes.trim().length} chars</div>
                </div>
              </div>

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
                <div className="swarm-panel-soft p-5">
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

            <div className="space-y-5">
              <div className="swarm-panel-soft p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                      Mission directives
                    </div>
                    <div className="mt-1 text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                      Operational guardrails
                    </div>
                  </div>
                  <div className="premium-chip" style={{ color: 'var(--accent)' }}>
                    <Workflow size={12} />
                    {selectedDirectiveCount} selected
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {SWARM_SKILL_GROUPS.map((group) => (
                    <div key={group}>
                      <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{group}</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {SWARM_SKILLS.filter((skill) => skill.group === group).map((skill) => {
                          const active = missionDirectives.includes(skill.id)

                          return (
                            <button
                              key={skill.id}
                              onClick={() => toggleMissionDirective(skill.id)}
                              className="rounded-2xl border px-4 py-3 text-left transition-all swarm-hover-lift"
                              style={{
                                borderColor: active ? 'rgba(79,140,255,0.34)' : 'var(--border)',
                                background: active ? 'rgba(79,140,255,0.1)' : 'rgba(4,9,18,0.56)',
                                boxShadow: active ? '0 16px 42px rgba(79,140,255,0.12)' : 'none',
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{skill.title}</span>
                                {active && <Check size={12} style={{ color: 'var(--accent)' }} />}
                              </div>
                              <div className="mt-2 text-[10px] leading-5" style={{ color: 'var(--text-secondary)' }}>{skill.description}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="swarm-panel-soft p-5 md:p-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  Operator notes
                </div>
                <div className="mt-1 text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Context only the operator should frame explicitly
                </div>
                <textarea
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  placeholder="Add release constraints, non-obvious caveats, priorities, or review expectations..."
                  className="mt-4 w-full min-h-[160px] rounded-[22px] border bg-[rgba(3,8,16,0.92)] px-5 py-4 text-[12px] leading-7 outline-none resize-none transition-all"
                  style={{ borderColor: 'rgba(79,140,255,0.18)', color: 'var(--text-primary)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                />
                <div className="mt-3 rounded-2xl px-4 py-3 text-[10px] leading-6" style={{ background: 'rgba(79,140,255,0.08)', color: 'var(--text-secondary)' }}>
                  Notes are attached to the launch envelope so the active swarm can preserve operator intent, even when the brief is short.
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 0 && (
          <div className="mt-10 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="swarm-panel-soft p-5 md:p-6">
              <div className="mb-5 grid gap-3 md:grid-cols-3">
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Preset posture</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{activePreset ? activePreset.label : 'Custom roster'}</div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{totalAgents} agents in formation</div>
                </div>
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Coverage</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{activeRoleCount} active roles</div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Balanced lanes reduce operator load</div>
                </div>
                <div className="premium-stat px-4 py-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Mission sync</div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: cliAvailabilitySummary.missing > 0 ? 'var(--warning)' : cliAvailabilitySummary.available > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                    {cliAvailabilitySummary.available} detected
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{cliAvailabilitySummary.missing} missing · {cliAvailabilitySummary.unverified} unverified</div>
                </div>
              </div>
              {unavailableSelectedClis.length > 0 && (
                <div className="mb-5 rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,191,98,0.22)', background: 'rgba(255,191,98,0.08)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--warning)' }}>CLI readiness warning</div>
                      <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                        Selected roster includes unavailable CLIs: {unavailableSelectedClis.join(', ')}.
                      </div>
                    </div>
                    {preferredAvailableCli && (
                      <button
                        onClick={() => handleGlobalCliChange(preferredAvailableCli)}
                        className="btn-secondary text-[10px] px-4 py-2"
                      >
                        Use {preferredAvailableCli}
                      </button>
                    )}
                  </div>
                </div>
              )}
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
                  (() => {
                    const detectionMeta = getCliDetectionMeta(option.id)

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleGlobalCliChange(option.id)}
                        className="rounded-2xl border px-4 py-3 text-left transition-all swarm-hover-lift"
                        style={{
                          borderColor: globalCli === option.id ? 'rgba(79,140,255,0.38)' : detectionMeta.color === 'var(--error)' ? 'rgba(255,71,87,0.22)' : 'var(--border)',
                          background: globalCli === option.id ? 'rgba(79,140,255,0.1)' : 'rgba(4,9,18,0.56)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-xl"
                            style={{ background: globalCli === option.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: globalCli === option.id ? '#04111d' : 'var(--text-secondary)' }}>
                            <span className="text-[10px] font-bold">{option.short}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{option.label}</div>
                            <div className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>{option.subtitle}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: detectionMeta.color }}>
                            {detectionMeta.label}
                          </span>
                          {globalCli === option.id && (
                            <span className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                              active
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })()
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
                  const detectionMeta = getCliDetectionMeta(agent.cli)

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
                            <span className="rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em]" style={{ background: 'rgba(255,255,255,0.04)', color: detectionMeta.color }}>
                              {detectionMeta.label}
                            </span>
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
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: getCliDetectionMeta(selectedAgent.cli).color }}>
                        {getCliDetectionMeta(selectedAgent.cli).label}
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
                            onClick={() => updateAgent(selectedAgent.id, { role: role.id, task: resolveTaskForRole(selectedAgent, role.id) })}
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
          {step === 0 && (
            <>
              <section className="mb-8 grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
                <div className="premium-panel-elevated premium-card-shell p-6 md:p-8 xl:p-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="premium-chip" style={{ color: 'var(--accent)' }}>
                      <Workflow size={12} />
                      SloerSwarm Command Surface
                    </div>
                    <div className="premium-chip">
                      <Sparkles size={12} style={{ color: 'var(--warning)' }} />
                      Multi-agent engineering system
                    </div>
                  </div>

                  <h1 className="mt-6 text-[34px] font-bold leading-[1.02] md:text-[48px]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.05em' }}>
                    Turn AI agents into
                    <br />
                    a senior engineering team.
                  </h1>

                  <p className="mt-4 max-w-2xl text-[14px] leading-8" style={{ color: 'var(--text-secondary)' }}>
                    SloerSwarm gives you the launchpad, shared mission brief, specialist roster, and live command surface required to coordinate real delivery across parallel agent lanes.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => scrollToSection(wizardRef)}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      Configure Swarm <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => scrollToSection(playbookRef)}
                      className="btn-secondary inline-flex items-center gap-2"
                    >
                      Read Playbook <BookOpen size={13} />
                    </button>
                    <button
                      onClick={() => scrollToSection(faqRef)}
                      className="btn-ghost inline-flex items-center gap-2 text-[11px]"
                    >
                      FAQ <ChevronDown size={12} />
                    </button>
                  </div>

                  <div className="mt-8 grid gap-3 md:grid-cols-3">
                    {SWARM_HERO_SIGNALS.map((signal) => {
                      const SignalIcon = signal.icon

                      return (
                        <div key={signal.label} className="rounded-[22px] border px-4 py-4" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(4,9,18,0.56)' }}>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
                              <SignalIcon size={14} />
                            </div>
                            <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>{signal.label}</div>
                          </div>
                          <div className="mt-4 text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>{signal.value}</div>
                          <div className="mt-2 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>{signal.detail}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="swarm-panel-soft p-5 md:p-6 xl:p-7">
                  <div className="rounded-[28px] border p-5" style={{ borderColor: 'rgba(79,140,255,0.14)', background: 'radial-gradient(circle at top, rgba(12,22,36,0.94), rgba(4,8,14,0.98))' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Bridge view</div>
                        <div className="mt-1 text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Live swarm topology</div>
                      </div>
                      <div className="premium-chip" style={{ color: 'var(--accent)' }}>
                        <Terminal size={11} />
                        Real CLI
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border p-4" style={{ borderColor: 'rgba(79,140,255,0.12)', background: 'rgba(2,7,14,0.82)' }}>
                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
                        <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                        Coordination layer
                      </div>
                      <div className="mt-4 grid gap-3">
                        <div className="flex items-center justify-between rounded-[18px] border px-4 py-3" style={{ borderColor: 'rgba(79,140,255,0.18)', background: 'rgba(79,140,255,0.08)' }}>
                          <div>
                            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Coordinator</div>
                            <div className="mt-1 text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>Routes tasks · maintains shared objective</div>
                          </div>
                          <span className="rounded-full px-2 py-1 text-[8px] font-bold uppercase" style={{ background: 'rgba(40,231,197,0.14)', color: 'var(--secondary)' }}>Live</span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {[
                            { label: 'Builders', tone: 'var(--info)', detail: 'Implement features and fixes in parallel.' },
                            { label: 'Scouts', tone: 'var(--secondary)', detail: 'Gather constraints, APIs, and file context.' },
                            { label: 'Reviewers', tone: 'var(--warning)', detail: 'Verify correctness, regressions, and readiness.' },
                            { label: 'Custom', tone: 'var(--text-secondary)', detail: 'Handle bespoke operator-defined responsibilities.' },
                          ].map((item) => (
                            <div key={item.label} className="rounded-[18px] border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,13,22,0.92)' }}>
                              <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: item.tone }}>{item.label}</div>
                              <div className="mt-2 text-[10px] leading-5" style={{ color: 'var(--text-secondary)' }}>{item.detail}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-[20px] border px-4 py-3" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(5,10,18,0.66)' }}>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Operator loop</div>
                        <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>Brief once, watch execution, then intervene only where it matters.</div>
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: 'var(--accent)' }}>mission &gt; review</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {SWARM_WORKFLOW_COLUMNS.map((item) => {
                  const ItemIcon = item.icon

                  return (
                    <div key={item.label} className="swarm-panel-soft p-5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
                          <ItemIcon size={15} />
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                      </div>
                      <div className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</div>
                      <div className="mt-2 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>{item.body}</div>
                    </div>
                  )
                })}
              </section>
            </>
          )}

          <div ref={wizardRef}>
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

          <div className="mb-6 grid gap-3 lg:grid-cols-4">
            <div className="premium-stat px-4 py-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Mission profile</div>
              <div className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{missionProfile}</div>
              <div className="mt-1 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{objectiveWordCount} words in brief</div>
            </div>
            <div className="premium-stat px-4 py-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Bound root</div>
              <div className="mt-2 text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{directoryLeaf}</div>
              <div className="mt-1 text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{workDir || 'Awaiting directory'}</div>
            </div>
            <div className="premium-stat px-4 py-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Context envelope</div>
              <div className="mt-2 text-[13px] font-semibold" style={{ color: knowledgeFiles.length > 0 || selectedDirectiveCount > 0 || contextNotes.trim() ? 'var(--success)' : 'var(--text-primary)' }}>
                {knowledgeLabel}
              </div>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{selectedDirectiveCount} directives · {contextNotes.trim() ? 'notes linked' : 'no notes'}</div>
            </div>
            <div className="premium-stat px-4 py-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Fleet posture</div>
              <div className="mt-2 text-[13px] font-semibold" style={{ color: readyToLaunch ? 'var(--success)' : 'var(--warning)' }}>
                {readyToLaunch ? 'Launch-ready' : 'Configuring'}
              </div>
              <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{activePreset ? `${activePreset.label} preset selected` : 'Custom roster in progress'}</div>
            </div>
          </div>

          {renderStepContent()}
          </div>

          {step === 0 && (
            <>
              <section className="mt-12">
                <div className="mb-5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>Role lanes</div>
                  <h2 className="mt-3 text-[30px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Specialist roles that keep the swarm shipping.
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {ROLE_OPTIONS.map((role) => {
                    const RoleIcon = role.icon

                    return (
                      <div key={role.id} className="swarm-panel-soft p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${role.color}18`, color: role.color }}>
                          <RoleIcon size={16} />
                        </div>
                        <div className="mt-4 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{role.label}</div>
                        <div className="mt-2 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>{role.description}</div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="mt-12">
                <div className="mb-5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>Why it stands out</div>
                  <h2 className="mt-3 text-[30px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Enterprise-grade swarm features that close the gaps.
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {SWARM_ADVANTAGES.map((item) => {
                    const ItemIcon = item.icon

                    return (
                      <div key={item.title} className="swarm-panel-soft p-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
                          <ItemIcon size={15} />
                        </div>
                        <div className="mt-4 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</div>
                        <div className="mt-2 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>{item.body}</div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section ref={playbookRef} className="mt-12">
                <div className="mb-5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>Playbook</div>
                  <h2 className="mt-3 text-[30px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    How SloerSwarm turns AI agents into an engineering team.
                  </h2>
                </div>
                <div className="mx-auto max-w-4xl space-y-4">
                  {SWARM_PLAYBOOK_SECTIONS.map((section) => (
                    <article key={section.title} className="swarm-panel-soft p-6 md:p-7">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Operating note</div>
                      <h3 className="mt-3 text-[22px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {section.title}
                      </h3>
                      <p className="mt-3 text-[12px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                        {section.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section ref={faqRef} className="mt-12">
                <div className="mb-5 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--text-muted)' }}>FAQ</div>
                  <h2 className="mt-3 text-[30px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    SloerSwarm FAQ
                  </h2>
                </div>
                <div className="mx-auto max-w-4xl space-y-3">
                  {SWARM_FAQ.map((item) => {
                    const open = expandedFaqId === item.id

                    return (
                      <div key={item.id} className="swarm-panel-soft overflow-hidden">
                        <button
                          onClick={() => setExpandedFaqId(open ? null : item.id)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.question}</span>
                          <ChevronDown
                            size={16}
                            style={{
                              color: open ? 'var(--accent)' : 'var(--text-muted)',
                              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </button>
                        {open && (
                          <div className="px-5 pb-5 text-[12px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                            {item.answer}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            </>
          )}
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
