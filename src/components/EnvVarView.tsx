'use client'

import React, { useState, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Eye, EyeOff, Save, FolderOpen, Copy, Check,
  Key, AlertCircle, Loader2, X, Settings2
} from 'lucide-react'
import { useStore, generateId } from '@/store/useStore'
import { readEnvFile, writeEnvFile } from '@/lib/desktop'

export function EnvVarView() {
  const envVars = useStore((s) => s.envVars)
  const addEnvVar = useStore((s) => s.addEnvVar)
  const updateEnvVar = useStore((s) => s.updateEnvVar)
  const removeEnvVar = useStore((s) => s.removeEnvVar)
  const workspaceTabs = useStore((s) => s.workspaceTabs)

  const [showPathBar, setShowPathBar] = useState<'open' | 'save' | null>(null)
  const [pathInput, setPathInput] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filterWs, setFilterWs] = useState<string>('__all__')
  const [addingVar, setAddingVar] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newIsSecret, setNewIsSecret] = useState(false)
  const newKeyRef = useRef<HTMLInputElement>(null)

  const terminalTabs = workspaceTabs.filter((t) => t.view === 'terminal')

  const filtered = envVars.filter((v) =>
    filterWs === '__all__' ? true : (v.workspaceId ?? '__all__') === filterWs
  )

  const handleAdd = useCallback(() => {
    if (!newKey.trim()) return
    addEnvVar({
      id: generateId(),
      key: newKey.trim(),
      value: newValue,
      comment: newComment.trim() || undefined,
      isSecret: newIsSecret,
      workspaceId: filterWs === '__all__' ? undefined : filterWs,
    })
    setNewKey(''); setNewValue(''); setNewComment(''); setNewIsSecret(false)
    setAddingVar(false)
  }, [newKey, newValue, newComment, newIsSecret, filterWs, addEnvVar])

  const handleCopy = useCallback((id: string, value: string) => {
    void navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }, [])

  const toggleReveal = useCallback((id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleOpenEnv = useCallback(async (path: string) => {
    setFileError(null)
    const entries = await readEnvFile(path)
    if (entries.length === 0) { setFileError('No variables found or file is empty.'); return }
    entries.forEach((e) => addEnvVar({
      id: generateId(),
      key: e.key,
      value: e.value,
      comment: e.comment,
      isSecret: e.key.toLowerCase().includes('secret') || e.key.toLowerCase().includes('key') || e.key.toLowerCase().includes('token') || e.key.toLowerCase().includes('password'),
      workspaceId: filterWs === '__all__' ? undefined : filterWs,
    }))
    setShowPathBar(null); setPathInput('')
  }, [addEnvVar, filterWs])

  const handleSaveEnv = useCallback(async (path: string) => {
    setIsSaving(true); setFileError(null)
    try {
      await writeEnvFile(path, filtered.map((v) => ({ key: v.key, value: v.value, comment: v.comment })))
      setSaveSuccess(true); setShowPathBar(null); setPathInput('')
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      setFileError('Could not save file.')
    } finally { setIsSaving(false) }
  }, [filtered])

  const handlePathSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!pathInput.trim()) return
    if (showPathBar === 'open') void handleOpenEnv(pathInput.trim())
    else void handleSaveEnv(pathInput.trim())
  }, [pathInput, showPathBar, handleOpenEnv, handleSaveEnv])

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Settings2 size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Env Var Manager</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>{envVars.length} vars</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowPathBar('open'); setPathInput(''); setFileError(null) }} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Import from .env file" style={{ color: 'var(--text-muted)' }}>
              <FolderOpen size={14} />
            </button>
            <button onClick={() => { setShowPathBar('save'); setPathInput('.env'); setFileError(null) }} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Export to .env file" style={{ color: saveSuccess ? '#38dd92' : 'var(--text-muted)' }}>
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}
            </button>
            <button onClick={() => { setAddingVar(true); setTimeout(() => newKeyRef.current?.focus(), 50) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
              <Plus size={11} /> Add Var
            </button>
          </div>
        </div>

        {/* Path bar */}
        {showPathBar && (
          <form onSubmit={handlePathSubmit} className="flex items-center gap-2 px-4 py-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
            <span className="text-[9px] font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--accent)' }}>
              {showPathBar === 'open' ? 'Import from' : 'Export to'}
            </span>
            <input value={pathInput} onChange={(e) => setPathInput(e.target.value)} placeholder=".env or /path/to/.env" autoFocus
              className="flex-1 bg-transparent outline-none text-[11px] font-mono px-2 py-1 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            {fileError && <span className="flex items-center gap-1 text-[9px] shrink-0" style={{ color: 'var(--error)' }}><AlertCircle size={10} />{fileError}</span>}
            <button type="submit" disabled={!pathInput.trim() || isSaving} className="px-3 py-1 rounded-lg text-[10px] font-medium disabled:opacity-40" style={{ background: 'var(--accent)', color: '#fff' }}>
              {showPathBar === 'open' ? 'Import' : isSaving ? 'Saving…' : 'Export'}
            </button>
            <button type="button" onClick={() => { setShowPathBar(null); setFileError(null) }} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]">
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          </form>
        )}

        {/* Workspace filter */}
        {terminalTabs.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[9px] font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>Scope</span>
            {[{ id: '__all__', name: 'Global' }, ...terminalTabs].map((t) => (
              <button key={t.id} onClick={() => setFilterWs(t.id)}
                className="px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all whitespace-nowrap"
                style={{ background: filterWs === t.id ? 'var(--accent-subtle)' : 'transparent', color: filterWs === t.id ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${filterWs === t.id ? 'var(--accent)' : 'var(--border)'}` }}>
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Var list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">

        {/* Add row */}
        {addingVar && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-1)', border: '1px solid var(--accent)' }}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>KEY</label>
                <input ref={newKeyRef} value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="MY_API_KEY"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAddingVar(false) }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-transparent outline-none" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>VALUE</label>
                <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="sk-..." type={newIsSecret ? 'password' : 'text'}
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-transparent outline-none" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Comment (optional)</label>
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Description..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-transparent outline-none" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newIsSecret} onChange={(e) => setNewIsSecret(e.target.checked)} className="rounded" />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Secret (masked by default)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setAddingVar(false)} className="px-3 py-1 rounded-lg text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                <button onClick={handleAdd} disabled={!newKey.trim()} className="px-3 py-1 rounded-lg text-[10px] font-medium disabled:opacity-40" style={{ background: 'var(--accent)', color: '#fff' }}>Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !addingVar && (
          <div className="text-center py-12">
            <Key size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <div className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No environment variables</div>
            <div className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Add variables or import from a .env file</div>
          </div>
        )}

        {/* Variable rows */}
        {filtered.map((v) => {
          const isRevealed = revealedIds.has(v.id)
          const isCopied = copiedId === v.id
          return (
            <div key={v.id} className="group flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: v.isSecret ? 'rgba(255,111,150,0.1)' : 'rgba(79,140,255,0.1)' }}>
                <Key size={11} style={{ color: v.isSecret ? '#ff6f96' : 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                {v.comment && <div className="text-[8px]" style={{ color: 'var(--text-muted)' }}># {v.comment}</div>}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{v.key}</span>
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>=</span>
                  <input
                    value={v.value}
                    type={v.isSecret && !isRevealed ? 'password' : 'text'}
                    onChange={(e) => updateEnvVar(v.id, { value: e.target.value })}
                    className="flex-1 bg-transparent outline-none text-[11px] font-mono min-w-0 px-1 rounded"
                    style={{ color: 'var(--text-secondary)', border: '1px solid transparent' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {v.isSecret && (
                  <button onClick={() => toggleReveal(v.id)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title={isRevealed ? 'Hide' : 'Reveal'}>
                    {isRevealed ? <EyeOff size={11} style={{ color: 'var(--text-muted)' }} /> : <Eye size={11} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                )}
                <button onClick={() => handleCopy(v.id, v.value)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Copy value">
                  {isCopied ? <Check size={11} style={{ color: '#38dd92' }} /> : <Copy size={11} style={{ color: 'var(--text-muted)' }} />}
                </button>
                <button onClick={() => removeEnvVar(v.id)} className="p-1 rounded hover:bg-[rgba(255,71,87,0.1)]">
                  <Trash2 size={11} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)' }}>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {filtered.filter((v) => v.isSecret).length} secrets · {filtered.filter((v) => !v.isSecret).length} plain
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {filterWs === '__all__' ? 'Global scope' : workspaceTabs.find((t) => t.id === filterWs)?.name ?? filterWs}
        </span>
      </div>
    </div>
  )
}
