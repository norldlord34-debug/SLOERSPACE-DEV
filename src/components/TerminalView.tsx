'use client'

import { formatCommandDuration, runTerminalCommand, openFolderDialog, cancelRunningCommand, getGitBranch } from '@/lib/desktop'
import { useStore, CommandBlock, TerminalPane, generateId } from '@/store/useStore'
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronDown, ChevronRight, Clock,
  Bot, Circle, LayoutGrid, Copy, Trash2,
  Check, Terminal, Activity, Zap, Hash, ArrowUp, CornerDownLeft,
  Maximize2, Minimize2, Columns2, Square, Grid2x2,
  ChevronLeft, Search, Sparkles, FolderOpen,
  FileDown, ZoomIn, ZoomOut, X, StopCircle,
  GitBranch, Lock,
  Clipboard
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────── */

type ViewMode = 'focus' | 'split' | 'quad' | 'grid'

interface AnsiSpan { text: string; style: React.CSSProperties }

/* ── Helpers ─────────────────────────────────────────────────── */

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown command error'
}

function formatCommandOutput(stdout: string, stderr: string) {
  const sections = [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean)
  return sections.length === 0 ? 'Command completed with no output.' : sections.join('\n\n')
}

function getPaneLabel(pane: TerminalPane) {
  if (pane.label) return pane.label
  return pane.cwd.split(/[\\/]/).filter(Boolean).pop() ?? pane.cwd
}

function getTimeAgo(timestamp: string) {
  try {
    const now = new Date()
    const parts = timestamp.split(':')
    if (parts.length < 2) return timestamp
    const then = new Date()
    then.setHours(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2] || '0'))
    const diffS = Math.floor((now.getTime() - then.getTime()) / 1000)
    if (diffS < 0 || diffS > 86400) return timestamp
    if (diffS < 5) return 'just now'
    if (diffS < 60) return `${diffS}s ago`
    if (diffS < 3600) return `${Math.floor(diffS / 60)}m ago`
    return `${Math.floor(diffS / 3600)}h ago`
  } catch { return timestamp }
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/g

const COMMON_COMMANDS = [
  'ls', 'dir', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'rm', 'cp', 'mv',
  'git status', 'git log --oneline -10', 'git diff', 'git branch', 'git pull', 'git push',
  'git add .', 'git commit -m ""', 'git checkout', 'git stash', 'git log --graph',
  'npm install', 'npm run dev', 'npm run build', 'npm test', 'npm start',
  'npx', 'yarn', 'pnpm', 'bun',
  'node', 'python', 'cargo build', 'cargo run', 'cargo test',
  'docker ps', 'docker compose up', 'docker images',
  'clear', 'cls', 'whoami', 'hostname', 'env', 'set',
  'ping', 'curl', 'wget', 'ssh', 'scp',
  'code .', 'explorer .', 'open .',
]

/* ── ANSI escape code parser ─────────────────────────────────── */

const ANSI_COLORS_FG: Record<number, string> = {
  30: '#1e1e2e', 31: '#f38ba8', 32: '#a6e3a1', 33: '#f9e2af', 34: '#89b4fa', 35: '#cba6f7', 36: '#94e2d5', 37: '#cdd6f4',
  90: '#585b70', 91: '#f38ba8', 92: '#a6e3a1', 93: '#f9e2af', 94: '#89b4fa', 95: '#cba6f7', 96: '#94e2d5', 97: '#ffffff',
}
const ANSI_COLORS_BG: Record<number, string> = {
  40: '#1e1e2e', 41: '#f38ba8', 42: '#a6e3a1', 43: '#f9e2af', 44: '#89b4fa', 45: '#cba6f7', 46: '#94e2d5', 47: '#cdd6f4',
}

function parseAnsiSpans(raw: string): AnsiSpan[] {
  const spans: AnsiSpan[] = []
  let style: React.CSSProperties = {}
  const regex = /\x1b\[([0-9;]*)m/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIdx) {
      spans.push({ text: raw.slice(lastIdx, match.index), style: { ...style } })
    }
    const codes = match[1].split(';').map(Number)
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i]
      if (c === 0) { style = {} }
      else if (c === 1) { style = { ...style, fontWeight: 700 } }
      else if (c === 3) { style = { ...style, fontStyle: 'italic' } }
      else if (c === 4) { style = { ...style, textDecoration: 'underline' } }
      else if (c === 9) { style = { ...style, textDecoration: 'line-through' } }
      else if (c === 22) { const { fontWeight: __fw, ...rest } = style; void __fw; style = rest }
      else if (c === 23) { const { fontStyle: __fs, ...rest } = style; void __fs; style = rest }
      else if (c === 24 || c === 29) { const { textDecoration: __td, ...rest } = style; void __td; style = rest }
      else if (ANSI_COLORS_FG[c]) { style = { ...style, color: ANSI_COLORS_FG[c] } }
      else if (ANSI_COLORS_BG[c]) { style = { ...style, backgroundColor: ANSI_COLORS_BG[c] } }
      else if (c === 38 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
        style = { ...style, color: ansi256ToHex(codes[i + 2]) }; i += 2
      } else if (c === 48 && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
        style = { ...style, backgroundColor: ansi256ToHex(codes[i + 2]) }; i += 2
      } else if (c === 38 && codes[i + 1] === 2 && codes.length >= i + 5) {
        style = { ...style, color: `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})` }; i += 4
      } else if (c === 48 && codes[i + 1] === 2 && codes.length >= i + 5) {
        style = { ...style, backgroundColor: `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})` }; i += 4
      }
    }
    lastIdx = regex.lastIndex
  }
  if (lastIdx < raw.length) spans.push({ text: raw.slice(lastIdx), style: { ...style } })
  return spans
}

function ansi256ToHex(n: number): string {
  if (n < 16) {
    const base = ['#000', '#a00', '#0a0', '#a50', '#00a', '#a0a', '#0aa', '#aaa',
      '#555', '#f55', '#5f5', '#ff5', '#55f', '#f5f', '#5ff', '#fff']
    return base[n] || '#ccc'
  }
  if (n < 232) {
    const i = n - 16
    const r = Math.floor(i / 36) * 51
    const g = Math.floor((i % 36) / 6) * 51
    const b = (i % 6) * 51
    return `rgb(${r},${g},${b})`
  }
  const v = 8 + (n - 232) * 10
  return `rgb(${v},${v},${v})`
}

