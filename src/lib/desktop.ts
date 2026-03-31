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

export interface DroppedFileResult {
  path: string
  escapedPath: string
  isImage: boolean
  isDir: boolean
  fileName: string
  iterm2Sequence: string | null
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

// ── Browser Pane Management (native WebView2) ──

export interface BrowserPaneInfo {
  id: string
  url: string
  x: number
  y: number
  width: number
  height: number
}

export async function browserCreatePane(
  paneId: string,
  url: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<BrowserPaneInfo | null> {
  if (!isTauriApp()) return null
  try {
    return await tauriInvoke<BrowserPaneInfo>('browser_create_pane', { paneId, url, x, y, width, height })
  } catch (e) {
    console.error('Failed to create browser pane:', e)
    return null
  }
}

export async function browserClosePane(paneId: string): Promise<boolean> {
  if (!isTauriApp()) return false
  try {
    await tauriInvoke<void>('browser_close_pane', { paneId })
    return true
  } catch {
    return false
  }
}

export async function browserNavigatePane(paneId: string, url: string): Promise<BrowserPaneInfo | null> {
  if (!isTauriApp()) return null
  try {
    return await tauriInvoke<BrowserPaneInfo>('browser_navigate_pane', { paneId, url })
  } catch (e) {
    console.error('Failed to navigate browser pane:', e)
    return null
  }
}

export async function browserResizePane(
  paneId: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<boolean> {
  if (!isTauriApp()) return false
  try {
    await tauriInvoke<void>('browser_resize_pane', { paneId, url: undefined, x, y, width, height })
    return true
  } catch {
    return false
  }
}

export async function browserListPanes(): Promise<BrowserPaneInfo[]> {
  if (!isTauriApp()) return []
  try {
    return await tauriInvoke<BrowserPaneInfo[]>('browser_list_panes')
  } catch {
    return []
  }
}

export async function browserSetVisible(paneId: string, visible: boolean): Promise<void> {
  if (!isTauriApp()) return
  try {
    await tauriInvoke<void>('browser_set_visible', { paneId, visible })
  } catch (e) {
    console.error('Failed to set visibility:', e)
  }
}

export async function browserToggleDevtools(paneId: string): Promise<boolean> {
  if (!isTauriApp()) return false
  try {
    return await tauriInvoke<boolean>('browser_toggle_devtools', { paneId })
  } catch (e) {
    console.error('Failed to toggle devtools:', e)
    return false
  }
}

export interface GitStatusEntry {
  path: string
  status: string
  staged: boolean
}

export interface GitLogEntry {
  hash: string
  short_hash: string
  author: string
  date: string
  message: string
}

export interface GitInfo {
  branch: string
  entries: GitStatusEntry[]
  ahead: number
  behind: number
  is_repo: boolean
}

export async function getGitStatus(cwd: string): Promise<GitInfo> {
  if (!isTauriApp()) return { branch: '', entries: [], ahead: 0, behind: 0, is_repo: false }
  try { return await tauriInvoke<GitInfo>('get_git_status', { cwd }) } catch { return { branch: '', entries: [], ahead: 0, behind: 0, is_repo: false } }
}

export async function getGitLog(cwd: string, count?: number): Promise<GitLogEntry[]> {
  if (!isTauriApp()) return []
  try { return await tauriInvoke<GitLogEntry[]>('get_git_log', { cwd, count: count ?? 30 }) } catch { return [] }
}

export async function getGitDiff(cwd: string, filePath?: string, staged?: boolean): Promise<string> {
  if (!isTauriApp()) return ''
  try { return await tauriInvoke<string>('get_git_diff', { cwd, filePath, staged }) } catch { return '' }
}

export async function gitStageFile(cwd: string, filePath: string): Promise<void> {
  if (!isTauriApp()) return
  await tauriInvoke<void>('git_stage_file', { cwd, filePath })
}

export async function gitUnstageFile(cwd: string, filePath: string): Promise<void> {
  if (!isTauriApp()) return
  await tauriInvoke<void>('git_unstage_file', { cwd, filePath })
}

export async function gitCommit(cwd: string, message: string): Promise<string> {
  if (!isTauriApp()) return ''
  return await tauriInvoke<string>('git_commit', { cwd, message })
}

export interface SSHConnection {
  id: string
  name: string
  host: string
  port: number
  username: string
  auth_method: 'password' | 'key'
  key_path?: string
}

export async function testSSHConnection(host: string, port: number, username: string): Promise<boolean> {
  if (!isTauriApp()) return false
  try { return await tauriInvoke<boolean>('test_ssh_connection', { host, port, username }) } catch { return false }
}

export async function getSSHBootstrapCommand(host: string, port: number, username: string, keyPath?: string): Promise<string> {
  if (!isTauriApp()) return ''
  try { return await tauriInvoke<string>('get_ssh_bootstrap_command', { host, port, username, keyPath }) } catch { return '' }
}

export interface FileContentResult {
  content: string
  path: string
  size: number
  is_binary: boolean
}

export interface TreeEntry {
  name: string
  path: string
  is_dir: boolean
  depth: number
  size: number
  children_count: number
}

export async function readFileContent(path: string): Promise<FileContentResult> {
  if (!isTauriApp()) return { content: '', path, size: 0, is_binary: false }
  return await tauriInvoke<FileContentResult>('read_file_content', { path })
}

export async function writeFileContent(path: string, content: string): Promise<void> {
  if (!isTauriApp()) return
  await tauriInvoke<void>('write_file_content', { path, content })
}

export interface EnvVarEntry {
  key: string
  value: string
  comment?: string
}

export async function readEnvFile(path: string): Promise<EnvVarEntry[]> {
  if (!isTauriApp()) return []
  try {
    return await tauriInvoke<EnvVarEntry[]>('read_env_file', { path })
  } catch {
    return []
  }
}

export async function writeEnvFile(path: string, vars: EnvVarEntry[]): Promise<void> {
  if (!isTauriApp()) return
  await tauriInvoke<void>('write_env_file', { path, vars })
}

export interface LanguageStat {
  language: string
  extension: string
  file_count: number
  line_count: number
  color: string
}

export interface FileStat {
  path: string
  name: string
  size: number
  line_count: number
  modified: number
  language: string
}

export interface CodebaseStats {
  root: string
  total_files: number
  total_lines: number
  total_size: number
  by_language: LanguageStat[]
  largest_files: FileStat[]
  recently_modified: FileStat[]
}

export async function indexCodebase(root: string, maxDepth?: number): Promise<CodebaseStats | null> {
  if (!isTauriApp()) return null
  try {
    return await tauriInvoke<CodebaseStats>('index_codebase', { root, maxDepth: maxDepth ?? 6 })
  } catch {
    return null
  }
}

export function getAssetUrl(filePath: string): string {
  if (!isTauriApp()) return ''
  try {
    // Tauri v2 asset protocol
    const normalized = filePath.replace(/\\/g, '/')
    return `asset://localhost/${encodeURIComponent(normalized)}`
  } catch {
    return ''
  }
}

export interface ProcessInfo {
  pid: number
  name: string
  cpu_usage: number
  memory_mb: number
}

export interface SystemStats {
  cpu_usage: number
  cpu_count: number
  memory_used_mb: number
  memory_total_mb: number
  memory_percent: number
  swap_used_mb: number
  swap_total_mb: number
  disk_used_gb: number
  disk_total_gb: number
  disk_percent: number
  uptime_secs: number
  top_processes: ProcessInfo[]
}

export interface PortEntry {
  port: number
  protocol: string
  state: string
  pid: number | null
  process_name: string | null
  local_address: string
}

export async function getSystemStats(): Promise<SystemStats | null> {
  if (!isTauriApp()) return null
  try {
    return await tauriInvoke<SystemStats>('get_system_stats')
  } catch {
    return null
  }
}

export async function scanActivePorts(): Promise<PortEntry[]> {
  if (!isTauriApp()) return []
  try {
    return await tauriInvoke<PortEntry[]>('scan_active_ports')
  } catch {
    return []
  }
}

export async function killProcessByPid(pid: number): Promise<string> {
  if (!isTauriApp()) return 'Not running in Tauri'
  return await tauriInvoke<string>('kill_process_by_pid', { pid })
}

export async function getDirectoryTree(root: string, maxDepth?: number): Promise<TreeEntry[]> {
  if (!isTauriApp()) return []
  try {
    return await tauriInvoke<TreeEntry[]>('get_directory_tree', { root, maxDepth: maxDepth ?? 3 })
  } catch {
    return []
  }
}

export interface AIChatCompletionRequest {
  provider: string
  api_key: string
  model: string
  endpoint?: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
}

export interface AIChatCompletionResponse {
  content: string
  model: string
  provider: string
  tokens_used: number
}

export async function aiChatCompletion(request: AIChatCompletionRequest): Promise<AIChatCompletionResponse> {
  if (!isTauriApp()) {
    return { content: 'AI is only available in the desktop app.', model: '', provider: '', tokens_used: 0 }
  }
  return await tauriInvoke<AIChatCompletionResponse>('ai_chat_completion', { request })
}

export async function sendDesktopNotification(title: string, body: string): Promise<void> {
  if (!isTauriApp()) return
  try {
    const { sendNotification, isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted) {
      const permission = await requestPermission()
      granted = permission === 'granted'
    }
    if (granted) {
      sendNotification({ title, body })
    }
  } catch (e) {
    console.error('Notification error:', e)
  }
}

export async function handleDroppedFiles(paths: string[]): Promise<DroppedFileResult[]> {
  if (!isTauriApp()) {
    return []
  }

  try {
    return await tauriInvoke<DroppedFileResult[]>('handle_dropped_files', { paths })
  } catch {
    return []
  }
}
