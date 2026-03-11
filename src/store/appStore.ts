import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ThemeId =
  | 'sloerspace' | 'github-dark' | 'catppuccin-mocha' | 'rose-pine' | 'one-dark-pro'
  | 'nord' | 'dracula' | 'everforest-dark' | 'poimandres' | 'oled-dark' | 'neon-tech'
  | 'synthwave' | 'catppuccin-latte' | 'github-light' | 'rose-pine-dawn'

export type ViewId = 'home' | 'terminal' | 'kanban' | 'agents' | 'prompts' | 'settings' | 'swarm-launch' | 'swarm-dashboard' | 'workspace-wizard' | 'login'
export type WorkspaceViewId = Extract<ViewId, 'terminal' | 'swarm-dashboard'>
export type WorkspaceKind = 'terminal' | 'swarm'

export type SettingsTab = 'appearance' | 'shortcuts' | 'ai-agents' | 'account' | 'api-keys' | 'data'

export type AgentCli = 'claude' | 'codex' | 'gemini' | 'opencode' | 'cursor'
export type AgentRole = 'builder' | 'reviewer' | 'scout' | 'coord' | 'custom'

export interface WorkspaceTab {
  id: string
  name: string
  color: string
  view: WorkspaceViewId
  kind: WorkspaceKind
  paneCount: number
  isActive: boolean
  workingDirectory: string
  createdAt: string
}

export interface KanbanTask {
  id: string
  title: string
  description: string
  column: 'todo' | 'in-progress' | 'in-review' | 'complete' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  agent?: AgentCli
  createdAt: string
}

export interface CustomAgent {
  id: string
  name: string
  systemPrompt: string
  createdAt: string
}

export interface Prompt {
  id: string
  title: string
  content: string
  isSystem: boolean
  createdAt: string
}

export interface CommandBlock {
  id: string
  command: string
  output: string
  exitCode: number
  timestamp: string
  isCollapsed: boolean
  duration: string
}

export interface TerminalPane {
  id: string
  cwd: string
  commands: CommandBlock[]
  agentCli?: AgentCli
  isActive: boolean
  label?: string
  isRunning?: boolean
  commandHistory?: string[]
  isLocked?: boolean
}

export interface SwarmAgent {
  id: string
  name: string
  role: AgentRole
  cli: AgentCli
  status: 'idle' | 'running' | 'complete' | 'error'
  task: string
  output?: string
  runtime: string
  progress: number
  tokens: number
  autoApprove: boolean
  startedAt: string
}

export interface SwarmMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: AgentRole | 'operator' | 'system'
  target: 'all' | string
  content: string
  createdAt: string
  kind: 'message' | 'status' | 'alert'
}

export interface LaunchSwarmAgent {
  id: string
  role: AgentRole
  cli: AgentCli
  task: string
  autoApprove: boolean
}

export interface SwarmSession {
  id: string
  name: string
  objective: string
  workingDirectory: string
  agents: SwarmAgent[]
  status: 'idle' | 'active' | 'complete'
  startedAt: string | null
  knowledgeFiles: string[]
  messages: SwarmMessage[]
}

export interface LaunchWorkspacePayload {
  agentConfig?: Record<AgentCli, number>
  name?: string
  workingDirectory: string
}

export interface LaunchSwarmPayload {
  name: string
  objective: string
  workingDirectory: string
  knowledgeFiles: string[]
  agents: LaunchSwarmAgent[]
}

export interface AppState {
  theme: ThemeId
  currentView: ViewId
  settingsTab: SettingsTab
  workspaceTabs: WorkspaceTab[]
  activeTabId: string | null
  terminalSessions: Record<string, TerminalPane[]>
  swarmSessions: Record<string, SwarmSession>
  kanbanTasks: KanbanTask[]
  customAgents: CustomAgent[]
  prompts: Prompt[]
  defaultAgent: AgentCli
  wizardStep: number
  wizardLayout: number
  wizardAgentConfig: Record<AgentCli, number>
  userProfile: {
    username: string
    email: string
    plan: 'free' | 'pro'
    accountId: string
  }
  isLoggedIn: boolean
  authToken: string | null
  sessionDevice: string | null
  trialStartedAt: string | null
  showOnStartup: boolean
  recentProjects: string[]
  commandAliases: Record<string, string>
  starredCommands: string[]
  commandSnippets: Array<{ id: string; name: string; command: string }>

