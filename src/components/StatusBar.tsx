'use client'

import { useEffect, useMemo, useState } from 'react'
import { getAppVersion } from '@/lib/desktop'
import { useStore } from '@/store/useStore'
import { Terminal, Layers, Zap, CheckCircle, Activity } from 'lucide-react'

export function StatusBar() {
  const { workspaceTabs, terminalSessions, kanbanTasks, theme, userProfile, isLoggedIn, isPro, isTrialActive } = useStore()
  const [appVersion, setAppVersion] = useState('0.1.0')

  const completedTasks = kanbanTasks.filter((t) => t.column === 'complete').length
  const totalTasks = kanbanTasks.length
  const trialActive = isTrialActive()
  const hasPremiumAccess = isPro()
  const accessLabel = userProfile.plan === 'pro' ? 'PRO' : trialActive ? 'TRIAL' : 'FREE'
  const runtimePanes = useMemo(
    () => Object.values(terminalSessions).flat(),
    [terminalSessions],
  )
  const activeRuntimeExecutions = runtimePanes.filter((pane) => pane.isRunning || pane.runtimeSession?.isRunning).length
  useEffect(() => {
    let cancelled = false
    void getAppVersion().then((v) => { if (!cancelled) setAppVersion(v) })
    return () => { cancelled = true }
  }, [])

  const activeWorkspace = workspaceTabs.find((t) => t.isActive) ?? workspaceTabs[workspaceTabs.length - 1] ?? null
  const totalPanes = runtimePanes.length

  return (
    <div
      className="h-[26px] flex items-center justify-between px-4 select-none shrink-0 border-t border-[var(--border)]"
      style={{ color: 'var(--text-muted)', borderRadius: 0, background: 'rgba(4,8,14,0.82)', backdropFilter: 'blur(12px)' }}
    >
      {/* LEFT — connection + workspace */}
      <div className="flex items-center gap-3 text-[9.5px] font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: isLoggedIn ? 'var(--success)' : 'var(--warning)', boxShadow: isLoggedIn ? '0 0 5px var(--success)' : 'none' }} />
          {isLoggedIn ? 'Connected' : 'Offline'}
        </span>
        <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <span className="flex items-center gap-1">
          <Terminal size={9} />
          {workspaceTabs.length} {workspaceTabs.length === 1 ? 'workspace' : 'workspaces'}
        </span>
        {totalPanes > 0 && (
          <>
            <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="flex items-center gap-1">
              <Layers size={9} />
              {totalPanes} panes
            </span>
          </>
        )}
        {activeRuntimeExecutions > 0 && (
          <>
            <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="flex items-center gap-1 animate-pulse" style={{ color: 'var(--accent)' }}>
              <Activity size={9} />
              {activeRuntimeExecutions} running
            </span>
          </>
        )}
        {totalTasks > 0 && (
          <>
            <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="flex items-center gap-1" style={{ color: completedTasks === totalTasks ? 'var(--success)' : 'var(--text-muted)' }}>
              <CheckCircle size={9} />
              {completedTasks}/{totalTasks}
            </span>
          </>
        )}
      </div>

      {/* CENTER — active workspace name */}
      {activeWorkspace && (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeWorkspace.color }} />
          {activeWorkspace.name}
        </div>
      )}

      {/* RIGHT — version + plan */}
      <div className="flex items-center gap-3 text-[9.5px] font-mono">
        {isLoggedIn && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase tracking-wider"
            style={{
              background: trialActive ? 'rgba(255,191,98,0.1)' : hasPremiumAccess ? 'rgba(79,140,255,0.1)' : 'rgba(255,255,255,0.04)',
              color: trialActive ? 'var(--warning)' : hasPremiumAccess ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${trialActive ? 'rgba(255,191,98,0.18)' : hasPremiumAccess ? 'rgba(79,140,255,0.18)' : 'var(--border)'}`,
            }}>
            {accessLabel}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Zap size={9} style={{ color: 'var(--warning)' }} />
          v{appVersion}
        </span>
        <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <span className="max-w-[80px] truncate" style={{ color: 'var(--text-muted)' }}>{theme}</span>
      </div>
    </div>
  )
}
