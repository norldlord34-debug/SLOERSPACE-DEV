'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Network, RefreshCw, Loader2, Search, X, Trash2, Check,
  AlertCircle, ExternalLink
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { scanActivePorts, killProcessByPid } from '@/lib/desktop'
import type { PortEntry } from '@/lib/desktop'

const WELL_KNOWN: Record<number, string> = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 465: 'SMTPS',
  587: 'SMTP', 993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle',
  3000: 'Dev Server', 3001: 'Dev Server', 3306: 'MySQL', 4000: 'Dev Server',
  4200: 'Angular', 5000: 'Dev Server', 5173: 'Vite', 5432: 'PostgreSQL',
  5984: 'CouchDB', 6379: 'Redis', 8000: 'Dev Server', 8080: 'HTTP Alt',
  8443: 'HTTPS Alt', 8888: 'Jupyter', 9000: 'PHP-FPM', 9200: 'Elasticsearch',
  27017: 'MongoDB', 27018: 'MongoDB',
}

function stateColor(state: string): string {
  const s = state.toUpperCase()
  if (s === 'LISTENING' || s === 'LISTEN') return '#38dd92'
  if (s === 'ESTABLISHED') return '#4f8cff'
  if (s.includes('WAIT') || s.includes('CLOSE')) return '#f7a94c'
  return '#8e8e8e'
}

export function PortManagerView() {
  const setView = useStore((s) => s.setView)
  const setPreviewPort = useStore((s) => s.setPreviewPort)

  const [ports, setPorts] = useState<PortEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [query, setQuery] = useState('')
  const [killingPid, setKillingPid] = useState<number | null>(null)
  const [killedPids, setKilledPids] = useState<Set<number>>(new Set())
  const [killError, setKillError] = useState<string | null>(null)
  const [hasScanned, setHasScanned] = useState(false)

  const scan = useCallback(async () => {
    setScanning(true); setLoading(true); setKillError(null)
    const result = await scanActivePorts()
    setPorts(result)
    setHasScanned(true)
    setScanning(false); setLoading(false)
  }, [])

  const handleKill = useCallback(async (pid: number) => {
    setKillingPid(pid); setKillError(null)
    try {
      await killProcessByPid(pid)
      setKilledPids((s) => new Set(Array.from(s).concat(pid)))
      setTimeout(() => {
        setPorts((prev) => prev.filter((p) => p.pid !== pid))
        setKilledPids((s) => { const n = new Set(s); n.delete(pid); return n })
      }, 1000)
    } catch (err) {
      setKillError(`Failed to kill PID ${pid}: ${String(err)}`)
    } finally {
      setKillingPid(null)
    }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return ports
    const q = query.toLowerCase()
    return ports.filter((p) =>
      String(p.port).includes(q) ||
      (p.process_name ?? '').toLowerCase().includes(q) ||
      (p.state ?? '').toLowerCase().includes(q) ||
      (WELL_KNOWN[p.port] ?? '').toLowerCase().includes(q)
    )
  }, [ports, query])

  const listeningCount = ports.filter((p) => p.state.toUpperCase().includes('LISTEN')).length

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Network size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Port Manager</span>
            {hasScanned && (
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>
                {listeningCount} listening · {ports.length} total
              </span>
            )}
          </div>
          <button onClick={scan} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all disabled:opacity-40"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
            {scanning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {scanning ? 'Scanning…' : hasScanned ? 'Refresh' : 'Scan Ports'}
          </button>
        </div>

        {hasScanned && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <Search size={11} style={{ color: 'var(--text-muted)' }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by port, process, state…"
                className="flex-1 bg-transparent outline-none text-[11px]" style={{ color: 'var(--text-primary)' }} />
              {query && <button onClick={() => setQuery('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>
          </div>
        )}

        {killError && (
          <div className="flex items-center gap-2 px-4 pb-2 text-[10px]" style={{ color: 'var(--error)' }}>
            <AlertCircle size={11} /> {killError}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasScanned && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Network size={36} style={{ color: 'var(--text-muted)' }} />
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>No port scan yet</div>
            <div className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
              Click &quot;Scan Ports&quot; to discover active ports and their processes
            </div>
            <button onClick={scan}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-medium"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
              <Network size={13} /> Start Scan
            </button>
          </div>
        )}

        {loading && !hasScanned && (
          <div className="flex items-center justify-center h-full gap-2" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span className="text-[11px]">Scanning ports…</span>
          </div>
        )}

        {hasScanned && filtered.length === 0 && (
          <div className="flex items-center justify-center h-full text-[11px]" style={{ color: 'var(--text-muted)' }}>
            No matching ports found
          </div>
        )}

        {hasScanned && filtered.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {/* Table header */}
            <div className="grid grid-cols-[60px_1fr_90px_90px_1fr_80px] items-center px-4 py-1.5 text-[8px] font-bold uppercase tracking-wider sticky top-0"
              style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <span>Port</span>
              <span>Process</span>
              <span>Protocol</span>
              <span>State</span>
              <span>Service</span>
              <span className="text-right">Actions</span>
            </div>

            {filtered.map((p) => {
              const isKilled = killedPids.has(p.pid ?? -1)
              const isKilling = killingPid === p.pid
              const service = WELL_KNOWN[p.port]
              return (
                <div key={`${p.port}-${p.pid}`}
                  className="group grid grid-cols-[60px_1fr_90px_90px_1fr_80px] items-center px-4 py-2 transition-all hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ opacity: isKilled ? 0.4 : 1 }}>
                  <span className="text-[12px] font-mono font-bold" style={{ color: 'var(--accent)' }}>{p.port}</span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {p.process_name ?? '—'}
                    </div>
                    {p.pid && <div className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>PID {p.pid}</div>}
                  </div>
                  <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>{p.protocol}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stateColor(p.state) }} />
                    <span className="text-[9px] truncate" style={{ color: stateColor(p.state) }}>{p.state}</span>
                  </div>
                  <span className="text-[9px]" style={{ color: service ? '#a78bfa' : 'var(--text-muted)' }}>
                    {service ?? '—'}
                  </span>
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Open in Preview */}
                    <button onClick={() => { setPreviewPort(p.port); setView('preview') }}
                      className="p-1 rounded hover:bg-[rgba(79,140,255,0.1)]" title="Open in Preview">
                      <ExternalLink size={10} style={{ color: 'var(--accent)' }} />
                    </button>
                    {/* Kill process */}
                    {p.pid && (
                      <button onClick={() => void handleKill(p.pid!)} disabled={isKilling || isKilled}
                        className="p-1 rounded hover:bg-[rgba(255,71,87,0.15)] disabled:opacity-40" title={`Kill PID ${p.pid}`}>
                        {isKilled ? <Check size={10} style={{ color: '#38dd92' }} />
                          : isKilling ? <Loader2 size={10} className="animate-spin" style={{ color: '#ff6f96' }} />
                          : <Trash2 size={10} style={{ color: '#ff6f96' }} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Status bar */}
      {hasScanned && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-1.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#38dd92' }} />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{listeningCount} listening</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f8cff' }} />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{ports.filter((p) => p.state.toUpperCase() === 'ESTABLISHED').length} established</span>
          </div>
          {query && <span className="ml-auto text-[9px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} of {ports.length} shown</span>}
        </div>
      )}
    </div>
  )
}