  setTheme: (theme: ThemeId) => void
  setView: (view: ViewId) => void
  setSettingsTab: (tab: SettingsTab) => void
  removeWorkspaceTab: (id: string) => void
  setActiveTab: (id: string) => void
  addKanbanTask: (task: KanbanTask) => void
  moveKanbanTask: (taskId: string, column: KanbanTask['column']) => void
  removeKanbanTask: (id: string) => void
  addCustomAgent: (agent: CustomAgent) => void
  removeCustomAgent: (id: string) => void
  addPrompt: (prompt: Prompt) => void
  removePrompt: (id: string) => void
  setDefaultAgent: (agent: AgentCli) => void
  addCommandBlock: (paneId: string, block: CommandBlock) => void
  toggleCommandCollapse: (paneId: string, blockId: string) => void
  setPaneWorkingDirectory: (paneId: string, cwd: string) => void
  clearPaneCommands: (paneId: string) => void
  removePane: (paneId: string) => void
  renamePane: (paneId: string, label: string) => void
  setPaneRunning: (paneId: string, running: boolean) => void
  setPaneLocked: (paneId: string, locked: boolean) => void
  addToCommandHistory: (paneId: string, command: string) => void
  setCommandAliases: (aliases: Record<string, string>) => void
  toggleStarCommand: (command: string) => void
  addCommandSnippet: (snippet: { id: string; name: string; command: string }) => void
  removeCommandSnippet: (id: string) => void
  updateKanbanTask: (id: string, updates: Partial<Omit<KanbanTask, 'id'>>) => void
  setWizardStep: (step: number) => void
  setWizardLayout: (layout: number) => void
  setWizardAgentConfig: (config: Record<AgentCli, number>) => void
  launchWorkspace: (payload: LaunchWorkspacePayload) => void
  launchSwarm: (payload: LaunchSwarmPayload) => void
  stopSwarm: () => void
  sendSwarmMessage: (target: 'all' | string, content: string) => void
  getActiveTerminalPanes: () => TerminalPane[]
  getActiveSwarmSession: () => SwarmSession | null
  login: (email: string, password: string) => void
  logout: () => void
  startTrial: () => void
  updateProfile: (updates: Partial<AppState['userProfile']>) => void
  setShowOnStartup: (show: boolean) => void
  addRecentProject: (path: string) => void
  isPro: () => boolean
  isTrialActive: () => boolean
}

const INITIAL_AGENT_CONFIG: Record<AgentCli, number> = { claude: 0, codex: 0, gemini: 0, opencode: 0, cursor: 0 }

const INITIAL_USER_PROFILE = {
  username: 'developer',
  email: 'dev@sloerspace.dev',
  plan: 'pro' as const,
  accountId: 'local-workstation',
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const AGENT_LABELS: Record<AgentCli, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
  opencode: 'OpenCode',
  cursor: 'Cursor',
}

const SWARM_ROLE_SEQUENCE: AgentRole[] = ['coord', 'builder', 'reviewer', 'scout', 'builder', 'reviewer', 'custom']

const THEME_IDS: ThemeId[] = ['sloerspace', 'github-dark', 'catppuccin-mocha', 'rose-pine', 'one-dark-pro', 'nord', 'dracula', 'everforest-dark', 'poimandres', 'oled-dark', 'neon-tech', 'synthwave', 'catppuccin-latte', 'github-light', 'rose-pine-dawn']
const VIEW_IDS: ViewId[] = ['home', 'terminal', 'kanban', 'agents', 'prompts', 'settings', 'swarm-launch', 'swarm-dashboard', 'workspace-wizard', 'login']
const SETTINGS_TAB_IDS: SettingsTab[] = ['appearance', 'shortcuts', 'ai-agents', 'account', 'api-keys', 'data']
const WORKSPACE_VIEW_IDS: WorkspaceViewId[] = ['terminal', 'swarm-dashboard']
const WORKSPACE_KINDS: WorkspaceKind[] = ['terminal', 'swarm']
const AGENT_CLIS: AgentCli[] = ['claude', 'codex', 'gemini', 'opencode', 'cursor']
const AGENT_ROLES: AgentRole[] = ['builder', 'reviewer', 'scout', 'coord', 'custom']
const KANBAN_COLUMNS: KanbanTask['column'][] = ['todo', 'in-progress', 'in-review', 'complete', 'cancelled']
const KANBAN_PRIORITIES: KanbanTask['priority'][] = ['low', 'medium', 'high', 'critical']
const SWARM_AGENT_STATUSES: SwarmAgent['status'][] = ['idle', 'running', 'complete', 'error']
const SWARM_SESSION_STATUSES: SwarmSession['status'][] = ['idle', 'active', 'complete']
const USER_PROFILE_PLANS: AppState['userProfile']['plan'][] = ['free', 'pro']

const getFallbackWorkingDirectory = () => {
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows')) {
    return 'C:\\'
  }

  return '/'
}

const applyTheme = (theme: ThemeId) => {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.setAttribute('data-theme', theme === 'sloerspace' ? '' : theme)
}

const markActiveTabs = (tabs: WorkspaceTab[], activeId: string | null) => tabs.map((tab) => ({
  ...tab,
  isActive: tab.id === activeId,
}))

const updatePaneCollection = (
  sessions: Record<string, TerminalPane[]>,
  paneId: string,
  updater: (pane: TerminalPane) => TerminalPane,
) => {
  let found = false

  const nextSessions = Object.fromEntries(
    Object.entries(sessions).map(([sessionId, panes]) => {
      const nextPanes = panes.map((pane) => {
        if (pane.id !== paneId) {
          return pane
        }

        found = true
        return updater(pane)
      })

      return [sessionId, nextPanes]
    }),
  )

  return found ? nextSessions : sessions
}

