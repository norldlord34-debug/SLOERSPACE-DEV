'use client'

import React, { useState, useCallback } from 'react'
import {
  BarChart3, FolderOpen, Loader2, RefreshCw, FileCode,
  Clock, AlertCircle, Layers, TrendingUp
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { indexCodebase } from '@/lib/desktop'
import type { CodebaseStats, FileStat } from '@/lib/desktop'

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function formatLoc(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

function timeAgo(secs: number): string {
  const diff = Date.now() / 1000 - secs
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(secs * 1000).toLocaleDateString()
}

function FileRow({ file, onPreview }: { file: FileStat; onPreview: (f: FileStat) => void }) {
  return (
    <button
      onClick={() => onPreview(file)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all hover:bg-[rgba(255,255,255,0.04)]"
      style={{ border: '1px solid transparent' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
    >
      <FileCode size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</div>
        <div className="text-[8px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{file.path}</div>
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        <div className="text-[9px] font-mono" style={{ color: 'var(--accent)' }}>{formatLoc(file.line_count)} LOC</div>
        <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{file.language}</div>
      </div>
    </button>
  )
}

export function CodebaseView() {
  const activeWorkspace = useStore((s) => {
    const id = s.activeTabId
    return id ? s.workspaceTabs.find((t) => t.id === id) : null
  })
  const setFilePreviewPath = useStore((s) => s.setFilePreviewPath)
  const setView = useStore((s) => s.setView)

  const [stats, setStats] = useState<CodebaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pathInput, setPathInput] = useState(activeWorkspace?.workingDirectory ?? '')
  const [activeTab, setActiveTab] = useState<'languages' | 'largest' | 'recent'>('languages')

  const runIndex = useCallback(async (path: string) => {
    if (!path.trim()) return
    setLoading(true); setError(null); setStats(null)
    const result = await indexCodebase(path.trim())
    if (result) {
      setStats(result)
    } else {
      setError('Could not index the directory. Make sure the path exists and is accessible.')
    }
    setLoading(false)
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    void runIndex(pathInput)
  }, [pathInput, runIndex])

  const handlePreview = useCallback((file: FileStat) => {
    setFilePreviewPath(file.path)
    setView('file-preview')
  }, [setFilePreviewPath, setView])

  const maxLines = stats ? Math.max(...stats.by_language.map((l) => l.line_count), 1) : 1

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-2">
          <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Codebase Indexer</span>
          {stats && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>
              {formatLoc(stats.total_files)} files · {formatLoc(stats.total_lines)} LOC
            </span>
          )}
        </div>

        {/* Path input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 pb-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <FolderOpen size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="Path to project root…"
              className="flex-1 bg-transparent outline-none text-[11px] font-mono"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <button type="submit" disabled={!pathInput.trim() || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all disabled:opacity-40"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? 'Indexing…' : 'Index'}
          </button>
        </form>

        {/* Tab selector */}
        {stats && (
          <div className="flex items-center gap-0 px-4 pb-0" style={{ borderTop: '1px solid var(--border)' }}>
            {(['languages', 'largest', 'recent'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-4 py-2 text-[10px] font-medium capitalize border-b-2 transition-all"
                style={{
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottomColor: activeTab === tab ? 'var(--accent)' : 'transparent',
                }}>
                {tab === 'languages' ? 'Languages' : tab === 'largest' ? 'Largest Files' : 'Recently Modified'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <div className="text-[12px]" style={{ color: 'var(--text-primary)' }}>Indexing codebase…</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Skipping node_modules, .git, dist, build…</div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertCircle size={28} style={{ color: 'var(--error)' }} />
            <div className="text-[12px]" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}

        {/* Empty state */}
        {!stats && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Layers size={32} style={{ color: 'var(--text-muted)' }} />
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Index your codebase</div>
            <div className="text-[10px] text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Enter a directory path above to analyze your project&apos;s language breakdown, line counts, and file stats.
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && !loading && (
          <div className="px-4 py-4 space-y-3">

            {/* Summary cards */}
            {activeTab === 'languages' && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Files', value: formatLoc(stats.total_files), icon: FileCode },
                  { label: 'Total LOC', value: formatLoc(stats.total_lines), icon: TrendingUp },
                  { label: 'Total Size', value: formatBytes(stats.total_size), icon: BarChart3 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl px-3 py-2.5 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    <Icon size={14} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
                    <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
                    <div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Language bars */}
            {activeTab === 'languages' && (
              <div className="space-y-2">
                {stats.by_language.slice(0, 20).map((lang) => {
                  const pct = (lang.line_count / maxLines) * 100
                  const totalPct = stats.total_lines > 0 ? ((lang.line_count / stats.total_lines) * 100).toFixed(1) : '0'
                  return (
                    <div key={lang.extension} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: lang.color }} />
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{lang.language}</span>
                          <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>.{lang.extension}</span>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{lang.file_count} files</span>
                          <span className="text-[10px] font-mono font-bold w-14 text-right" style={{ color: 'var(--text-primary)' }}>{formatLoc(lang.line_count)}</span>
                          <span className="text-[9px] w-10 text-right" style={{ color: 'var(--text-muted)' }}>{totalPct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: lang.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Largest files */}
            {activeTab === 'largest' && (
              <div className="space-y-1">
                {stats.largest_files.map((f) => (
                  <FileRow key={f.path} file={f} onPreview={handlePreview} />
                ))}
              </div>
            )}

            {/* Recently modified */}
            {activeTab === 'recent' && (
              <div className="space-y-1">
                {stats.recently_modified.map((f) => (
                  <div key={f.path} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</div>
                      <div className="text-[8px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{f.path}</div>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(f.modified)}</div>
                      <div className="text-[9px] font-mono" style={{ color: 'var(--accent)' }}>{f.language}</div>
                    </div>
                    <button onClick={() => handlePreview(f)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Preview file">
                      <FileCode size={11} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      {stats && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-1.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{stats.by_language.length} languages detected</span>
          <span className="text-[9px] font-mono truncate flex-1" style={{ color: 'var(--text-muted)' }}>{stats.root}</span>
        </div>
      )}
    </div>
  )
}
