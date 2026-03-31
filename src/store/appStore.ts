import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useState, useEffect } from 'react'
import type { TerminalSessionSnapshot } from '@/lib/desktop'

export type ThemeId =
  | 'sloerspace' | 'github-dark' | 'catppuccin-mocha' | 'rose-pine' | 'one-dark-pro'
  | 'nord' | 'dracula' | 'everforest-dark' | 'poimandres' | 'oled-dark' | 'neon-tech'
  | 'dark-contrast-puro' | 'synthwave' | 'catppuccin-latte' | 'github-light' | 'rose-pine-dawn'
  | 'custom'

export interface CustomThemePreset {
  id: string
  name: string
  mode: 'dark' | 'light'
  colors: [string, string, string]
  surface0: string
  surface1: string
  surface2: string
  surface3: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accent: string
  secondary: string
  border: string
  terminalBg: string
  terminalText: string
  description: string
}

export type ViewId = 'home' | 'terminal' | 'canvas' | 'kanban' | 'agents' | 'prompts' | 'settings' | 'swarm-launch' | 'swarm-dashboard' | 'workspace-wizard' | 'canvas-wizard' | 'login' | 'browser' | 'editor' | 'notebook' | 'ssh' | 'env' | 'preview' | 'sessions' | 'file-preview' | 'history' | 'codebase' | 'system' | 'ports' | 'snippets'
export type WorkspaceViewId = Extract<ViewId, 'terminal' | 'canvas' | 'swarm-dashboard' | 'browser'>
export type WorkspaceKind = 'terminal' | 'canvas' | 'swarm' | 'browser'
export type TerminalSplitDirection = 'horizontal' | 'vertical'

export type SettingsTab = 'account' | 'appearance' | 'shortcuts' | 'ai-agents' | 'ai-settings' | 'siulk-voice' | 'notifications' | 'cli' | 'terminal' | 'api-keys' | 'data' | 'help'

export interface NotificationSettings {
  sounds: boolean
  os: boolean
}

export type SiulkVoiceTranscriptionMode = 'local'
export type SiulkVoiceRecordingMode = 'push-to-talk' | 'toggle'
export type WhisperModel = 'tiny.en' | 'base.en' | 'large-v3'
export type WhisperLanguage = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh'

export interface SiulkVoiceSettings {
  enabled: boolean
  transcriptionMode: SiulkVoiceTranscriptionMode
  whisperModel: WhisperModel
  whisperLanguage: WhisperLanguage
  pushToTalkKey: string | null
  toggleRecordingKey: string | null
  selectedMicrophone: string | null
  isRecording: boolean
  isProcessing: boolean
  lastTranscript: string | null
}

export interface TerminalSettings {
  defaultShell: TerminalShellKind
}

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'ollama'
export type AIChatRole = 'user' | 'assistant' | 'system'

export interface AISettings {
  provider: AIProvider
  openaiApiKey: string
  anthropicApiKey: string
  googleApiKey: string
  ollamaEndpoint: string
  ollamaModel: string
  openaiModel: string
  anthropicModel: string
  googleModel: string
  commandSuggestionsEnabled: boolean
  notificationsEnabled: boolean
}

export interface AIChatMessage {
  id: string
  role: AIChatRole
  content: string
  createdAt: string
  provider?: AIProvider
}

const INITIAL_AI_SETTINGS: AISettings = {
  provider: 'anthropic',
  openaiApiKey: '',
  anthropicApiKey: '',
  googleApiKey: '',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  openaiModel: 'gpt-4o',
  anthropicModel: 'claude-sonnet-4-20250514',
  googleModel: 'gemini-2.0-flash',
  commandSuggestionsEnabled: true,
  notificationsEnabled: true,
}

export interface WorkspacePreset {
  id: string
  name: string
  layoutCount: number
  workingDirectory: string
  agentConfig: Record<string, number>
  customCommand: string
  createdAt: string
}

export interface Snippet {
  id: string
  title: string
  content: string
  category: string
  language: string
  tags: string[]
  isPinned: boolean
  createdAt: string
  usageCount: number
}

export interface EnvVar {
  id: string
  key: string
  value: string
  comment?: string
  isSecret: boolean
  workspaceId?: string
}

export interface SSHConnectionInfo {
  id: string
  name: string
  host: string
  port: number
  username: string
  authMethod: 'password' | 'key'
  keyPath?: string
  lastConnectedAt?: number
}

export type AgentCli = 'claude' | 'codex' | 'gemini' | 'opencode' | 'cursor' | 'droid' | 'copilot'
export type AgentRole = 'builder' | 'reviewer' | 'scout' | 'coord' | 'custom'
export type TerminalShellKind = 'auto' | 'powershell' | 'command-prompt' | 'git-bash'
export type TerminalSessionKind = 'local' | 'agent-attached'

export interface WorkspaceTab {
  id: string
  name: string
  color: string
  view: WorkspaceViewId
  kind: WorkspaceKind
  splitDirection?: TerminalSplitDirection
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
  sessionKind?: TerminalSessionKind
  shellKind?: TerminalShellKind
  shellBootstrapCommand?: string | null
  bootstrappedShellSessionCreatedAtMs?: number | null
  isActive: boolean
  label?: string
  isRunning?: boolean
  commandHistory?: string[]
  isLocked?: boolean
  runtimeSessionId?: string
  runtimeSession?: TerminalSessionSnapshot | null
  layoutColumn?: number
  layoutRow?: number
}

export interface BrowserPane {
  id: string
  url: string
  title?: string
  x: number
  y: number
  width: number
  height: number
  isActive: boolean
  label?: string
  createdAt: number
  webviewWindowId?: string
}

export interface SavedBrowserTab {
  id: string
  url: string
  title: string
  history: string[]
  historyIndex: number
  pinned?: boolean
  favicon?: string
}

export type BrowserSplitMode = 'full' | 'split-right' | 'split-bottom'

export interface SwarmAgent {
  id: string
  name: string
  role: AgentRole
  cli: AgentCli
  cliBootstrapCommand?: string | null
  terminalPaneId?: string
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
  cliBootstrapCommand?: string | null
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
  contextNotes: string
  missionDirectives: string[]
  messages: SwarmMessage[]
}

export interface LaunchWorkspacePayload {
  agentConfig?: Record<AgentCli, number>
  agentBootstrapCommands?: Partial<Record<AgentCli, string | null>>
  customBootstrapCommand?: string | null
  name?: string
  workingDirectory: string
}

export interface LaunchSwarmPayload {
  name: string
  objective: string
  workingDirectory: string
  knowledgeFiles: string[]
  contextNotes: string
  missionDirectives: string[]
  agents: LaunchSwarmAgent[]
}

export interface AppState {
  theme: ThemeId
  customTheme: CustomThemePreset | null
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
  hasCompletedOnboarding: boolean
  recentProjects: string[]
  pendingTerminalCommand: string | null
  pendingVoiceTranscript: string | null
  commandAliases: Record<string, string>
  starredCommands: string[]
  commandSnippets: Array<{ id: string; name: string; command: string }>
  siulkVoice: SiulkVoiceSettings
  terminalSettings: TerminalSettings
  browserTabs: SavedBrowserTab[]
  browserSplitMode: BrowserSplitMode
  browserActiveTabId: string | null
  browserShowBookmarks: boolean
  aiSettings: AISettings
  aiChatHistory: AIChatMessage[]
  sshConnections: SSHConnectionInfo[]
  notificationSettings: NotificationSettings

