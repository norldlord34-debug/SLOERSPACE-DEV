'use client'

import {
  formatCommandDuration,
  openFolderDialog,
  cancelRunningCommand,
  getGitBranch,
  getSystemInfo,
  getTerminalCapabilities,
  inspectWorkingDirectory,
  ensureTerminalSession,
  getTerminalSessionEvents,
  listenToTerminalSessionLiveEvents,
  listenToTerminalSessionStreamEvents,
  getTerminalSessionSnapshot,
  runTerminalSessionCommand,
  resizeTerminalSession,
  writeTerminalSessionInput,
  startPtyStream,
  closeTerminalSession,
  handleDroppedFiles,
  isTauriApp,
  SystemInfo,
  TerminalCapabilities,
  TerminalSessionEvent,
  WorkingDirectoryInsight,
} from '@/lib/desktop'
import { useStore, CommandBlock, TerminalPane, generateId } from '@/store/useStore'
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronDown, ChevronRight, Clock,
  Bot, Circle, LayoutGrid, Copy, Trash2,
  Check, Terminal, Activity, Zap, Hash, ArrowUp, CornerDownLeft,
  Maximize2, Minimize2, Columns2, Square, Grid2x2,
  ChevronLeft, Search, Sparkles, FolderOpen,
  FileDown, ZoomIn, ZoomOut, X, StopCircle,
  GitBranch, Lock, Star, Workflow, Cpu, ShieldCheck, BookOpen,
  Clipboard
} from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────── */

type ViewMode = 'focus' | 'split' | 'quad' | 'grid'

interface AnsiSpan { text: string; style: React.CSSProperties }

interface LiveCommandBlockState {
  commandId: string | null
  command: string
  output: string
  startedAtMs: number
  baselineCommandCount: number
}

/* ── Helpers ─────────────────────────────────────────────────── */

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown command error'
}

function formatCommandOutput(stdout: string, stderr: string) {
  const sections = [sanitizeTerminalOutput(stdout).trimEnd(), sanitizeTerminalOutput(stderr).trimEnd()].filter(Boolean)
  return sections.length === 0 ? 'Command completed with no output.' : sections.join('\n\n')
}

function getPaneLabel(pane: TerminalPane) {
  if (pane.label) return pane.label
  return pane.cwd.split(/[\\/]/).filter(Boolean).pop() ?? pane.cwd
}

function getPaneSessionKind(pane: TerminalPane) {
  return pane.sessionKind ?? 'local'
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

const TERMINAL_GRID_COLUMNS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 2,
  5: 3,
  6: 3,
  7: 4,
  8: 4,
  9: 3,
  10: 5,
  11: 4,
  12: 4,
  13: 5,
  14: 7,
  15: 5,
  16: 4,
}

function getGridColumnsForPaneCount(count: number) {
  if (count <= 1) {
    return 1
  }

  return TERMINAL_GRID_COLUMNS[count] ?? Math.min(6, Math.max(2, Math.ceil(Math.sqrt(count))))
}

function getFriendlyShellName(shell?: string | null) {
  if (!shell) return 'Shell'

  const normalized = shell.toLowerCase()
  if (normalized.includes('powershell')) return 'PowerShell'
  if (normalized.includes('pwsh')) return 'PowerShell 7'
  if (normalized.includes('cmd')) return 'Command Prompt'
  if (normalized.includes('zsh')) return 'zsh'
  if (normalized.includes('bash')) return 'bash'
  if (normalized.includes('fish')) return 'fish'
  return shell
}

function getShellKindLabel(shellKind?: TerminalPane['shellKind'] | null) {
  if (shellKind === 'powershell') return 'PowerShell'
  if (shellKind === 'command-prompt') return 'Command Prompt'
  if (shellKind === 'git-bash') return 'Git Bash'
  return null
}

function hasExplicitPaneLayout(pane: TerminalPane) {
  return typeof pane.layoutColumn === 'number' || typeof pane.layoutRow === 'number'
}

function getPaneLayoutColumn(pane: TerminalPane, fallbackColumn: number) {
  return typeof pane.layoutColumn === 'number' ? Math.max(0, Math.trunc(pane.layoutColumn)) : fallbackColumn
}

function getPaneLayoutRow(pane: TerminalPane) {
  return typeof pane.layoutRow === 'number' ? Math.max(0, Math.trunc(pane.layoutRow)) : 0
}

function getFriendlyOsName(os?: string | null) {
  if (!os) return 'Desktop'
  if (os === 'windows') return 'Windows'
  if (os === 'macos') return 'macOS'
  if (os === 'linux') return 'Linux'
  return os
}

function getClientShellFallback() {
  if (typeof navigator === 'undefined') return 'Shell'
  return navigator.userAgent.includes('Windows') ? 'PowerShell' : 'Shell'
}

function getClientOsFallback() {
  if (typeof navigator === 'undefined') return 'Desktop'
  if (navigator.userAgent.includes('Windows')) return 'Windows'
  if (navigator.userAgent.includes('Mac')) return 'macOS'
  return 'Linux'
}