const buildStarterCommand = (): CommandBlock => ({
  id: generateId(),
  command: 'echo SloerSpace Terminal Ready',
  output: 'SloerSpace Terminal Ready',
  exitCode: 0,
  timestamp: new Date().toLocaleTimeString(),
  isCollapsed: false,
  duration: '0ms',
})

const buildSwarmStarterCommand = (agentName: string, role: AgentRole): CommandBlock => ({
  id: generateId(),
  command: `echo ${agentName} boot`,
  output: `${agentName} online · role ${role}`,
  exitCode: 0,
  timestamp: new Date().toLocaleTimeString(),
  isCollapsed: false,
  duration: '0ms',
})

const expandAgentAssignments = (config: Record<AgentCli, number>) => (
  Object.entries(config) as [AgentCli, number][]
).flatMap(([agent, count]) => Array.from({ length: count }, () => agent))

const createTerminalPanes = (paneCount: number, workingDirectory: string, config: Record<AgentCli, number>) => {
  const assignedAgents = expandAgentAssignments(config)

  return Array.from({ length: paneCount }, (_, index): TerminalPane => ({
    id: generateId(),
    cwd: workingDirectory,
    commands: [buildStarterCommand()],
    agentCli: assignedAgents[index],
    isActive: index === 0,
  }))
}

const createSwarmTerminalPanes = (agents: SwarmAgent[], workingDirectory: string) => (
  agents.map((agent, index): TerminalPane => ({
    id: generateId(),
    cwd: workingDirectory,
    commands: [buildSwarmStarterCommand(agent.name, agent.role)],
    agentCli: agent.cli,
    isActive: index === 0,
  }))
)

const getSwarmTask = (role: AgentRole, objective: string) => {
  if (role === 'coord') {
    return `Coordinate mission execution for: ${objective}`
  }

  if (role === 'builder') {
    return `Implement deliverables for: ${objective}`
  }

  if (role === 'reviewer') {
    return `Review output quality for: ${objective}`
  }

  if (role === 'scout') {
    return `Research context and constraints for: ${objective}`
  }

  return objective
}

const createSwarmAgents = (launchAgents: LaunchSwarmAgent[], objective: string) => {
  const agentCliCounts = { ...INITIAL_AGENT_CONFIG }

  return launchAgents.map((agent) => {
    agentCliCounts[agent.cli] += 1
    const role = agent.role || SWARM_ROLE_SEQUENCE[(agentCliCounts[agent.cli] - 1) % SWARM_ROLE_SEQUENCE.length]
    const startedAt = new Date().toISOString()

    return {
      id: agent.id || generateId(),
      name: `${AGENT_LABELS[agent.cli]} ${agentCliCounts[agent.cli]}`,
      role,
      cli: agent.cli,
      status: 'running',
      task: agent.task.trim() || getSwarmTask(role, objective),
      runtime: '0m 00s',
      progress: 0,
      tokens: 0,
      autoApprove: agent.autoApprove,
      startedAt,
    } satisfies SwarmAgent
  })
}

const createSwarmMessages = (name: string, objective: string, agents: SwarmAgent[]): SwarmMessage[] => {
  const now = new Date().toISOString()
  const coordinator = agents.find((agent) => agent.role === 'coord') ?? agents[0]

  return [
    {
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      target: 'all',
      content: `${name} launched. Mission objective locked: ${objective}`,
      createdAt: now,
      kind: 'status',
    },
    ...(coordinator ? [{
      id: generateId(),
      senderId: coordinator.id,
      senderName: coordinator.name,
      senderRole: coordinator.role,
      target: 'all' as const,
      content: 'Coordinator online. Routing tasks and booting CLI sessions.',
      createdAt: now,
      kind: 'message' as const,
    }] : []),
  ]
}

const nextWorkspaceColor = (workspaceCount: number) => COLORS[workspaceCount % COLORS.length]

const getNextWorkspaceName = (tabs: WorkspaceTab[], kind: WorkspaceKind, fallback: string) => {
  const count = tabs.filter((tab) => tab.kind === kind).length + 1
  return `${fallback} ${count}`
}

export const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2, 10)
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const getString = (value: unknown, fallback = '') => (
  typeof value === 'string' ? value : fallback
)

const getNumber = (value: unknown, fallback = 0) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
)

const getBoolean = (value: unknown, fallback = false) => (
  typeof value === 'boolean' ? value : fallback
)

const getEnumValue = <T extends string>(collection: readonly T[], value: unknown, fallback: T): T => (
  typeof value === 'string' && collection.includes(value as T) ? (value as T) : fallback
)

const getOptionalAgentCli = (value: unknown) => (
  typeof value === 'string' && AGENT_CLIS.includes(value as AgentCli) ? (value as AgentCli) : undefined
)

