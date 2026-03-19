export interface TerminalCommandResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  resolvedCwd: string
  timedOut: boolean
  cancelled: boolean
}

export interface DirectoryEntry {
  name: string
  isDir: boolean
  size: number
}

export interface SystemInfo {
  os: string
  arch: string
  hostname: string
  username: string
  homeDir: string
  shell: string
  nodeVersion: string
  rustVersion: string
}

export interface AppUpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  installerAvailable: boolean
  assetName: string | null
  assetDownloadUrl: string | null
  releasePageUrl: string
  publishedAt: string | null
  notes: string | null
}

export interface AgentCliResolution {
  cli: string
  available: boolean
  resolvedPath: string | null
  bootstrapCommand: string | null
}

export interface TerminalCapabilities {
  desktopRuntimeAvailable: boolean
  commandBlocks: boolean
  workflows: boolean
  safeCancellation: boolean
  persistentSessions: boolean
  streamingOutput: boolean
  interactiveInput: boolean
  sessionResize: boolean
  altScreen: boolean
  remoteDomains: boolean
  widgets: boolean
  executionMode: string
  backendKind: string
  shell: string
}

export interface RecommendedCommand {
  id: string
  label: string
  command: string
  reason: string
  category: string
}

export interface WorkingDirectoryInsight {
  cwd: string
  projectType: string
  packageManager: string | null
  isGitRepo: boolean
  hasReadme: boolean
  hasEnvFile: boolean
  hasDocker: boolean
  recommendedCommands: RecommendedCommand[]
}

export interface TerminalSessionSnapshot {
  sessionId: string
  label: string | null
  sessionKind: string
  backendKind: string
  cwd: string
  createdAtMs: number
  updatedAtMs: number
  lastCommand: string | null
  lastExitCode: number | null
  lastDurationMs: number | null
  executionCount: number
  isRunning: boolean
  activeCommandId: string | null
  executionMode: string
  shell: string
}

export interface TerminalSessionEvent {
  id: string
  sessionId: string
  label: string | null
  kind: string
  timestampMs: number
  cwd: string
  command: string | null
  commandId: string | null
  exitCode: number | null
  durationMs: number | null
  message: string
}

export interface TerminalSessionCommandResult {
  result: TerminalCommandResult
  sessionSnapshot: TerminalSessionSnapshot
}

export interface TerminalSessionLiveEvent {
  sessionSnapshot: TerminalSessionSnapshot
  event: TerminalSessionEvent | null
}

export interface TerminalSessionStreamEvent {
  sessionId: string
  commandId: string | null
  chunk: string
  sequence: number
}

const hasWindow = typeof window !== 'undefined'

export function isTauriApp() {
  if (!hasWindow) {
    return false
  }

  const tauriWindow = window as Window & { __TAURI_INTERNALS__?: unknown }

  return Boolean(tauriWindow.__TAURI_INTERNALS__) || navigator.userAgent.includes('Tauri')
}

async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(command, args)
}

async function tauriGetCurrentWindow() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}

export function formatCommandDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  if (durationMs < 10000) {
    return `${(durationMs / 1000).toFixed(1)}s`
  }

  return `${Math.round(durationMs / 1000)}s`
}

export async function getDefaultWorkingDirectory() {
  if (!isTauriApp()) {
    return navigator.userAgent.includes('Windows') ? 'C:\\' : '/'
  }

  return tauriInvoke<string>('get_default_workdir')
}

export async function getAppVersion() {
  if (!isTauriApp()) {
    return '0.1.0'
  }

  try {
    return await tauriInvoke<string>('get_app_version')
  } catch {
    return '0.1.0'
  }
}

export async function getAgentCliResolutions(clis?: string[]) {
  if (!isTauriApp()) {
    return [] as AgentCliResolution[]
  }

  return tauriInvoke<AgentCliResolution[]>('get_agent_cli_resolutions', {
    clis: clis?.length ? clis : undefined,
  })
}

export async function checkAppUpdate() {
  if (!isTauriApp()) {
    return null
  }

  return tauriInvoke<AppUpdateInfo>('check_app_update')
}

