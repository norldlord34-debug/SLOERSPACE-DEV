'use client'

import React, { useCallback, useState } from 'react'
import { Server, ExternalLink, ChevronDown } from 'lucide-react'
import { SSHManager } from '@/components/SSHManager'
import { useStore } from '@/store/useStore'

function formatLastConnected(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

export function SSHView() {
  const setView = useStore((s) => s.setView)
  const workspaceTabs = useStore((s) => s.workspaceTabs)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const primeTerminalCommand = useStore((s) => s.primeTerminalCommand)
  const launchQuickShellWorkspace = useStore((s) => s.launchQuickShellWorkspace)
  const updateSSHLastConnected = useStore((s) => s.updateSSHLastConnected)
  const sshConnections = useStore((s) => s.sshConnections)

  const terminalTabs = workspaceTabs.filter((t) => t.view === 'terminal')
  const [selectedTabId, setSelectedTabId] = useState<string>('__new__')

  const handleConnect = useCallback(async (bootstrapCmd: string, label: string, connId: string) => {
    updateSSHLastConnected(connId)
    if (selectedTabId === '__new__') {
      launchQuickShellWorkspace({ shellBootstrapCommand: bootstrapCmd, name: label })
    } else {
      primeTerminalCommand(bootstrapCmd)
      const tab = workspaceTabs.find((t) => t.id === selectedTabId)
      if (tab) {
        setActiveTab(tab.id)
        setView('terminal')
      } else {
        launchQuickShellWorkspace({ shellBootstrapCommand: bootstrapCmd, name: label })
      }
    }
  }, [selectedTabId, launchQuickShellWorkspace, primeTerminalCommand, workspaceTabs, setActiveTab, setView, updateSSHLastConnected])

  return (
    <div className="h-full w-full overflow-y-auto" style={{ background: 'var(--surface-0)' }}>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(79,140,255,0.25)' }}>
            <Server size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>SSH Manager</div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Save connections, test reachability, and open remote shells inside Terminal.</div>
          </div>
        </div>

        {/* Workspace destination selector */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink size={13} style={{ color: 'var(--accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Open SSH session in</span>
          </div>
          <div className="relative">
            <select
              value={selectedTabId}
              onChange={(e) => setSelectedTabId(e.target.value)}
              className="w-full appearance-none px-3 py-2 rounded-xl text-[11px] font-medium outline-none pr-8"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="__new__">✦ New Terminal Tab</option>
              {terminalTabs.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
          {selectedTabId === '__new__' && (
            <p className="mt-1.5 text-[9px]" style={{ color: 'var(--text-muted)' }}>
              A new workspace tab will be created and the SSH session will open automatically.
            </p>
          )}
        </div>

        {/* Last connected summary */}
        {sshConnections.some((c) => c.lastConnectedAt) && (
          <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Recent</div>
            <div className="space-y-1">
              {sshConnections
                .filter((c) => c.lastConnectedAt)
                .sort((a, b) => (b.lastConnectedAt ?? 0) - (a.lastConnectedAt ?? 0))
                .slice(0, 4)
                .map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server size={10} style={{ color: 'var(--accent)' }} />
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                      <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{c.username}@{c.host}</span>
                    </div>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {formatLastConnected(c.lastConnectedAt!)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Connections manager */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <SSHManager
            onConnect={(bootstrapCmd: string, label: string, connId: string) => {
              void handleConnect(bootstrapCmd, label, connId)
            }}
          />
        </div>

      </div>
    </div>
  )
}