  setTheme: (theme: ThemeId) => void
  applyCustomTheme: (theme: CustomThemePreset) => void
  clearCustomTheme: () => void
  setView: (view: ViewId) => void
  setSettingsTab: (tab: SettingsTab) => void
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void
  removeWorkspaceTab: (id: string) => void
  updateWorkspaceTab: (id: string, changes: Partial<Pick<WorkspaceTab, 'name' | 'color'>>) => void
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
  setActivePane: (paneId: string) => void
  markPaneShellBootstrapped: (paneId: string, sessionCreatedAtMs: number | null) => void
  renamePane: (paneId: string, label: string) => void
  setPaneRunning: (paneId: string, running: boolean) => void
  setPaneLocked: (paneId: string, locked: boolean) => void
  setPaneRuntimeSession: (paneId: string, snapshot: TerminalSessionSnapshot | null) => void
  addToCommandHistory: (paneId: string, command: string) => void
  setCommandAliases: (aliases: Record<string, string>) => void
  toggleStarCommand: (command: string) => void
  addCommandSnippet: (snippet: { id: string; name: string; command: string }) => void
  removeCommandSnippet: (id: string) => void
  updateKanbanTask: (id: string, updates: Partial<Omit<KanbanTask, 'id'>>) => void
  setWizardStep: (step: number) => void
  setWizardLayout: (layout: number) => void
  setWizardAgentConfig: (config: Record<AgentCli, number>) => void
  setActiveWorkspaceSplitDirection: (direction: TerminalSplitDirection) => void
  launchWorkspace: (payload: LaunchWorkspacePayload) => void
  launchQuickShellWorkspace: (payload: { workingDirectory?: string; shellKind?: TerminalShellKind; name?: string; shellBootstrapCommand?: string | null }) => void
  addPaneToActiveWorkspace: (payload?: { shellKind?: TerminalShellKind; label?: string; splitDirection?: TerminalSplitDirection; shellBootstrapCommand?: string | null; workingDirectory?: string; anchorPaneId?: string }) => string | null
  launchCanvas: (payload: LaunchWorkspacePayload) => void
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
  setOnboardingCompleted: (completed: boolean) => void
  addRecentProject: (path: string) => void
  primeTerminalCommand: (command: string | null) => void
  consumePendingTerminalCommand: () => string | null
  primeVoiceTranscript: (text: string | null) => void
  consumeVoiceTranscript: () => string | null
  isPro: () => boolean
  isTrialActive: () => boolean
  setSiulkVoiceEnabled: (enabled: boolean) => void
  setSiulkVoiceTranscriptionMode: (mode: SiulkVoiceTranscriptionMode) => void
  setWhisperModel: (model: WhisperModel) => void
  setWhisperLanguage: (lang: WhisperLanguage) => void
  setSiulkVoicePushToTalkKey: (key: string | null) => void
  setSiulkVoiceToggleRecordingKey: (key: string | null) => void
  setSiulkVoiceSelectedMicrophone: (mic: string | null) => void
  setSiulkVoiceRecording: (recording: boolean) => void
  setSiulkVoiceProcessing: (processing: boolean) => void
  setSiulkVoiceLastTranscript: (transcript: string | null) => void
  setTerminalDefaultShell: (shell: TerminalShellKind) => void
  setBrowserTabs: (tabs: SavedBrowserTab[]) => void
  setBrowserSplitMode: (mode: BrowserSplitMode) => void
  setBrowserActiveTabId: (id: string | null) => void
  setBrowserShowBookmarks: (show: boolean) => void
  setAISettings: (updates: Partial<AISettings>) => void
  addAIChatMessage: (message: AIChatMessage) => void
  clearAIChatHistory: () => void
  addSSHConnection: (conn: SSHConnectionInfo) => void
  removeSSHConnection: (id: string) => void
  updateSSHLastConnected: (id: string) => void
  envVars: EnvVar[]
  addEnvVar: (v: EnvVar) => void
  updateEnvVar: (id: string, changes: Partial<EnvVar>) => void
  removeEnvVar: (id: string) => void
  previewPort: number
  setPreviewPort: (port: number) => void
  filePreviewPath: string | null
  setFilePreviewPath: (path: string | null) => void
  snippets: Snippet[]
  addSnippet: (s: Snippet) => void
  updateSnippet: (id: string, changes: Partial<Snippet>) => void
  removeSnippet: (id: string) => void
  incrementSnippetUsage: (id: string) => void
  workspacePresets: WorkspacePreset[]
  addWorkspacePreset: (p: WorkspacePreset) => void
  removeWorkspacePreset: (id: string) => void
  updateWorkspacePreset: (id: string, changes: Partial<WorkspacePreset>) => void
}

const INITIAL_AGENT_CONFIG: Record<AgentCli, number> = { claude: 0, codex: 0, gemini: 0, opencode: 0, cursor: 0, droid: 0, copilot: 0 }

const INITIAL_USER_PROFILE = {
  username: 'developer',
  email: 'dev@sloerspace.dev',
  plan: 'free' as const,
  accountId: 'local-workstation',
}

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const AGENT_LABELS: Record<AgentCli, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
  opencode: 'OpenCode',
  cursor: 'Cursor',
  droid: 'Droid',
  copilot: 'Copilot',
}

const SWARM_ROLE_SEQUENCE: AgentRole[] = ['coord', 'builder', 'reviewer', 'scout', 'builder', 'reviewer', 'custom']

const THEME_IDS: ThemeId[] = ['sloerspace', 'github-dark', 'catppuccin-mocha', 'rose-pine', 'one-dark-pro', 'nord', 'dracula', 'everforest-dark', 'poimandres', 'oled-dark', 'dark-contrast-puro', 'neon-tech', 'synthwave', 'catppuccin-latte', 'github-light', 'rose-pine-dawn']
const VIEW_IDS: ViewId[] = ['home', 'terminal', 'canvas', 'kanban', 'agents', 'prompts', 'settings', 'swarm-launch', 'swarm-dashboard', 'workspace-wizard', 'canvas-wizard', 'login', 'browser']
const SETTINGS_TAB_IDS: SettingsTab[] = ['account', 'appearance', 'shortcuts', 'ai-agents', 'ai-settings', 'siulk-voice', 'notifications', 'cli', 'terminal', 'api-keys', 'data', 'help']
const WHISPER_MODELS: WhisperModel[] = ['tiny.en', 'base.en', 'large-v3']
const WHISPER_LANGUAGES: WhisperLanguage[] = ['en', 'es', 'fr', 'de', 'ja', 'zh']

const INITIAL_SIULK_VOICE: SiulkVoiceSettings = {
  enabled: false,
  transcriptionMode: 'local',
  whisperModel: 'tiny.en',
  whisperLanguage: 'en',
  pushToTalkKey: null,
  toggleRecordingKey: null,
  selectedMicrophone: null,
  isRecording: false,
  isProcessing: false,
  lastTranscript: null,
}

const INITIAL_TERMINAL_SETTINGS: TerminalSettings = {
  defaultShell: 'auto',
}
const WORKSPACE_VIEW_IDS: WorkspaceViewId[] = ['terminal', 'canvas', 'swarm-dashboard', 'browser']
const WORKSPACE_KINDS: WorkspaceKind[] = ['terminal', 'canvas', 'swarm', 'browser']
const TERMINAL_SPLIT_DIRECTIONS: TerminalSplitDirection[] = ['horizontal', 'vertical']
const AGENT_CLIS: AgentCli[] = ['claude', 'codex', 'gemini', 'opencode', 'cursor', 'droid', 'copilot']
const TERMINAL_SHELL_KINDS: TerminalShellKind[] = ['auto', 'powershell', 'command-prompt', 'git-bash']
const TERMINAL_SESSION_KINDS: TerminalSessionKind[] = ['local', 'agent-attached']
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