export async function installAppUpdate() {
  if (!isTauriApp()) {
    throw new Error('Desktop update installation is only available in the Tauri build.')
  }

  return tauriInvoke<string>('install_app_update')
}

export async function runTerminalCommand(
  command: string,
  cwd: string,
  commandId?: string,
  timeoutSecs?: number,
) {
  if (!isTauriApp()) {
    throw new Error('Desktop command execution is only available in the Tauri build.')
  }

  return tauriInvoke<TerminalCommandResult>('run_terminal_command', {
    command,
    cwd,
    commandId: commandId || undefined,
    timeoutSecs: timeoutSecs || undefined,
  })
}

export async function cancelRunningCommand(commandId: string) {
  if (!isTauriApp()) return false
  return tauriInvoke<boolean>('cancel_running_command', { commandId })
}

export async function getGitBranch(cwd: string) {
  if (!isTauriApp()) return null
  try {
    return await tauriInvoke<string | null>('get_git_branch', { cwd })
  } catch {
    return null
  }
}

export async function listDirectoryContents(cwd: string, prefix?: string) {
  if (!isTauriApp()) return []
  try {
    return await tauriInvoke<DirectoryEntry[]>('list_directory_contents', {
      cwd,
      prefix: prefix || undefined,
    })
  } catch {
    return []
  }
}

export async function getSystemInfo() {
  if (!isTauriApp()) return null
  try {
    return await tauriInvoke<SystemInfo>('get_system_info', {})
  } catch {
    return null
  }
}

export async function getTerminalCapabilities() {
  if (!isTauriApp()) {
    return {
      desktopRuntimeAvailable: false,
      commandBlocks: true,
      workflows: false,
      safeCancellation: false,
      persistentSessions: false,
      streamingOutput: false,
      interactiveInput: false,
      sessionResize: false,
      altScreen: false,
      remoteDomains: false,
      widgets: false,
      executionMode: 'browser-fallback',
      backendKind: 'browser-fallback',
      shell: navigator.userAgent.includes('Windows') ? 'PowerShell' : 'Shell',
    } satisfies TerminalCapabilities
  }

  try {
    return await tauriInvoke<TerminalCapabilities>('get_terminal_capabilities', {})
  } catch {
    return null
  }
}

export async function inspectWorkingDirectory(cwd: string) {
  if (!isTauriApp()) {
    return null
  }

  try {
    return await tauriInvoke<WorkingDirectoryInsight>('inspect_working_directory', { cwd })
  } catch {
    return null
  }
}

export async function ensureTerminalSession(
  sessionId: string,
  cwd: string,
  label?: string,
  sessionKind?: string,
) {
  if (!isTauriApp()) {
    const now = Date.now()
    return {
      sessionId,
      label: label || null,
      sessionKind: sessionKind || 'local',
      backendKind: 'browser-fallback',
      cwd,
      createdAtMs: now,
      updatedAtMs: now,
      lastCommand: null,
      lastExitCode: null,
      lastDurationMs: null,
      executionCount: 0,
      isRunning: false,
      activeCommandId: null,
      executionMode: 'browser-fallback',
      shell: navigator.userAgent.includes('Windows') ? 'PowerShell' : 'Shell',
    } satisfies TerminalSessionSnapshot
  }

  return tauriInvoke<TerminalSessionSnapshot>('ensure_terminal_session', {
    sessionId,
    cwd,
    label: label || undefined,
    sessionKind: sessionKind || undefined,
  })
}

export async function getTerminalSessionSnapshot(sessionId: string) {
  if (!isTauriApp()) {
    return null
  }

  try {
    return await tauriInvoke<TerminalSessionSnapshot | null>('get_terminal_session_snapshot', { sessionId })
  } catch {
    return null
  }
}

export async function getTerminalSessionEvents(sessionId: string, limit?: number) {
  if (!isTauriApp()) {
    return [] as TerminalSessionEvent[]
  }

  try {
    return await tauriInvoke<TerminalSessionEvent[]>('get_terminal_session_events', {
      sessionId,
      limit: limit || undefined,
    })
  } catch {
    return [] as TerminalSessionEvent[]
  }
}

