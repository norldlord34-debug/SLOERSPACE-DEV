'use client'

import { useEffect, useMemo, useState } from 'react'
import { getTerminalCapabilities, TerminalCapabilities } from '@/lib/desktop'
import { useStore } from '@/store/useStore'
import { Terminal, Layers, Zap, CheckCircle, Cpu, Activity, ShieldCheck } from 'lucide-react'

export function StatusBar() {
  const { workspaceTabs, terminalSessions, kanbanTasks, customAgents, theme, userProfile, isLoggedIn, isPro, isTrialActive } = useStore()
  const [capabilities, setCapabilities] = useState<TerminalCapabilities | null>(null)

  const completedTasks = kanbanTasks.filter((t) => t.column === 'complete').length
  const totalTasks = kanbanTasks.length
  const trialActive = isTrialActive()
  const hasPremiumAccess = isPro()
  const accessLabel = userProfile.plan === 'pro' ? 'PRO' : trialActive ? 'TRIAL' : 'FREE'
  const runtimePanes = useMemo(
    () => Object.values(terminalSessions).flat(),
    [terminalSessions],
  )
  const runtimeSessionCount = runtimePanes.filter((pane) => pane.runtimeSessionId).length
  const hydratedRuntimeSessions = runtimePanes.filter((pane) => pane.runtimeSession).length
  const activeRuntimeExecutions = runtimePanes.filter((pane) => pane.isRunning || pane.runtimeSession?.isRunning).length
  const runtimeMode = useMemo(() => {
    const runtimeSnapshotMode = runtimePanes.find((pane) => pane.runtimeSession?.executionMode)?.runtimeSession?.executionMode
    return runtimeSnapshotMode || capabilities?.executionMode || 'persistent-pty-shell'
  }, [capabilities?.executionMode, runtimePanes])
  const runtimeBackendKind = useMemo(() => {
    const runtimeSnapshotBackend = runtimePanes.find((pane) => pane.runtimeSession?.backendKind)?.runtimeSession?.backendKind
    return runtimeSnapshotBackend || capabilities?.backendKind || 'persistent-pty'
  }, [capabilities?.backendKind, runtimePanes])

  useEffect(() => {
    let cancelled = false

    void getTerminalCapabilities().then((nextCapabilities) => {
      if (!cancelled && nextCapabilities) {
        setCapabilities(nextCapabilities)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className="h-[28px] flex items-center justify-between px-4 text-[10px] font-mono select-none shrink-0 border-t border-[var(--border)]"
      style={{ background: 'var(--surface-0)', color: 'var(--text-muted)' }}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-[6px] h-[6px] rounded-full" style={{ background: isLoggedIn ? 'var(--success)' : 'var(--warning)', boxShadow: isLoggedIn ? '0 0 6px var(--success)' : 'none' }} />
          {isLoggedIn ? 'Connected' : 'Offline'}
        </span>
        <span className="flex items-center gap-1.5">
          <Terminal size={10} />
          {workspaceTabs.length} workspaces
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle size={10} />
          {completedTasks}/{totalTasks} tasks
        </span>
        <span className="flex items-center gap-1.5">
          <Cpu size={10} />
          {customAgents.length} agents
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={10} />
          {runtimeSessionCount} runtime sessions
        </span>
        <span className="flex items-center gap-1.5">
          <Activity size={10} />
          {hydratedRuntimeSessions}/{runtimeSessionCount || 0} hydrated
        </span>
        {activeRuntimeExecutions > 0 && (
          <span className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
            <Activity size={10} className="animate-pulse" />
            {activeRuntimeExecutions} executing
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Terminal size={10} />
          {runtimeMode}
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={10} />
          {runtimeBackendKind}
        </span>
        {isLoggedIn && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
            style={{
              background: trialActive ? 'rgba(255,191,98,0.12)' : hasPremiumAccess ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: trialActive ? 'var(--warning)' : hasPremiumAccess ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${trialActive ? 'rgba(255,191,98,0.2)' : hasPremiumAccess ? 'rgba(79,140,255,0.2)' : 'var(--border)'}`,
            }}>
            {accessLabel}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Zap size={10} style={{ color: 'var(--warning)' }} />
          v0.1.0
        </span>
        <span className="flex items-center gap-1.5">
          <Layers size={10} />
          {theme}
        </span>
      </div>
    </div>
  )
}