function stripAnsi(raw: string): string {
  return raw.replace(/\x1b\[[0-9;]*m/g, '')
}

/* ── Fuzzy match ─────────────────────────────────────────────── */

function fuzzyScore(input: string, target: string): number {
  const lower = input.toLowerCase()
  const t = target.toLowerCase()
  if (t.startsWith(lower)) return 100
  if (t.includes(lower)) return 80
  let score = 0, j = 0
  for (let i = 0; i < t.length && j < lower.length; i++) {
    if (t[i] === lower[j]) { score += 10; j++ }
  }
  return j === lower.length ? score : 0
}

/* ── ANSI-like output renderer (memoized) ────────────────────── */

function renderLineWithLinks(text: string) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const regex = new RegExp(URL_REGEX.source, 'g')
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(
      <a key={match.index} href={match[0]} target="_blank" rel="noopener noreferrer"
        className="underline decoration-dotted hover:decoration-solid transition-all"
        style={{ color: 'var(--accent)' }}
        onClick={(e) => e.stopPropagation()}>
        {match[0]}
      </a>
    )
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : text
}

const OutputRenderer = React.memo(function OutputRenderer({ text }: { text: string }) {
  const hasAnsi = text.includes('\x1b[')
  const lines = text.split('\n')
  return (
    <pre className="font-mono text-[12px] whitespace-pre-wrap leading-[1.7] tracking-[0.01em]" style={{ color: 'var(--terminal-text)' }}>
      {lines.map((line, i) => {
        if (hasAnsi) {
          const spans = parseAnsiSpans(line)
          return (
            <span key={i}>
              {spans.map((s, j) => (
                <span key={j} style={s.style}>{renderLineWithLinks(s.text)}</span>
              ))}
              {i < lines.length - 1 ? '\n' : ''}
            </span>
          )
        }

        const stripped = stripAnsi(line)
        let style: React.CSSProperties = {}

        if (stripped.startsWith('error') || stripped.startsWith('Error') || stripped.startsWith('ERR!') || stripped.includes('FAILED')) {
          style = { color: 'var(--error)' }
        } else if (stripped.startsWith('warning') || stripped.startsWith('Warning') || stripped.startsWith('WARN')) {
          style = { color: 'var(--warning)' }
        } else if (stripped.startsWith('+') && !stripped.startsWith('++')) {
          style = { color: 'var(--success)' }
        } else if (stripped.startsWith('-') && !stripped.startsWith('--')) {
          style = { color: 'var(--error)' }
        } else if (stripped.startsWith('diff ') || stripped.startsWith('@@')) {
          style = { color: 'var(--accent)' }
        } else if (stripped.startsWith('$') || stripped.startsWith('>')) {
          style = { color: 'var(--accent)', fontWeight: 600 }
        }

        return <span key={i} style={style}>{renderLineWithLinks(line)}{i < lines.length - 1 ? '\n' : ''}</span>
      })}
    </pre>
  )
})

/* ── Command Block (memoized) ────────────────────────────────── */

const MAX_VISIBLE_LINES = 80

const CommandBlockUI = React.memo(function CommandBlockUI({ block, onToggle, onRerun }: { block: CommandBlock; onToggle: () => void; onRerun?: (cmd: string) => void }) {
  const ok = block.exitCode === 0
  const [copied, setCopied] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const outputLines = block.output.split('\n').length
  const isLong = outputLines > MAX_VISIBLE_LINES
  const rawCommand = block.command.split(' → ')[0].replace(' [broadcast]', '')

  const displayText = (!block.isCollapsed && isLong && !expanded)
    ? block.output.split('\n').slice(0, MAX_VISIBLE_LINES).join('\n')
    : block.output

  const handleCopyOutput = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(block.output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyCommand = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(block.command).then(() => {
      setCopiedCmd(true)
      setTimeout(() => setCopiedCmd(false), 2000)
    })
  }

  const handleExportMarkdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    const md = `## \`${block.command}\`\n\n\`\`\`\n${block.output}\n\`\`\`\n\n- **Exit code:** ${block.exitCode}\n- **Duration:** ${block.duration}\n- **Time:** ${block.timestamp}\n`
    navigator.clipboard.writeText(md)
  }

  return (
    <div
      className="group overflow-hidden transition-all duration-150"
      style={{
        background: ok ? 'rgba(6,12,22,0.5)' : 'rgba(20,8,12,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Command header - Warp-style block */}
      <div
        className="flex items-center gap-2.5 px-5 py-3 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.025)]"
        onClick={onToggle}
      >
        <button className="shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--text-muted)' }}>
          {block.isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>

        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ok ? 'var(--success)' : 'var(--error)', boxShadow: `0 0 8px ${ok ? 'rgba(46,213,115,0.4)' : 'rgba(255,71,87,0.4)'}` }} />

        <span className="font-mono text-[13px] flex-1 font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--accent)', opacity: 0.6 }}>$ </span>
          {block.command}
        </span>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Re-run */}
          {onRerun && (
            <button
              onClick={(e) => { e.stopPropagation(); onRerun(rawCommand) }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
              title="Re-run command"
              style={{ color: 'var(--text-muted)' }}
            >
              <CornerDownLeft size={12} />
            </button>
          )}
          {/* Copy command */}
          <button
            onClick={handleCopyCommand}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title="Copy command"
            style={{ color: copiedCmd ? 'var(--success)' : 'var(--text-muted)' }}
          >
            {copiedCmd ? <Check size={12} /> : <Hash size={12} />}
          </button>
          {/* Copy output */}
          <button
            onClick={handleCopyOutput}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title="Copy output"
            style={{ color: copied ? 'var(--success)' : 'var(--text-muted)' }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          {/* Line numbers toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowLineNumbers(!showLineNumbers) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
            style={{ color: showLineNumbers ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Hash size={12} />
          </button>
          {/* Export as markdown */}
          <button
            onClick={handleExportMarkdown}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title="Copy as Markdown"
            style={{ color: 'var(--text-muted)' }}
          >
            <FileDown size={12} />
          </button>

          {/* Exit code badge */}
          {!ok && (
            <span className="text-[9px] font-bold font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--error)' }}>
              EXIT {block.exitCode}
            </span>
          )}

          {/* Duration */}
          <span className="text-[10px] font-mono flex items-center gap-1 px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>
            <Clock size={9} /> {block.duration}
          </span>

          {/* Line count */}
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {outputLines}L
          </span>

          {/* Time */}
          <span className="hidden md:inline text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{getTimeAgo(block.timestamp)}</span>
        </div>
      </div>

      {/* Output body */}
      {!block.isCollapsed && (
        <div
          className="px-5 py-3.5 ml-[30px] mr-3 mb-3 rounded-xl transition-all"
          style={{
            background: 'rgba(2,6,14,0.65)',
            borderLeft: `2px solid ${ok ? 'rgba(46,213,115,0.25)' : 'rgba(255,71,87,0.25)'}`,
          }}
        >
          {showLineNumbers ? (
            <pre className="font-mono text-[12px] whitespace-pre-wrap leading-[1.7] tracking-[0.01em]" style={{ color: 'var(--terminal-text)' }}>
              {displayText.split('\n').map((line, i) => (
                <span key={i}>
                  <span className="select-none inline-block text-right mr-3" style={{ width: '2.5em', color: 'var(--text-muted)', opacity: 0.35, fontSize: '10px' }}>{i + 1}</span>
                  {line}{i < displayText.split('\n').length - 1 ? '\n' : ''}
                </span>
              ))}
            </pre>
          ) : (
            <OutputRenderer text={displayText} />
          )}
          {isLong && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              className="mt-2 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
              style={{ color: 'var(--accent)' }}
            >
              {expanded ? `▲ Show less` : `▼ Show ${outputLines - MAX_VISIBLE_LINES} more lines`}
            </button>
          )}
        </div>
      )}
    </div>
  )
})