const parseColorToRgb = (input: string) => {
  const value = input.trim()

  if (value.startsWith('#')) {
    const normalized = value.slice(1)

    if (normalized.length === 3) {
      return {
        r: parseInt(normalized[0] + normalized[0], 16),
        g: parseInt(normalized[1] + normalized[1], 16),
        b: parseInt(normalized[2] + normalized[2], 16),
      }
    }

    if (normalized.length >= 6) {
      return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
      }
    }
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i)
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => Number.parseFloat(part.trim()))
    return {
      r: Number.isFinite(parts[0]) ? parts[0] : 0,
      g: Number.isFinite(parts[1]) ? parts[1] : 0,
      b: Number.isFinite(parts[2]) ? parts[2] : 0,
    }
  }

  return { r: 127, g: 127, b: 127 }
}

const withAlpha = (color: string, alpha: number) => {
  const { r, g, b } = parseColorToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const CUSTOM_THEME_VAR_KEYS = [
  '--surface-0',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--surface-4',
  '--surface-5',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--accent',
  '--accent-hover',
  '--accent-glow',
  '--accent-subtle',
  '--secondary',
  '--secondary-glow',
  '--border',
  '--border-hover',
  '--success',
  '--success-glow',
  '--warning',
  '--warning-glow',
  '--error',
  '--error-glow',
  '--info',
  '--terminal-bg',
  '--terminal-text',
  '--surface-glass',
  '--surface-glass-strong',
] as const

const applyCustomThemeVariables = (theme: CustomThemePreset | null) => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  if (!theme) {
    for (const variable of CUSTOM_THEME_VAR_KEYS) {
      root.style.removeProperty(variable)
    }
    return
  }

  const [errorTone, successTone, infoTone] = theme.colors

  root.style.setProperty('--surface-0', theme.surface0)
  root.style.setProperty('--surface-1', theme.surface1)
  root.style.setProperty('--surface-2', theme.surface2)
  root.style.setProperty('--surface-3', theme.surface3)
  root.style.setProperty('--surface-4', theme.surface3)
  root.style.setProperty('--surface-5', theme.surface3)
  root.style.setProperty('--text-primary', theme.textPrimary)
  root.style.setProperty('--text-secondary', theme.textSecondary)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--accent-hover', theme.secondary)
  root.style.setProperty('--accent-glow', withAlpha(theme.accent, 0.32))
  root.style.setProperty('--accent-subtle', withAlpha(theme.accent, 0.12))
  root.style.setProperty('--secondary', theme.secondary)
  root.style.setProperty('--secondary-glow', withAlpha(theme.secondary, 0.24))
  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--border-hover', withAlpha(theme.textPrimary, 0.22))
  root.style.setProperty('--success', successTone || theme.secondary)
  root.style.setProperty('--success-glow', withAlpha(successTone || theme.secondary, 0.24))
  root.style.setProperty('--warning', errorTone || theme.accent)
  root.style.setProperty('--warning-glow', withAlpha(errorTone || theme.accent, 0.24))
  root.style.setProperty('--error', errorTone || theme.accent)
  root.style.setProperty('--error-glow', withAlpha(errorTone || theme.accent, 0.24))
  root.style.setProperty('--info', infoTone || theme.secondary)
  root.style.setProperty('--terminal-bg', theme.terminalBg)
  root.style.setProperty('--terminal-text', theme.terminalText)
  root.style.setProperty('--surface-glass', withAlpha(theme.surface1, theme.mode === 'light' ? 0.82 : 0.76))
  root.style.setProperty('--surface-glass-strong', withAlpha(theme.surface1, theme.mode === 'light' ? 0.94 : 0.9))
}

