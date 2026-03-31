'use client'

import React, { useState, useCallback } from 'react'
import {
  Share2, Download, Upload, Copy, Check, Trash2,
  Terminal, Layers, AlertCircle, Clock
} from 'lucide-react'
import { useStore } from '@/store/useStore'

interface SessionSnapshot {
  version: 1
  exportedAt: string
  appVersion: string
  workspaces: Array<{
    id: string
    name: string
    color: string
    kind: string
    splitDirection: string
    paneCount: number
    workingDirectory?: string
    panes: Array<{
      label?: string
      shellKind?: string
      commandHistory?: string[]
      lastCommand?: string
    }>
  }>
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  return `${(b / 1024).toFixed(1)} KB`
}

export function SessionShareView() {
  const workspaceTabs = useStore((s) => s.workspaceTabs)
  const terminalSessions = useStore((s) => s.terminalSessions)
  const launchQuickShellWorkspace = useStore((s) => s.launchQuickShellWorkspace)

  const [copiedJson, setCopiedJson] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')

  const buildSnapshot = useCallback((): SessionSnapshot => {
    const workspaces = workspaceTabs.map((tab) => {
      const panes = (terminalSessions[tab.id] ?? []).map((pane) => ({
        label: pane.label ?? undefined,
        shellKind: pane.shellKind ?? undefined,
        commandHistory: (pane.commandHistory ?? []).slice(-20),
        lastCommand: pane.runtimeSession?.lastCommand ?? undefined,
      }))
      return {
        id: tab.id,
        name: tab.name,
        color: tab.color,
        kind: tab.kind,
        splitDirection: tab.splitDirection ?? 'vertical',
        paneCount: tab.paneCount,
        workingDirectory: tab.workingDirectory ?? undefined,
        panes,
      }
    })
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      workspaces,
    }
  }, [workspaceTabs, terminalSessions])

  const handleExportDownload = useCallback(() => {
    const snapshot = buildSnapshot()
    const json = JSON.stringify(snapshot, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sloerspace-session-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [buildSnapshot])

  const handleExportCopy = useCallback(() => {
    const json = JSON.stringify(buildSnapshot(), null, 2)
    void navigator.clipboard.writeText(json)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 1800)
  }, [buildSnapshot])

  const handleImport = useCallback(() => {
    setImportError(null)
    setImportSuccess(false)
    let parsed: SessionSnapshot
    try {
      parsed = JSON.parse(importText.trim()) as SessionSnapshot
    } catch {
      setImportError('Invalid JSON — paste a valid SloerSpace session export.')
      return
    }
    if (parsed.version !== 1 || !Array.isArray(parsed.workspaces)) {
      setImportError('Unrecognised format. Make sure this is a SloerSpace session export.')
      return
    }
    parsed.workspaces.forEach((ws) => {
      launchQuickShellWorkspace({
        workingDirectory: ws.workingDirectory,
        name: `${ws.name} (imported)`,
      })
    })
    setImportSuccess(true)
    setImportText('')
    setTimeout(() => setImportSuccess(false), 3000)
  }, [importText, launchQuickShellWorkspace])

  const snapshot = buildSnapshot()
  const jsonPreview = JSON.stringify(snapshot, null, 2)
  const jsonSize = new TextEncoder().encode(jsonPreview).length

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <Share2 size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Session Sharing</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>
            {workspaceTabs.length} workspaces
          </span>
        </div>
        {/* Tab switcher */}
        <div className="flex items-center rounded-xl p-0.5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {(['export', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1 rounded-lg text-[10px] font-medium capitalize transition-all"
              style={{
                background: activeTab === tab ? 'var(--accent-subtle)' : 'transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'export' ? (
          <div className="space-y-4">
            {/* Export actions */}
            <div className="flex items-center gap-2">
              <button onClick={handleExportDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium transition-all" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
                <Download size={13} /> Download JSON
              </button>
              <button onClick={handleExportCopy} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                {copiedJson ? <><Check size={13} style={{ color: '#38dd92' }} /> Copied!</> : <><Copy size={13} /> Copy JSON</>}
              </button>
              <span className="ml-auto text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{formatBytes(jsonSize)}</span>
            </div>

            {/* Workspace summary cards */}
            <div className="space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Included in export
              </div>
              {snapshot.workspaces.map((ws) => (
                <div key={ws.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: ws.color + '22' }}>
                    {ws.kind === 'terminal' ? <Terminal size={12} style={{ color: ws.color }} /> : <Layers size={12} style={{ color: ws.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ws.name}</div>
                    <div className="text-[9px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                      {ws.paneCount} pane{ws.paneCount !== 1 ? 's' : ''} · {ws.workingDirectory ?? 'default dir'}
                    </div>
                    {ws.panes.some((p) => p.commandHistory && p.commandHistory.length > 0) && (
                      <div className="mt-1 text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {ws.panes.flatMap((p) => p.commandHistory ?? []).slice(0, 3).join(', ')}…
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                    {ws.kind}
                  </span>
                </div>
              ))}
              {snapshot.workspaces.length === 0 && (
                <div className="text-center py-6 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  No workspaces open — open terminals first to include them in the export.
                </div>
              )}
            </div>

            {/* JSON preview */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>JSON Preview</span>
                <div className="flex items-center gap-1.5">
                  <Clock size={9} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>{new Date(snapshot.exportedAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <pre className="px-3 py-2 text-[9px] font-mono overflow-x-auto max-h-40 overflow-y-auto"
                style={{ color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {jsonPreview.slice(0, 1200)}{jsonPreview.length > 1200 ? '\n…' : ''}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Paste a SloerSpace session JSON export to restore workspaces. New workspace tabs will be created for each entry.
            </div>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(null) }}
              placeholder='Paste session JSON here…\n{\n  "version": 1,\n  "workspaces": [...]\n}'
              className="w-full bg-transparent outline-none resize-none font-mono text-[10px] p-3 rounded-xl"
              style={{ border: `1px solid ${importError ? 'var(--error)' : 'var(--border)'}`, color: 'var(--text-primary)', minHeight: 220 }}
            />
            {importError && (
              <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--error)' }}>
                <AlertCircle size={12} /> {importError}
              </div>
            )}
            {importSuccess && (
              <div className="flex items-center gap-2 text-[10px]" style={{ color: '#38dd92' }}>
                <Check size={12} /> Workspaces restored successfully!
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={handleImport} disabled={!importText.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium transition-all disabled:opacity-40"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
                <Upload size={13} /> Restore Workspaces
              </button>
              <button onClick={() => { setImportText(''); setImportError(null) }} disabled={!importText}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-medium transition-all disabled:opacity-40 hover:bg-[rgba(255,71,87,0.08)]"
                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
