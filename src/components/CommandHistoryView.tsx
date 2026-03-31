'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  History, Search, Copy, Check, Play, Terminal, X, Clock, ChevronRight
} from 'lucide-react'
import { useStore } from '@/store/useStore'

interface HistoryEntry {
  command: string
  workspaceName: string
  workspaceId: string
  workspaceColor: string
  paneLabel?: string
  timestamp?: string
  exitCode?: number
  output?: string
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

export function CommandHistoryView() {
  const workspaceTabs = useStore((s) => s.workspaceTabs)
  const terminalSessions = useStore((s) => s.terminalSessions)
  const primeTerminalCommand = useStore((s) => s.primeTerminalCommand)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const setView = useStore((s) => s.setView)

  const [query, setQuery] = useState('')
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const [filterWs, setFilterWs] = useState<string>('__all__')
  const [expandedCmd, setExpandedCmd] = useState<string | null>(null)

  const allEntries = useMemo<HistoryEntry[]>(() => {
    const entries: HistoryEntry[] = []
    workspaceTabs.forEach((tab) => {
      const panes = terminalSessions[tab.id] ?? []
      panes.forEach((pane) => {
        // From commandHistory (simple strings)
        ;(pane.commandHistory ?? []).forEach((cmd) => {
          entries.push({
            command: cmd,
            workspaceName: tab.name,
            workspaceId: tab.id,
            workspaceColor: tab.color,
            paneLabel: pane.label,
          })
        })
        // From CommandBlock history (richer, with output + exit code)
        ;(pane.commands ?? []).filter((c) => c.command?.trim()).forEach((block) => {
          entries.push({
            command: block.command,
            workspaceName: tab.name,
            workspaceId: tab.id,
            workspaceColor: tab.color,
            paneLabel: pane.label,
            timestamp: block.timestamp,
            exitCode: block.exitCode,
            output: block.output,
          })
        })
      })
    })
    // Deduplicate by command + workspaceId, keep latest
    const seen = new Map<string, HistoryEntry>()
    entries.forEach((e) => {
      const key = `${e.workspaceId}::${e.command}`
      if (!seen.has(key) || (e.timestamp && (!seen.get(key)!.timestamp || e.timestamp > seen.get(key)!.timestamp!))) {
        seen.set(key, e)
      }
    })
    return Array.from(seen.values()).reverse()
  }, [workspaceTabs, terminalSessions])

  const filtered = useMemo(() => {
    let result = allEntries
    if (filterWs !== '__all__') result = result.filter((e) => e.workspaceId === filterWs)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter((e) => e.command.toLowerCase().includes(q))
    }
    return result.slice(0, 200)
  }, [allEntries, query, filterWs])

  const handleCopy = useCallback((cmd: string) => {
    void navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 1500)
  }, [])

  const handlePrime = useCallback((entry: HistoryEntry) => {
    const tab = workspaceTabs.find((t) => t.id === entry.workspaceId)
    if (tab) { setActiveTab(tab.id); setView('terminal') }
    primeTerminalCommand(entry.command)
  }, [workspaceTabs, setActiveTab, setView, primeTerminalCommand])

  const terminalTabs = workspaceTabs.filter((t) => t.view === 'terminal')

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-2">
          <History size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Command History</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>{allEntries.length} entries</span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands…"
              className="flex-1 bg-transparent outline-none text-[11px]"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="hover:opacity-60 transition-opacity">
                <X size={11} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
        </div>

        {/* Workspace filter */}
        {terminalTabs.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto">
            {[{ id: '__all__', name: 'All', color: 'var(--accent)' }, ...terminalTabs].map((t) => (
              <button key={t.id} onClick={() => setFilterWs(t.id)}
                className="px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all whitespace-nowrap shrink-0"
                style={{
                  background: filterWs === t.id ? ('color' in t ? t.color + '22' : 'var(--accent-subtle)') : 'transparent',
                  color: filterWs === t.id ? ('color' in t ? t.color : 'var(--accent)') : 'var(--text-muted)',
                  border: `1px solid ${filterWs === t.id ? ('color' in t ? t.color + '44' : 'var(--accent)') : 'var(--border)'}`,
                }}>
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <History size={28} style={{ color: 'var(--text-muted)' }} />
            <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {query ? 'No matching commands' : 'No command history yet'}
            </div>
            <div className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
              {query ? 'Try a different search term' : 'Run commands in Terminal to see them here'}
            </div>
          </div>
        )}

        {filtered.map((entry, idx) => {
          const key = `${entry.workspaceId}-${entry.command}-${idx}`
          const isExpanded = expandedCmd === key
          const isCopied = copiedCmd === entry.command
          const hasOutput = !!entry.output

          return (
            <div key={key}
              className="group rounded-xl transition-all"
              style={{ background: 'var(--surface-1)', border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}` }}>
              <div className="flex items-start gap-3 px-3 py-2">
                {/* Workspace color dot */}
                <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: entry.workspaceColor }} />

                {/* Command */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Terminal size={9} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{entry.workspaceName}{entry.paneLabel ? ` / ${entry.paneLabel}` : ''}</span>
                    {entry.timestamp && (
                      <span className="flex items-center gap-1 text-[8px]" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={8} /> {timeAgo(entry.timestamp)}
                      </span>
                    )}
                    {entry.exitCode !== undefined && (
                      <span className="text-[8px] px-1 rounded" style={{
                        background: entry.exitCode === 0 ? 'rgba(56,221,146,0.1)' : 'rgba(255,111,150,0.1)',
                        color: entry.exitCode === 0 ? '#38dd92' : '#ff6f96',
                      }}>exit {entry.exitCode}</span>
                    )}
                  </div>
                  <code className="text-[11px] font-mono block truncate" style={{ color: 'var(--text-primary)' }}>
                    {query ? (
                      <span dangerouslySetInnerHTML={{
                        __html: entry.command.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                          '<mark style="background:rgba(79,140,255,0.3);color:var(--text-primary);border-radius:2px">$1</mark>')
                      }} />
                    ) : entry.command}
                  </code>
                  {isExpanded && hasOutput && (
                    <pre className="mt-2 px-2 py-1.5 rounded-lg text-[9px] font-mono overflow-x-auto max-h-32 overflow-y-auto"
                      style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {entry.output}
                    </pre>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {hasOutput && (
                    <button onClick={() => setExpandedCmd(isExpanded ? null : key)}
                      className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Show output">
                      <ChevronRight size={11} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}
                  <button onClick={() => handleCopy(entry.command)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Copy">
                    {isCopied ? <Check size={11} style={{ color: '#38dd92' }} /> : <Copy size={11} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button onClick={() => handlePrime(entry)} className="p-1 rounded hover:bg-[rgba(79,140,255,0.15)]" title="Run in terminal">
                    <Play size={11} style={{ color: 'var(--accent)' }} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} of {allEntries.length} commands
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {workspaceTabs.length} workspace{workspaceTabs.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