const normalizeCommandBlocks = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const blocks: CommandBlock[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    blocks.push({
      id: getString(entry.id) || generateId(),
      command: getString(entry.command) || 'Unknown command',
      output: getString(entry.output),
      exitCode: Math.trunc(getNumber(entry.exitCode, 0)),
      timestamp: getString(entry.timestamp) || new Date().toLocaleTimeString(),
      isCollapsed: getBoolean(entry.isCollapsed, false),
      duration: getString(entry.duration) || '0ms',
    })
  }

  return blocks
}

const normalizeTerminalPane = (value: unknown, index: number) => {
  if (!isRecord(value)) {
    return null
  }

  return {
    id: getString(value.id) || generateId(),
    cwd: getString(value.cwd) || getFallbackWorkingDirectory(),
    commands: normalizeCommandBlocks(value.commands),
    agentCli: getOptionalAgentCli(value.agentCli),
    isActive: getBoolean(value.isActive, index === 0),
  } satisfies TerminalPane
}

const normalizeTerminalSessions = (value: unknown) => {
  if (!isRecord(value)) {
    return {}
  }

  const sessions: Record<string, TerminalPane[]> = {}

  for (const [sessionId, panes] of Object.entries(value)) {
    if (!Array.isArray(panes)) {
      continue
    }

    sessions[sessionId] = panes.flatMap((pane, index) => {
      const normalizedPane = normalizeTerminalPane(pane, index)
      return normalizedPane ? [normalizedPane] : []
    })
  }

  return sessions
}

const normalizeWorkspaceTabs = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const tabs: WorkspaceTab[] = []

  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (!isRecord(entry)) {
      continue
    }

    const fallbackKind: WorkspaceKind = entry.view === 'swarm-dashboard' ? 'swarm' : 'terminal'
    const kind = getEnumValue(WORKSPACE_KINDS, entry.kind, fallbackKind)
    const fallbackView: WorkspaceViewId = kind === 'swarm' ? 'swarm-dashboard' : 'terminal'

    tabs.push({
      id: getString(entry.id) || generateId(),
      name: getString(entry.name) || (kind === 'swarm' ? `SloerSwarm ${index + 1}` : `Workspace ${index + 1}`),
      color: getString(entry.color) || nextWorkspaceColor(index),
      view: getEnumValue(WORKSPACE_VIEW_IDS, entry.view, fallbackView),
      kind,
      paneCount: Math.max(1, Math.trunc(getNumber(entry.paneCount, 1))),
      isActive: getBoolean(entry.isActive, false),
      workingDirectory: getString(entry.workingDirectory) || getFallbackWorkingDirectory(),
      createdAt: getString(entry.createdAt) || new Date().toISOString(),
    })
  }

  return tabs
}

const normalizeSwarmAgents = (value: unknown, objective: string) => {
  if (!Array.isArray(value)) {
    return []
  }

  const agents: SwarmAgent[] = []

  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (!isRecord(entry)) {
      continue
    }

    const role = getEnumValue(AGENT_ROLES, entry.role, SWARM_ROLE_SEQUENCE[index % SWARM_ROLE_SEQUENCE.length])
    const cli = getEnumValue(AGENT_CLIS, entry.cli, 'claude')

    agents.push({
      id: getString(entry.id) || generateId(),
      name: getString(entry.name) || `${AGENT_LABELS[cli]} #${index + 1}`,
      role,
      cli,
      status: getEnumValue(SWARM_AGENT_STATUSES, entry.status, 'idle'),
      task: getString(entry.task) || getSwarmTask(role, objective),
      output: typeof entry.output === 'string' ? entry.output : undefined,
      runtime: getString(entry.runtime) || '0m 00s',
      progress: Math.max(0, Math.min(100, Math.trunc(getNumber(entry.progress, 0)))),
      tokens: Math.max(0, Math.trunc(getNumber(entry.tokens, 0))),
      autoApprove: getBoolean(entry.autoApprove, false),
      startedAt: getString(entry.startedAt) || new Date().toISOString(),
    })
  }

  return agents
}

const normalizeSwarmMessages = (value: unknown): SwarmMessage[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const messages: SwarmMessage[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const rawSenderRole = typeof entry.senderRole === 'string' ? entry.senderRole : 'system'
    const senderRole: SwarmMessage['senderRole'] = rawSenderRole === 'operator' || rawSenderRole === 'system'
      ? rawSenderRole
      : getEnumValue(AGENT_ROLES, rawSenderRole, 'coord')
    const rawKind = typeof entry.kind === 'string' ? entry.kind : 'message'
    const kind: SwarmMessage['kind'] = rawKind === 'status' || rawKind === 'alert' ? rawKind : 'message'

    messages.push({
      id: getString(entry.id) || generateId(),
      senderId: getString(entry.senderId) || 'system',
      senderName: getString(entry.senderName) || 'System',
      senderRole,
      target: getString(entry.target) || 'all',
      content: getString(entry.content),
      createdAt: getString(entry.createdAt) || new Date().toISOString(),
      kind,
    })
  }

  return messages
}