/* ── Welcome Message ─────────────────────────────────────────── */

const KEYBOARD_SHORTCUTS = [
  { keys: 'Enter', desc: 'Run command' },
  { keys: 'Ctrl+C', desc: 'Cancel running' },
  { keys: 'Ctrl+L', desc: 'Clear terminal' },
  { keys: '↑ / ↓', desc: 'History navigation' },
  { keys: 'Tab', desc: 'Accept suggestion' },
  { keys: 'Ctrl+F', desc: 'Search output' },
  { keys: 'Ctrl++/−', desc: 'Zoom in/out' },
  { keys: 'Ctrl+0', desc: 'Reset zoom' },
]

const WelcomeMessage = React.memo(function WelcomeMessage({ cwd }: { cwd: string }) {
  return (
    <div className="px-6 py-8 flex flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--accent), rgba(40,231,197,0.7))', boxShadow: '0 8px 32px rgba(79,140,255,0.25)' }}>
        <Terminal size={20} className="text-white" />
      </div>
      <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Ready</div>
      <div className="font-mono text-[11px] leading-relaxed space-y-1 mt-3" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-2 justify-center">
          <FolderOpen size={11} style={{ color: 'var(--accent)' }} />
          <span className="truncate max-w-[300px]">{cwd}</span>
        </div>
        <div className="flex items-center gap-2 justify-center mt-2">
          <Sparkles size={11} style={{ color: 'var(--warning)' }} />
          <span>Type a command below and press <span className="premium-kbd text-[9px] mx-0.5">Enter</span></span>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {KEYBOARD_SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>{s.keys}</span>
            <span>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

/* ── Running Indicator ───────────────────────────────────────── */

function RunningIndicator({ paneId }: { paneId: string }) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setElapsedMs(0)
    timerRef.current = setInterval(() => setElapsedMs((p) => p + 100), 100)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paneId])

  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
      </div>
      <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--accent)' }}>
        Executing...
      </span>
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ color: 'var(--warning)', background: 'rgba(255,191,98,0.1)' }}>
        {(elapsedMs / 1000).toFixed(1)}s
      </span>
    </div>
  )
}

/* ── Terminal Pane (memoized) ────────────────────────────────── */

