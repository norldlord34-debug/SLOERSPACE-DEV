'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Activity, Cpu, MemoryStick, HardDrive, RefreshCw, Loader2, Clock } from 'lucide-react'
import { getSystemStats } from '@/lib/desktop'
import type { SystemStats } from '@/lib/desktop'

function fmt(n: number, dec = 1) { return n.toFixed(dec) }
function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

function GaugeBar({ value, color, label, sublabel }: { value: number; color: string; label: string; sublabel: string }) {
  const pct = Math.min(Math.max(value, 0), 100)
  const danger = pct > 85
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{sublabel}</span>
          <span className="text-[12px] font-bold font-mono" style={{ color: danger ? '#ff6f96' : color }}>{fmt(pct)}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: danger ? '#ff6f96' : color }} />
      </div>
    </div>
  )
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const W = 80, H = 24
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`).join(' ')
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function SystemMonitorView() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [ramHistory, setRamHistory] = useState<number[]>([])
  const [sortBy, setSortBy] = useState<'cpu' | 'mem'>('cpu')

  const refresh = useCallback(async () => {
    setLoading(true)
    const s = await getSystemStats()
    if (s) {
      setStats(s)
      setCpuHistory((h) => [...h.slice(-29), s.cpu_usage])
      setRamHistory((h) => [...h.slice(-29), s.memory_percent])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => { void refresh() }, 2500)
    return () => clearInterval(id)
  }, [autoRefresh, refresh])

  const sortedProcs = stats
    ? [...stats.top_processes].sort((a, b) => sortBy === 'cpu' ? b.cpu_usage - a.cpu_usage : b.memory_mb - a.memory_mb)
    : []

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <Activity size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>System Monitor</span>
          {stats && (
            <span className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
              <Clock size={9} /> up {fmtUptime(stats.uptime_secs)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded w-3 h-3" />
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Auto (2.5s)</span>
          </label>
          <button onClick={refresh} disabled={loading} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40" title="Refresh">
            {loading ? <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <RefreshCw size={13} style={{ color: 'var(--text-muted)' }} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!stats && !loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        )}

        {stats && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'CPU', icon: Cpu, value: stats.cpu_usage, sub: `${stats.cpu_count} cores`, color: '#4f8cff', history: cpuHistory },
                { label: 'RAM', icon: MemoryStick, value: stats.memory_percent, sub: `${fmt(stats.memory_used_mb / 1024)} / ${fmt(stats.memory_total_mb / 1024)} GB`, color: '#38dd92', history: ramHistory },
                { label: 'Disk', icon: HardDrive, value: stats.disk_percent, sub: `${fmt(stats.disk_used_gb)} / ${fmt(stats.disk_total_gb)} GB`, color: '#f7a94c', history: [] },
                { label: 'Swap', icon: Activity, value: stats.swap_total_mb > 0 ? (stats.swap_used_mb / stats.swap_total_mb) * 100 : 0, sub: `${fmt(stats.swap_used_mb / 1024)} / ${fmt(stats.swap_total_mb / 1024)} GB`, color: '#a78bfa', history: [] },
              ].map(({ label, icon: Icon, value, sub, color, history }) => (
                <div key={label} className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
                        <Icon size={12} style={{ color }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{label}</span>
                    </div>
                    {history.length > 1 && <Sparkline values={history} color={color} />}
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100)}%`, background: value > 85 ? '#ff6f96' : color }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{sub}</span>
                    <span className="text-[12px] font-bold font-mono" style={{ color: value > 85 ? '#ff6f96' : color }}>{fmt(value)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Disk usage bar */}
            <GaugeBar value={stats.disk_percent} color="#f7a94c" label="Disk Usage" sublabel={`${fmt(stats.disk_used_gb)} / ${fmt(stats.disk_total_gb)} GB`} />

            {/* Process list */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Top Processes</span>
                <div className="flex items-center gap-1">
                  {(['cpu', 'mem'] as const).map((k) => (
                    <button key={k} onClick={() => setSortBy(k)}
                      className="px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all"
                      style={{ background: sortBy === k ? 'var(--accent-subtle)' : 'transparent', color: sortBy === k ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {k === 'cpu' ? 'CPU%' : 'MEM'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {sortedProcs.slice(0, 10).map((p) => (
                  <div key={p.pid} className="flex items-center gap-3 px-3 py-1.5">
                    <span className="text-[9px] font-mono w-8 shrink-0 text-right" style={{ color: 'var(--text-muted)' }}>{p.pid}</span>
                    <span className="flex-1 text-[10px] font-mono truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[9px] font-mono w-12 text-right" style={{ color: p.cpu_usage > 20 ? '#ff6f96' : '#4f8cff' }}>{fmt(p.cpu_usage)}%</span>
                      <span className="text-[9px] font-mono w-14 text-right" style={{ color: 'var(--text-muted)' }}>{fmt(p.memory_mb)} MB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