const normalizeSwarmSessions = (value: unknown) => {
  if (!isRecord(value)) {
    return {}
  }

  const sessions: Record<string, SwarmSession> = {}

  for (const [sessionId, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue
    }

    const objective = getString(entry.objective) || 'Untitled mission'

    sessions[sessionId] = {
      id: getString(entry.id) || sessionId,
      name: getString(entry.name) || objective.slice(0, 24) || `SloerSwarm ${Object.keys(sessions).length + 1}`,
      objective,
      workingDirectory: getString(entry.workingDirectory) || getFallbackWorkingDirectory(),
      agents: normalizeSwarmAgents(entry.agents, objective),
      status: getEnumValue(SWARM_SESSION_STATUSES, entry.status, 'idle'),
      startedAt: typeof entry.startedAt === 'string' || entry.startedAt === null ? entry.startedAt : null,
      knowledgeFiles: Array.isArray(entry.knowledgeFiles) ? entry.knowledgeFiles.flatMap((item) => typeof item === 'string' ? [item] : []) : [],
      messages: normalizeSwarmMessages(entry.messages),
    }
  }

  return sessions
}

const normalizeKanbanTasks = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const tasks: KanbanTask[] = []

  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (!isRecord(entry)) {
      continue
    }

    tasks.push({
      id: getString(entry.id) || generateId(),
      title: getString(entry.title) || `Task ${index + 1}`,
      description: getString(entry.description),
      column: getEnumValue(KANBAN_COLUMNS, entry.column, 'todo'),
      priority: getEnumValue(KANBAN_PRIORITIES, entry.priority, 'medium'),
      agent: getOptionalAgentCli(entry.agent),
      createdAt: getString(entry.createdAt) || new Date().toISOString(),
    })
  }

  return tasks
}

const normalizeCustomAgents = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const agents: CustomAgent[] = []

  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (!isRecord(entry)) {
      continue
    }

    agents.push({
      id: getString(entry.id) || generateId(),
      name: getString(entry.name) || `Agent ${index + 1}`,
      systemPrompt: getString(entry.systemPrompt),
      createdAt: getString(entry.createdAt) || new Date().toISOString(),
    })
  }

  return agents
}

const normalizePrompts = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const prompts: Prompt[] = []

  for (let index = 0; index < value.length; index += 1) {
    const entry = value[index]
    if (!isRecord(entry)) {
      continue
    }

    prompts.push({
      id: getString(entry.id) || generateId(),
      title: getString(entry.title) || `Prompt ${index + 1}`,
      content: getString(entry.content),
      isSystem: getBoolean(entry.isSystem, false),
      createdAt: getString(entry.createdAt) || new Date().toISOString(),
    })
  }

  return prompts
}

const normalizeAgentConfig = (value: unknown) => {
  if (!isRecord(value)) {
    return { ...INITIAL_AGENT_CONFIG }
  }

  const config = { ...INITIAL_AGENT_CONFIG }

  for (const agent of AGENT_CLIS) {
    config[agent] = Math.max(0, Math.trunc(getNumber(value[agent], INITIAL_AGENT_CONFIG[agent])))
  }

  return config
}

const normalizeUserProfile = (value: unknown) => {
  if (!isRecord(value)) {
    return { ...INITIAL_USER_PROFILE }
  }

  const rawPlan = typeof value.plan === 'string' ? value.plan.toLowerCase() : value.plan

  return {
    username: getString(value.username) || getString(value.name) || INITIAL_USER_PROFILE.username,
    email: getString(value.email) || INITIAL_USER_PROFILE.email,
    plan: getEnumValue(USER_PROFILE_PLANS, rawPlan, INITIAL_USER_PROFILE.plan),
    accountId: getString(value.accountId) || INITIAL_USER_PROFILE.accountId,
  }
}

const normalizePersistedState = (value: unknown): Partial<AppState> | null => {
  const persistedState = isRecord(value) && isRecord(value.state) ? value.state : value

  if (!isRecord(persistedState)) {
    return null
  }

  const workspaceTabs = normalizeWorkspaceTabs(persistedState.workspaceTabs)
  const activeTabId = getString(persistedState.activeTabId) || null
  const normalizedActiveTabId = activeTabId && workspaceTabs.some((tab) => tab.id === activeTabId) ? activeTabId : null

  return {
    theme: getEnumValue(THEME_IDS, persistedState.theme, 'sloerspace'),
    currentView: getEnumValue(VIEW_IDS, persistedState.currentView, 'home'),
    settingsTab: getEnumValue(SETTINGS_TAB_IDS, persistedState.settingsTab, 'appearance'),
    workspaceTabs: markActiveTabs(workspaceTabs, normalizedActiveTabId),
    activeTabId: normalizedActiveTabId,
    terminalSessions: normalizeTerminalSessions(persistedState.terminalSessions),
    swarmSessions: normalizeSwarmSessions(persistedState.swarmSessions),
    kanbanTasks: normalizeKanbanTasks(persistedState.kanbanTasks),
    customAgents: normalizeCustomAgents(persistedState.customAgents),
    prompts: normalizePrompts(persistedState.prompts),
    defaultAgent: getEnumValue(AGENT_CLIS, persistedState.defaultAgent, 'claude'),
    wizardLayout: Math.min(16, Math.max(1, Math.trunc(getNumber(persistedState.wizardLayout, 1)))),
    wizardAgentConfig: normalizeAgentConfig(persistedState.wizardAgentConfig),
    userProfile: normalizeUserProfile(persistedState.userProfile),
  }
}