const TerminalPaneUI = React.memo(function TerminalPaneUI({ pane, isOnly, onMaximize, isMaximized, isFocused, broadcastPanes }: {
  pane: TerminalPane
  isOnly: boolean
  onMaximize: () => void
  isMaximized: boolean
  isFocused: boolean
  broadcastPanes?: TerminalPane[]
}) {
  const addCommandBlock = useStore((s) => s.addCommandBlock)
  const toggleCommandCollapse = useStore((s) => s.toggleCommandCollapse)
  const setPaneWorkingDirectory = useStore((s) => s.setPaneWorkingDirectory)
  const clearPaneCommands = useStore((s) => s.clearPaneCommands)
  const setPaneRunning = useStore((s) => s.setPaneRunning)
  const addToCommandHistory = useStore((s) => s.addToCommandHistory)
  const commandAliases = useStore((s) => s.commandAliases)

  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [running, setRunning] = useState(false)
  const [cdInput, setCdInput] = useState('')
  const [showCdBar, setShowCdBar] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const runningRef = useRef(false)
  const executionTokenRef = useRef<string | null>(null)
  const previousCommandCountRef = useRef(pane.commands.length)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fontSize, setFontSize] = useState(12)
  const [filter, setFilter] = useState<'all' | 'success' | 'errors'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [gitBranch, setGitBranch] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const activeCommandId = useRef<string | null>(null)
  const persistedHistory = pane.commandHistory ?? []

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [pane.commands])

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  const finishExecution = useCallback((token?: string | null) => {
    if (token && executionTokenRef.current && executionTokenRef.current !== token) {
      return
    }

    executionTokenRef.current = null
    runningRef.current = false
    setRunning(false)
  }, [])

  useEffect(() => {
    if (runningRef.current && pane.commands.length > previousCommandCountRef.current) {
      finishExecution()
    }
    previousCommandCountRef.current = pane.commands.length
  }, [pane.commands.length, finishExecution])

  useEffect(() => {
    previousCommandCountRef.current = pane.commands.length
  }, [pane.id, pane.commands.length])

  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
      finishExecution()
    }
  }, [finishExecution])

  useEffect(() => {
    let cancelled = false
    getGitBranch(pane.cwd).then((b) => { if (!cancelled) setGitBranch(b) })
    return () => { cancelled = true }
  }, [pane.cwd])

  const updateSuggestions = useCallback((val: string) => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    suggestTimerRef.current = setTimeout(() => {
      const scored: { cmd: string; score: number }[] = []
      const seen = new Set<string>()
      const add = (cmd: string) => {
        if (seen.has(cmd) || cmd === val) return
        const s = fuzzyScore(val, cmd)
        if (s > 0) { scored.push({ cmd, score: s }); seen.add(cmd) }
      }
      persistedHistory.forEach(add)
      COMMON_COMMANDS.forEach(add)
      Object.keys(commandAliases).forEach(add)
      scored.sort((a, b) => b.score - a.score)
      const all = scored.slice(0, 6).map((s) => s.cmd)
      setSuggestions(all)
      setShowSuggestions(all.length > 0)
    }, 80)
  }, [persistedHistory, commandAliases])

  const resolveAliases = useCallback((cmd: string): string => {
    const parts = cmd.trim().split(/\s+/)
    const alias = commandAliases[parts[0]]
    if (alias) return [alias, ...parts.slice(1)].join(' ')
    return cmd
  }, [commandAliases])

  const cancelCommand = useCallback(async () => {
    if (activeCommandId.current) {
      await cancelRunningCommand(activeCommandId.current)
      activeCommandId.current = null
    }
    finishExecution()
  }, [finishExecution])

  const executeCommand = async (command: string) => {
    if (!command || runningRef.current) return

    const lower = command.toLowerCase().trim()

    if (lower === 'clear' || lower === 'cls') {
      clearPaneCommands(pane.id)
      setInput('')
      return
    }
    if (lower === 'exit' || lower === 'quit') {
      clearPaneCommands(pane.id)
      setInput('')
      return
    }

    const resolved = resolveAliases(command)
    const cmdId = generateId()
    const executionToken = generateId()
    executionTokenRef.current = executionToken
    activeCommandId.current = cmdId
    runningRef.current = true
    setRunning(true)
    setPaneRunning(pane.id, true)
    setInput('')
    setShowSuggestions(false)
    addToCommandHistory(pane.id, command)
    setHistoryIndex(-1)

    const runInPane = async (targetPaneId: string, targetCwd: string) => {
      try {
        const pCmdId = targetPaneId === pane.id ? cmdId : generateId()
        const result = await runTerminalCommand(resolved, targetCwd, pCmdId)
        const suffix = result.timedOut ? ' [TIMED OUT]' : result.cancelled ? ' [CANCELLED]' : ''
        const outputText = formatCommandOutput(result.stdout, result.stderr) + suffix
        const lineCount = outputText.split('\n').length
        addCommandBlock(targetPaneId, {
          id: generateId(),
          command: command + (resolved !== command ? ` → ${resolved}` : '') + (targetPaneId !== pane.id ? ' [broadcast]' : ''),
          output: outputText,
          exitCode: result.exitCode,
          timestamp: new Date().toLocaleTimeString(),
          isCollapsed: lineCount > AUTO_COLLAPSE_THRESHOLD,
          duration: formatCommandDuration(result.durationMs),
        })
        if (result.resolvedCwd && result.resolvedCwd !== targetCwd) {
          setPaneWorkingDirectory(targetPaneId, result.resolvedCwd)
        }
      } catch (error) {
        addCommandBlock(targetPaneId, {
          id: generateId(),
          command,
          output: getErrorMessage(error),
          exitCode: 1,
          timestamp: new Date().toLocaleTimeString(),
          isCollapsed: false,
          duration: '0ms',
        })
      }
    }

    try {
      if (broadcastPanes && broadcastPanes.length > 0) {
        const otherPanes = broadcastPanes.filter((p) => p.id !== pane.id)
        otherPanes.forEach((p) => setPaneRunning(p.id, true))
        await Promise.all([
          runInPane(pane.id, pane.cwd),
          ...otherPanes.map((p) => runInPane(p.id, p.cwd)),
        ])
        otherPanes.forEach((p) => setPaneRunning(p.id, false))
      } else {
        await runInPane(pane.id, pane.cwd)
      }
    } finally {
      activeCommandId.current = null
      setPaneRunning(pane.id, false)
      finishExecution(executionToken)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const command = input.trim()
    await executeCommand(command)
  }

  const applySuggestion = (suggestion: string) => {
    setInput(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const exportAsMarkdown = useCallback(() => {
    const lines = [`# Terminal Session — ${getPaneLabel(pane)}`, `> Working directory: \`${pane.cwd}\``, `> Exported: ${new Date().toLocaleString()}`, '']
    pane.commands.forEach((block) => {
      lines.push(`## \`${block.command}\``)
      lines.push(`- **Exit code:** ${block.exitCode}  **Duration:** ${block.duration}  **Time:** ${block.timestamp}`)
      lines.push('```')
      lines.push(stripAnsi(block.output))
      lines.push('```')
      lines.push('')
    })
    const md = lines.join('\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-${getPaneLabel(pane)}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [pane])

  const AUTO_COLLAPSE_THRESHOLD = 50

  const successCount = pane.commands.filter((c) => c.exitCode === 0).length
  const errorCount = pane.commands.filter((c) => c.exitCode !== 0).length

  const filteredCommands = useMemo(() => {
    let cmds = pane.commands
    if (filter === 'success') cmds = cmds.filter((c) => c.exitCode === 0)
    else if (filter === 'errors') cmds = cmds.filter((c) => c.exitCode !== 0)
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      cmds = cmds.filter((c) => c.command.toLowerCase().includes(lower) || c.output.toLowerCase().includes(lower))
    }
    return cmds
  }, [pane.commands, filter, searchTerm])

  return (
    <div
      className="flex flex-col h-full overflow-hidden rounded-xl transition-all duration-200"
      style={{
        background: 'var(--terminal-bg)',
        border: `1px solid ${focused ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: focused ? '0 0 0 1px var(--accent), 0 4px 24px rgba(79,140,255,0.08)' : '0 2px 12px rgba(0,0,0,0.2)',
      }}
    >
      {/* ── Pane header - macOS style ── */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-1.5 mr-1">
          <Circle size={7} fill="var(--error)" style={{ color: 'var(--error)', opacity: 0.8 }} />
          <Circle size={7} fill="var(--warning)" style={{ color: 'var(--warning)', opacity: 0.8 }} />
          <Circle size={7} fill="var(--success)" style={{ color: 'var(--success)', opacity: 0.8 }} />
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Terminal size={11} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {getPaneLabel(pane)}
          </span>
          {pane.agentCli && (
            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md tracking-wider"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
              {pane.agentCli}
            </span>
          )}
          {gitBranch && (
            <span className="flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(166,227,161,0.08)', color: '#a6e3a1' }}>
              <GitBranch size={8} /> {gitBranch}
            </span>
          )}
          {running && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md animate-pulse"
              style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
              RUNNING
            </span>
          )}
          {pane.isLocked && (
            <Lock size={9} style={{ color: 'var(--warning)' }} />
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {running && (
            <button onClick={cancelCommand}
              className="flex items-center gap-1 text-[8px] font-bold uppercase px-2 py-1 rounded-md transition-all hover:bg-[rgba(255,71,87,0.2)]"
              style={{ color: 'var(--error)', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}
              title="Cancel running command (kill process)">
              <StopCircle size={10} /> STOP
            </button>
          )}
          {pane.commands.length > 0 && !running && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md mr-1" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)' }}>
              {successCount}✓{errorCount > 0 && <span style={{ color: 'var(--error)' }}> {errorCount}✗</span>}
            </span>
          )}
          {!isOnly && (
            <button onClick={onMaximize} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title={isMaximized ? 'Restore' : 'Maximize'} style={{ color: 'var(--text-muted)' }}>
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
          <button onClick={() => setShowCdBar(!showCdBar)} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Navigate (cd)" style={{ color: showCdBar ? 'var(--accent)' : 'var(--text-muted)' }}>
            <FolderOpen size={11} />
          </button>
          {fontSize !== 12 && (
            <span className="text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>{fontSize}px</span>
          )}
          <button onClick={() => setFontSize((s) => Math.min(20, s + 1))} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Zoom in (Ctrl++)" style={{ color: 'var(--text-muted)' }}>
            <ZoomIn size={11} />
          </button>
          <button onClick={() => setFontSize((s) => Math.max(8, s - 1))} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Zoom out (Ctrl+-)" style={{ color: 'var(--text-muted)' }}>
            <ZoomOut size={11} />
          </button>
          {pane.commands.length > 0 && (
            <button onClick={exportAsMarkdown} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Export as Markdown" style={{ color: 'var(--text-muted)' }}>
              <FileDown size={11} />
            </button>
          )}
          <button onClick={() => clearPaneCommands(pane.id)} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Clear (Ctrl+L)" style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* ── Filter & Search bar ── */}
      {(showSearch || filter !== 'all') && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center gap-1">
            {(['all', 'success', 'errors'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md transition-all"
                style={{
                  background: filter === f ? (f === 'errors' ? 'rgba(255,71,87,0.15)' : f === 'success' ? 'rgba(46,213,115,0.15)' : 'var(--accent-subtle)') : 'transparent',
                  color: filter === f ? (f === 'errors' ? 'var(--error)' : f === 'success' ? 'var(--success)' : 'var(--accent)') : 'var(--text-muted)',
                }}>{f}</button>
            ))}
          </div>
          {showSearch && (
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find in output..."
              className="flex-1 bg-transparent text-[10px] font-mono outline-none" style={{ color: 'var(--text-primary)' }}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowSearch(false); setSearchTerm('') } }}
            />
          )}
          <button onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchTerm('') }}
            className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: showSearch ? 'var(--accent)' : 'var(--text-muted)' }}>
            <Search size={10} />
          </button>
        </div>
      )}

      {/* ── Output area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ background: 'var(--terminal-bg)', fontSize: `${fontSize}px` }}
        onClick={() => inputRef.current?.focus()}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
      >
        {pane.commands.length === 0 && <WelcomeMessage cwd={pane.cwd} />}
        {filteredCommands.map((block) => (
          <CommandBlockUI key={block.id} block={block} onToggle={() => toggleCommandCollapse(pane.id, block.id)} onRerun={(cmd) => void executeCommand(cmd)} />
        ))}
        {filter !== 'all' && filteredCommands.length === 0 && pane.commands.length > 0 && (
          <div className="text-center py-6 text-[11px]" style={{ color: 'var(--text-muted)' }}>No {filter === 'errors' ? 'errors' : 'successes'} found. <button onClick={() => setFilter('all')} className="underline" style={{ color: 'var(--accent)' }}>Show all</button></div>
        )}
        {running && <RunningIndicator paneId={pane.id} />}
      </div>

      {/* ── Autocomplete suggestions ── */}
      {showSuggestions && !running && (
        <div className="shrink-0 px-4 py-2 flex flex-wrap gap-1.5" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <Search size={10} style={{ color: 'var(--text-muted)', marginTop: 4 }} />
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => applySuggestion(s)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
              style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── cd navigation bar ── */}
      {showCdBar && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)' }}>
          <span className="font-mono text-[11px] font-bold shrink-0 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Terminal size={11} />
            <span style={{ color: 'var(--accent)' }}>$</span> cd
          </span>
          <input
            type="text"
            value={cdInput}
            onChange={(e) => setCdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && cdInput.trim()) {
                e.preventDefault()
                const cmd = `cd ${cdInput.trim()}`
                setCdInput('')
                setShowCdBar(false)
                void executeCommand(cmd)
              } else if (e.key === 'Escape') {
                setShowCdBar(false)
                setCdInput('')
              }
            }}
            placeholder="~/projects/my-app or ../repo"
            className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-40"
            style={{ color: 'var(--text-primary)' }}
            autoFocus
          />
          <button
            onClick={() => {
              void openFolderDialog(pane.cwd).then((path) => {
                if (path) {
                  setCdInput(path)
                }
              })
            }}
            className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Browse
          </button>
          <button
            onClick={() => {
              if (cdInput.trim()) {
                const cmd = `cd ${cdInput.trim()}`
                setCdInput('')
                setShowCdBar(false)
                void executeCommand(cmd)
              }
            }}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: cdInput.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.04)', color: cdInput.trim() ? '#04111d' : 'var(--text-muted)' }}
          >
            GO
          </button>
          <button
            onClick={() => { setShowCdBar(false); setCdInput('') }}
            className="text-[9px] font-mono px-1.5 py-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: 'var(--text-muted)' }}
          >
            ESC
          </button>
        </div>
      )}
      {showCdBar && (
        <div className="shrink-0 px-4 py-1" style={{ background: 'rgba(255,255,255,0.015)' }}>
          <div className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
            Use the browser above or jump with terminal-style navigation commands.
          </div>
        </div>
      )}

      {/* ── Input - Warp-style block input ── */}
      <form onSubmit={handleSubmit} className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2.5 px-4 py-3">
          <span className="font-mono text-[14px] font-bold shrink-0" style={{ color: focused ? 'var(--accent)' : 'var(--text-muted)' }}>
            {running ? <Activity size={14} className="animate-spin" style={{ color: 'var(--accent)' }} /> : '❯'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { if (!running) { setInput(e.target.value); setHistoryIndex(-1); updateSuggestions(e.target.value) } }}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 200) }}
            onKeyDown={(e) => {
              if (e.key === 'c' && e.ctrlKey && running) {
                e.preventDefault()
                void cancelCommand()
                return
              }
              if (running) return
              if (e.key === 'ArrowUp' && persistedHistory.length > 0) {
                e.preventDefault()
                const next = Math.min(historyIndex + 1, persistedHistory.length - 1)
                setHistoryIndex(next)
                setInput(persistedHistory[next])
                setShowSuggestions(false)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                if (historyIndex <= 0) { setHistoryIndex(-1); setInput('') }
                else { const next = historyIndex - 1; setHistoryIndex(next); setInput(persistedHistory[next]) }
                setShowSuggestions(false)
              } else if (e.key === 'Tab' && suggestions.length > 0) {
                e.preventDefault()
                applySuggestion(suggestions[0])
              } else if (e.key === 'Escape') {
                setShowSuggestions(false)
                setContextMenu(null)
              } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault()
                clearPaneCommands(pane.id)
              } else if ((e.key === '=' || e.key === '+') && e.ctrlKey) {
                e.preventDefault()
                setFontSize((s) => Math.min(20, s + 1))
              } else if (e.key === '-' && e.ctrlKey) {
                e.preventDefault()
                setFontSize((s) => Math.max(8, s - 1))
              } else if (e.key === '0' && e.ctrlKey) {
                e.preventDefault()
                setFontSize(12)
              } else if (e.key === 'f' && e.ctrlKey) {
                e.preventDefault()
                setShowSearch(true)
              }
            }}
            placeholder={running ? 'Press Ctrl+C to cancel...' : 'Type a command...'}
            className="flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-50"
            style={{ color: 'var(--text-primary)' }}
            autoFocus={isFocused}
            readOnly={running}
          />
          <div className="flex items-center gap-2 shrink-0">
            {running && (
              <button type="button" onClick={() => void cancelCommand()}
                className="flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-1 rounded-md transition-all hover:bg-[rgba(255,71,87,0.15)]"
                style={{ color: 'var(--error)', background: 'rgba(255,71,87,0.08)' }}>
                <X size={9} /> Cancel
              </button>
            )}
            {input && !running && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-1 rounded-md" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>
                <CornerDownLeft size={9} /> RUN
              </span>
            )}
            {persistedHistory.length > 0 && !input && !running && (
              <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)' }}>
                <ArrowUp size={9} /> {persistedHistory.length}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* ── Pane status bar with breadcrumbs ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.12)' }}>
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <FolderOpen size={9} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          {pane.cwd.split(/[\\/]/).filter(Boolean).map((segment, i, arr) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={7} className="shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
              <button
                onClick={() => {
                  const path = arr.slice(0, i + 1).join(navigator.userAgent.includes('Windows') ? '\\' : '/')
                  const fullPath = navigator.userAgent.includes('Windows') ? path : '/' + path
                  void executeCommand(`cd ${fullPath}`)
                }}
                className="text-[8px] font-mono shrink-0 transition-colors hover:text-[var(--accent)]"
                style={{ color: i === arr.length - 1 ? 'var(--text-secondary)' : 'var(--text-muted)' }}
                title={`Navigate to ${segment}`}
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
          {gitBranch && (
            <>
              <span className="mx-1 text-[7px]" style={{ color: 'var(--text-muted)', opacity: 0.3 }}>|</span>
              <span className="flex items-center gap-0.5 text-[7px] font-mono shrink-0" style={{ color: '#a6e3a1' }}>
                <GitBranch size={7} /> {gitBranch}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => { setShowSearch(true); setFilter(filter === 'all' ? 'errors' : 'all') }}
            className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: errorCount > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
            {errorCount}E
          </button>
          <span className="text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {pane.commands.length} cmd{pane.commands.length !== 1 ? 's' : ''}
          </span>
          {fontSize !== 12 && <span className="text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>{fontSize}px</span>}
        </div>
      </div>

      {/* ── Context menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg shadow-2xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y, background: 'var(--surface-elevated)', border: '1px solid var(--border)', backdropFilter: 'blur(20px)' }}
          onClick={() => setContextMenu(null)}
        >
          {[
            { label: 'Copy Selection', icon: <Copy size={11} />, action: () => navigator.clipboard.writeText(window.getSelection()?.toString() ?? '') },
            { label: 'Paste', icon: <Clipboard size={11} />, action: () => navigator.clipboard.readText().then((t) => setInput((prev) => prev + t)) },
            { label: 'Clear Terminal', icon: <Trash2 size={11} />, action: () => clearPaneCommands(pane.id) },
            { label: 'Find in Output', icon: <Search size={11} />, action: () => setShowSearch(true) },
            { label: 'Toggle Filter', icon: <Hash size={11} />, action: () => setFilter(filter === 'all' ? 'errors' : 'all') },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] transition-all hover:bg-[rgba(255,255,255,0.06)]"
              style={{ color: 'var(--text-secondary)' }}>
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

/* ── Sidebar Pane Tab ────────────────────────────────────────── */

const SidebarPaneTab = React.memo(function SidebarPaneTab({ pane, index, isActive, onClick }: {
  pane: TerminalPane
  index: number
  isActive: boolean
  onClick: () => void
}) {
  const renamePane = useStore((s) => s.renamePane)
  const cmdCount = pane.commands.length
  const hasErrors = pane.commands.some((c) => c.exitCode !== 0)
  const isRunning = pane.isRunning ?? false
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRenameValue(getPaneLabel(pane))
    setIsRenaming(true)
  }

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== getPaneLabel(pane)) {
      renamePane(pane.id, trimmed)
    }
    setIsRenaming(false)
  }

  return (
    <button
      onClick={onClick}
      onDoubleClick={startRename}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 group"
      style={{
        background: isActive ? 'var(--accent-subtle)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      <div className="relative w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
        style={{
          background: isRunning ? 'rgba(79,140,255,0.15)' : isActive ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
          color: isRunning ? 'var(--accent)' : isActive ? '#04111d' : 'var(--text-muted)',
        }}>
        {isRunning ? <Activity size={10} className="animate-spin" /> : index + 1}
        {isRunning && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setIsRenaming(false) }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-[10px] font-semibold outline-none border-b"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--accent)' }}
          />
        ) : (
          <div className="text-[10px] font-semibold truncate" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {getPaneLabel(pane)}
          </div>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          {pane.agentCli && (
            <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              {pane.agentCli}
            </span>
          )}
          {isRunning && (
            <span className="text-[7px] font-bold uppercase tracking-wider animate-pulse" style={{ color: 'var(--accent)' }}>
              running
            </span>
          )}
          {pane.isLocked && (
            <Lock size={7} style={{ color: 'var(--warning)' }} />
          )}
          {cmdCount > 0 && !isRunning && (
            <span className="text-[8px] font-mono" style={{ color: hasErrors ? 'var(--error)' : 'var(--text-muted)' }}>
              {cmdCount} cmd{cmdCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div
        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${isRunning ? 'animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}
        style={{
          background: isRunning ? 'var(--accent)' : hasErrors ? 'var(--error)' : 'var(--success)',
          boxShadow: isRunning ? '0 0 6px var(--accent)' : undefined,
        }}
      />
    </button>
  )
})

/* ── View Mode Button ────────────────────────────────────────── */

function ViewModeButton({ mode, currentMode, onClick, icon, label }: {
  mode: ViewMode
  currentMode: ViewMode
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  const isActive = mode === currentMode
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg transition-all"
      title={label}
      style={{
        background: isActive ? 'var(--accent-subtle)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        border: isActive ? '1px solid rgba(79,140,255,0.2)' : '1px solid transparent',
      }}
    >
      {icon}
    </button>
  )
}

/* ── Main TerminalView ───────────────────────────────────────── */

export function TerminalView() {
  // FIX: Use separate atomic selectors to avoid creating new object references
  // that cause infinite re-renders with Zustand v5's Object.is comparison
  const activeTabId = useStore((s) => s.activeTabId)
  const terminalSessions = useStore((s) => s.terminalSessions)
  const workspaceTabs = useStore((s) => s.workspaceTabs)

  const terminalPanes = useMemo(
    () => (activeTabId ? (terminalSessions[activeTabId] ?? []) : []),
    [activeTabId, terminalSessions]
  )

  const activeWorkspace = useMemo(
    () => workspaceTabs.find((tab) => tab.id === activeTabId) ?? null,
    [workspaceTabs, activeTabId]
  )

  const defaultViewMode: ViewMode = terminalPanes.length <= 1 ? 'focus'
    : terminalPanes.length <= 2 ? 'split'
    : terminalPanes.length <= 4 ? 'quad'
    : 'focus'

  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode)
  const [activePaneId, setActivePaneId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [broadcastMode, setBroadcastMode] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const runningPanes = terminalPanes.filter((p) => p.isRunning).length

  // Sync active pane with available panes
  useEffect(() => {
    if (terminalPanes.length > 0 && (!activePaneId || !terminalPanes.find((p) => p.id === activePaneId))) {
      setActivePaneId(terminalPanes[0].id)
    }
  }, [terminalPanes, activePaneId])

  // Auto-select best view mode when pane count changes
  useEffect(() => {
    if (terminalPanes.length <= 1) setViewMode('focus')
    else if (terminalPanes.length > 4 && viewMode === 'grid') setViewMode('focus')
  }, [terminalPanes.length, viewMode])

  // Keyboard shortcuts for pane navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+1-9 to switch panes
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        if (idx < terminalPanes.length) {
          setActivePaneId(terminalPanes[idx].id)
          if (viewMode !== 'focus') setViewMode('focus')
        }
      }
      // Alt+ArrowLeft/Right to navigate panes
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const currentIdx = terminalPanes.findIndex((p) => p.id === activePaneId)
        if (currentIdx >= 0) {
          const nextIdx = e.key === 'ArrowRight'
            ? (currentIdx + 1) % terminalPanes.length
            : (currentIdx - 1 + terminalPanes.length) % terminalPanes.length
          setActivePaneId(terminalPanes[nextIdx].id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [terminalPanes, activePaneId, viewMode])

  // Compute visible panes based on view mode
  const visiblePanes = useMemo(() => {
    if (viewMode === 'grid') return terminalPanes

    const activeIdx = terminalPanes.findIndex((p) => p.id === activePaneId)
    const startIdx = Math.max(0, activeIdx)

    if (viewMode === 'focus') {
      return terminalPanes.slice(startIdx, startIdx + 1)
    }
    if (viewMode === 'split') {
      const panes = terminalPanes.slice(startIdx, startIdx + 2)
      if (panes.length < 2 && terminalPanes.length >= 2) {
        return terminalPanes.slice(0, 2)
      }
      return panes
    }
    if (viewMode === 'quad') {
      const panes = terminalPanes.slice(startIdx, startIdx + 4)
      if (panes.length < 4 && terminalPanes.length >= 4) {
        return terminalPanes.slice(0, 4)
      }
      return panes
    }

    return terminalPanes
  }, [viewMode, activePaneId, terminalPanes])

  const gridCols = viewMode === 'focus' ? 1
    : viewMode === 'split' ? 2
    : viewMode === 'quad' ? 2
    : terminalPanes.length <= 2 ? 2
    : terminalPanes.length <= 4 ? 2
    : terminalPanes.length <= 9 ? 3
    : 4

  if (terminalPanes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <div className="premium-panel-elevated max-w-xl w-full p-8 text-center mesh-overlay">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,var(--accent),rgba(40,231,197,0.82))] text-[#04111d] shadow-[0_20px_50px_rgba(79,140,255,0.28)]">
            <Terminal size={24} />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] mb-3" style={{ color: 'var(--text-muted)' }}>
            Terminal Command Surface
          </div>
          <div className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            No active terminal workspace
          </div>
          <p className="text-[13px] leading-7 max-w-lg mx-auto mb-5" style={{ color: 'var(--text-secondary)' }}>
            Launch a workspace from the home surface or workspace launchpad to open a real multi-pane execution grid with desktop command runtime.
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1.5"><Zap size={10} style={{ color: 'var(--warning)' }} /> Real shell execution</div>
            <div className="flex items-center gap-1.5"><LayoutGrid size={10} style={{ color: 'var(--accent)' }} /> Multi-pane grid</div>
            <div className="flex items-center gap-1.5"><Bot size={10} style={{ color: 'var(--secondary)' }} /> AI agent assignment</div>
          </div>
        </div>
      </div>
    )
  }

  const activeAgents = terminalPanes.filter((p) => p.agentCli).length
  const totalCmds = terminalPanes.reduce((s, p) => s + p.commands.length, 0)

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* ── Top toolbar ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {activeWorkspace?.name ?? 'Terminal'}
            </span>
          </div>
          <div className="h-4 w-px" style={{ background: 'var(--border)' }} />
          <span className="text-[10px] font-mono truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
            {activeWorkspace?.workingDirectory ?? terminalPanes[0]?.cwd}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-3 text-[9px] font-mono mr-2" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><LayoutGrid size={9} /> {terminalPanes.length}</span>
            <span className="flex items-center gap-1"><Terminal size={9} /> {totalCmds}</span>
            {activeAgents > 0 && <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}><Bot size={9} /> {activeAgents}</span>}
            {runningPanes > 0 && (
              <span className="flex items-center gap-1 animate-pulse" style={{ color: 'var(--accent)' }}>
                <Activity size={9} /> {runningPanes} running
              </span>
            )}
          </div>

          {terminalPanes.length > 1 && (
            <button
              onClick={() => setBroadcastMode(!broadcastMode)}
              className="flex items-center gap-1 text-[8px] font-bold uppercase px-2 py-1 rounded-md transition-all"
              style={{
                background: broadcastMode ? 'rgba(255,71,87,0.12)' : 'rgba(255,255,255,0.03)',
                color: broadcastMode ? 'var(--error)' : 'var(--text-muted)',
                border: broadcastMode ? '1px solid rgba(255,71,87,0.3)' : '1px solid transparent',
              }}
              title="Broadcast mode: run commands in all panes simultaneously"
            >
              <Zap size={9} /> {broadcastMode ? 'BROADCAST ON' : 'Broadcast'}
            </button>
          )}

          {/* View mode toggles */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <ViewModeButton mode="focus" currentMode={viewMode} onClick={() => setViewMode('focus')} icon={<Square size={12} />} label="Focus (1 pane)" />
            {terminalPanes.length >= 2 && (
              <ViewModeButton mode="split" currentMode={viewMode} onClick={() => setViewMode('split')} icon={<Columns2 size={12} />} label="Split (2 panes)" />
            )}
            {terminalPanes.length >= 4 && (
              <ViewModeButton mode="quad" currentMode={viewMode} onClick={() => setViewMode('quad')} icon={<Grid2x2 size={12} />} label="Quad (4 panes)" />
            )}
            {terminalPanes.length > 1 && (
              <ViewModeButton mode="grid" currentMode={viewMode} onClick={() => setViewMode('grid')} icon={<LayoutGrid size={12} />} label="Grid (all panes)" />
            )}
          </div>

          {/* Sidebar toggle */}
          {terminalPanes.length > 1 && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              style={{ color: 'var(--text-muted)' }}
            >
              <ChevronLeft size={13} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Sidebar (pane list) ── */}
        {terminalPanes.length > 1 && !sidebarCollapsed && (
          <div
            className="shrink-0 flex flex-col overflow-hidden transition-all duration-200"
            style={{
              width: '180px',
              borderRight: '1px solid var(--border)',
              background: 'rgba(0,0,0,0.12)',
            }}
          >
            <div className="px-3 py-2 shrink-0">
              <div className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                Terminals ({terminalPanes.length})
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">
              {terminalPanes.map((pane, i) => (
                <SidebarPaneTab
                  key={pane.id}
                  pane={pane}
                  index={i}
                  isActive={activePaneId === pane.id}
                  onClick={() => {
                    setActivePaneId(pane.id)
                    if (viewMode === 'grid') setViewMode('focus')
                  }}
                />
              ))}
            </div>
            {/* Keyboard shortcut hint */}
            <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowShortcuts(!showShortcuts)}
                className="text-[8px] font-mono leading-relaxed w-full text-left transition-colors hover:text-[var(--accent)]"
                style={{ color: 'var(--text-muted)' }}
              >
                {showShortcuts ? '▾ Hide shortcuts' : '▸ Keyboard shortcuts'}
              </button>
              {showShortcuts && (
                <div className="mt-1.5 space-y-1">
                  {[
                    { k: 'Alt+1-9', d: 'Switch pane' },
                    { k: 'Alt+←→', d: 'Navigate panes' },
                    { k: 'Ctrl+L', d: 'Clear terminal' },
                    { k: 'Ctrl+C', d: 'Cancel command' },
                    { k: 'Ctrl+F', d: 'Search output' },
                    { k: 'Ctrl++/−', d: 'Zoom' },
                    { k: '↑ / ↓', d: 'History' },
                    { k: 'Tab', d: 'Autocomplete' },
                  ].map((s) => (
                    <div key={s.k} className="flex items-center justify-between text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>{s.k}</span>
                      <span>{s.d}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Terminal grid/focus area ── */}
        <div className="flex-1 overflow-hidden p-1.5 min-w-0">
          <div className="h-full grid gap-1.5" style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${Math.ceil(visiblePanes.length / gridCols)}, minmax(0, 1fr))`,
          }}>
            {visiblePanes.map((pane) => (
              <TerminalPaneUI
                key={pane.id}
                pane={pane}
                isOnly={terminalPanes.length === 1}
                onMaximize={() => {
                  if (viewMode === 'focus' && activePaneId === pane.id) {
                    setViewMode(terminalPanes.length <= 2 ? 'split' : 'quad')
                  } else {
                    setActivePaneId(pane.id)
                    setViewMode('focus')
                  }
                }}
                isMaximized={viewMode === 'focus' && activePaneId === pane.id && terminalPanes.length > 1}
                isFocused={activePaneId === pane.id}
                broadcastPanes={broadcastMode ? terminalPanes : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
