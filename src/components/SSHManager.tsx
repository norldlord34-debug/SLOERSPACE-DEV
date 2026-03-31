'use client'

import React, { useState, useCallback } from 'react'
import {
  Server, Plus, Trash2, Play, Loader2, Check, X, Shield, AlertCircle
} from 'lucide-react'
import { useStore, generateId } from '@/store/useStore'
import { testSSHConnection, getSSHBootstrapCommand } from '@/lib/desktop'

export function SSHManager({ onConnect }: { onConnect: (bootstrapCmd: string, label: string, connId: string) => void }) {
  const sshConnections = useStore((s) => s.sshConnections)
  const addSSHConnection = useStore((s) => s.addSSHConnection)
  const removeSSHConnection = useStore((s) => s.removeSSHConnection)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('key')
  const [keyPath, setKeyPath] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, boolean | null>>({})
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleAdd = useCallback(() => {
    if (!name.trim() || !host.trim() || !username.trim()) return
    addSSHConnection({
      id: generateId(),
      name: name.trim(),
      host: host.trim(),
      port: parseInt(port) || 22,
      username: username.trim(),
      authMethod,
      keyPath: authMethod === 'key' && keyPath.trim() ? keyPath.trim() : undefined,
    })
    setName(''); setHost(''); setPort('22'); setUsername(''); setKeyPath('')
    setShowForm(false)
  }, [name, host, port, username, authMethod, keyPath, addSSHConnection])

  const handleTest = useCallback(async (conn: typeof sshConnections[0]) => {
    setTesting(conn.id)
    setTestResult((prev) => ({ ...prev, [conn.id]: null }))
    const ok = await testSSHConnection(conn.host, conn.port, conn.username)
    setTestResult((prev) => ({ ...prev, [conn.id]: ok }))
    setTesting(null)
  }, [])

  const handleConnect = useCallback(async (conn: typeof sshConnections[0]) => {
    setConnecting(conn.id)
    const cmd = await getSSHBootstrapCommand(conn.host, conn.port, conn.username, conn.keyPath)
    if (cmd) onConnect(cmd, `SSH: ${conn.name}`, conn.id)
    setConnecting(null)
  }, [onConnect])

  return (
    <div className="space-y-4">
      {/* Saved connections */}
      {sshConnections.length === 0 && !showForm && (
        <div className="text-center py-8">
          <Server size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <div className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No SSH connections</div>
          <div className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Add a server to connect via SSH</div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-medium transition-all" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
            <Plus size={12} /> Add Connection
          </button>
        </div>
      )}

      {sshConnections.length > 0 && (
        <div className="space-y-2">
          {sshConnections.map((conn) => (
            <div key={conn.id} className="flex items-center gap-3 p-3 rounded-xl transition-all" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(79,140,255,0.1)' }}>
                <Server size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{conn.name}</div>
                <div className="text-[9px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                  {conn.username}@{conn.host}:{conn.port}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {testResult[conn.id] === true && <Check size={12} style={{ color: 'var(--success)' }} />}
                {testResult[conn.id] === false && <AlertCircle size={12} style={{ color: 'var(--error)' }} />}
                <button onClick={() => handleTest(conn)} disabled={testing === conn.id} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Test connection" style={{ color: 'var(--text-muted)' }}>
                  {testing === conn.id ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                </button>
                <button onClick={() => handleConnect(conn)} disabled={connecting === conn.id} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(79,140,255,0.1)]" title="Connect" style={{ color: 'var(--accent)' }}>
                  {connecting === conn.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                </button>
                <button onClick={() => removeSSHConnection(conn.id)} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,71,87,0.1)]" title="Delete" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-medium transition-all hover:bg-[rgba(255,255,255,0.04)]" style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
            <Plus size={10} /> Add Connection
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>New Connection</span>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]"><X size={12} style={{ color: 'var(--text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Server" className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-transparent outline-none" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Host</label>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.100" className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-transparent outline-none font-mono" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Port</label>
              <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="22" className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-transparent outline-none font-mono" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="root" className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-transparent outline-none font-mono" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Auth</label>
              <div className="flex gap-1">
                {(['key', 'password'] as const).map((m) => (
                  <button key={m} onClick={() => setAuthMethod(m)} className="flex-1 py-1.5 rounded-lg text-[9px] font-medium transition-all"
                    style={{ background: authMethod === m ? 'var(--accent-subtle)' : 'transparent', color: authMethod === m ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${authMethod === m ? 'var(--accent)' : 'var(--border)'}` }}>
                    {m === 'key' ? '🔑 Key' : '🔒 Pass'}
                  </button>
                ))}
              </div>
            </div>
            {authMethod === 'key' && (
              <div className="col-span-2">
                <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Key Path (optional)</label>
                <input value={keyPath} onChange={(e) => setKeyPath(e.target.value)} placeholder="~/.ssh/id_rsa" className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-transparent outline-none font-mono" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            )}
          </div>
          <button onClick={handleAdd} disabled={!name.trim() || !host.trim() || !username.trim()} className="w-full py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40" style={{ background: 'var(--accent)', color: '#fff' }}>
            Save Connection
          </button>
        </div>
      )}
    </div>
  )
}
