'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  GitBranch, GitCommit, RefreshCw, Plus, Minus, Check, X,
  ChevronDown, ChevronRight, ArrowUp, ArrowDown, Send
} from 'lucide-react'
import {
  getGitStatus, getGitLog, getGitDiff, gitStageFile, gitUnstageFile, gitCommit,
  type GitInfo, type GitLogEntry, type GitStatusEntry,
} from '@/lib/desktop'

const STATUS_COLORS: Record<string, string> = {
  modified: '#ffbf62',
  added: '#38dd92',
  deleted: '#ff6f96',
  untracked: '#8fc2ff',
  renamed: '#a78bfa',
  copied: '#28e7c5',
  unknown: 'var(--text-muted)',
}

const STATUS_LABELS: Record<string, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  untracked: '?',
  renamed: 'R',
  copied: 'C',
  unknown: '·',
}

export function GitPanel({ cwd, onClose }: { cwd: string; onClose?: () => void }) {
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null)
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [diff, setDiff] = useState<string>('')
  const [diffFile, setDiffFile] = useState<string | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'changes' | 'log'>('changes')
  const [expandStaged, setExpandStaged] = useState(true)
  const [expandUnstaged, setExpandUnstaged] = useState(true)

  const refresh = useCallback(async () => {
    if (!cwd) return
    setIsLoading(true)
    const [info, logEntries] = await Promise.all([getGitStatus(cwd), getGitLog(cwd, 30)])
    setGitInfo(info)
    setLog(logEntries)
    setIsLoading(false)
  }, [cwd])

  useEffect(() => { refresh() }, [refresh])

  const handleStage = useCallback(async (path: string) => {
    await gitStageFile(cwd, path)
    refresh()
  }, [cwd, refresh])

  const handleUnstage = useCallback(async (path: string) => {
    await gitUnstageFile(cwd, path)
    refresh()
  }, [cwd, refresh])

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim()) return
    await gitCommit(cwd, commitMsg.trim())
    setCommitMsg('')
    refresh()
  }, [cwd, commitMsg, refresh])

  const handleViewDiff = useCallback(async (path: string, staged: boolean) => {
    setDiffFile(path)
    const d = await getGitDiff(cwd, path, staged)
    setDiff(d)
  }, [cwd])

  if (!gitInfo) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--surface-0)', width: 300 }}>
        <div className="flex flex-col items-center gap-2">
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Loading git...</span>
        </div>
      </div>
    )
  }

  if (!gitInfo.is_repo) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--surface-0)', width: 300, borderLeft: '1px solid var(--border)' }}>
        <div className="text-center px-4">
          <GitBranch size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Not a git repository</div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Open a project with git init to use this panel</div>
        </div>
      </div>
    )
  }

  const staged = gitInfo.entries.filter((e) => e.staged)
  const unstaged = gitInfo.entries.filter((e) => !e.staged)

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)', width: 300, borderLeft: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <GitBranch size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{gitInfo.branch}</span>
          {gitInfo.ahead > 0 && <span className="text-[8px] flex items-center gap-0.5" style={{ color: 'var(--success)' }}><ArrowUp size={8} />{gitInfo.ahead}</span>}
          {gitInfo.behind > 0 && <span className="text-[8px] flex items-center gap-0.5" style={{ color: 'var(--warning)' }}><ArrowDown size={8} />{gitInfo.behind}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={refresh} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {onClose && <button onClick={onClose} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }}><X size={11} /></button>}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['changes', 'log'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ color: mode === m ? 'var(--accent)' : 'var(--text-muted)', borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent' }}>
            {m === 'changes' ? `Changes (${gitInfo.entries.length})` : `Log (${log.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'changes' && (
          <div className="py-1">
            {/* Staged */}
            <button onClick={() => setExpandStaged(!expandStaged)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider hover:bg-[rgba(255,255,255,0.03)]" style={{ color: 'var(--success)' }}>
              {expandStaged ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Staged ({staged.length})
            </button>
            {expandStaged && staged.map((entry) => (
              <FileStatusRow key={`s-${entry.path}`} entry={entry} onAction={() => handleUnstage(entry.path)} actionIcon={Minus} actionTitle="Unstage" onViewDiff={() => handleViewDiff(entry.path, true)} />
            ))}

            {/* Unstaged */}
            <button onClick={() => setExpandUnstaged(!expandUnstaged)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider hover:bg-[rgba(255,255,255,0.03)]" style={{ color: 'var(--warning)' }}>
              {expandUnstaged ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Changes ({unstaged.length})
            </button>
            {expandUnstaged && unstaged.map((entry) => (
              <FileStatusRow key={`u-${entry.path}`} entry={entry} onAction={() => handleStage(entry.path)} actionIcon={Plus} actionTitle="Stage" onViewDiff={() => handleViewDiff(entry.path, false)} />
            ))}

            {gitInfo.entries.length === 0 && (
              <div className="px-3 py-6 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <Check size={16} className="mx-auto mb-1" style={{ color: 'var(--success)' }} />
                Working tree clean
              </div>
            )}
          </div>
        )}

        {mode === 'log' && (
          <div className="py-1">
            {log.map((entry) => (
              <div key={entry.hash} className="flex items-start gap-2 px-3 py-2 hover:bg-[rgba(255,255,255,0.03)] transition-all">
                <GitCommit size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entry.message}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] font-mono" style={{ color: 'var(--accent)' }}>{entry.short_hash}</span>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{entry.author}</span>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{entry.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diff preview */}
      {diffFile && diff && (
        <div className="shrink-0 max-h-[200px] overflow-y-auto" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-3 py-1" style={{ background: 'var(--surface-1)' }}>
            <span className="text-[9px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{diffFile}</span>
            <button onClick={() => { setDiffFile(null); setDiff('') }} className="p-0.5 rounded hover:bg-[rgba(255,255,255,0.06)]"><X size={9} style={{ color: 'var(--text-muted)' }} /></button>
          </div>
          <pre className="px-3 py-2 text-[9px] font-mono leading-relaxed overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
            {diff.split('\n').map((line, i) => (
              <div key={i} style={{ color: line.startsWith('+') ? '#38dd92' : line.startsWith('-') ? '#ff6f96' : line.startsWith('@@') ? '#8fc2ff' : 'var(--text-muted)' }}>
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Commit input */}
      {mode === 'changes' && staged.length > 0 && (
        <div className="px-3 py-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <input type="text" value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommit() }}
              placeholder="Commit message..."
              className="flex-1 px-2 py-1.5 rounded-lg text-[11px] bg-transparent outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              spellCheck={false} />
            <button onClick={handleCommit} disabled={!commitMsg.trim()} className="p-1.5 rounded-lg transition-all disabled:opacity-30" style={{ color: 'var(--accent)', background: 'var(--accent-subtle)' }}>
              <Send size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FileStatusRow({ entry, onAction, actionIcon: ActionIcon, actionTitle, onViewDiff }: {
  entry: GitStatusEntry; onAction: () => void; actionIcon: React.ElementType; actionTitle: string; onViewDiff: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 group hover:bg-[rgba(255,255,255,0.03)] transition-all">
      <span className="w-4 text-[9px] font-mono font-bold text-center" style={{ color: STATUS_COLORS[entry.status] ?? 'var(--text-muted)' }}>
        {STATUS_LABELS[entry.status] ?? '·'}
      </span>
      <button onClick={onViewDiff} className="flex-1 text-left text-[10px] truncate hover:underline" style={{ color: 'var(--text-secondary)' }}>
        {entry.path}
      </button>
      <button onClick={onAction} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[rgba(255,255,255,0.1)] transition-all" title={actionTitle}>
        <ActionIcon size={10} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  )
}
