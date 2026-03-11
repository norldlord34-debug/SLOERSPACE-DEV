'use client'

import { useStore } from '@/store/useStore'
import { Terminal, Layers, Zap, CheckCircle, Cpu } from 'lucide-react'

export function StatusBar() {
  const { workspaceTabs, kanbanTasks, customAgents, theme, userProfile, isLoggedIn } = useStore()

  const completedTasks = kanbanTasks.filter((t) => t.column === 'complete').length
  const totalTasks = kanbanTasks.length
  const isPro = userProfile.plan === 'pro'

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
      </div>
      <div className="flex items-center gap-4">
        {isLoggedIn && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
            style={{
              background: isPro ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: isPro ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${isPro ? 'rgba(79,140,255,0.2)' : 'var(--border)'}`,
            }}>
            {isPro ? 'PRO' : 'FREE'}
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
