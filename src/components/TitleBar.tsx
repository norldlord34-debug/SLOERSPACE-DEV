'use client'

type SpeechResultEvent = { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> }
type SpeechErrorEvent = { error: string }
type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((e: SpeechResultEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance
type SpeechAPIWindow = Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }

import Image from 'next/image'
import { closeDesktopWindow, getDefaultWorkingDirectory, getTerminalCapabilities, isTauriApp, minimizeDesktopWindow, runTerminalCommand, toggleDesktopWindowMaximize } from '@/lib/desktop'
import { useStore, TerminalShellKind, WhisperLanguage } from '@/store/useStore'
import { Settings, Minus, Square, X, Plus, PanelLeft, Search, ChevronDown, Loader2, Mic, Sparkles, MessageSquarePlus, Pencil, Palette } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/Toast'

const VIEW_LABELS = {
  home: 'Overview',
  terminal: 'Terminal Grid',
  canvas: 'SloerCanvas',
  kanban: 'Delivery Board',
  agents: 'Agent Library',
  prompts: 'Prompt System',
  settings: 'Executive Settings',
  'workspace-wizard': 'Workspace Launchpad',
  'canvas-wizard': 'Canvas Launchpad',
  'swarm-launch': 'Swarm Launchpad',
  'swarm-dashboard': 'Swarm Command',
  'browser': 'Browser',
  'editor': 'Code Editor',
  'notebook': 'Notebook',
  'ssh': 'SSH Manager',
  'env': 'Env Var Manager',
  'preview': 'Preview Panel',
  'sessions': 'Session Sharing',
  'file-preview': 'File Preview',
  'history': 'Command History',
  'codebase': 'Codebase Indexer',
  'system': 'System Monitor',
  'ports': 'Port Manager',
  'snippets': 'Snippet Manager',
  'login': 'Sign In',
}

type QuickShellOption = {
  id: Exclude<TerminalShellKind, 'auto'>
  label: string
  description: string
  available: boolean
  bootstrapCommand: string | null
}

const DEFAULT_QUICK_SHELL_OPTIONS: QuickShellOption[] = [
  {
    id: 'powershell',
    label: 'PowerShell',
    description: 'Windows shell',
    available: true,
    bootstrapCommand: null,
  },
  {
    id: 'command-prompt',
    label: 'CMD',
    description: 'Classic Windows shell',
    available: true,
    bootstrapCommand: 'cmd',
  },
  {
    id: 'git-bash',
    label: 'Git Bash',
    description: 'Git shell if detected',
    available: false,
    bootstrapCommand: null,
  },
]

function getGitBashBootstrap(stdout: string) {
  const matches = stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const gitBashPath = matches.find((entry) => entry.toLowerCase().includes('git') && entry.toLowerCase().endsWith('bash.exe'))
  if (!gitBashPath) {
    return null
  }

  return `"${gitBashPath}" --login -i`
}

const TAB_COLORS = [
  '#4f8cff', '#38dd92', '#f7a94c', '#ff6f96', '#a78bfa',
  '#e8956a', '#06b6d4', '#84cc16', '#58a6ff', '#f472b6',
]

const NUM_BARS = 12

const LANG_BCP47: Record<WhisperLanguage, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  zh: 'zh-CN',
}