export const useStore = create<AppState>()(persist(
  (set, get) => ({
    theme: 'sloerspace',
    currentView: 'home',
    settingsTab: 'appearance',
    workspaceTabs: [],
    activeTabId: null,
    terminalSessions: {},
    swarmSessions: {},
    kanbanTasks: [],
    customAgents: [],
    prompts: [],
    defaultAgent: 'claude',
    wizardStep: 0,
    wizardLayout: 1,
    wizardAgentConfig: { ...INITIAL_AGENT_CONFIG },
    userProfile: { ...INITIAL_USER_PROFILE },
    isLoggedIn: false,
    authToken: null,
    sessionDevice: null,
    trialStartedAt: null,
    showOnStartup: true,
    recentProjects: [],
    commandAliases: {},
    starredCommands: [],
    commandSnippets: [],

    setTheme: (theme) => {
      applyTheme(theme)
      set({ theme })
    },
    setView: (view) => set({ currentView: view }),
    setSettingsTab: (tab) => set({ settingsTab: tab }),

    removeWorkspaceTab: (id) => set((state) => {
      const nextTabs = state.workspaceTabs.filter((tab) => tab.id !== id)
      const removedActive = state.activeTabId === id
      const nextActiveId = removedActive ? (nextTabs[nextTabs.length - 1]?.id ?? null) : state.activeTabId
      const nextActiveTab = nextTabs.find((tab) => tab.id === nextActiveId) ?? null
      const nextTerminalSessions = { ...state.terminalSessions }
      const nextSwarmSessions = { ...state.swarmSessions }

      delete nextTerminalSessions[id]
      delete nextSwarmSessions[id]

      return {
        workspaceTabs: markActiveTabs(nextTabs, nextActiveId),
        activeTabId: nextActiveId,
        terminalSessions: nextTerminalSessions,
        swarmSessions: nextSwarmSessions,
        currentView: removedActive
          ? nextActiveTab?.view ?? (state.currentView === 'terminal' || state.currentView === 'swarm-dashboard' ? 'home' : state.currentView)
          : state.currentView,
      }
    }),

    setActiveTab: (id) => set((state) => {
      const activeTab = state.workspaceTabs.find((tab) => tab.id === id)

      if (!activeTab) {
        return state
      }

      return {
        workspaceTabs: markActiveTabs(state.workspaceTabs, id),
        activeTabId: id,
        currentView: activeTab.view,
      }
    }),

    addKanbanTask: (task) => set((state) => ({ kanbanTasks: [...state.kanbanTasks, task] })),
    moveKanbanTask: (taskId, column) => set((state) => ({
      kanbanTasks: state.kanbanTasks.map((task) => task.id === taskId ? { ...task, column } : task),
    })),
    removeKanbanTask: (id) => set((state) => ({
      kanbanTasks: state.kanbanTasks.filter((task) => task.id !== id),
    })),

    addCustomAgent: (agent) => set((state) => ({ customAgents: [...state.customAgents, agent] })),
    removeCustomAgent: (id) => set((state) => ({
      customAgents: state.customAgents.filter((agent) => agent.id !== id),
    })),

    addPrompt: (prompt) => set((state) => ({ prompts: [...state.prompts, prompt] })),
    removePrompt: (id) => set((state) => ({
      prompts: state.prompts.filter((prompt) => prompt.id !== id),
    })),

    setDefaultAgent: (agent) => set({ defaultAgent: agent }),

    addCommandBlock: (paneId, block) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        commands: [...pane.commands, block],
      })),
    })),

    toggleCommandCollapse: (paneId, blockId) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        commands: pane.commands.map((command) => command.id === blockId ? { ...command, isCollapsed: !command.isCollapsed } : command),
      })),
    })),

    setPaneWorkingDirectory: (paneId, cwd) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        cwd,
      })),
    })),

    clearPaneCommands: (paneId) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        commands: [],
      })),
    })),

    removePane: (paneId) => set((state) => {
      const next: Record<string, TerminalPane[]> = {}
      for (const [sid, panes] of Object.entries(state.terminalSessions)) {
        const filtered = panes.filter((p) => p.id !== paneId)
        if (filtered.length > 0) next[sid] = filtered
        else next[sid] = panes
      }
      return { terminalSessions: next }
    }),

    renamePane: (paneId, label) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        label,
      })),
    })),

    setPaneRunning: (paneId, running) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        isRunning: running,
      })),
    })),

    setPaneLocked: (paneId, locked) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        isLocked: locked,
      })),
    })),

    addToCommandHistory: (paneId, command) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        commandHistory: [command, ...(pane.commandHistory ?? []).filter((c) => c !== command)].slice(0, 200),
      })),
    })),

    setCommandAliases: (aliases) => set({ commandAliases: aliases }),

    toggleStarCommand: (command) => set((state) => ({
      starredCommands: state.starredCommands.includes(command)
        ? state.starredCommands.filter((c) => c !== command)
        : [...state.starredCommands, command],
    })),

    addCommandSnippet: (snippet) => set((state) => ({
      commandSnippets: [...state.commandSnippets, snippet],
    })),

    removeCommandSnippet: (id) => set((state) => ({
      commandSnippets: state.commandSnippets.filter((s) => s.id !== id),
    })),

    updateKanbanTask: (id, updates) => set((state) => ({
      kanbanTasks: state.kanbanTasks.map((task) => task.id === id ? { ...task, ...updates } : task),
    })),

    setWizardStep: (step) => set({ wizardStep: step }),
    setWizardLayout: (layout) => set({ wizardLayout: layout }),
    setWizardAgentConfig: (config) => set({ wizardAgentConfig: config }),

    launchWorkspace: (payload) => {
      const state = get()
      const paneCount = Math.max(1, state.wizardLayout)
      const workingDirectory = payload.workingDirectory.trim() || getFallbackWorkingDirectory()
      const agentConfig = payload.agentConfig ?? state.wizardAgentConfig
      const id = generateId()
      const tab: WorkspaceTab = {
        id,
        name: payload.name?.trim() || getNextWorkspaceName(state.workspaceTabs, 'terminal', 'Workspace'),
        color: nextWorkspaceColor(state.workspaceTabs.length),
        view: 'terminal',
        kind: 'terminal',
        paneCount,
        isActive: true,
        workingDirectory,
        createdAt: new Date().toISOString(),
      }
      const panes = createTerminalPanes(paneCount, workingDirectory, agentConfig)

      set((currentState) => ({
        workspaceTabs: [...markActiveTabs(currentState.workspaceTabs, null), tab],
        activeTabId: id,
        terminalSessions: {
          ...currentState.terminalSessions,
          [id]: panes,
        },
        currentView: 'terminal',
        wizardStep: 0,
        wizardAgentConfig: { ...INITIAL_AGENT_CONFIG },
      }))
    },

    launchSwarm: (payload) => {
      const state = get()
      const name = payload.name.trim() || getNextWorkspaceName(state.workspaceTabs, 'swarm', 'SloerSwarm')
      const objective = payload.objective.trim()
      const workingDirectory = payload.workingDirectory.trim() || getFallbackWorkingDirectory()
      const agents = createSwarmAgents(payload.agents, objective)
      const panes = createSwarmTerminalPanes(agents, workingDirectory)
      const id = generateId()
      const tab: WorkspaceTab = {
        id,
        name,
        color: nextWorkspaceColor(state.workspaceTabs.length),
        view: 'swarm-dashboard',
        kind: 'swarm',
        paneCount: agents.length,
        isActive: true,
        workingDirectory,
        createdAt: new Date().toISOString(),
      }
      const session: SwarmSession = {
        id,
        name,
        objective,
        workingDirectory,
        agents,
        status: 'active',
        startedAt: new Date().toISOString(),
        knowledgeFiles: payload.knowledgeFiles,
        messages: createSwarmMessages(name, objective, agents),
      }

      set((currentState) => ({
        workspaceTabs: [...markActiveTabs(currentState.workspaceTabs, null), tab],
        activeTabId: id,
        terminalSessions: {
          ...currentState.terminalSessions,
          [id]: panes,
        },
        swarmSessions: {
          ...currentState.swarmSessions,
          [id]: session,
        },
        currentView: 'swarm-dashboard',
      }))
    },

    stopSwarm: () => set((state) => {
      if (!state.activeTabId) {
        return state
      }

      const activeSession = state.swarmSessions[state.activeTabId]

      if (!activeSession) {
        return state
      }

      return {
        swarmSessions: {
          ...state.swarmSessions,
          [state.activeTabId]: {
            ...activeSession,
            status: 'complete',
            messages: [
              ...activeSession.messages,
              {
                id: generateId(),
                senderId: 'system',
                senderName: 'System',
                senderRole: 'system',
                target: 'all',
                content: 'Swarm halted. Results preserved and agents moved to complete state.',
                createdAt: new Date().toISOString(),
                kind: 'alert',
              },
            ],
            agents: activeSession.agents.map((agent) => ({
              ...agent,
              status: agent.status === 'error' ? 'error' : 'complete',
              progress: agent.progress === 0 ? 100 : agent.progress,
            })),
          },
        },
      }
    }),

    sendSwarmMessage: (target, content) => set((state) => {
      const trimmed = content.trim()

      if (!trimmed || !state.activeTabId) {
        return state
      }

      const activeSession = state.swarmSessions[state.activeTabId]

      if (!activeSession) {
        return state
      }

      const operatorMessage: SwarmMessage = {
        id: generateId(),
        senderId: 'operator',
        senderName: 'Operator',
        senderRole: 'operator',
        target,
        content: trimmed,
        createdAt: new Date().toISOString(),
        kind: 'message',
      }
      const respondingAgents = target === 'all'
        ? activeSession.agents.filter((agent) => agent.role === 'coord').slice(0, 1)
        : activeSession.agents.filter((agent) => agent.id === target).slice(0, 1)
      const acknowledgements = respondingAgents.map((agent) => ({
        id: generateId(),
        senderId: agent.id,
        senderName: agent.name,
        senderRole: agent.role,
        target: 'operator',
        content: target === 'all'
          ? 'Acknowledged broadcast. Synchronizing the swarm and updating execution plans.'
          : `Acknowledged. ${agent.role === 'coord' ? 'Routing' : 'Handling'} request: ${trimmed}`,
        createdAt: new Date().toISOString(),
        kind: 'status' as const,
      }))

      return {
        swarmSessions: {
          ...state.swarmSessions,
          [state.activeTabId]: {
            ...activeSession,
            messages: [...activeSession.messages, operatorMessage, ...acknowledgements],
          },
        },
      }
    }),

    getActiveTerminalPanes: () => {
      const { activeTabId, terminalSessions } = get()
      return activeTabId ? (terminalSessions[activeTabId] ?? []) : []
    },

    getActiveSwarmSession: () => {
      const { activeTabId, swarmSessions } = get()
      return activeTabId ? (swarmSessions[activeTabId] ?? null) : null
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    login: (email, _password) => {
      const accountId = 'acc_' + Math.random().toString(36).slice(2, 10)
      set({
        isLoggedIn: true,
        authToken: 'tok_' + Math.random().toString(36).slice(2, 18),
        sessionDevice: navigator.userAgent.includes('Windows') ? 'Windows Desktop' : 'Desktop',
        userProfile: {
          ...get().userProfile,
          email,
          username: email.split('@')[0],
          accountId,
        },
      })
    },

    logout: () => set({
      isLoggedIn: false,
      authToken: null,
      sessionDevice: null,
    }),

    startTrial: () => set({
      trialStartedAt: new Date().toISOString(),
      userProfile: { ...get().userProfile, plan: 'pro' },
    }),

    updateProfile: (updates) => set({
      userProfile: { ...get().userProfile, ...updates },
    }),

    setShowOnStartup: (show) => set({ showOnStartup: show }),

    addRecentProject: (path) => set((state) => ({
      recentProjects: [path, ...state.recentProjects.filter((p) => p !== path)].slice(0, 10),
    })),

    isPro: () => {
      const { userProfile, trialStartedAt } = get()
      if (userProfile.plan === 'pro') return true
      if (trialStartedAt) {
        const trialEnd = new Date(trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000
        return Date.now() < trialEnd
      }
      return false
    },

    isTrialActive: () => {
      const { trialStartedAt } = get()
      if (!trialStartedAt) return false
      const trialEnd = new Date(trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000
      return Date.now() < trialEnd
    },
  }),
  {
    name: 'sloerspace-dev-store',
    version: 6,
    storage: createJSONStorage(() => localStorage),
    migrate: (persistedState, version) => {
      const state = persistedState as Record<string, unknown>
      if (version < 5) {
        state.currentView = 'home'
        state.showOnStartup = true
      }
      if (version < 6) {
        state.commandAliases = {}
        state.starredCommands = []
        state.commandSnippets = []
      }
      return state as never
    },
    partialize: (state) => ({
      theme: state.theme,
      currentView: state.currentView,
      settingsTab: state.settingsTab,
      workspaceTabs: state.workspaceTabs,
      activeTabId: state.activeTabId,
      terminalSessions: state.terminalSessions,
      swarmSessions: state.swarmSessions,
      kanbanTasks: state.kanbanTasks,
      customAgents: state.customAgents,
      prompts: state.prompts,
      defaultAgent: state.defaultAgent,
      wizardLayout: state.wizardLayout,
      wizardAgentConfig: state.wizardAgentConfig,
      userProfile: state.userProfile,
      isLoggedIn: state.isLoggedIn,
      authToken: state.authToken,
      sessionDevice: state.sessionDevice,
      trialStartedAt: state.trialStartedAt,
      showOnStartup: state.showOnStartup,
      recentProjects: state.recentProjects,
      commandAliases: state.commandAliases,
      starredCommands: state.starredCommands,
      commandSnippets: state.commandSnippets,
    }),
    merge: (persistedState, currentState) => {
      const normalizedState = normalizePersistedState(persistedState)

      if (!normalizedState) {
        return currentState
      }

      return {
        ...currentState,
        ...normalizedState,
      }
    },
    onRehydrateStorage: () => (state) => {
      if (state?.theme) {
        applyTheme(state.theme)
      }
    },
  },
))