function getPromptPreview(cwd: string, shellName: string) {
  if (shellName.toLowerCase().includes('powershell')) {
    return `PS ${cwd}>`
  }

  if (shellName.toLowerCase().includes('command prompt')) {
    return `${cwd}>`
  }

  return `${cwd} $`
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/g

const INTERACTIVE_CLI_COMMANDS = new Set([
  'opencode', 'claude', 'codex', 'gemini', 'cursor',
  'vim', 'nvim', 'nano', 'vi', 'emacs', 'less', 'more', 'top', 'htop', 'btop',
  'python', 'python3', 'node', 'irb', 'ghci', 'lua', 'julia',
  'ssh', 'telnet', 'ftp', 'sftp',
  'mysql', 'psql', 'mongo', 'mongosh', 'redis-cli',
  'nix-shell', 'bash', 'zsh', 'fish', 'sh', 'pwsh', 'powershell', 'cmd',
])

function isInteractiveCommand(command: string): boolean {
  const base = command.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  const name = base.split(/[\\/]/).pop()?.replace(/\.exe$/i, '') ?? base
  return INTERACTIVE_CLI_COMMANDS.has(name)
}

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

const EMPTY_COMMAND_HISTORY: string[] = []

function buildSnippetName(command: string) {
  const compact = command.trim().replace(/\s+/g, ' ')
  if (compact.length <= 30) {
    return compact
  }

  return `${compact.slice(0, 27)}...`
}

/* ── ANSI escape code parser ─────────────────────────────────── */

const ANSI_COLORS_FG: Record<number, string> = {
  30: '#1e1e2e', 31: '#f38ba8', 32: '#a6e3a1', 33: '#f9e2af', 34: '#89b4fa', 35: '#cba6f7', 36: '#94e2d5', 37: '#cdd6f4',
  90: '#585b70', 91: '#f38ba8', 92: '#a6e3a1', 93: '#f9e2af', 94: '#89b4fa', 95: '#cba6f7', 96: '#94e2d5', 97: '#ffffff',
}
const ANSI_COLORS_BG: Record<number, string> = {
  40: '#1e1e2e', 41: '#f38ba8', 42: '#a6e3a1', 43: '#f9e2af', 44: '#89b4fa', 45: '#cba6f7', 46: '#94e2d5', 47: '#cdd6f4',
}

function parseAnsiSpans(raw: string): AnsiSpan[] {
  const sanitized = sanitizeTerminalOutput(raw)
  const spans: AnsiSpan[] = []
  let style: React.CSSProperties = {}
  const regex = /\x1b\[([0-9;]*)m/g
  let lastIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(sanitized)) !== null) {
    if (match.index > lastIdx) {
      spans.push({ text: sanitized.slice(lastIdx, match.index), style: { ...style } })
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
  if (lastIdx < sanitized.length) spans.push({ text: sanitized.slice(lastIdx), style: { ...style } })
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

function sanitizeTerminalOutput(raw: string): string {
  let cleaned = raw
  cleaned = cleaned.replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')
  cleaned = cleaned.replace(/\x1b\[[0-9;]*[ABCDEFGHJKSTfnsu]/g, '')
  cleaned = cleaned.replace(/\x1b\([A-Z0-9]/g, '')
  cleaned = cleaned.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
  cleaned = cleaned.replace(/\x1b[=>NOcZ78]/g, '')
  cleaned = cleaned.replace(/\r(?!\n)/g, '')
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')
  return cleaned
}

function stripAnsi(raw: string): string {
  return raw.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b[\(\)][A-Z0-9]/g, '').replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '').replace(/\x1b[=>NOcZ78]/g, '')
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

const CommandBlockUI = React.memo(function CommandBlockUI({
  block,
  onToggle,
  onRerun,
  onToggleStar,
  onSaveSnippet,
  isStarred,
  compactMode = false,
}: {
  block: CommandBlock
  onToggle: () => void
  onRerun?: (cmd: string) => void
  onToggleStar?: (cmd: string) => void
  onSaveSnippet?: (cmd: string) => void
  isStarred?: boolean
  compactMode?: boolean
}) {
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
        className={`flex items-center gap-2.5 cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.025)] ${compactMode ? 'px-3 py-2' : 'px-5 py-3'}`}
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
          {onRerun && !compactMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onRerun(rawCommand) }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
              title="Re-run command"
              style={{ color: 'var(--text-muted)' }}
            >
              <CornerDownLeft size={12} />
            </button>
          )}
          {onToggleStar && !compactMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(rawCommand) }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
              title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
              style={{ color: isStarred ? 'var(--warning)' : 'var(--text-muted)' }}
            >
              <Star size={12} fill={isStarred ? 'currentColor' : 'none'} />
            </button>
          )}
          {onSaveSnippet && !compactMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onSaveSnippet(rawCommand) }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
              title="Save as workflow snippet"
              style={{ color: 'var(--text-muted)' }}
            >
              <Workflow size={12} />
            </button>
          )}
          {/* Copy command */}
          {!compactMode && <button
            onClick={handleCopyCommand}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title="Copy command"
            style={{ color: copiedCmd ? 'var(--success)' : 'var(--text-muted)' }}
          >
            {copiedCmd ? <Check size={12} /> : <Hash size={12} />}
          </button>}
          {/* Copy output */}
          {!compactMode && <button
            onClick={handleCopyOutput}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title="Copy output"
            style={{ color: copied ? 'var(--success)' : 'var(--text-muted)' }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>}
          {/* Line numbers toggle */}
          {!compactMode && <button
            onClick={(e) => { e.stopPropagation(); setShowLineNumbers(!showLineNumbers) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
            style={{ color: showLineNumbers ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Hash size={12} />
          </button>}
          {/* Export as markdown */}
          {!compactMode && <button
            onClick={handleExportMarkdown}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-[var(--surface-3)]"
            title="Copy as Markdown"
            style={{ color: 'var(--text-muted)' }}
          >
            <FileDown size={12} />
          </button>}

          {/* Exit code badge */}
          {!ok && (
            <span className="text-[9px] font-bold font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--error)' }}>
              EXIT {block.exitCode}
            </span>
          )}

          {/* Duration */}
          {!compactMode && <span className="text-[10px] font-mono flex items-center gap-1 px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>
            <Clock size={9} /> {block.duration}
          </span>}

          {/* Line count */}
          {!compactMode && <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {outputLines}L
          </span>}

          {/* Time */}
          {!compactMode && <span className="hidden md:inline text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{getTimeAgo(block.timestamp)}</span>}
        </div>
      </div>

      {/* Output body */}
      {!block.isCollapsed && (
        <div
          className={`rounded-xl transition-all ${compactMode ? 'px-3 py-2.5 ml-[18px] mr-2 mb-2' : 'px-5 py-3.5 ml-[30px] mr-3 mb-3'}`}
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

const WelcomeMessage = React.memo(function WelcomeMessage({ cwd, shellName, osName }: { cwd: string; shellName: string; osName: string }) {
  const promptPreview = getPromptPreview(cwd, shellName)

  return (
    <div className="px-6 py-8 flex flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, var(--accent), rgba(40,231,197,0.7))', boxShadow: '0 8px 32px rgba(79,140,255,0.25)' }}>
        <Terminal size={20} className="text-white" />
      </div>
      <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Ready</div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>
          {shellName}
        </span>
        <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
          {osName}
        </span>
      </div>
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
      <div className="mt-5 w-full max-w-[420px] rounded-[20px] border border-[var(--border)] bg-[rgba(2,6,14,0.72)] px-4 py-3 text-left font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--accent)' }}>{promptPreview}</span>
        <span style={{ color: 'var(--text-primary)' }}> </span>
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

/* ── PTY Terminal Emulator (xterm.js) ────────────────────────── */

const SLOERSPACE_TERMINAL_THEME = {
  background: '#0b1120',
  foreground: '#cdd6f4',
  cursor: '#4f8cff',
  cursorAccent: '#0b1120',
  selectionBackground: 'rgba(79,140,255,0.38)',
  selectionForeground: '#ffffff',
  selectionInactiveBackground: 'rgba(79,140,255,0.15)',
  black: '#45475a',
  red: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  blue: '#89b4fa',
  magenta: '#cba6f7',
  cyan: '#94e2d5',
  white: '#bac2de',
  brightBlack: '#585b70',
  brightRed: '#f38ba8',
  brightGreen: '#a6e3a1',
  brightYellow: '#f9e2af',
  brightBlue: '#89b4fa',
  brightMagenta: '#cba6f7',
  brightCyan: '#94e2d5',
  brightWhite: '#ffffff',
}

export const PtyTerminalEmulator = React.memo(function PtyTerminalEmulator({
  sessionId,
  cwd,
  paneIndex = 0,
  totalPanes = 1,
  onExit,
}: {
  sessionId: string
  cwd: string
  paneIndex?: number
  totalPanes?: number
  onExit?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<import('@xterm/xterm').Terminal | null>(null)
  const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const disposedRef = useRef(false)
  const [rendererType, setRendererType] = useState<'webgl' | 'canvas'>('canvas')

  useEffect(() => {
    if (!containerRef.current) return
    disposedRef.current = false

    let terminal: import('@xterm/xterm').Terminal | null = null
    let fitAddon: import('@xterm/addon-fit').FitAddon | null = null
    let webglAddon: import('@xterm/addon-webgl').WebglAddon | null = null
    let streamUnlisten: (() => void) | null = null
    let resizeFrameId: number | null = null
    let writeBuffer: string[] = []
    let writeFlushTimer: ReturnType<typeof setTimeout> | null = null

    const flushWriteBuffer = () => {
      writeFlushTimer = null
      if (!terminal || disposedRef.current || writeBuffer.length === 0) return
      const batch = writeBuffer.join('')
      writeBuffer = []
      terminal.write(batch)
    }

    const queueWrite = (chunk: string) => {
      if (!terminal || disposedRef.current) return
      if (writeBuffer.length === 0 && !writeFlushTimer) {
        terminal.write(chunk)
        return
      }
      writeBuffer.push(chunk)
      if (!writeFlushTimer) {
        writeFlushTimer = setTimeout(flushWriteBuffer, 4)
      }
    }

    const doFitAndResize = () => {
      if (!fitAddon || !terminal || disposedRef.current) return
      try {
        fitAddon.fit()
        void resizeTerminalSession(sessionId, terminal.cols, terminal.rows)
      } catch { /* ignore during transitions */ }
    }

    const init = async () => {
      if (paneIndex > 0) {
        await new Promise((r) => setTimeout(r, paneIndex * 120))
      }
      if (disposedRef.current) return

      const [{ Terminal }, { FitAddon }, { Unicode11Addon }, { listen }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-unicode11'),
        import('@tauri-apps/api/event'),
      ])

      if (disposedRef.current || !containerRef.current) return

      terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        cursorWidth: 2,
        fontSize: 14,
        fontFamily: "'CaskaydiaCove Nerd Font', 'FiraCode Nerd Font', Consolas, 'Cascadia Code', 'JetBrains Mono', 'Courier New', monospace",
        fontWeight: '400',
        fontWeightBold: '600',
        lineHeight: 1.15,
        letterSpacing: 0,
        drawBoldTextInBrightColors: true,
        minimumContrastRatio: 1,
        theme: SLOERSPACE_TERMINAL_THEME,
        allowProposedApi: true,
        scrollback: 50000,
        smoothScrollDuration: 100,
        convertEol: false,
        altClickMovesCursor: true,
        rightClickSelectsWord: true,
        macOptionIsMeta: true,
        scrollOnUserInput: true,
      })

      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      const unicode11 = new Unicode11Addon()
      terminal.loadAddon(unicode11)
      terminal.unicode.activeVersion = '11'

      terminal.open(containerRef.current!)

      if (totalPanes <= 2) {
        try {
          const { WebglAddon } = await import('@xterm/addon-webgl')
          webglAddon = new WebglAddon()
          webglAddon.onContextLoss(() => {
            webglAddon?.dispose()
            webglAddon = null
            setRendererType('canvas')
          })
          terminal.loadAddon(webglAddon)
          setRendererType('webgl')
        } catch {
          setRendererType('canvas')
        }
      } else {
        setRendererType('canvas')
      }

      fitAddon.fit()
      xtermRef.current = terminal
      fitAddonRef.current = fitAddon

      terminal.onData((data) => {
        void writeTerminalSessionInput(sessionId, data)
      })

      terminal.attachCustomKeyEventHandler((event) => {
        if (event.type !== 'keydown') return true
        if (event.ctrlKey && event.shiftKey && event.key === 'C') {
          const sel = terminal?.getSelection()
          if (sel) navigator.clipboard.writeText(sel)
          return false
        }
        if (event.ctrlKey && event.shiftKey && event.key === 'V') {
          navigator.clipboard.readText().then((text) => {
            if (text) void writeTerminalSessionInput(sessionId, text)
          }).catch(() => {})
          return false
        }
        return true
      })

      terminal.onResize(({ cols, rows }) => {
        void resizeTerminalSession(sessionId, cols, rows)
      })

      const unlisten = await listen<{ sessionId: string; commandId: string | null; chunk: string; sequence: number }>(
        'terminal-session-stream',
        (event) => {
          if (event.payload.sessionId === sessionId && !disposedRef.current) {
            queueWrite(event.payload.chunk)
          }
        },
      )
      streamUnlisten = unlisten

      if (disposedRef.current) { unlisten(); terminal.dispose(); return }

      await ensureTerminalSession(sessionId, cwd).catch(() => {})

      if (disposedRef.current) { unlisten(); terminal.dispose(); return }

      for (let attempt = 0; attempt < 5; attempt++) {
        if (disposedRef.current) break
        const started = await startPtyStream(sessionId).catch(() => false)
        if (started) break
        await new Promise((r) => setTimeout(r, 200))
      }

      if (disposedRef.current) { unlisten(); terminal.dispose(); return }

      void resizeTerminalSession(sessionId, terminal.cols, terminal.rows)

      const resizeObserver = new ResizeObserver(() => {
        if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId)
        resizeFrameId = requestAnimationFrame(doFitAndResize)
      })
      if (containerRef.current) resizeObserver.observe(containerRef.current)
      resizeObserverRef.current = resizeObserver

      terminal.focus()
    }

    void init()

    return () => {
      disposedRef.current = true
      if (resizeFrameId !== null) cancelAnimationFrame(resizeFrameId)
      if (writeFlushTimer !== null) clearTimeout(writeFlushTimer)
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      streamUnlisten?.()
      webglAddon?.dispose()
      terminal?.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, cwd])

  const handleCopy = () => {
    const sel = xtermRef.current?.getSelection()
    if (sel) navigator.clipboard.writeText(sel)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) void writeTerminalSessionInput(sessionId, text)
    } catch { /* clipboard access denied */ }
  }

  const handleClear = () => {
    void writeTerminalSessionInput(sessionId, '\x0c')
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <div className="flex items-center justify-between px-3 py-1 shrink-0" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a6e3a1', boxShadow: '0 0 6px rgba(166,227,161,0.5)' }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
            PTY · {rendererType === 'webgl' ? 'GPU' : 'Canvas'}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handleCopy} className="p-1 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Copy (Ctrl+Shift+C)" style={{ color: 'var(--text-muted)' }}>
            <Copy size={10} />
          </button>
          <button onClick={handlePaste} className="p-1 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Paste (Ctrl+Shift+V)" style={{ color: 'var(--text-muted)' }}>
            <Clipboard size={10} />
          </button>
          <button onClick={handleClear} className="p-1 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Clear (Ctrl+L)" style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={10} />
          </button>
          {onExit && (
            <button onClick={onExit} className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded transition-all hover:bg-[rgba(255,255,255,0.06)] ml-1" style={{ color: 'var(--text-muted)' }}>
              Blocks
            </button>
          )}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden" style={{ background: SLOERSPACE_TERMINAL_THEME.background }} />
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

const LiveCommandBlockUI = React.memo(function LiveCommandBlockUI({
  command,
  output,
  startedAtMs,
  compactMode = false,
}: {
  command: string
  output: string
  startedAtMs: number
  compactMode?: boolean
}) {
  const [elapsedMs, setElapsedMs] = useState(() => Math.max(0, Date.now() - startedAtMs))

  useEffect(() => {
    setElapsedMs(Math.max(0, Date.now() - startedAtMs))
    const timer = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - startedAtMs))
    }, 100)
    return () => clearInterval(timer)
  }, [startedAtMs])

  const displayText = output.trimEnd()

  return (
    <div
      className="overflow-hidden transition-all duration-150"
      style={{
        background: 'rgba(6,12,22,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div
        className={`flex items-center gap-2.5 ${compactMode ? 'px-3 py-2' : 'px-5 py-3'}`}
        style={{ background: 'rgba(255,255,255,0.018)' }}
      >
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
        </div>

        <span className="font-mono text-[13px] flex-1 font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--accent)', opacity: 0.6 }}>$ </span>
          {command}
        </span>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[9px] font-bold font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(79,140,255,0.14)', color: 'var(--accent)' }}>
            LIVE
          </span>
          {!compactMode && <span className="text-[10px] font-mono flex items-center gap-1 px-2 py-1 rounded-md" style={{ color: 'var(--warning)', background: 'rgba(255,191,98,0.1)' }}>
            <Clock size={9} /> {formatCommandDuration(elapsedMs)}
          </span>}
        </div>
      </div>

      {displayText ? (
        <div
          className={`rounded-xl transition-all ${compactMode ? 'px-3 py-2.5 ml-[18px] mr-2 mb-2' : 'px-5 py-3.5 ml-[30px] mr-3 mb-3'}`}
          style={{
            background: 'rgba(2,6,14,0.65)',
            borderLeft: '2px solid rgba(79,140,255,0.28)',
          }}
        >
          <OutputRenderer text={displayText} />
        </div>
      ) : null}
    </div>
  )
})

function getProjectTypeLabel(projectType?: string | null) {
  if (!projectType) return 'Workspace'
  if (projectType === 'node') return 'Node'
  if (projectType === 'rust') return 'Rust'
  if (projectType === 'python') return 'Python'
  if (projectType === 'go') return 'Go'
  if (projectType === 'containers') return 'Containers'
  return 'Workspace'
}

function getSessionEventTone(kind: string) {
  if (kind === 'command-finished') return '#a6e3a1'
  if (kind === 'command-started') return 'var(--accent)'
  if (kind === 'cwd-changed') return 'var(--warning)'
  if (kind === 'command-cancelled' || kind === 'cancel-requested') return 'var(--warning)'
  if (kind === 'command-error' || kind === 'command-timed-out') return 'var(--error)'
  return 'var(--text-secondary)'
}

function getSessionEventIcon(kind: string) {
  const color = getSessionEventTone(kind)

  if (kind === 'command-started') return <Activity size={11} style={{ color }} />
  if (kind === 'cwd-changed') return <FolderOpen size={11} style={{ color }} />
  if (kind === 'command-finished') return <Check size={11} style={{ color }} />
  if (kind === 'command-cancelled' || kind === 'cancel-requested') return <StopCircle size={11} style={{ color }} />
  if (kind === 'command-error' || kind === 'command-timed-out') return <X size={11} style={{ color }} />
  return <Terminal size={11} style={{ color }} />
}

function formatSessionEventTimestamp(timestampMs: number) {
  return new Date(timestampMs).toLocaleTimeString()
}

const CommandDockGroup = React.memo(function CommandDockGroup({
  title,
  icon,
  items,
  accent,
  onSelect,
}: {
  title: string
  icon: React.ReactNode
  items: Array<{ id: string; label: string; command: string; reason?: string }>
  accent: string
  onSelect: (command: string) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        <span className="inline-flex items-center" style={{ color: accent }}>{icon}</span>
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.command)}
            className="group rounded-xl px-3 py-2 text-left transition-all hover:-translate-y-[1px]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            title={item.reason ? `${item.command}\n\n${item.reason}` : item.command}
          >
            <div className="text-[10px] font-semibold transition-colors group-hover:text-[var(--text-primary)]" style={{ color: 'var(--text-secondary)' }}>
              {item.label}
            </div>
            <div className="mt-1 font-mono text-[9px] truncate max-w-[220px]" style={{ color: 'var(--text-muted)' }}>
              {item.command}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
})

/* ── Terminal Pane (memoized) ────────────────────────────────── */

const SessionTimelinePanel = React.memo(function SessionTimelinePanel({
  events,
  onSelectCommand,
}: {
  events: TerminalSessionEvent[]
  onSelectCommand: (command: string) => void
}) {
  if (events.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center" style={{ color: 'var(--accent)' }}>
            <Activity size={11} />
          </span>
          Session Activity
        </div>
        <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {events.length} events
        </span>
      </div>
      <div className="grid gap-1.5">
        {events.map((event) => {
          const tone = getSessionEventTone(event.kind)
          const hasCommand = Boolean(event.command)
          const inner = (
            <div className="flex items-start gap-2 w-full">
              <div className="mt-0.5 shrink-0">
                {getSessionEventIcon(event.kind)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {event.message}
                  </div>
                  <span className="shrink-0 text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {formatSessionEventTimestamp(event.timestampMs)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[9px] truncate" style={{ color: hasCommand ? tone : 'var(--text-muted)' }}>
                  {event.command || event.cwd}
                </div>
                {(event.durationMs !== null || event.exitCode !== null) && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {event.durationMs !== null && (
                      <span className="rounded-md px-1.5 py-0.5 text-[8px] font-mono" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                        {formatCommandDuration(event.durationMs)}
                      </span>
                    )}
                    {event.exitCode !== null && (
                      <span className="rounded-md px-1.5 py-0.5 text-[8px] font-mono" style={{ background: event.exitCode === 0 ? 'rgba(166,227,161,0.08)' : 'rgba(255,71,87,0.08)', color: event.exitCode === 0 ? '#a6e3a1' : 'var(--error)' }}>
                        exit {event.exitCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )

          if (hasCommand && event.command) {
            return (
              <button
                key={event.id}
                onClick={() => onSelectCommand(event.command!)}
                className="rounded-xl px-3 py-2 text-left transition-all hover:-translate-y-[1px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                title={`Reuse command: ${event.command}`}
              >
                {inner}
              </button>
            )
          }

          return (
            <div
              key={event.id}
              className="rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
})

const TerminalPaneUI = React.memo(function TerminalPaneUI({ pane, paneIndex = 0, isOnly, onMaximize, isMaximized, isFocused, broadcastPanes, shellName, osName, capabilities, onActivate, onSplitRight, onSplitDown, compactMode = false }: {
  pane: TerminalPane
  paneIndex?: number
  isOnly: boolean
  onMaximize: () => void
  isMaximized: boolean
  isFocused: boolean
  broadcastPanes?: TerminalPane[]
  shellName: string
  osName: string
  capabilities?: TerminalCapabilities | null
  onActivate?: () => void
  onSplitRight?: () => void
  onSplitDown?: () => void
  compactMode?: boolean
}) {
  const addCommandBlock = useStore((s) => s.addCommandBlock)
  const toggleCommandCollapse = useStore((s) => s.toggleCommandCollapse)
  const setPaneWorkingDirectory = useStore((s) => s.setPaneWorkingDirectory)
  const clearPaneCommands = useStore((s) => s.clearPaneCommands)
  const setPaneRunning = useStore((s) => s.setPaneRunning)
  const setPaneRuntimeSession = useStore((s) => s.setPaneRuntimeSession)
  const addToCommandHistory = useStore((s) => s.addToCommandHistory)
  const commandAliases = useStore((s) => s.commandAliases)
  const starredCommands = useStore((s) => s.starredCommands)
  const commandSnippets = useStore((s) => s.commandSnippets)
  const pendingTerminalCommand = useStore((s) => s.pendingTerminalCommand)
  const consumePendingTerminalCommand = useStore((s) => s.consumePendingTerminalCommand)
  const pendingVoiceTranscript = useStore((s) => s.pendingVoiceTranscript)
  const consumeVoiceTranscript = useStore((s) => s.consumeVoiceTranscript)
  const toggleStarCommand = useStore((s) => s.toggleStarCommand)
  const addCommandSnippet = useStore((s) => s.addCommandSnippet)
  const markPaneShellBootstrapped = useStore((s) => s.markPaneShellBootstrapped)

  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [running, setRunning] = useState(false)
  const [ptyMode, setPtyMode] = useState(true)
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
  const commandCountRef = useRef(pane.commands.length)
  const liveStreamSequenceRef = useRef(0)
  const expectedLiveCommandIdRef = useRef<string | null>(null)
  const runtimeLastCommandRef = useRef<string | null>(pane.runtimeSession?.lastCommand ?? null)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fontSize, setFontSize] = useState(12)
  const [filter, setFilter] = useState<'all' | 'success' | 'errors'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [gitBranch, setGitBranch] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [insight, setInsight] = useState<WorkingDirectoryInsight | null>(null)
  const [sessionEvents, setSessionEvents] = useState<TerminalSessionEvent[]>([])
  const [liveCommandBlock, setLiveCommandBlock] = useState<LiveCommandBlockState | null>(null)
  const activeCommandId = useRef<string | null>(null)
  const persistedHistory = useMemo(() => pane.commandHistory ?? EMPTY_COMMAND_HISTORY, [pane.commandHistory])
  const runtimeSessionId = pane.runtimeSessionId ?? pane.id
  const runtimeSessionLabel = pane.label?.trim() || getPaneLabel(pane)
  const runtimeSessionKind = getPaneSessionKind(pane)
  const runtimeSession = pane.runtimeSession
  const runtimeBackendKind = runtimeSession?.backendKind ?? capabilities?.backendKind ?? 'persistent-pty'
  const supportsInteractiveInput = runtimeBackendKind === 'persistent-pty' && (capabilities?.interactiveInput ?? true)
  const supportsSessionResize = runtimeBackendKind === 'persistent-pty' && (capabilities?.sessionResize ?? true)
  const interactiveInputTerminator = osName.toLowerCase().includes('windows') ? '\r\n' : '\n'
  const isCommandRunning = Boolean(running || pane.isRunning)
  const isInteractiveInputMode = Boolean(isCommandRunning && supportsInteractiveInput)
  const runtimeSessionDisplayId = useMemo(
    () => (runtimeSession?.sessionId ?? runtimeSessionId).slice(0, 8),
    [runtimeSession?.sessionId, runtimeSessionId],
  )
  const savedSnippetCommands = useMemo(() => new Set(commandSnippets.map((snippet) => snippet.command)), [commandSnippets])
  const topRecommendedCommands = useMemo(() => insight?.recommendedCommands.slice(0, 4) ?? [], [insight])
  const quickWorkflowSnippets = useMemo(() => commandSnippets.slice(0, 4), [commandSnippets])
  const favoriteCommands = useMemo(() => starredCommands.slice(0, 4), [starredCommands])
  const paneShellName = useMemo(
    () => runtimeSession?.shell
      ? getFriendlyShellName(runtimeSession.shell)
      : getShellKindLabel(pane.shellKind) ?? shellName,
    [runtimeSession?.shell, pane.shellKind, shellName],
  )

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [liveCommandBlock?.output, pane.commands])

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isFocused])

  useEffect(() => {
    commandCountRef.current = pane.commands.length
  }, [pane.commands.length])

  useEffect(() => {
    runtimeLastCommandRef.current = runtimeSession?.lastCommand ?? null
  }, [runtimeSession?.lastCommand])

  useEffect(() => {
    if (!isFocused || !pendingTerminalCommand || isCommandRunning) {
      return
    }

    setInput(pendingTerminalCommand)
    setShowSuggestions(false)
    setHistoryIndex(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
    consumePendingTerminalCommand()
  }, [consumePendingTerminalCommand, isCommandRunning, isFocused, pendingTerminalCommand])

  useEffect(() => {
    if (!isFocused || !pendingVoiceTranscript) return
    setInput((prev) => prev + pendingVoiceTranscript)
    setShowSuggestions(false)
    setHistoryIndex(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
    consumeVoiceTranscript()
  }, [consumeVoiceTranscript, isFocused, pendingVoiceTranscript])

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
    if (!liveCommandBlock) {
      return
    }

    if (pane.commands.length > liveCommandBlock.baselineCommandCount) {
      liveStreamSequenceRef.current = 0
      expectedLiveCommandIdRef.current = null
      setLiveCommandBlock(null)
    }
  }, [liveCommandBlock, pane.commands.length])

  useEffect(() => {
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
      finishExecution()
      liveStreamSequenceRef.current = 0
      expectedLiveCommandIdRef.current = null
      setLiveCommandBlock(null)
    }
  }, [finishExecution])

  useEffect(() => {
    let cancelled = false
    getGitBranch(pane.cwd).then((b) => { if (!cancelled) setGitBranch(b) })
    return () => { cancelled = true }
  }, [pane.cwd])

  useEffect(() => {
    let cancelled = false
    inspectWorkingDirectory(pane.cwd).then((nextInsight) => {
      if (!cancelled) {
        setInsight(nextInsight)
      }
    })
    return () => { cancelled = true }
  }, [pane.cwd])

  useEffect(() => {
    if (ptyMode) return
    let cancelled = false

    ensureTerminalSession(runtimeSessionId, pane.cwd, runtimeSessionLabel, runtimeSessionKind).then((snapshot) => {
      if (!cancelled) {
        setPaneRuntimeSession(pane.id, snapshot)
      }
    }).catch(() => {})

    return () => { cancelled = true }
  }, [pane.cwd, pane.id, ptyMode, runtimeSessionId, runtimeSessionKind, runtimeSessionLabel, setPaneRuntimeSession])

  useEffect(() => {
    const bootstrapCommand = pane.shellBootstrapCommand?.trim()
    const sessionCreatedAtMs = runtimeSession?.createdAtMs ?? null

    if (!bootstrapCommand || !sessionCreatedAtMs) {
      return
    }

    if (pane.bootstrappedShellSessionCreatedAtMs === sessionCreatedAtMs) {
      return
    }

    const staggerDelay = 1000 + (paneIndex * 1500)
    const timer = window.setTimeout(() => {
      void writeTerminalSessionInput(runtimeSessionId, `${bootstrapCommand}${interactiveInputTerminator}`).then((sent) => {
        if (sent) {
          markPaneShellBootstrapped(pane.id, sessionCreatedAtMs)
        }
      }).catch(() => {})
    }, staggerDelay)

    return () => window.clearTimeout(timer)
  }, [
    interactiveInputTerminator,
    markPaneShellBootstrapped,
    pane.bootstrappedShellSessionCreatedAtMs,
    pane.id,
    pane.shellBootstrapCommand,
    paneIndex,
    runtimeSession?.createdAtMs,
    runtimeSessionId,
  ])

  useEffect(() => {
    let cancelled = false

    getTerminalSessionEvents(runtimeSessionId, 6).then((events) => {
      if (!cancelled) {
        setSessionEvents(events)
      }
    }).catch(() => {
      if (!cancelled) {
        setSessionEvents([])
      }
    })

    return () => { cancelled = true }
  }, [runtimeSession?.updatedAtMs, runtimeSessionId])

  useEffect(() => {
    let disposed = false
    let unlisten: (() => void) | null = null

    void listenToTerminalSessionLiveEvents((payload) => {
      if (payload.sessionSnapshot.sessionId !== runtimeSessionId) {
        return
      }

      setPaneRuntimeSession(pane.id, payload.sessionSnapshot)
      runtimeLastCommandRef.current = payload.sessionSnapshot.lastCommand ?? runtimeLastCommandRef.current

      const liveEvent = payload.event
      if (liveEvent) {
        setSessionEvents((previous) => {
          const nextEvents = [liveEvent, ...previous.filter((event) => event.id !== liveEvent.id)]
          return nextEvents.slice(0, 6)
        })

        if (liveEvent.kind === 'command-started') {
          const nextCommandId = liveEvent.commandId ?? null
          const isSameCommand = expectedLiveCommandIdRef.current === nextCommandId

          if (!isSameCommand) {
            liveStreamSequenceRef.current = 0
          }
          expectedLiveCommandIdRef.current = nextCommandId

          setLiveCommandBlock((previous) => ({
            commandId: nextCommandId,
            command: liveEvent.command ?? payload.sessionSnapshot.lastCommand ?? 'Running command',
            output: isSameCommand ? previous?.output ?? '' : '',
            startedAtMs: liveEvent.timestampMs,
            baselineCommandCount: commandCountRef.current,
          }))
        }
      }
    }).then((dispose) => {
      if (disposed) {
        dispose()
      } else {
        unlisten = dispose
      }
    }).catch(() => {})

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [pane.id, runtimeSessionId, setPaneRuntimeSession])

  useEffect(() => {
    let disposed = false
    let unlisten: (() => void) | null = null

    void listenToTerminalSessionStreamEvents((payload) => {
      if (payload.sessionId !== runtimeSessionId) {
        return
      }

      if (payload.sequence <= liveStreamSequenceRef.current) {
        return
      }
      liveStreamSequenceRef.current = payload.sequence
      expectedLiveCommandIdRef.current = payload.commandId ?? expectedLiveCommandIdRef.current

      setLiveCommandBlock((previous) => {
        if (!previous) {
          return {
            commandId: payload.commandId,
            command: runtimeLastCommandRef.current ?? 'Running command',
            output: payload.chunk,
            startedAtMs: Date.now(),
            baselineCommandCount: commandCountRef.current,
          }
        }

        if (previous.commandId && payload.commandId && previous.commandId !== payload.commandId) {
          expectedLiveCommandIdRef.current = payload.commandId
          return {
            commandId: payload.commandId,
            command: runtimeLastCommandRef.current ?? 'Running command',
            output: payload.chunk,
            startedAtMs: Date.now(),
            baselineCommandCount: commandCountRef.current,
          }
        }

        return {
          ...previous,
          commandId: previous.commandId ?? payload.commandId,
          output: previous.output + payload.chunk,
        }
      })
    }).then((dispose) => {
      if (disposed) {
        dispose()
      } else {
        unlisten = dispose
      }
    }).catch(() => {})

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [runtimeSessionId])

  useEffect(() => {
    if (!supportsSessionResize || typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId: number | null = null
    const emitResize = () => {
      const container = scrollRef.current
      if (!container) {
        return
      }

      const cols = Math.max(40, Math.floor(container.clientWidth / Math.max(fontSize * 0.62, 7)))
      const rows = Math.max(12, Math.floor(container.clientHeight / Math.max(fontSize * 1.7, 16)))
      void resizeTerminalSession(runtimeSessionId, cols, rows)
    }

    emitResize()

    const observer = new ResizeObserver(() => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      frameId = requestAnimationFrame(emitResize)
    })

    if (scrollRef.current) {
      observer.observe(scrollRef.current)
    }

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
      observer.disconnect()
    }
  }, [fontSize, runtimeSessionId, supportsSessionResize])

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

  const primeCommand = useCallback((command: string) => {
    if (runningRef.current) return
    setInput(command)
    setShowSuggestions(false)
    setHistoryIndex(-1)
    inputRef.current?.focus()
  }, [])

  const saveSnippet = useCallback((command: string) => {
    if (!command.trim() || savedSnippetCommands.has(command)) {
      return
    }

    addCommandSnippet({
      id: generateId(),
      name: buildSnippetName(command),
      command,
    })
  }, [addCommandSnippet, savedSnippetCommands])

  const cancelCommand = useCallback(async () => {
    const commandId = activeCommandId.current ?? runtimeSession?.activeCommandId
    if (commandId) {
      await cancelRunningCommand(commandId)
      activeCommandId.current = null
    }
    const snapshot = await getTerminalSessionSnapshot(runtimeSessionId)
    if (snapshot) {
      setPaneRuntimeSession(pane.id, snapshot)
    }
    finishExecution()
  }, [finishExecution, pane.id, runtimeSession?.activeCommandId, runtimeSessionId, setPaneRuntimeSession])

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

    if (isInteractiveCommand(resolved) && supportsInteractiveInput) {
      setInput('')
      addToCommandHistory(pane.id, command)
      setHistoryIndex(-1)
      setPtyMode(true)
      setTimeout(() => {
        void writeTerminalSessionInput(
          runtimeSessionId,
          `${resolved}${interactiveInputTerminator}`,
        )
      }, 150)
      return
    }
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

    const runInPane = async (targetPane: TerminalPane) => {
      try {
        const pCmdId = targetPane.id === pane.id ? cmdId : generateId()
        const sessionResult = await runTerminalSessionCommand(
          targetPane.runtimeSessionId ?? targetPane.id,
          resolved,
          targetPane.cwd,
          targetPane.label?.trim() || getPaneLabel(targetPane),
          getPaneSessionKind(targetPane),
          pCmdId,
        )
        const result = sessionResult.result
        const suffix = result.cancelled ? ' [CANCELLED]' : ''
        const outputText = formatCommandOutput(result.stdout, result.stderr) + suffix
        const lineCount = outputText.split('\n').length
        setPaneRuntimeSession(targetPane.id, sessionResult.sessionSnapshot)
        addCommandBlock(targetPane.id, {
          id: generateId(),
          command: command + (resolved !== command ? ` → ${resolved}` : '') + (targetPane.id !== pane.id ? ' [broadcast]' : ''),
          output: outputText,
          exitCode: result.exitCode,
          timestamp: new Date().toLocaleTimeString(),
          isCollapsed: lineCount > AUTO_COLLAPSE_THRESHOLD,
          duration: formatCommandDuration(result.durationMs),
        })
        if (sessionResult.sessionSnapshot.cwd && sessionResult.sessionSnapshot.cwd !== targetPane.cwd) {
          setPaneWorkingDirectory(targetPane.id, sessionResult.sessionSnapshot.cwd)
        } else if (result.resolvedCwd && result.resolvedCwd !== targetPane.cwd) {
          setPaneWorkingDirectory(targetPane.id, result.resolvedCwd)
        }
      } catch (error) {
        const snapshot = await getTerminalSessionSnapshot(targetPane.runtimeSessionId ?? targetPane.id)
        if (snapshot) {
          setPaneRuntimeSession(targetPane.id, snapshot)
        }
        addCommandBlock(targetPane.id, {
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

    const otherPanes = broadcastPanes?.filter((p) => p.id !== pane.id) ?? []

    try {
      if (broadcastPanes && broadcastPanes.length > 0) {
        otherPanes.forEach((p) => setPaneRunning(p.id, true))
        await Promise.all([
          runInPane(pane),
          ...otherPanes.map((targetPane) => runInPane(targetPane)),
        ])
      } else {
        await runInPane(pane)
      }
    } finally {
      otherPanes.forEach((p) => setPaneRunning(p.id, false))
      activeCommandId.current = null
      setPaneRunning(pane.id, false)
      finishExecution(executionToken)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isInteractiveInputMode) {
      const sent = await writeTerminalSessionInput(
        runtimeSession?.sessionId ?? runtimeSessionId,
        `${input}${interactiveInputTerminator}`,
      )

      if (sent) {
        setInput('')
        setHistoryIndex(-1)
        setShowSuggestions(false)
        requestAnimationFrame(() => inputRef.current?.focus())
        return
      }

      const snapshot = await getTerminalSessionSnapshot(runtimeSession?.sessionId ?? runtimeSessionId)
      if (snapshot) {
        setPaneRuntimeSession(pane.id, snapshot)
      }
      return
    }

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

  const AUTO_COLLAPSE_THRESHOLD = 200

  const successCount = pane.commands.filter((c) => c.exitCode === 0).length
  const errorCount = pane.commands.filter((c) => c.exitCode !== 0).length
  const recommendedDockItems = useMemo(
    () => topRecommendedCommands.map((item) => ({
      id: item.id,
      label: item.label,
      command: item.command,
      reason: item.reason,
    })),
    [topRecommendedCommands],
  )
  const workflowDockItems = useMemo(
    () => quickWorkflowSnippets.map((snippet) => ({
      id: snippet.id,
      label: snippet.name,
      command: snippet.command,
      reason: 'Saved reusable workflow snippet.',
    })),
    [quickWorkflowSnippets],
  )
  const favoriteDockItems = useMemo(
    () => favoriteCommands.map((command) => ({
      id: `favorite-${command}`,
      label: buildSnippetName(command),
      command,
      reason: 'Starred command from your operator toolkit.',
    })),
    [favoriteCommands],
  )
  const hasCommandDock = Boolean(
    capabilities
    || insight
    || runtimeSession
    || recommendedDockItems.length > 0
    || workflowDockItems.length > 0
    || favoriteDockItems.length > 0,
  )
  const shouldShowCommandDock = hasCommandDock && !isCommandRunning && !compactMode && pane.commands.length === 0
  const shouldShowSessionTimeline = false

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
      onMouseDown={() => onActivate?.()}
      style={{
        background: 'var(--terminal-bg)',
        border: `1px solid ${(focused || isFocused) ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: (focused || isFocused) ? '0 0 0 1px var(--accent), 0 4px 24px rgba(79,140,255,0.08)' : '0 2px 12px rgba(0,0,0,0.2)',
      }}
    >
      {/* ── Pane header - macOS style ── */}
      <div className={`flex items-center gap-2 shrink-0 ${compactMode ? 'px-3 py-1.5' : 'px-4 py-2'}`} style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {!compactMode && (
          <div className="flex items-center gap-1.5 mr-1">
            <Circle size={7} fill="var(--error)" style={{ color: 'var(--error)', opacity: 0.8 }} />
            <Circle size={7} fill="var(--warning)" style={{ color: 'var(--warning)', opacity: 0.8 }} />
            <Circle size={7} fill="var(--success)" style={{ color: 'var(--success)', opacity: 0.8 }} />
          </div>
        )}

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
          {!compactMode && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md tracking-wider"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
            {runtimeSession?.sessionKind ?? runtimeSessionKind}
          </span>}
          {!compactMode && <span className="hidden lg:flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={8} />
            {runtimeBackendKind}
          </span>}
          {!compactMode && <span className="hidden lg:flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
            <Hash size={8} />
            {runtimeSessionDisplayId}
          </span>}
          {!compactMode && runtimeSession && (
            <span className="hidden xl:flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(79,140,255,0.08)', color: 'var(--accent)' }}>
              <Activity size={8} />
              {runtimeSession.executionCount} runs
            </span>
          )}
          {!compactMode && gitBranch && (
            <span className="flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(166,227,161,0.08)', color: '#a6e3a1' }}>
              <GitBranch size={8} /> {gitBranch}
            </span>
          )}
          {!compactMode && <span className="hidden md:flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
            {paneShellName}
          </span>}
          {isCommandRunning && (
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
          {isCommandRunning && (
            <button onClick={cancelCommand}
              className="flex items-center gap-1 text-[8px] font-bold uppercase px-2 py-1 rounded-md transition-all hover:bg-[rgba(255,71,87,0.2)]"
              style={{ color: 'var(--error)', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}
              title="Cancel running command (kill process)">
              <StopCircle size={10} /> STOP
            </button>
          )}
          {pane.commands.length > 0 && !isCommandRunning && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md mr-1" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', display: compactMode ? 'none' : 'inline-flex' }}>
              {successCount}✓{errorCount > 0 && <span style={{ color: 'var(--error)' }}> {errorCount}✗</span>}
            </span>
          )}
          {onSplitRight && (
            <button onClick={onSplitRight} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Split Right (Ctrl+D)" style={{ color: 'var(--text-muted)' }}>
              <Columns2 size={12} />
            </button>
          )}
          {onSplitDown && (
            <button onClick={onSplitDown} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Split Down (Ctrl+Shift+D)" style={{ color: 'var(--text-muted)' }}>
              <Columns2 size={12} style={{ transform: 'rotate(90deg)' }} />
            </button>
          )}
          {!isOnly && (
            <button onClick={onMaximize} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title={isMaximized ? 'Restore' : 'Maximize'} style={{ color: 'var(--text-muted)' }}>
              {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
          {!compactMode && <button onClick={() => setShowCdBar(!showCdBar)} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Navigate (cd)" style={{ color: showCdBar ? 'var(--accent)' : 'var(--text-muted)' }}>
            <FolderOpen size={11} />
          </button>}
          {!compactMode && fontSize !== 12 && (
            <span className="text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>{fontSize}px</span>
          )}
          {!compactMode && <button onClick={() => setFontSize((s) => Math.min(20, s + 1))} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Zoom in (Ctrl++)" style={{ color: 'var(--text-muted)' }}>
            <ZoomIn size={11} />
          </button>}
          {!compactMode && <button onClick={() => setFontSize((s) => Math.max(8, s - 1))} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Zoom out (Ctrl+-)" style={{ color: 'var(--text-muted)' }}>
            <ZoomOut size={11} />
          </button>}
          {pane.commands.length > 0 && !compactMode && (
            <button onClick={exportAsMarkdown} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Export as Markdown" style={{ color: 'var(--text-muted)' }}>
              <FileDown size={11} />
            </button>
          )}
          <button onClick={() => clearPaneCommands(pane.id)} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Clear (Ctrl+L)" style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {ptyMode && (
        <PtyTerminalEmulator
          sessionId={runtimeSessionId}
          cwd={pane.cwd}
          paneIndex={paneIndex}
          totalPanes={useStore.getState().getActiveTerminalPanes().length}
          onExit={() => setPtyMode(false)}
        />
      )}

      {!ptyMode && shouldShowCommandDock && (
        <div className="shrink-0 px-4 py-3 space-y-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015))' }}>
          <div className="flex flex-wrap items-center gap-2">
            {insight && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(79,140,255,0.18)', background: 'rgba(79,140,255,0.08)', color: 'var(--accent)' }}>
                <BookOpen size={9} />
                {getProjectTypeLabel(insight.projectType)}
              </span>
            )}
            {insight?.packageManager && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                {insight.packageManager}
              </span>
            )}
            {insight?.isGitRepo && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(166,227,161,0.18)', background: 'rgba(166,227,161,0.08)', color: '#a6e3a1' }}>
                <GitBranch size={9} />
                Git
              </span>
            )}
            {insight?.hasDocker && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(255,191,98,0.18)', background: 'rgba(255,191,98,0.08)', color: 'var(--warning)' }}>
                <Cpu size={9} />
                Containers
              </span>
            )}
            {capabilities && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.03)', color: capabilities.persistentSessions ? 'var(--success)' : 'var(--warning)' }}>
                <ShieldCheck size={9} />
                {capabilities.executionMode}
              </span>
            )}
            {runtimeSession && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                <Terminal size={9} />
                {runtimeBackendKind}
              </span>
            )}
            {runtimeSession && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: 'rgba(79,140,255,0.18)', background: 'rgba(79,140,255,0.08)', color: 'var(--accent)' }}>
                  <Activity size={9} />
                  {runtimeSession.executionCount} executions
                </span>
                {runtimeSession.lastExitCode !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: runtimeSession.lastExitCode === 0 ? 'rgba(166,227,161,0.18)' : 'rgba(255,71,87,0.18)', background: runtimeSession.lastExitCode === 0 ? 'rgba(166,227,161,0.08)' : 'rgba(255,71,87,0.08)', color: runtimeSession.lastExitCode === 0 ? '#a6e3a1' : 'var(--error)' }}>
                    {runtimeSession.lastExitCode === 0 ? <Check size={9} /> : <X size={9} />}
                    exit {runtimeSession.lastExitCode}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <CommandDockGroup
              title="Recommended"
              icon={<Sparkles size={11} />}
              items={recommendedDockItems}
              accent="var(--accent)"
              onSelect={primeCommand}
            />
            <CommandDockGroup
              title="Favorites"
              icon={<Star size={11} />}
              items={favoriteDockItems}
              accent="var(--warning)"
              onSelect={primeCommand}
            />
            <CommandDockGroup
              title="Workflows"
              icon={<Workflow size={11} />}
              items={workflowDockItems}
              accent="var(--secondary)"
              onSelect={primeCommand}
            />
          </div>
        </div>
      )}

      {!ptyMode && shouldShowSessionTimeline && (
        <div className="shrink-0 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
          <SessionTimelinePanel events={sessionEvents} onSelectCommand={primeCommand} />
        </div>
      )}

      {/* ── Filter & Search bar ── */}
      {!ptyMode && (showSearch || filter !== 'all') && (
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
      {!ptyMode && <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ background: 'var(--terminal-bg)', fontSize: `${fontSize}px` }}
        onClick={() => inputRef.current?.focus()}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }) }}
      >
        {pane.commands.length === 0 && !liveCommandBlock && (
          compactMode ? (
            <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center">
              <div>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{getPaneLabel(pane)}</div>
                <div className="mt-2 text-[10px] font-mono break-all" style={{ color: 'var(--text-muted)' }}>{pane.cwd}</div>
              </div>
            </div>
          ) : <WelcomeMessage cwd={pane.cwd} shellName={paneShellName} osName={osName} />
        )}
        {filteredCommands.map((block) => (
          <CommandBlockUI
            key={block.id}
            block={block}
            onToggle={() => toggleCommandCollapse(pane.id, block.id)}
            onRerun={(cmd) => void executeCommand(cmd)}
            onToggleStar={toggleStarCommand}
            onSaveSnippet={saveSnippet}
            isStarred={starredCommands.includes(block.command.split(' → ')[0].replace(' [broadcast]', ''))}
            compactMode={compactMode}
          />
        ))}
        {filter !== 'all' && filteredCommands.length === 0 && pane.commands.length > 0 && (
          <div className="text-center py-6 text-[11px]" style={{ color: 'var(--text-muted)' }}>No {filter === 'errors' ? 'errors' : 'successes'} found. <button onClick={() => setFilter('all')} className="underline" style={{ color: 'var(--accent)' }}>Show all</button></div>
        )}
        {liveCommandBlock && (
          <LiveCommandBlockUI
            command={liveCommandBlock.command}
            output={liveCommandBlock.output}
            startedAtMs={liveCommandBlock.startedAtMs}
            compactMode={compactMode}
          />
        )}
        {isCommandRunning && !liveCommandBlock && <RunningIndicator paneId={pane.id} />}
      </div>}

      {/* ── Autocomplete suggestions ── */}
      {!ptyMode && showSuggestions && !isCommandRunning && !compactMode && (
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
      {!ptyMode && showCdBar && !compactMode && (
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
      {!ptyMode && showCdBar && !compactMode && (
        <div className="shrink-0 px-4 py-1" style={{ background: 'rgba(255,255,255,0.015)' }}>
          <div className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
            Use the browser above or jump with terminal-style navigation commands.
          </div>
        </div>
      )}

      {/* ── Input - Warp-style block input ── */}
      {!ptyMode && <form onSubmit={handleSubmit} className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className={`flex items-center gap-2.5 ${compactMode ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <span className="font-mono text-[14px] font-bold shrink-0" style={{ color: focused ? 'var(--accent)' : 'var(--text-muted)' }}>
            {isCommandRunning ? <Activity size={14} className="animate-spin" style={{ color: 'var(--accent)' }} /> : '❯'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              const nextValue = e.target.value
              setInput(nextValue)
              setHistoryIndex(-1)
              if (isInteractiveInputMode || isCommandRunning) {
                setShowSuggestions(false)
                return
              }
              updateSuggestions(nextValue)
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 200) }}
            onKeyDown={(e) => {
              if (e.key === 'c' && e.ctrlKey && isCommandRunning) {
                e.preventDefault()
                void cancelCommand()
                return
              }
              if (isInteractiveInputMode) {
                if (e.key === 'Escape') {
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
                return
              }
              if (isCommandRunning) return
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
            placeholder={isInteractiveInputMode ? 'Send input to running session...' : isCommandRunning ? 'Press Ctrl+C to cancel...' : 'Type a command...'}
            className={`flex-1 bg-transparent font-mono outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-50 ${compactMode ? 'text-[12px]' : 'text-[13px]'}`}
            style={{ color: 'var(--text-primary)' }}
            autoFocus={isFocused}
            readOnly={isCommandRunning && !supportsInteractiveInput}
          />
          <div className="flex items-center gap-2 shrink-0">
            {isCommandRunning && (
              <button type="button" onClick={() => void cancelCommand()}
                className="flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-1 rounded-md transition-all hover:bg-[rgba(255,71,87,0.15)]"
                style={{ color: 'var(--error)', background: 'rgba(255,71,87,0.08)' }}>
                <X size={9} /> Cancel
              </button>
            )}
            {isInteractiveInputMode && (
              <button
                type="submit"
                className="flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-1 rounded-md transition-all hover:opacity-90"
                style={{ color: '#04111d', background: 'var(--accent)' }}
              >
                <CornerDownLeft size={9} /> Send
              </button>
            )}
            {input && !isCommandRunning && !compactMode && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-1 rounded-md" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>
                <CornerDownLeft size={9} /> RUN
              </span>
            )}
            {persistedHistory.length > 0 && !input && !isCommandRunning && !compactMode && (
              <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)' }}>
                <ArrowUp size={9} /> {persistedHistory.length}
              </span>
            )}
          </div>
        </div>
      </form>}

      {/* ── Pane status bar with breadcrumbs ── */}
      {!ptyMode && !compactMode && <div className="shrink-0 flex items-center justify-between px-3 py-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.12)' }}>
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
      </div>}

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
  const runtimeSession = pane.runtimeSession
  const runtimeSessionDisplayId = (runtimeSession?.sessionId ?? pane.runtimeSessionId ?? pane.id).slice(0, 6)
  const sessionKind = runtimeSession?.sessionKind ?? getPaneSessionKind(pane)
  const lastExitCode = runtimeSession?.lastExitCode ?? null
  const hasErrors = lastExitCode !== null ? lastExitCode !== 0 : pane.commands.some((c) => c.exitCode !== 0)
  const isRunning = pane.isRunning ?? runtimeSession?.isRunning ?? false
  const executionCount = runtimeSession?.executionCount ?? 0
  const lastCommandPreview = runtimeSession?.lastCommand ? buildSnippetName(runtimeSession.lastCommand) : null
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
          <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {sessionKind}
          </span>
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
          {executionCount > 0 && !isRunning && (
            <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {executionCount} run{executionCount !== 1 ? 's' : ''}
            </span>
          )}
          {executionCount === 0 && cmdCount > 0 && !isRunning && (
            <span className="text-[8px] font-mono" style={{ color: hasErrors ? 'var(--error)' : 'var(--text-muted)' }}>
              {cmdCount} cmd{cmdCount !== 1 ? 's' : ''}
            </span>
          )}
          {lastExitCode !== null && !isRunning && (
            <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ color: lastExitCode === 0 ? '#a6e3a1' : 'var(--error)', background: lastExitCode === 0 ? 'rgba(166,227,161,0.08)' : 'rgba(255,71,87,0.08)' }}>
              exit {lastExitCode}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
          <span className="text-[7px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
            #{runtimeSessionDisplayId}
          </span>
          <span className="text-[8px] font-mono truncate" style={{ color: hasErrors ? 'var(--error)' : 'var(--text-muted)' }}>
            {lastCommandPreview || pane.cwd}
          </span>
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
  const setActivePane = useStore((s) => s.setActivePane)
  const addPaneToActiveWorkspace = useStore((s) => s.addPaneToActiveWorkspace)
  const setActiveWorkspaceSplitDirection = useStore((s) => s.setActiveWorkspaceSplitDirection)

  const terminalPanes = useMemo(
    () => (activeTabId ? (terminalSessions[activeTabId] ?? []) : []),
    [activeTabId, terminalSessions]
  )

  const activeWorkspace = useMemo(
    () => workspaceTabs.find((tab) => tab.id === activeTabId) ?? null,
    [workspaceTabs, activeTabId]
  )

  const preferredViewMode: ViewMode = terminalPanes.length <= 1 ? 'focus'
    : terminalPanes.length <= 2 ? 'split'
    : terminalPanes.length <= 4 ? 'quad'
    : 'grid'

  const [viewMode, setViewMode] = useState<ViewMode>(preferredViewMode)
  const [activePaneId, setActivePaneId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [broadcastMode, setBroadcastMode] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [zenMode, setZenMode] = useState(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [capabilities, setCapabilities] = useState<TerminalCapabilities | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const previousTabIdRef = useRef<string | null>(null)
  const trackedRuntimeSessionIdsRef = useRef<string[]>([])
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    dragCounterRef.current = 0

    if (!isTauriApp()) return

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const paths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if ((file as File & { path?: string }).path) {
        paths.push((file as File & { path?: string }).path as string)
      } else if (file.name) {
        paths.push(file.name)
      }
    }

    if (paths.length === 0) return

    const results = await handleDroppedFiles(paths)
    if (results.length === 0) return

    const targetPane = terminalPanes.find((p) => p.id === activePaneId)
      ?? terminalPanes.find((p) => p.isActive)
      ?? terminalPanes[0]

    if (!targetPane) return

    const sessionId = targetPane.runtimeSessionId ?? targetPane.id

    for (const result of results) {
      if (result.isImage && result.iterm2Sequence) {
        await writeTerminalSessionInput(sessionId, result.iterm2Sequence)
      } else {
        const pathText = results.length === 1
          ? result.escapedPath
          : result.escapedPath + ' '
        await writeTerminalSessionInput(sessionId, pathText)
      }
    }
  }, [activePaneId, terminalPanes])

  const runningPanes = terminalPanes.filter((p) => p.isRunning).length
  const defaultShellName = systemInfo ? getFriendlyShellName(systemInfo.shell) : getClientShellFallback()
  const osName = systemInfo ? getFriendlyOsName(systemInfo.os) : getClientOsFallback()
  const allRuntimeSessionIds = useMemo(
    () => Object.values(terminalSessions).flatMap((panes) => panes.map((pane) => pane.runtimeSessionId ?? pane.id)),
    [terminalSessions],
  )
  const activePane = useMemo(
    () => terminalPanes.find((pane) => pane.id === activePaneId)
      ?? terminalPanes.find((pane) => pane.isActive)
      ?? terminalPanes[0]
      ?? null,
    [activePaneId, terminalPanes],
  )
  const shellName = useMemo(
    () => activePane?.runtimeSession?.shell
      ? getFriendlyShellName(activePane.runtimeSession.shell)
      : getShellKindLabel(activePane?.shellKind) ?? defaultShellName,
    [activePane?.runtimeSession?.shell, activePane?.shellKind, defaultShellName],
  )
  const activatePane = useCallback((paneId: string) => {
    setActivePaneId(paneId)
    setActivePane(paneId)
  }, [setActivePane])

  const splitFromPane = useCallback((pane: TerminalPane | null, direction: 'vertical' | 'horizontal') => {
    if (!pane) {
      return
    }

    setActiveWorkspaceSplitDirection(direction)
    addPaneToActiveWorkspace({
      anchorPaneId: pane.id,
      workingDirectory: pane.cwd,
      shellKind: pane.shellKind,
      splitDirection: direction,
    })
    setViewMode('grid')
  }, [addPaneToActiveWorkspace, setActiveWorkspaceSplitDirection])

  useEffect(() => {
    let cancelled = false

    void getSystemInfo().then((info) => {
      if (!cancelled && info) {
        setSystemInfo(info)
      }
    })

    void getTerminalCapabilities().then((runtimeCapabilities) => {
      if (!cancelled && runtimeCapabilities) {
        setCapabilities(runtimeCapabilities)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  // Sync active pane with available panes
  useEffect(() => {
    const storeActivePaneId = terminalPanes.find((pane) => pane.isActive)?.id ?? terminalPanes[0]?.id ?? null

    if (storeActivePaneId && storeActivePaneId !== activePaneId) {
      setActivePaneId(storeActivePaneId)
    }
  }, [terminalPanes, activePaneId])

  useEffect(() => {
    if (activeTabId && previousTabIdRef.current !== activeTabId) {
      setViewMode(preferredViewMode)
      previousTabIdRef.current = activeTabId
    }
  }, [activeTabId, preferredViewMode])

  useEffect(() => {
    const currentIds = Array.from(new Set(allRuntimeSessionIds))
    const currentIdSet = new Set(currentIds)
    const removedIds = trackedRuntimeSessionIdsRef.current.filter((sessionId) => !currentIdSet.has(sessionId))

    removedIds.forEach((sessionId) => {
      void closeTerminalSession(sessionId)
    })

    trackedRuntimeSessionIdsRef.current = currentIds
  }, [allRuntimeSessionIds])

  // Auto-select best view mode when pane count changes
  useEffect(() => {
    if (terminalPanes.length <= 1 && viewMode !== 'focus') {
      setViewMode('focus')
    } else if (terminalPanes.length <= 2 && (viewMode === 'quad' || viewMode === 'grid')) {
      setViewMode('split')
    } else if (terminalPanes.length <= 4 && viewMode === 'grid') {
      setViewMode('quad')
    }
  }, [terminalPanes.length, viewMode])

  // Keyboard shortcuts for pane navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+1-9 to switch panes
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        if (idx < terminalPanes.length) {
          activatePane(terminalPanes[idx].id)
          if (viewMode !== 'focus') setViewMode('focus')
        }
      }
      // F11 to toggle zen mode (fullscreen terminals only)
      if (e.key === 'F11') {
        e.preventDefault()
        setZenMode((z) => !z)
        return
      }
      // Alt+ArrowLeft/Right to navigate panes
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const currentIdx = terminalPanes.findIndex((p) => p.id === activePaneId)
        if (currentIdx >= 0) {
          const nextIdx = e.key === 'ArrowRight'
            ? (currentIdx + 1) % terminalPanes.length
            : (currentIdx - 1 + terminalPanes.length) % terminalPanes.length
          activatePane(terminalPanes[nextIdx].id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [terminalPanes, activePaneId, viewMode, activatePane])

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

  const workspaceActivityPanes = useMemo(
    () => [...terminalPanes]
      .filter((pane) => pane.runtimeSession)
      .sort((left, right) => {
        const leftRunning = left.runtimeSession?.isRunning || left.isRunning ? 1 : 0
        const rightRunning = right.runtimeSession?.isRunning || right.isRunning ? 1 : 0

        if (rightRunning !== leftRunning) {
          return rightRunning - leftRunning
        }

        return (right.runtimeSession?.updatedAtMs ?? 0) - (left.runtimeSession?.updatedAtMs ?? 0)
      })
      .slice(0, 4),
    [terminalPanes],
  )
  const workspaceBackendKind = useMemo(() => {
    const paneBackendKind = terminalPanes.find((pane) => pane.runtimeSession?.backendKind)?.runtimeSession?.backendKind
    return paneBackendKind || capabilities?.backendKind || 'persistent-pty'
  }, [capabilities?.backendKind, terminalPanes])
  const customGridColumns = useMemo(() => {
    if (viewMode !== 'grid') {
      return []
    }

    const positioned = terminalPanes
      .map((pane, originalIndex) => ({
        pane,
        originalIndex,
        column: getPaneLayoutColumn(pane, originalIndex),
        row: getPaneLayoutRow(pane),
      }))

    if (positioned.length === 0 || positioned.some((entry) => !hasExplicitPaneLayout(entry.pane))) {
      return []
    }

    const columns = Array.from(new Set(positioned.map((entry) => entry.column))).sort((left, right) => left - right)

    return columns.map((column) => (
      positioned
        .filter((entry) => entry.column === column)
        .sort((left, right) => (left.row - right.row) || (left.originalIndex - right.originalIndex))
    ))
  }, [terminalPanes, viewMode])
  const hasCustomGridLayout = customGridColumns.length > 0
  const splitDirection = activeWorkspace?.splitDirection ?? 'vertical'
  const gridCols = viewMode === 'focus' ? 1
    : viewMode === 'split' ? (splitDirection === 'horizontal' ? 1 : 2)
    : viewMode === 'quad' ? 2
    : getGridColumnsForPaneCount(terminalPanes.length)
  const gridRows = viewMode === 'split' && splitDirection === 'horizontal'
    ? 2
    : Math.ceil(visiblePanes.length / gridCols)
  const compactPaneMode = viewMode === 'grid' || visiblePanes.length >= 4
  const compactToolbar = viewMode === 'grid' || terminalPanes.length >= 4
  const showWorkspaceActivity = workspaceActivityPanes.length > 0 && !compactToolbar
  const showPaneSidebar = terminalPanes.length > 1 && !sidebarCollapsed && !compactToolbar

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
    <div
      className="h-full w-full flex flex-col overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: 'rgba(3,5,10,0.82)', backdropFilter: 'blur(8px)' }}>
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px]" style={{ background: 'linear-gradient(135deg, var(--accent), var(--secondary))', boxShadow: '0 20px 60px var(--accent-glow)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#04111d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Drop files here</div>
            <div className="text-[12px] max-w-xs text-center leading-5" style={{ color: 'var(--text-secondary)' }}>
              Files and folders will be inserted as shell-escaped paths. Images will render inline via iTerm2 protocol.
            </div>
          </div>
        </div>
      )}

      {/* ── Zen mode overlay hint ── */}
      {zenMode && (
        <div className="fixed top-2 right-2 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <button onClick={() => setZenMode(false)} className="text-[9px] font-bold uppercase px-2 py-1 rounded-md backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
            F11 Exit Zen
          </button>
        </div>
      )}

      {/* ── Top toolbar ── */}
      {!zenMode && <div className={`shrink-0 flex items-center justify-between gap-3 liquid-glass-heavy ${compactToolbar ? 'px-3 py-2' : 'px-4 py-3'}`} style={{ borderBottom: '1px solid var(--border)', borderRadius: 0 }}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal size={15} style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {activeWorkspace?.name ?? 'Terminal'}
            </span>
          </div>
          {!compactToolbar && <div className="h-4 w-px" style={{ background: 'var(--border)' }} />}
          {!compactToolbar && <span className="text-[10px] font-mono truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
            {activeWorkspace?.workingDirectory ?? terminalPanes[0]?.cwd}
          </span>}
          {!compactToolbar && <div className="hidden xl:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
              <Terminal size={9} />
              {shellName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
              {osName}
              {systemInfo?.arch ? ` · ${systemInfo.arch.toUpperCase()}` : ''}
            </span>
            {capabilities && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: capabilities.persistentSessions ? 'var(--success)' : 'var(--warning)' }}>
                <Cpu size={9} />
                {capabilities.persistentSessions ? 'Persistent PTY' : 'Stateless Shell'}
              </span>
            )}
            {capabilities?.safeCancellation && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--info)' }}>
                <ShieldCheck size={9} />
                Safe Cancel
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
              <Terminal size={9} />
              {workspaceBackendKind}
            </span>
          </div>}
          {compactToolbar && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: runningPanes > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <LayoutGrid size={9} />
              {terminalPanes.length} panes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className={`items-center gap-3 text-[9px] font-mono mr-2 ${compactToolbar ? 'hidden md:flex' : 'flex'}`} style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><LayoutGrid size={9} /> {terminalPanes.length}</span>
            {!compactToolbar && <span className="flex items-center gap-1"><Terminal size={9} /> {totalCmds}</span>}
            {!compactToolbar && activeAgents > 0 && <span className="flex items-center gap-1" style={{ color: 'var(--accent)' }}><Bot size={9} /> {activeAgents}</span>}
            {runningPanes > 0 && (
              <span className="flex items-center gap-1 animate-pulse" style={{ color: 'var(--accent)' }}>
                <Activity size={9} /> {runningPanes} running
              </span>
            )}
          </div>

          {terminalPanes.length > 1 && (
            <button
              onClick={() => setBroadcastMode(!broadcastMode)}
              className={`flex items-center gap-1 text-[8px] font-bold uppercase rounded-md transition-all ${compactToolbar ? 'px-1.5 py-1' : 'px-2 py-1'}`}
              style={{
                background: broadcastMode ? 'rgba(255,71,87,0.12)' : 'rgba(255,255,255,0.03)',
                color: broadcastMode ? 'var(--error)' : 'var(--text-muted)',
                border: broadcastMode ? '1px solid rgba(255,71,87,0.3)' : '1px solid transparent',
              }}
              title="Broadcast mode: run commands in all panes simultaneously"
            >
              <Zap size={9} /> {broadcastMode ? 'BROADCAST ON' : compactToolbar ? 'Broadcast' : 'Broadcast'}
            </button>
          )}

          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => splitFromPane(activePane, 'vertical')}
              disabled={!activePane}
              className="p-1.5 rounded-lg transition-all disabled:opacity-40"
              title="Split Right (Ctrl+D)"
              style={{ color: 'var(--text-muted)' }}
            >
              <Columns2 size={12} />
            </button>
            <button
              onClick={() => splitFromPane(activePane, 'horizontal')}
              disabled={!activePane}
              className="p-1.5 rounded-lg transition-all disabled:opacity-40"
              title="Split Down (Ctrl+Shift+D)"
              style={{ color: 'var(--text-muted)' }}
            >
              <Columns2 size={12} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>

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
          {terminalPanes.length > 1 && !compactToolbar && (
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
      </div>}

      {!zenMode && showWorkspaceActivity && (
        <div className="shrink-0 px-4 py-2.5 flex items-center gap-2 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="shrink-0 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
            <Activity size={10} style={{ color: 'var(--accent)' }} />
            Workspace Activity
          </div>
          {workspaceActivityPanes.map((pane) => {
            const runtimeSession = pane.runtimeSession
            const isRunning = pane.isRunning ?? runtimeSession?.isRunning ?? false
            const lastExitCode = runtimeSession?.lastExitCode ?? null
            const sessionKind = runtimeSession?.sessionKind ?? getPaneSessionKind(pane)
            const updatedAtMs = runtimeSession?.updatedAtMs ?? 0
            const preview = runtimeSession?.lastCommand ? buildSnippetName(runtimeSession.lastCommand) : pane.cwd

            return (
              <button
                key={pane.id}
                onClick={() => {
                  activatePane(pane.id)
                }}
                className="shrink-0 min-w-[180px] rounded-xl px-3 py-2 text-left transition-all hover:-translate-y-[1px]"
                style={{
                  background: activePaneId === pane.id ? 'var(--accent-subtle)' : 'rgba(255,255,255,0.03)',
                  border: activePaneId === pane.id ? '1px solid rgba(79,140,255,0.28)' : '1px solid rgba(255,255,255,0.06)',
                }}
                title={preview}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {getPaneLabel(pane)}
                  </div>
                  <span className="text-[7px] font-bold uppercase tracking-[0.16em]" style={{ color: isRunning ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {sessionKind}
                  </span>
                </div>
                <div className="mt-1 text-[8px] font-mono truncate" style={{ color: lastExitCode !== null && lastExitCode !== 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                  {preview}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[7px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    #{(runtimeSession?.sessionId ?? pane.runtimeSessionId ?? pane.id).slice(0, 6)}
                  </span>
                  <div className="flex items-center gap-1.5 text-[7px] font-mono">
                    {updatedAtMs > 0 && (
                      <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={8} />
                        {formatSessionEventTimestamp(updatedAtMs)}
                      </span>
                    )}
                    {lastExitCode !== null && !isRunning && (
                      <span style={{ color: lastExitCode === 0 ? '#a6e3a1' : 'var(--error)' }}>
                        exit {lastExitCode}
                      </span>
                    )}
                    {isRunning && (
                      <span className="flex items-center gap-1 animate-pulse" style={{ color: 'var(--accent)' }}>
                        <Activity size={8} />
                        running
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Sidebar (pane list) ── */}
        {!zenMode && showPaneSidebar && (
          <div
            className="shrink-0 flex flex-col overflow-hidden transition-all duration-200 liquid-glass"
            style={{
              width: '170px',
              borderRight: '1px solid var(--border)',
              borderRadius: 0,
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
                    activatePane(pane.id)
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
        <div className={`flex-1 overflow-hidden min-w-0 ${compactPaneMode ? 'p-1' : 'p-1.5'}`}>
          {hasCustomGridLayout ? (
            <div className={`h-full flex ${compactPaneMode ? 'gap-1' : 'gap-1.5'}`}>
              {customGridColumns.map((column, columnIndex) => (
                <div key={`layout-column-${columnIndex}`} className={`flex min-w-0 flex-1 flex-col ${compactPaneMode ? 'gap-1' : 'gap-1.5'}`}>
                  {column.map(({ pane, originalIndex }) => (
                    <div key={pane.id} style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
                      <TerminalPaneUI
                        pane={pane}
                        paneIndex={originalIndex}
                        isOnly={terminalPanes.length === 1}
                        onActivate={() => activatePane(pane.id)}
                        onSplitRight={() => splitFromPane(pane, 'vertical')}
                        onSplitDown={() => splitFromPane(pane, 'horizontal')}
                        onMaximize={() => {
                          if (viewMode === 'focus' && activePaneId === pane.id) {
                            setViewMode(terminalPanes.length <= 2 ? 'split' : 'quad')
                          } else {
                            activatePane(pane.id)
                            setViewMode('focus')
                          }
                        }}
                        isMaximized={viewMode === 'focus' && activePaneId === pane.id && terminalPanes.length > 1}
                        isFocused={activePaneId === pane.id}
                        broadcastPanes={broadcastMode ? terminalPanes : undefined}
                        shellName={shellName}
                        osName={osName}
                        capabilities={capabilities}
                        compactMode={compactPaneMode}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className={`h-full grid ${compactPaneMode ? 'gap-1' : 'gap-1.5'}`} style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
            }}>
              {terminalPanes.map((pane, idx) => {
                const isVisible = visiblePanes.includes(pane)
                return (
                  <div key={pane.id} style={{ display: isVisible ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
                    <TerminalPaneUI
                      pane={pane}
                      paneIndex={idx}
                      isOnly={terminalPanes.length === 1}
                      onActivate={() => activatePane(pane.id)}
                      onSplitRight={() => splitFromPane(pane, 'vertical')}
                      onSplitDown={() => splitFromPane(pane, 'horizontal')}
                      onMaximize={() => {
                        if (viewMode === 'focus' && activePaneId === pane.id) {
                          setViewMode(terminalPanes.length <= 2 ? 'split' : 'quad')
                        } else {
                          activatePane(pane.id)
                          setViewMode('focus')
                        }
                      }}
                      isMaximized={viewMode === 'focus' && activePaneId === pane.id && terminalPanes.length > 1}
                      isFocused={activePaneId === pane.id}
                      broadcastPanes={broadcastMode ? terminalPanes : undefined}
                      shellName={shellName}
                      osName={osName}
                      capabilities={capabilities}
                      compactMode={compactPaneMode}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
