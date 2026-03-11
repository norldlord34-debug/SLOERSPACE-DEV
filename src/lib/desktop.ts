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