export function TitleBar({ onNavToggle, onCommandPalette, onAIChatToggle }: { onNavToggle: () => void; onCommandPalette?: () => void; onAIChatToggle?: () => void }) {
  const {
    workspaceTabs, activeTabId, setActiveTab, removeWorkspaceTab, updateWorkspaceTab,
    setView, currentView, setWizardStep, launchQuickShellWorkspace,
    siulkVoice, setSiulkVoiceRecording, setSiulkVoiceProcessing,
    setSiulkVoiceLastTranscript, primeTerminalCommand,
  } = useStore()
  const { addToast } = useToast()
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const pttKeyRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [barHeights, setBarHeights] = useState<number[]>(Array(NUM_BARS).fill(0))
  const [showQuickShellMenu, setShowQuickShellMenu] = useState(false)
  const [isDetectingShells, setIsDetectingShells] = useState(false)
  const [quickShellOptions, setQuickShellOptions] = useState(DEFAULT_QUICK_SHELL_OPTIONS)

  const [ctxMenu, setCtxMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState<{ tabId: string; value: string } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const openCtxMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault(); e.stopPropagation()
    setCtxMenu({ tabId, x: e.clientX, y: e.clientY })
  }, [])

  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])

  const startRename = useCallback((tabId: string, currentName: string) => {
    setRenaming({ tabId, value: currentName })
    setCtxMenu(null)
    setTimeout(() => renameInputRef.current?.select(), 40)
  }, [])

  const commitRename = useCallback(() => {
    if (renaming && renaming.value.trim()) {
      updateWorkspaceTab(renaming.tabId, { name: renaming.value.trim() })
    }
    setRenaming(null)
  }, [renaming, updateWorkspaceTab])
  const activeWorkspace = workspaceTabs.find((tab) => tab.id === activeTabId) ?? null

  const detectQuickShellOptions = useCallback(async () => {
    if (!isTauriApp()) {
      setQuickShellOptions(DEFAULT_QUICK_SHELL_OPTIONS)
      return
    }

    setIsDetectingShells(true)

    try {
      const cwd = activeWorkspace?.workingDirectory || await getDefaultWorkingDirectory()
      const capabilities = await getTerminalCapabilities().catch(() => null)
      const currentShell = capabilities?.shell?.toLowerCase() ?? ''
      const [pwshResult, powershellResult, bashResult] = await Promise.allSettled([
        runTerminalCommand('where.exe pwsh.exe', cwd, undefined, 8),
        runTerminalCommand('where.exe powershell.exe', cwd, undefined, 8),
        runTerminalCommand('where.exe bash.exe', cwd, undefined, 8),
      ])

      const hasPwsh = pwshResult.status === 'fulfilled' && pwshResult.value.exitCode === 0
      const hasWindowsPowerShell = powershellResult.status === 'fulfilled' && powershellResult.value.exitCode === 0
      const gitBashBootstrap = bashResult.status === 'fulfilled' && bashResult.value.exitCode === 0
        ? getGitBashBootstrap(bashResult.value.stdout)
        : null

      setQuickShellOptions([
        {
          id: 'powershell',
          label: 'PowerShell',
          description: 'Windows shell',
          available: hasPwsh || hasWindowsPowerShell || currentShell.includes('powershell'),
          bootstrapCommand: currentShell.includes('powershell') ? null : hasPwsh ? 'pwsh' : hasWindowsPowerShell ? 'powershell' : null,
        },
        {
          id: 'command-prompt',
          label: 'CMD',
          description: 'Classic Windows shell',
          available: true,
          bootstrapCommand: currentShell.includes('command prompt') || currentShell.includes('cmd') ? null : 'cmd',
        },
        {
          id: 'git-bash',
          label: 'Git Bash',
          description: gitBashBootstrap ? 'Git shell' : 'Not detected on this system',
          available: Boolean(gitBashBootstrap),
          bootstrapCommand: gitBashBootstrap,
        },
      ])
    } catch {
      setQuickShellOptions(DEFAULT_QUICK_SHELL_OPTIONS)
    } finally {
      setIsDetectingShells(false)
    }
  }, [activeWorkspace?.workingDirectory])

  useEffect(() => {
    if (!showQuickShellMenu) {
      return
    }

    void detectQuickShellOptions()
  }, [detectQuickShellOptions, showQuickShellMenu])

  const handleQuickShellLaunch = useCallback(async (option: QuickShellOption) => {
    if (!option.available) {
      addToast(`${option.label} is not available on this system.`, 'warning')
      return
    }

    const workingDirectory = activeWorkspace?.workingDirectory || await getDefaultWorkingDirectory()
    launchQuickShellWorkspace({
      workingDirectory,
      shellKind: option.id,
      shellBootstrapCommand: option.bootstrapCommand,
    })
    setShowQuickShellMenu(false)
    addToast(`${option.label} workspace opened.`, 'success', 2600)
  }, [activeWorkspace?.workingDirectory, addToast, launchQuickShellWorkspace])

  // ── Audio Analyser (voice-sync waveform) ─────────────────────────────
  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      micStreamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      analyserRef.current = analyser
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(data)
        const heights: number[] = []
        for (let i = 0; i < NUM_BARS; i++) {
          const lo = 1 + Math.floor(i * 30 / NUM_BARS)
          const hi = 1 + Math.floor((i + 1) * 30 / NUM_BARS)
          let sum = 0, count = 0
          for (let b = lo; b <= hi; b++) { sum += data[b]; count++ }
          heights.push(count > 0 ? (sum / count) / 255 : 0)
        }
        setBarHeights(heights)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      // getUserMedia denied — bars stay flat, recording continues via SpeechRecognition
    }
  }, [])

  const stopAudioAnalysis = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null }
    if (audioCtxRef.current) { void audioCtxRef.current.close(); audioCtxRef.current = null }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null }
    setBarHeights(Array(NUM_BARS).fill(0))
  }, [])

  // ── Voice Engine ───────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!siulkVoice.enabled) return
    if (recognitionRef.current) return // already recording

    const SpeechRecognitionAPI: SpeechRecognitionCtor | undefined =
      (window as SpeechAPIWindow).SpeechRecognition ||
      (window as SpeechAPIWindow).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      addToast('Speech recognition not available. Enable microphone permissions.', 'error', 4000)
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = LANG_BCP47[siulkVoice.whisperLanguage ?? 'en']
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setSiulkVoiceRecording(true)
      setSiulkVoiceProcessing(false)
    }

    recognition.onresult = (event) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        }
      }
      if (final.trim()) {
        setSiulkVoiceLastTranscript(final.trim())
        primeTerminalCommand(final.trim())
        addToast(`✦ ${final.trim()}`, 'success', 4000)
      }
    }

    recognition.onerror = (event) => {
      const msg = event.error === 'not-allowed'
        ? 'Microphone access denied. Check browser/OS permissions.'
        : event.error === 'no-speech'
        ? 'No speech detected.'
        : `Voice error: ${event.error}`
      addToast(msg, 'error', 4000)
      setSiulkVoiceRecording(false)
      setSiulkVoiceProcessing(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setSiulkVoiceRecording(false)
      setSiulkVoiceProcessing(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    void startAudioAnalysis()
    addToast('🎙 SiulkVoice listening…', 'info', 1800)
  }, [siulkVoice.enabled, siulkVoice.whisperLanguage, setSiulkVoiceRecording, setSiulkVoiceProcessing, setSiulkVoiceLastTranscript, primeTerminalCommand, addToast, startAudioAnalysis])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    pttKeyRef.current = null
    stopAudioAnalysis()
    setSiulkVoiceRecording(false)
    setSiulkVoiceProcessing(false)
    addToast('SiulkVoice stopped.', 'info', 1600)
  }, [setSiulkVoiceRecording, setSiulkVoiceProcessing, addToast, stopAudioAnalysis])

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    if (!siulkVoice.enabled) return

    const buildCombo = (e: KeyboardEvent): string => {
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Meta')
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
      }
      return parts.join('+')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const combo = buildCombo(e)

      // Push-to-Talk — start on press
      if (siulkVoice.pushToTalkKey && combo === siulkVoice.pushToTalkKey && !pttKeyRef.current) {
        e.preventDefault()
        pttKeyRef.current = e.key
        startRecording()
        return
      }

      // Toggle Recording — flip on press
      if (siulkVoice.toggleRecordingKey && combo === siulkVoice.toggleRecordingKey) {
        e.preventDefault()
        if (recognitionRef.current) {
          stopRecording()
        } else {
          startRecording()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Push-to-Talk — stop on release of the triggering key
      if (pttKeyRef.current && e.key === pttKeyRef.current) {
        stopRecording()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [siulkVoice.enabled, siulkVoice.pushToTalkKey, siulkVoice.toggleRecordingKey, startRecording, stopRecording])

  return (
    <div
      className="flex h-[60px] items-center select-none relative z-50 shrink-0 px-3 md:px-4 liquid-glass-heavy"
      style={{ borderBottom: '1px solid var(--border)', borderRadius: 0 }}
    >
      <div className="flex h-full shrink-0 items-center gap-2">
        <button onClick={onNavToggle} className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-secondary)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] lg:hidden">
          <PanelLeft size={15} />
        </button>

        <div className="premium-panel flex items-center gap-2.5 rounded-[18px] px-2.5 py-1.5">
          <div className="relative h-8 w-8 overflow-hidden rounded-[14px] ring-1 ring-white/10">
            <Image src="/LOGO.png" alt="SloerSpace" width={32} height={32} className="h-full w-full object-contain" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)]" />
          </div>
          <div>
            <div className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>SloerSpace Dev</div>
            <div className="text-[12px] font-semibold leading-none" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {VIEW_LABELS[currentView]}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-1 items-center gap-2 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" data-tauri-drag-region>
          {workspaceTabs.map((tab) => {
            const isActive = tab.id === activeTabId
            const isRenaming = renaming?.tabId === tab.id
            return (
              <div
                key={tab.id}
                className={`relative flex h-9 cursor-pointer items-center gap-2 rounded-[16px] border px-3 text-[10px] transition-all group ${
                  isActive
                    ? 'text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${tab.color}38, ${tab.color}20)`
                    : `${tab.color}10`,
                  borderColor: isActive ? `${tab.color}55` : `${tab.color}25`,
                  boxShadow: isActive ? `0 8px 24px ${tab.color}25, inset 0 1px 0 rgba(255,255,255,0.05)` : 'none',
                }}
                onClick={() => { if (!isRenaming) { setActiveTab(tab.id); setView(tab.view) } }}
                onContextMenu={(e) => openCtxMenu(e, tab.id)}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full transition-all"
                  style={{
                    backgroundColor: tab.color,
                    boxShadow: isActive ? `0 0 8px ${tab.color}cc` : 'none',
                    opacity: isActive ? 1 : 0.65,
                  }}
                />
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renaming!.value}
                    onChange={(e) => setRenaming({ tabId: tab.id, value: e.target.value })}
                    onBlur={commitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null) }}
                    className="max-w-[100px] bg-transparent outline-none font-semibold text-[10px] border-b border-[var(--accent)]"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="max-w-[110px] truncate font-semibold">{tab.name}</span>
                )}
                {tab.paneCount > 1 && (
                  <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 text-[8px] font-mono leading-none text-[var(--text-muted)]">
                    {tab.paneCount}
                  </span>
                )}
                <button
                  className="ml-0.5 rounded-lg p-1 opacity-0 transition-all hover:bg-[var(--error)]/10 hover:text-[var(--error)] group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); removeWorkspaceTab(tab.id) }}
                >
                  <X size={10} />
                </button>
                {isActive && (
                  <div className="absolute inset-x-5 bottom-0 h-px rounded-full gradient-accent opacity-90" />
                )}
              </div>
            )
          })}

          {workspaceTabs.length === 0 && (
            <div className="rounded-full border px-3 py-1.5 text-[10px] font-semibold" style={{ borderColor: 'var(--border)', background: 'rgba(10,17,28,0.58)', color: 'var(--text-muted)' }} data-tauri-drag-region>
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--warning)' }} />
              No active workspaces
            </div>
          )}
        </div>

        <div className="relative flex shrink-0 items-center">
          <div className="flex h-9 items-center overflow-hidden rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)]">
            <button
              className="flex h-full w-9 items-center justify-center text-[var(--text-muted)] transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
              onClick={() => { setWizardStep(1); setView('workspace-wizard') }}
              title="New workspace"
            >
              <Plus size={13} strokeWidth={2.5} />
            </button>
            <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
            <button
              className="flex h-full w-8 items-center justify-center text-[var(--text-muted)] transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
              onClick={() => setShowQuickShellMenu((current) => !current)}
              title="Open shell workspace"
            >
              {isDetectingShells ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
            </button>
          </div>
          {showQuickShellMenu && (
            <>
              <div className="fixed inset-0 z-[98]" onClick={() => setShowQuickShellMenu(false)} />
              <div
                className="absolute right-0 top-[44px] z-[99] w-[248px] rounded-[20px] border border-[var(--border)] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
                style={{ background: 'linear-gradient(180deg, rgba(8,13,22,0.98), rgba(6,10,18,0.96))' }}
              >
                <div className="px-2.5 pb-1.5 pt-1">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>Open shell workspace</div>
                </div>
                <div className="grid gap-1">
                  {quickShellOptions.map((option) => {
                    const statusLabel = option.available ? 'Ready' : 'Unavailable'

                    return (
                      <button
                        key={option.id}
                        onClick={() => { void handleQuickShellLaunch(option) }}
                        disabled={isDetectingShells || !option.available}
                        className="w-full rounded-[16px] border px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed"
                        style={{
                          borderColor: option.available ? 'rgba(79,140,255,0.14)' : 'rgba(255,255,255,0.06)',
                          background: option.available ? 'rgba(10,17,28,0.82)' : 'rgba(255,255,255,0.025)',
                          opacity: isDetectingShells || !option.available ? 0.58 : 1,
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{option.label}</div>
                            <div className="mt-0.5 truncate text-[9px]" style={{ color: 'var(--text-muted)' }}>{option.description}</div>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em]"
                            style={{
                              color: option.available ? 'var(--accent)' : 'var(--text-muted)',
                              background: option.available ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: option.available ? 'var(--accent)' : 'var(--text-muted)' }} />
                            {statusLabel}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab right-click context menu */}
      {ctxMenu && (() => {
        const tab = workspaceTabs.find((t) => t.id === ctxMenu.tabId)
        if (!tab) return null
        return (
          <>
            <div className="fixed inset-0 z-[199]" onClick={closeCtxMenu} onContextMenu={(e) => { e.preventDefault(); closeCtxMenu() }} />
            <div
              className="fixed z-[200] w-[210px] rounded-2xl border p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.52)]"
              style={{
                left: Math.min(ctxMenu.x, window.innerWidth - 220),
                top: Math.min(ctxMenu.y, window.innerHeight - 240),
                background: 'linear-gradient(180deg,rgba(8,13,22,0.98),rgba(6,10,18,0.96))',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Rename */}
              <button
                onClick={() => startRename(tab.id, tab.name)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-medium transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                style={{ color: 'var(--text-primary)' }}
              >
                <Pencil size={13} style={{ color: 'var(--text-muted)' }} /> Rename
              </button>

              {/* Change Color */}
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Palette size={13} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Change Color</span>
                  <span className="ml-auto w-3 h-3 rounded-full shrink-0" style={{ background: tab.color }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TAB_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { updateWorkspaceTab(tab.id, { color: c }); closeCtxMenu() }}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-125 ring-2"
                      style={{ background: c, boxShadow: tab.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none' }}
                    />
                  ))}
                </div>
              </div>

              <div className="my-1 h-px mx-2" style={{ background: 'rgba(255,255,255,0.07)' }} />

              {/* Close Tab */}
              <button
                onClick={() => { removeWorkspaceTab(tab.id); closeCtxMenu() }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[11px] font-medium transition-colors hover:bg-[rgba(255,71,87,0.12)]"
                style={{ color: 'var(--error)' }}
              >
                <X size={13} style={{ color: 'var(--error)' }} /> Close Tab
              </button>
            </div>
          </>
        )
      })()}

      <div className="flex shrink-0 items-center gap-1.5">
        {siulkVoice.enabled && (
          <button
            className={`hidden md:flex h-9 items-center gap-2 rounded-full border px-3.5 text-[10px] font-semibold transition-all duration-300 ${siulkVoice.isRecording ? 'siulk-recording' : ''}`}
            style={{
              background: siulkVoice.isRecording
                ? 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.10))'
                : 'linear-gradient(135deg, rgba(79,140,255,0.14), rgba(40,231,197,0.08))',
              borderColor: siulkVoice.isRecording ? 'rgba(239,68,68,0.5)' : 'rgba(163,209,255,0.18)',
              color: siulkVoice.isRecording ? 'rgba(239,68,68,0.9)' : 'var(--text-secondary)',
            }}
            onClick={() => {
              if (siulkVoice.isRecording) {
                stopRecording()
              } else {
                startRecording()
              }
            }}
            title="SiulkVoice — Click to toggle recording"
          >
            {siulkVoice.isRecording ? (
              <span className="flex items-end gap-[2px]" style={{ height: '18px', overflow: 'hidden', minWidth: '38px' }}>
                {barHeights.map((level, i) => {
                  const minH = 2, maxH = 18
                  const h = Math.round(minH + level * (maxH - minH))
                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        width: '2px',
                        height: `${Math.max(minH, h)}px`,
                        borderRadius: '2px',
                        background: 'rgba(239,68,68,0.88)',
                        transition: 'height 0.06s ease',
                      }}
                    />
                  )
                })}
              </span>
            ) : (
              <Mic size={12} />
            )}
            <span className="tracking-wider uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '9px', letterSpacing: '0.12em' }}>SiulkVoice</span>
            <Sparkles size={10} style={{ color: siulkVoice.isRecording ? 'rgba(239,68,68,0.75)' : 'var(--accent)' }} />
          </button>
        )}

        <button
          className="hidden md:flex h-9 items-center gap-2 rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-3 text-[10px] text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          onClick={onCommandPalette}
          title="Command Palette (Ctrl+K)"
        >
          <Search size={12} />
          <span className="hidden lg:inline">Search</span>
          <span className="premium-kbd ml-1 text-[8px]">Ctrl+K</span>
        </button>

        {onAIChatToggle && (
          <button
            className="flex h-9 items-center gap-1.5 rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-2.5 text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={onAIChatToggle}
            title="AI Chat (Ctrl+J)"
          >
            <MessageSquarePlus size={14} />
            <span className="hidden lg:inline text-[9px] font-medium">AI</span>
          </button>
        )}

        <button
          className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[rgba(10,17,28,0.76)] text-[var(--text-muted)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          onClick={() => setView('settings')}
          title="Settings"
        >
          <Settings size={14} />
        </button>

        <div className="relative z-[100] flex items-center gap-1 rounded-[18px] border border-[var(--border)] bg-[rgba(9,15,24,0.7)] p-1" style={{ pointerEvents: 'auto' }}>
          <button
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)]"
            onClick={(e) => { e.stopPropagation(); void minimizeDesktopWindow() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Minimize"
          >
            <Minus size={12} />
          </button>
          <button
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)]"
            onClick={(e) => { e.stopPropagation(); void toggleDesktopWindowMaximize() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Maximize or restore"
          >
            <Square size={10} />
          </button>
          <button
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[10px] text-[var(--text-muted)] transition-colors hover:bg-[rgba(255,71,87,0.15)] hover:text-[var(--error)]"
            onClick={(e) => { e.stopPropagation(); void closeDesktopWindow() }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