export async function listenToTerminalSessionLiveEvents(
  onEvent: (payload: TerminalSessionLiveEvent) => void,
) {
  if (!isTauriApp()) {
    return () => {}
  }

  const { listen } = await import('@tauri-apps/api/event')
  return listen<TerminalSessionLiveEvent>('terminal-session-live', (event) => {
    onEvent(event.payload)
  })
}

export async function listenToTerminalSessionStreamEvents(
  onEvent: (payload: TerminalSessionStreamEvent) => void,
) {
  if (!isTauriApp()) {
    return () => {}
  }

  const { listen } = await import('@tauri-apps/api/event')
  return listen<TerminalSessionStreamEvent>('terminal-session-stream', (event) => {
    onEvent(event.payload)
  })
}

export async function listTerminalSessions() {
  if (!isTauriApp()) {
    return [] as TerminalSessionSnapshot[]
  }

  try {
    return await tauriInvoke<TerminalSessionSnapshot[]>('list_terminal_sessions', {})
  } catch {
    return [] as TerminalSessionSnapshot[]
  }
}

export async function runTerminalSessionCommand(
  sessionId: string,
  command: string,
  cwd: string,
  label?: string,
  sessionKind?: string,
  commandId?: string,
  timeoutSecs?: number,
) {
  if (!isTauriApp()) {
    throw new Error('Desktop session execution is only available in the Tauri build.')
  }

  return tauriInvoke<TerminalSessionCommandResult>('run_terminal_session_command', {
    sessionId,
    command,
    cwd,
    label: label || undefined,
    sessionKind: sessionKind || undefined,
    commandId: commandId || undefined,
    timeoutSecs: timeoutSecs || undefined,
  })
}

export async function closeTerminalSession(sessionId: string) {
  if (!isTauriApp()) {
    return false
  }

  try {
    return await tauriInvoke<boolean>('close_terminal_session', { sessionId })
  } catch {
    return false
  }
}

export async function startPtyStream(sessionId: string) {
  if (!isTauriApp()) {
    return false
  }

  try {
    return await tauriInvoke<boolean>('start_pty_stream', { sessionId })
  } catch {
    return false
  }
}

export async function writeTerminalSessionInput(sessionId: string, input: string) {
  if (!isTauriApp()) {
    return false
  }

  try {
    return await tauriInvoke<boolean>('write_terminal_session_input', {
      sessionId,
      input,
    })
  } catch {
    return false
  }
}

export async function resizeTerminalSession(sessionId: string, cols: number, rows: number) {
  if (!isTauriApp()) {
    return false
  }

  try {
    return await tauriInvoke<boolean>('resize_terminal_session', {
      sessionId,
      cols,
      rows,
    })
  } catch {
    return false
  }
}

export async function minimizeDesktopWindow() {
  if (!isTauriApp()) {
    return
  }

  const appWindow = await tauriGetCurrentWindow()
  await appWindow.minimize()
}

export async function toggleDesktopWindowMaximize() {
  if (!isTauriApp()) {
    return
  }

  const appWindow = await tauriGetCurrentWindow()
  const maximized = await appWindow.isMaximized()

  if (maximized) {
    await appWindow.unmaximize()
    return
  }

  await appWindow.maximize()
}

export async function toggleDesktopWindowFullscreen() {
  if (!isTauriApp()) {
    return false
  }

  const appWindow = await tauriGetCurrentWindow()
  const fullscreen = await appWindow.isFullscreen()
  await appWindow.setFullscreen(!fullscreen)
  return !fullscreen
}

export async function isDesktopWindowFullscreen() {
  if (!isTauriApp()) {
    return false
  }

  const appWindow = await tauriGetCurrentWindow()
  return appWindow.isFullscreen()
}

export async function closeDesktopWindow() {
  if (!isTauriApp()) {
    return
  }

  const appWindow = await tauriGetCurrentWindow()
  await appWindow.close()
}

export async function openFolderDialog(defaultPath?: string): Promise<string | null> {
  if (!isTauriApp()) {
    return null
  }

  try {
    const result = await tauriInvoke<string | string[] | null>('plugin:dialog|open', {
      options: {
        directory: true,
        multiple: false,
        defaultPath: defaultPath || undefined,
      },
    })
    return Array.isArray(result) ? (result[0] ?? null) : result
  } catch {
    return null
  }
}