const applyResolvedTheme = (theme: ThemeId, customTheme: CustomThemePreset | null) => {
  if (typeof document === 'undefined') {
    return
  }

  const themeAttribute = customTheme
    ? (customTheme.mode === 'light' ? 'github-light' : '')
    : (theme === 'sloerspace' ? '' : theme)

  document.documentElement.setAttribute('data-theme', themeAttribute)
  applyCustomThemeVariables(customTheme)
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

const buildSwarmStarterCommand = (
  agentName: string,
  role: AgentRole,
  cli: AgentCli,
  task: string,
  workingDirectory: string,
): CommandBlock => ({
  id: generateId(),
  command: `echo [SWARM] ${agentName} session ready`,
  output: [
    `${agentName} online`,
    `role ${role} · cli ${cli}`,
    `root ${workingDirectory}`,
    task || 'Mission brief pending',
  ].join('\n'),
  exitCode: 0,
  timestamp: new Date().toLocaleTimeString(),
  isCollapsed: false,
  duration: '0ms',
})

const createTerminalPane = (
  workingDirectory: string,
  options?: {
    agentCli?: AgentCli
    sessionKind?: TerminalSessionKind
    label?: string
    isActive?: boolean
    commands?: CommandBlock[]
    shellKind?: TerminalShellKind
    shellBootstrapCommand?: string | null
    layoutColumn?: number
    layoutRow?: number
  },
): TerminalPane => ({
  id: generateId(),
  cwd: workingDirectory,
  commands: options?.commands ?? [],
  agentCli: options?.agentCli,
  sessionKind: options?.sessionKind ?? 'local',
  shellKind: options?.shellKind ?? 'auto',
  shellBootstrapCommand: options?.shellBootstrapCommand ?? null,
  bootstrappedShellSessionCreatedAtMs: null,
  isActive: options?.isActive ?? false,
  label: options?.label,
  isRunning: false,
  commandHistory: [],
  runtimeSessionId: generateId(),
  runtimeSession: null,
  layoutColumn: typeof options?.layoutColumn === 'number' ? Math.max(0, Math.trunc(options.layoutColumn)) : undefined,
  layoutRow: typeof options?.layoutRow === 'number' ? Math.max(0, Math.trunc(options.layoutRow)) : undefined,
})

const hasExplicitPaneLayout = (pane: TerminalPane) => (
  typeof pane.layoutColumn === 'number' || typeof pane.layoutRow === 'number'
)

const getPaneLayoutColumn = (pane: TerminalPane, fallbackColumn: number) => (
  typeof pane.layoutColumn === 'number' ? Math.max(0, Math.trunc(pane.layoutColumn)) : fallbackColumn
)

const getPaneLayoutRow = (pane: TerminalPane) => (
  typeof pane.layoutRow === 'number' ? Math.max(0, Math.trunc(pane.layoutRow)) : 0
)

const normalizePaneSplitLayout = (panes: TerminalPane[]) => {
  const positioned = panes.map((pane, index) => ({
    pane,
    index,
    column: getPaneLayoutColumn(pane, index),
    row: getPaneLayoutRow(pane),
  }))

  const columns = Array.from(new Set(positioned.map((entry) => entry.column))).sort((left, right) => left - right)

  return columns.flatMap((column, normalizedColumn) => (
    positioned
      .filter((entry) => entry.column === column)
      .sort((left, right) => (left.row - right.row) || (left.index - right.index))
      .map((entry, normalizedRow) => ({
        ...entry.pane,
        layoutColumn: normalizedColumn,
        layoutRow: normalizedRow,
      }))
  ))
}

const expandAgentAssignments = (config: Record<AgentCli, number>) => (
  Object.entries(config) as [AgentCli, number][]
).flatMap(([agent, count]) => Array.from({ length: count }, () => agent))

const createTerminalPanes = (
  paneCount: number,
  workingDirectory: string,
  config: Record<AgentCli, number>,
  shellKind: TerminalShellKind = 'auto',
  bootstrapCommands?: Partial<Record<AgentCli, string | null>>,
  customBootstrapCommand?: string | null,
) => {
  const assignedAgents = expandAgentAssignments(config)

  return Array.from({ length: paneCount }, (_, index): TerminalPane => {
    const agentCli = assignedAgents[index]
    const shellBootstrapCommand = agentCli && bootstrapCommands?.[agentCli]
      ? bootstrapCommands[agentCli]
      : (!agentCli && customBootstrapCommand ? customBootstrapCommand : null)
    return createTerminalPane(workingDirectory, {
      agentCli,
      sessionKind: 'local',
      isActive: index === 0,
      shellKind,
      shellBootstrapCommand,
    })
  })
}

const createSwarmTerminalPanes = (agents: SwarmAgent[], workingDirectory: string) => (
  agents.map((agent, index): TerminalPane => createTerminalPane(workingDirectory, {
    commands: [buildSwarmStarterCommand(agent.name, agent.role, agent.cli, agent.task, workingDirectory)],
    agentCli: agent.cli,
    sessionKind: 'agent-attached',
    label: agent.name,
    isActive: index === 0,
    shellKind: 'auto',
    shellBootstrapCommand: agent.cliBootstrapCommand ?? null,
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
      cliBootstrapCommand: agent.cliBootstrapCommand ?? null,
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

const createSwarmMessages = (
  name: string,
  objective: string,
  agents: SwarmAgent[],
  workingDirectory: string,
  knowledgeFiles: string[],
  contextNotes: string,
  missionDirectives: string[],
): SwarmMessage[] => {
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
    {
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      target: 'all',
      content: `Workspace root synchronized: ${workingDirectory}`,
      createdAt: now,
      kind: 'status',
    },
    {
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      target: 'all',
      content: knowledgeFiles.length > 0
        ? `Knowledge envelope attached with ${knowledgeFiles.length} linked file${knowledgeFiles.length === 1 ? '' : 's'}.`
        : 'Knowledge envelope is empty. Launching with mission brief only.',
      createdAt: now,
      kind: 'status',
    },
    ...(missionDirectives.length > 0 ? [{
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system' as const,
      target: 'all' as const,
      content: `Mission directives active: ${missionDirectives.join(', ')}`,
      createdAt: now,
      kind: 'status' as const,
    }] : []),
    ...(contextNotes.trim() ? [{
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system' as const,
      target: 'all' as const,
      content: `Operator note linked to mission context: ${contextNotes.trim()}`,
      createdAt: now,
      kind: 'status' as const,
    }] : []),
    ...(coordinator ? [{
      id: generateId(),
      senderId: coordinator.id,
      senderName: coordinator.name,
      senderRole: coordinator.role,
      target: 'all' as const,
      content: 'Coordinator online. Routing tasks, syncing lanes, and preparing operator-visible terminal sessions.',
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

const getOptionalString = (value: unknown) => (
  typeof value === 'string' ? value : null
)

const normalizeStringArray = (value: unknown, limit = 200) => (
  Array.isArray(value)
    ? value.flatMap((entry) => typeof entry === 'string' ? [entry] : []).slice(0, limit)
    : []
)

const getEnumValue = <T extends string>(collection: readonly T[], value: unknown, fallback: T): T => (
  typeof value === 'string' && collection.includes(value as T) ? (value as T) : fallback
)

const getOptionalAgentCli = (value: unknown) => (
  typeof value === 'string' && AGENT_CLIS.includes(value as AgentCli) ? (value as AgentCli) : undefined
)

const getOptionalTerminalShellKind = (value: unknown) => (
  typeof value === 'string' && TERMINAL_SHELL_KINDS.includes(value as TerminalShellKind) ? (value as TerminalShellKind) : undefined
)

const getOptionalTerminalSessionKind = (value: unknown) => (
  typeof value === 'string' && TERMINAL_SESSION_KINDS.includes(value as TerminalSessionKind) ? (value as TerminalSessionKind) : undefined
)

const getOptionalTerminalSplitDirection = (value: unknown) => (
  typeof value === 'string' && TERMINAL_SPLIT_DIRECTIONS.includes(value as TerminalSplitDirection)
    ? (value as TerminalSplitDirection)
    : undefined
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

const normalizeTerminalSessionSnapshot = (value: unknown): TerminalSessionSnapshot | null => {
  if (!isRecord(value)) {
    return null
  }

  const now = Date.now()

  return {
    sessionId: getString(value.sessionId) || generateId(),
    label: getOptionalString(value.label),
    sessionKind: getString(value.sessionKind) || 'local',
    backendKind: getString(value.backendKind) || 'persistent-pty',
    cwd: getString(value.cwd) || getFallbackWorkingDirectory(),
    createdAtMs: Math.max(0, Math.trunc(getNumber(value.createdAtMs, now))),
    updatedAtMs: Math.max(0, Math.trunc(getNumber(value.updatedAtMs, now))),
    lastCommand: getOptionalString(value.lastCommand),
    lastExitCode: typeof value.lastExitCode === 'number' ? Math.trunc(value.lastExitCode) : null,
    lastDurationMs: typeof value.lastDurationMs === 'number' ? Math.max(0, Math.trunc(value.lastDurationMs)) : null,
    executionCount: Math.max(0, Math.trunc(getNumber(value.executionCount, 0))),
    isRunning: getBoolean(value.isRunning, false),
    activeCommandId: getOptionalString(value.activeCommandId),
    executionMode: getString(value.executionMode) || 'persistent-pty-shell',
    shell: getString(value.shell) || 'Shell',
  }
}

const normalizeTerminalPane = (
  value: unknown,
  index: number,
  fallbackSessionKind: TerminalSessionKind = 'local',
) => {
  if (!isRecord(value)) {
    return null
  }

  const runtimeSession = normalizeTerminalSessionSnapshot(value.runtimeSession)
  const sessionKind = getOptionalTerminalSessionKind(value.sessionKind)
    ?? getOptionalTerminalSessionKind(runtimeSession?.sessionKind)
    ?? fallbackSessionKind

  return {
    id: getString(value.id) || generateId(),
    cwd: getString(value.cwd) || getFallbackWorkingDirectory(),
    commands: normalizeCommandBlocks(value.commands),
    agentCli: getOptionalAgentCli(value.agentCli),
    sessionKind,
    shellKind: getOptionalTerminalShellKind(value.shellKind) ?? 'auto',
    shellBootstrapCommand: getOptionalString(value.shellBootstrapCommand),
    bootstrappedShellSessionCreatedAtMs: typeof value.bootstrappedShellSessionCreatedAtMs === 'number'
      ? Math.max(0, Math.trunc(value.bootstrappedShellSessionCreatedAtMs))
      : null,
    isActive: getBoolean(value.isActive, index === 0),
    label: getString(value.label) || undefined,
    isRunning: getBoolean(value.isRunning, false),
    commandHistory: normalizeStringArray(value.commandHistory, 200),
    isLocked: getBoolean(value.isLocked, false),
    runtimeSessionId: getString(value.runtimeSessionId) || generateId(),
    runtimeSession: runtimeSession ? { ...runtimeSession, sessionKind } : null,
    layoutColumn: typeof value.layoutColumn === 'number' ? Math.max(0, Math.trunc(value.layoutColumn)) : undefined,
    layoutRow: typeof value.layoutRow === 'number' ? Math.max(0, Math.trunc(value.layoutRow)) : undefined,
  } satisfies TerminalPane
}

const normalizeTerminalSessions = (value: unknown, workspaceTabs: WorkspaceTab[]) => {
  if (!isRecord(value)) {
    return {}
  }

  const sessions: Record<string, TerminalPane[]> = {}
  const workspaceKindById = new Map(workspaceTabs.map((tab) => [tab.id, tab.kind] as const))

  for (const [sessionId, panes] of Object.entries(value)) {
    if (!Array.isArray(panes)) {
      continue
    }

     const fallbackSessionKind: TerminalSessionKind = workspaceKindById.get(sessionId) === 'swarm'
      ? 'agent-attached'
      : 'local'

    sessions[sessionId] = panes.flatMap((pane, index) => {
      const normalizedPane = normalizeTerminalPane(pane, index, fallbackSessionKind)
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

    const fallbackKind: WorkspaceKind = entry.view === 'swarm-dashboard' ? 'swarm' : entry.view === 'browser' ? 'browser' : 'terminal'
    const kind = getEnumValue(WORKSPACE_KINDS, entry.kind, fallbackKind)
    const fallbackView: WorkspaceViewId = kind === 'swarm' ? 'swarm-dashboard' : kind === 'browser' ? 'browser' : 'terminal'

    tabs.push({
      id: getString(entry.id) || generateId(),
      name: getString(entry.name) || (kind === 'swarm' ? `SloerSwarm ${index + 1}` : `Workspace ${index + 1}`),
      color: getString(entry.color) || nextWorkspaceColor(index),
      view: getEnumValue(WORKSPACE_VIEW_IDS, entry.view, fallbackView),
      kind,
      splitDirection: getOptionalTerminalSplitDirection(entry.splitDirection) ?? 'vertical',
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
      cliBootstrapCommand: getOptionalString(entry.cliBootstrapCommand),
      terminalPaneId: typeof entry.terminalPaneId === 'string' ? entry.terminalPaneId : undefined,
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
      contextNotes: getString(entry.contextNotes),
      missionDirectives: Array.isArray(entry.missionDirectives)
        ? entry.missionDirectives.flatMap((item) => typeof item === 'string' ? [item] : [])
        : [],
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

const normalizeCommandAliases = (value: unknown) => {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => (
      key.trim() && typeof entry === 'string' ? [[key, entry]] : []
    )),
  )
}

const normalizeCommandSnippets = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return []
    }

    const name = getString(entry.name).trim()
    const command = getString(entry.command).trim()

    if (!name || !command) {
      return []
    }

    return [{
      id: getString(entry.id) || `snippet-${index}-${generateId()}`,
      name,
      command,
    }]
  }).slice(0, 200)
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

const normalizeCustomTheme = (value: unknown): CustomThemePreset | null => {
  if (!isRecord(value)) {
    return null
  }

  const colors = Array.isArray(value.colors)
    ? value.colors.flatMap((entry) => typeof entry === 'string' ? [entry] : []).slice(0, 3)
    : []

  const preset: CustomThemePreset = {
    id: getString(value.id) || 'custom-imported',
    name: getString(value.name) || 'Custom Theme',
    mode: value.mode === 'light' ? 'light' : 'dark',
    colors: [
      colors[0] || getString(value.accent) || '#ff6f96',
      colors[1] || getString(value.secondary) || '#28e7c5',
      colors[2] || getString(value.textMuted) || '#8fc2ff',
    ],
    surface0: getString(value.surface0),
    surface1: getString(value.surface1),
    surface2: getString(value.surface2),
    surface3: getString(value.surface3),
    textPrimary: getString(value.textPrimary),
    textSecondary: getString(value.textSecondary),
    textMuted: getString(value.textMuted),
    accent: getString(value.accent),
    secondary: getString(value.secondary),
    border: getString(value.border),
    terminalBg: getString(value.terminalBg),
    terminalText: getString(value.terminalText),
    description: getString(value.description) || 'Imported custom theme preset',
  }

  const requiredFields = [
    preset.surface0,
    preset.surface1,
    preset.surface2,
    preset.surface3,
    preset.textPrimary,
    preset.textSecondary,
    preset.textMuted,
    preset.accent,
    preset.secondary,
    preset.border,
    preset.terminalBg,
    preset.terminalText,
  ]

  return requiredFields.every(Boolean) ? preset : null
}

const normalizeSiulkVoice = (value: unknown): SiulkVoiceSettings => {
  if (!isRecord(value)) {
    return { ...INITIAL_SIULK_VOICE }
  }

  return {
    enabled: getBoolean(value.enabled, false),
    transcriptionMode: 'local',
    whisperModel: getEnumValue(WHISPER_MODELS, value.whisperModel, 'tiny.en'),
    whisperLanguage: getEnumValue(WHISPER_LANGUAGES, value.whisperLanguage, 'en'),
    pushToTalkKey: getOptionalString(value.pushToTalkKey),
    toggleRecordingKey: getOptionalString(value.toggleRecordingKey),
    selectedMicrophone: getOptionalString(value.selectedMicrophone),
    isRecording: false,
    isProcessing: false,
    lastTranscript: null,
  }
}

const normalizeTerminalSettings = (value: unknown): TerminalSettings => {
  if (!isRecord(value)) {
    return { ...INITIAL_TERMINAL_SETTINGS }
  }

  return {
    defaultShell: getEnumValue(TERMINAL_SHELL_KINDS, value.defaultShell, 'auto'),
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
    customTheme: normalizeCustomTheme(persistedState.customTheme),
    currentView: getEnumValue(VIEW_IDS, persistedState.currentView, 'home'),
    settingsTab: getEnumValue(SETTINGS_TAB_IDS, persistedState.settingsTab, 'appearance'),
    workspaceTabs: markActiveTabs(workspaceTabs, normalizedActiveTabId),
    activeTabId: normalizedActiveTabId,
    terminalSessions: normalizeTerminalSessions(persistedState.terminalSessions, workspaceTabs),
    swarmSessions: normalizeSwarmSessions(persistedState.swarmSessions),
    kanbanTasks: normalizeKanbanTasks(persistedState.kanbanTasks),
    customAgents: normalizeCustomAgents(persistedState.customAgents),
    prompts: normalizePrompts(persistedState.prompts),
    defaultAgent: getEnumValue(AGENT_CLIS, persistedState.defaultAgent, 'claude'),
    wizardLayout: Math.min(16, Math.max(1, Math.trunc(getNumber(persistedState.wizardLayout, 1)))),
    wizardAgentConfig: normalizeAgentConfig(persistedState.wizardAgentConfig),
    userProfile: normalizeUserProfile(persistedState.userProfile),
    isLoggedIn: getBoolean(persistedState.isLoggedIn, false),
    authToken: getOptionalString(persistedState.authToken),
    sessionDevice: getOptionalString(persistedState.sessionDevice),
    trialStartedAt: getOptionalString(persistedState.trialStartedAt),
    showOnStartup: getBoolean(persistedState.showOnStartup, true),
    hasCompletedOnboarding: typeof persistedState.hasCompletedOnboarding === 'boolean'
      ? persistedState.hasCompletedOnboarding
      : true,
    recentProjects: normalizeStringArray(persistedState.recentProjects, 10),
    commandAliases: normalizeCommandAliases(persistedState.commandAliases),
    starredCommands: normalizeStringArray(persistedState.starredCommands, 200),
    commandSnippets: normalizeCommandSnippets(persistedState.commandSnippets),
    siulkVoice: normalizeSiulkVoice(persistedState.siulkVoice),
    terminalSettings: normalizeTerminalSettings(persistedState.terminalSettings),
  }
}

export const useStore = create<AppState>()(persist(
  (set, get) => ({
    theme: 'sloerspace',
    customTheme: null,
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
    hasCompletedOnboarding: false,
    recentProjects: [],
    pendingTerminalCommand: null,
    pendingVoiceTranscript: null,
    commandAliases: {},
    starredCommands: [],
    commandSnippets: [],
    siulkVoice: { ...INITIAL_SIULK_VOICE },
    terminalSettings: { ...INITIAL_TERMINAL_SETTINGS },
    browserTabs: [],
    browserSplitMode: 'full' as BrowserSplitMode,
    browserActiveTabId: null,
    browserShowBookmarks: true,
    aiSettings: { ...INITIAL_AI_SETTINGS },
    aiChatHistory: [],
    sshConnections: [],
    notificationSettings: { sounds: true, os: true },

    setTheme: (theme) => {
      applyResolvedTheme(theme, null)
      set({ theme, customTheme: null })
    },
    applyCustomTheme: (customTheme) => {
      applyResolvedTheme(get().theme, customTheme)
      set({ customTheme })
    },
    clearCustomTheme: () => {
      const currentTheme = get().theme
      applyResolvedTheme(currentTheme, null)
      set({ customTheme: null })
    },
    setView: (view) => set({ currentView: view }),
    setSettingsTab: (tab) => set({ settingsTab: tab }),
    setNotificationSettings: (settings) => set((state) => ({ notificationSettings: { ...state.notificationSettings, ...settings } })),

    updateWorkspaceTab: (id, changes) => set((state) => ({
      workspaceTabs: state.workspaceTabs.map((tab) => tab.id === id ? { ...tab, ...changes } : tab),
    })),

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
        runtimeSession: pane.runtimeSession
          ? {
            ...pane.runtimeSession,
            cwd,
            updatedAtMs: Date.now(),
          }
          : pane.runtimeSession,
      })),
    })),

    clearPaneCommands: (paneId) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        commands: [],
      })),
    })),

    setActivePane: (paneId) => set((state) => {
      let changed = false

      const nextSessions = Object.fromEntries(
        Object.entries(state.terminalSessions).map(([sessionId, panes]) => {
          const hasTarget = panes.some((pane) => pane.id === paneId)

          if (!hasTarget) {
            return [sessionId, panes]
          }

          changed = true
          return [sessionId, panes.map((pane) => ({
            ...pane,
            isActive: pane.id === paneId,
          }))]
        }),
      ) as Record<string, TerminalPane[]>

      return changed ? { terminalSessions: nextSessions } : state
    }),

    markPaneShellBootstrapped: (paneId, sessionCreatedAtMs) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        bootstrappedShellSessionCreatedAtMs: sessionCreatedAtMs,
      })),
    })),

    removePane: (paneId) => set((state) => {
      const nextSessions: Record<string, TerminalPane[]> = { ...state.terminalSessions }
      let targetWorkspaceId: string | null = null

      for (const [sessionId, panes] of Object.entries(state.terminalSessions)) {
        const paneIndex = panes.findIndex((pane) => pane.id === paneId)
        if (paneIndex === -1) {
          continue
        }

        if (panes.length <= 1) {
          return state
        }

        targetWorkspaceId = sessionId
        const filtered = panes.filter((pane) => pane.id !== paneId)
        const removedActive = panes[paneIndex]?.isActive
        const nextPaneSet = filtered.some(hasExplicitPaneLayout)
          ? normalizePaneSplitLayout(filtered)
          : filtered

        nextSessions[sessionId] = nextPaneSet.map((pane, index) => ({
          ...pane,
          isActive: removedActive
            ? index === Math.max(0, Math.min(paneIndex - 1, nextPaneSet.length - 1))
            : pane.isActive,
        }))
        break
      }

      if (!targetWorkspaceId) {
        return state
      }

      return {
        terminalSessions: nextSessions,
        workspaceTabs: state.workspaceTabs.map((tab) => (
          tab.id === targetWorkspaceId
            ? { ...tab, paneCount: nextSessions[targetWorkspaceId]?.length ?? tab.paneCount }
            : tab
        )),
      }
    }),

    renamePane: (paneId, label) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        label,
        runtimeSession: pane.runtimeSession
          ? {
            ...pane.runtimeSession,
            label,
            updatedAtMs: Date.now(),
          }
          : pane.runtimeSession,
      })),
    })),

    setPaneRunning: (paneId, running) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        isRunning: running,
        runtimeSession: pane.runtimeSession
          ? {
            ...pane.runtimeSession,
            isRunning: running,
            updatedAtMs: Date.now(),
          }
          : pane.runtimeSession,
      })),
    })),

    setPaneLocked: (paneId, locked) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        isLocked: locked,
      })),
    })),

    setPaneRuntimeSession: (paneId, snapshot) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        cwd: snapshot?.cwd ?? pane.cwd,
        runtimeSessionId: snapshot?.sessionId ?? pane.runtimeSessionId ?? generateId(),
        runtimeSession: snapshot,
      })),
    })),

    addToCommandHistory: (paneId, command) => set((state) => ({
      terminalSessions: updatePaneCollection(state.terminalSessions, paneId, (pane) => ({
        ...pane,
        commandHistory: [command, ...(pane.commandHistory ?? []).filter((entry) => entry !== command)].slice(0, 200),
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
    setActiveWorkspaceSplitDirection: (direction) => set((state) => {
      if (!state.activeTabId) {
        return state
      }

      return {
        workspaceTabs: state.workspaceTabs.map((tab) => (
          tab.id === state.activeTabId && tab.kind === 'terminal'
            ? { ...tab, splitDirection: direction }
            : tab
        )),
      }
    }),

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
        splitDirection: 'vertical',
        paneCount,
        isActive: true,
        workingDirectory,
        createdAt: new Date().toISOString(),
      }
      const panes = createTerminalPanes(paneCount, workingDirectory, agentConfig, 'auto', payload.agentBootstrapCommands, payload.customBootstrapCommand)

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

    launchCanvas: (payload) => {
      const state = get()
      const paneCount = Math.max(1, state.wizardLayout)
      const workingDirectory = payload.workingDirectory.trim() || getFallbackWorkingDirectory()
      const agentConfig = payload.agentConfig ?? state.wizardAgentConfig
      const id = generateId()
      const tab: WorkspaceTab = {
        id,
        name: payload.name?.trim() || getNextWorkspaceName(state.workspaceTabs, 'canvas', 'Canvas'),
        color: nextWorkspaceColor(state.workspaceTabs.length),
        view: 'canvas',
        kind: 'canvas',
        splitDirection: 'vertical',
        paneCount,
        isActive: true,
        workingDirectory,
        createdAt: new Date().toISOString(),
      }
      const panes = createTerminalPanes(paneCount, workingDirectory, agentConfig, 'auto', payload.agentBootstrapCommands, payload.customBootstrapCommand)

      set((currentState) => ({
        workspaceTabs: [...markActiveTabs(currentState.workspaceTabs, null), tab],
        activeTabId: id,
        terminalSessions: {
          ...currentState.terminalSessions,
          [id]: panes,
        },
        currentView: 'canvas',
        wizardStep: 0,
        wizardAgentConfig: { ...INITIAL_AGENT_CONFIG },
      }))
    },

    launchQuickShellWorkspace: (payload) => {
      const state = get()
      const workingDirectory = payload.workingDirectory?.trim() || getFallbackWorkingDirectory()
      const id = generateId()
      const shellKind = payload.shellKind ?? 'auto'
      const shellLabel = shellKind === 'powershell'
        ? 'PowerShell'
        : shellKind === 'command-prompt'
          ? 'Command Prompt'
          : shellKind === 'git-bash'
            ? 'Git Bash'
            : 'Workspace'
      const tab: WorkspaceTab = {
        id,
        name: payload.name?.trim() || getNextWorkspaceName(state.workspaceTabs, 'terminal', shellLabel),
        color: nextWorkspaceColor(state.workspaceTabs.length),
        view: 'terminal',
        kind: 'terminal',
        splitDirection: 'vertical',
        paneCount: 1,
        isActive: true,
        workingDirectory,
        createdAt: new Date().toISOString(),
      }
      const panes = [createTerminalPane(workingDirectory, {
        isActive: true,
        label: shellLabel,
        shellKind,
        shellBootstrapCommand: payload.shellBootstrapCommand,
      })]

      set((currentState) => ({
        workspaceTabs: [...markActiveTabs(currentState.workspaceTabs, null), tab],
        activeTabId: id,
        terminalSessions: {
          ...currentState.terminalSessions,
          [id]: panes,
        },
        currentView: 'terminal',
      }))
    },

    addPaneToActiveWorkspace: (payload) => {
      const state = get()
      const activeWorkspaceId = state.activeTabId

      if (!activeWorkspaceId) {
        return null
      }

      const activeWorkspace = state.workspaceTabs.find((tab) => tab.id === activeWorkspaceId && (tab.kind === 'terminal' || tab.kind === 'canvas'))
      const panes = state.terminalSessions[activeWorkspaceId] ?? []

      if (!activeWorkspace) {
        return null
      }

      const anchorPane = payload?.anchorPaneId
        ? panes.find((pane) => pane.id === payload.anchorPaneId)
        : panes.find((pane) => pane.isActive) ?? panes[panes.length - 1]
      const workingDirectory = payload?.workingDirectory?.trim()
        || anchorPane?.cwd
        || activeWorkspace.workingDirectory
        || panes[0]?.cwd
        || getFallbackWorkingDirectory()
      const shellKind = payload?.shellKind ?? anchorPane?.shellKind ?? 'auto'
      const splitDirection = payload?.splitDirection ?? activeWorkspace.splitDirection ?? 'vertical'
      const shouldUseExplicitLayout = Boolean(payload?.anchorPaneId || panes.some(hasExplicitPaneLayout))

      const nextPane = (() => {
        if (!shouldUseExplicitLayout) {
          return createTerminalPane(workingDirectory, {
            isActive: true,
            label: payload?.label,
            shellKind,
            shellBootstrapCommand: payload?.shellBootstrapCommand,
          })
        }

        const normalizedPanes = normalizePaneSplitLayout(
          panes.map((pane, index) => ({
            ...pane,
            layoutColumn: getPaneLayoutColumn(pane, index),
            layoutRow: getPaneLayoutRow(pane),
          }))
        )
        const positionedAnchor = normalizedPanes.find((pane) => pane.id === anchorPane?.id) ?? normalizedPanes[normalizedPanes.length - 1]
        const anchorColumn = getPaneLayoutColumn(positionedAnchor, Math.max(0, normalizedPanes.length - 1))
        const anchorRow = getPaneLayoutRow(positionedAnchor)

        if (splitDirection === 'horizontal') {
          return createTerminalPane(workingDirectory, {
            isActive: true,
            label: payload?.label,
            shellKind,
            shellBootstrapCommand: payload?.shellBootstrapCommand,
            layoutColumn: anchorColumn,
            layoutRow: anchorRow + 1,
          })
        }

        return createTerminalPane(workingDirectory, {
          isActive: true,
          label: payload?.label,
          shellKind,
          shellBootstrapCommand: payload?.shellBootstrapCommand,
          layoutColumn: anchorColumn + 1,
          layoutRow: 0,
        })
      })()

      set((currentState) => ({
        terminalSessions: {
          ...currentState.terminalSessions,
          [activeWorkspaceId]: (() => {
            const currentPanes = currentState.terminalSessions[activeWorkspaceId] ?? []

            if (!shouldUseExplicitLayout) {
              return [
                ...currentPanes.map((pane) => ({ ...pane, isActive: false })),
                nextPane,
              ]
            }

            const normalizedPanes = normalizePaneSplitLayout(
              currentPanes.map((pane, index) => ({
                ...pane,
                isActive: false,
                layoutColumn: getPaneLayoutColumn(pane, index),
                layoutRow: getPaneLayoutRow(pane),
              }))
            )
            const positionedAnchor = normalizedPanes.find((pane) => pane.id === anchorPane?.id) ?? normalizedPanes[normalizedPanes.length - 1]
            const anchorColumn = getPaneLayoutColumn(positionedAnchor, Math.max(0, normalizedPanes.length - 1))
            const anchorRow = getPaneLayoutRow(positionedAnchor)

            if (splitDirection === 'horizontal') {
              return normalizePaneSplitLayout([
                ...normalizedPanes.map((pane) => ({
                  ...pane,
                  layoutRow: getPaneLayoutColumn(pane, 0) === anchorColumn && getPaneLayoutRow(pane) > anchorRow
                    ? getPaneLayoutRow(pane) + 1
                    : getPaneLayoutRow(pane),
                })),
                nextPane,
              ])
            }

            return normalizePaneSplitLayout([
              ...normalizedPanes.map((pane) => ({
                ...pane,
                layoutColumn: getPaneLayoutColumn(pane, 0) > anchorColumn
                  ? getPaneLayoutColumn(pane, 0) + 1
                  : getPaneLayoutColumn(pane, 0),
              })),
              nextPane,
            ])
          })(),
        },
        workspaceTabs: currentState.workspaceTabs.map((tab) => (
          tab.id === activeWorkspaceId
            ? {
              ...tab,
              paneCount: (currentState.terminalSessions[activeWorkspaceId] ?? []).length + 1,
              splitDirection,
            }
            : tab
        )),
        currentView: activeWorkspace.kind === 'canvas' ? 'canvas' : 'terminal',
      }))

      return nextPane.id
    },

    launchSwarm: (payload) => {
      const state = get()
      const name = payload.name.trim() || getNextWorkspaceName(state.workspaceTabs, 'swarm', 'SloerSwarm')
      const objective = payload.objective.trim()
      const workingDirectory = payload.workingDirectory.trim() || getFallbackWorkingDirectory()
      const baseAgents = createSwarmAgents(payload.agents, objective)
      const panes = createSwarmTerminalPanes(baseAgents, workingDirectory)
      const agents = baseAgents.map((agent, index) => ({
        ...agent,
        terminalPaneId: panes[index]?.id,
      }))
      const id = generateId()
      const tab: WorkspaceTab = {
        id,
        name,
        color: nextWorkspaceColor(state.workspaceTabs.length),
        view: 'swarm-dashboard',
        kind: 'swarm',
        splitDirection: 'vertical',
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
        contextNotes: payload.contextNotes,
        missionDirectives: payload.missionDirectives,
        messages: createSwarmMessages(
          name,
          objective,
          agents,
          workingDirectory,
          payload.knowledgeFiles,
          payload.contextNotes,
          payload.missionDirectives,
        ),
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
        terminalSessions: {
          ...state.terminalSessions,
          [state.activeTabId]: (state.terminalSessions[state.activeTabId] ?? []).map((pane) => ({
            ...pane,
            isRunning: false,
          })),
        },
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
      const nextAgents: SwarmAgent[] = activeSession.agents.map((agent) => {
        const touched = target === 'all'
          ? agent.role === 'coord' || agent.status === 'running'
          : agent.id === target || agent.role === 'coord'

        if (!touched) {
          return agent
        }

        const progressDelta = target === 'all' ? (agent.role === 'coord' ? 6 : 4) : (agent.id === target ? 10 : 4)
        const tokenDelta = Math.max(24, trimmed.length * (agent.role === 'coord' ? 3 : 5))

        return {
          ...agent,
          status: (agent.status === 'error' ? 'error' : 'running') as SwarmAgent['status'],
          progress: Math.min(98, Math.max(agent.progress, Math.min(98, agent.progress + progressDelta))),
          tokens: agent.tokens + tokenDelta,
          output: target === 'all'
            ? 'Broadcast acknowledged. Lane plan synchronized.'
            : `Operator directive received: ${trimmed}`,
        }
      })

      return {
        swarmSessions: {
          ...state.swarmSessions,
          [state.activeTabId]: {
            ...activeSession,
            agents: nextAgents,
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

    logout: () => {
      set({
        isLoggedIn: false,
        authToken: null,
        sessionDevice: null,
        pendingTerminalCommand: null,
      pendingVoiceTranscript: null,
      })
      try {
        const raw = localStorage.getItem('sloerspace-dev-store')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.state) {
            parsed.state.authToken = null
            parsed.state.isLoggedIn = false
            parsed.state.sessionDevice = null
            localStorage.setItem('sloerspace-dev-store', JSON.stringify(parsed))
          }
        }
      } catch { /* best-effort token purge */ }
    },

    startTrial: () => set({
      trialStartedAt: new Date().toISOString(),
    }),

    updateProfile: (updates) => set((state) => ({
      userProfile: { ...state.userProfile, ...updates },
    })),
    setShowOnStartup: (show) => set({ showOnStartup: show }),
    setOnboardingCompleted: (completed) => set({ hasCompletedOnboarding: completed }),
    addRecentProject: (path) => set((state) => ({
      recentProjects: [path, ...state.recentProjects.filter((p) => p !== path)].slice(0, 10),
    })),
    primeTerminalCommand: (command) => set({ pendingTerminalCommand: command?.trim() || null }),
    consumePendingTerminalCommand: () => {
      const command = get().pendingTerminalCommand
      if (command) set({ pendingTerminalCommand: null })
      return command
    },
    primeVoiceTranscript: (text) => set({ pendingVoiceTranscript: text?.trim() || null }),
    consumeVoiceTranscript: () => {
      const text = get().pendingVoiceTranscript
      if (text) set({ pendingVoiceTranscript: null })
      return text
    },
    isPro: () => {
      const { userProfile, trialStartedAt } = get()
      if (userProfile.plan === 'pro') return true
      if (!trialStartedAt) return false
      const trialEnd = new Date(trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000
      return Date.now() < trialEnd
    },

    isTrialActive: () => {
      const { trialStartedAt } = get()
      if (!trialStartedAt) return false
      const trialEnd = new Date(trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000
      return Date.now() < trialEnd
    },

    setSiulkVoiceEnabled: (enabled) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, enabled },
    })),
    setSiulkVoiceTranscriptionMode: (mode) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, transcriptionMode: mode },
    })),
    setWhisperModel: (model) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, whisperModel: model },
    })),
    setWhisperLanguage: (lang) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, whisperLanguage: lang },
    })),
    setSiulkVoicePushToTalkKey: (key) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, pushToTalkKey: key },
    })),
    setSiulkVoiceToggleRecordingKey: (key) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, toggleRecordingKey: key },
    })),
    setSiulkVoiceSelectedMicrophone: (mic) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, selectedMicrophone: mic },
    })),
    setSiulkVoiceRecording: (recording) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, isRecording: recording },
    })),
    setSiulkVoiceProcessing: (processing) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, isProcessing: processing },
    })),
    setSiulkVoiceLastTranscript: (transcript) => set((state) => ({
      siulkVoice: { ...state.siulkVoice, lastTranscript: transcript },
    })),
    setTerminalDefaultShell: (shell) => set((state) => ({
      terminalSettings: { ...state.terminalSettings, defaultShell: shell },
    })),
    setBrowserTabs: (tabs) => set({ browserTabs: tabs }),
    setBrowserSplitMode: (mode) => set({ browserSplitMode: mode }),
    setBrowserActiveTabId: (id) => set({ browserActiveTabId: id }),
    setBrowserShowBookmarks: (show) => set({ browserShowBookmarks: show }),
    setAISettings: (updates) => set((state) => ({
      aiSettings: { ...state.aiSettings, ...updates },
    })),
    addAIChatMessage: (message) => set((state) => ({
      aiChatHistory: [...state.aiChatHistory, message].slice(-100),
    })),
    clearAIChatHistory: () => set({ aiChatHistory: [] }),
    addSSHConnection: (conn) => set((state) => ({
      sshConnections: [...state.sshConnections, conn],
    })),
    removeSSHConnection: (id) => set((state) => ({
      sshConnections: state.sshConnections.filter((c) => c.id !== id),
    })),
    updateSSHLastConnected: (id) => set((state) => ({
      sshConnections: state.sshConnections.map((c) => c.id === id ? { ...c, lastConnectedAt: Date.now() } : c),
    })),
    envVars: [],
    addEnvVar: (v) => set((state) => ({ envVars: [...state.envVars, v] })),
    updateEnvVar: (id, changes) => set((state) => ({
      envVars: state.envVars.map((v) => v.id === id ? { ...v, ...changes } : v),
    })),
    removeEnvVar: (id) => set((state) => ({ envVars: state.envVars.filter((v) => v.id !== id) })),
    previewPort: 3000,
    setPreviewPort: (port) => set({ previewPort: port }),
    filePreviewPath: null,
    setFilePreviewPath: (path) => set({ filePreviewPath: path }),
    snippets: [],
    addSnippet: (s) => set((state) => ({ snippets: [...state.snippets, s] })),
    updateSnippet: (id, changes) => set((state) => ({ snippets: state.snippets.map((s) => s.id === id ? { ...s, ...changes } : s) })),
    removeSnippet: (id) => set((state) => ({ snippets: state.snippets.filter((s) => s.id !== id) })),
    incrementSnippetUsage: (id) => set((state) => ({ snippets: state.snippets.map((s) => s.id === id ? { ...s, usageCount: s.usageCount + 1 } : s) })),
    workspacePresets: [],
    addWorkspacePreset: (p) => set((state) => ({ workspacePresets: [...state.workspacePresets, p] })),
    removeWorkspacePreset: (id) => set((state) => ({ workspacePresets: state.workspacePresets.filter((p) => p.id !== id) })),
    updateWorkspacePreset: (id, changes) => set((state) => ({ workspacePresets: state.workspacePresets.map((p) => p.id === id ? { ...p, ...changes } : p) })),
  }),
  {
    name: 'sloerspace-dev-store',
    version: 10,
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
      if (version < 7) {
        state.customTheme = null
      }
      if (version < 8) {
        state.hasCompletedOnboarding = true
      }
      if (version < 9) {
        state.siulkVoice = { ...INITIAL_SIULK_VOICE }
        state.terminalSettings = { ...INITIAL_TERMINAL_SETTINGS }
      }
      if (version < 10) {
        state.browserTabs = []
        state.browserSplitMode = 'full'
        state.browserActiveTabId = null
        state.browserShowBookmarks = true
        // Reset transient views on upgrade
        if (['workspace-wizard', 'canvas-wizard', 'swarm-launch'].includes(state.currentView as string)) {
          state.currentView = 'home'
        }
      }
      return state as never
    },
    partialize: (state) => ({
      theme: state.theme,
      customTheme: state.customTheme,
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
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      recentProjects: state.recentProjects,
      commandAliases: state.commandAliases,
      starredCommands: state.starredCommands,
      commandSnippets: state.commandSnippets,
      siulkVoice: state.siulkVoice,
      terminalSettings: state.terminalSettings,
      browserTabs: state.browserTabs,
      browserSplitMode: state.browserSplitMode,
      browserActiveTabId: state.browserActiveTabId,
      browserShowBookmarks: state.browserShowBookmarks,
      aiSettings: state.aiSettings,
      sshConnections: state.sshConnections,
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
        applyResolvedTheme(state.theme, state.customTheme ?? null)
      }
    },
  },
))

export const useStoreHydrated = () => {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      if (useStore.persist.hasHydrated()) {
        setHydrated(true)
        return
      }
      const unsub = useStore.persist.onFinishHydration(() => setHydrated(true))
      return unsub
    } catch {
      setHydrated(true)
    }
  }, [])

  return hydrated
}
