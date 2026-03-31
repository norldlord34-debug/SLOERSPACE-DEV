'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  BookMarked, Plus, Trash2, Copy, Check, Search, X,
  Pin, Play, Tag, Download, Upload, AlertCircle
} from 'lucide-react'
import { useStore, generateId } from '@/store/useStore'
import type { Snippet } from '@/store/appStore'

const DEFAULT_CATEGORIES = ['Shell', 'Git', 'Docker', 'npm', 'Python', 'SQL', 'General']

const BUILTIN_SNIPPETS: Omit<Snippet, 'id' | 'createdAt' | 'usageCount'>[] = [
  { title: 'Git status + log', content: 'git status && git log --oneline -10', category: 'Git', language: 'shell', tags: ['git', 'status'], isPinned: false },
  { title: 'Kill port process', content: 'npx kill-port 3000', category: 'npm', language: 'shell', tags: ['port', 'kill'], isPinned: false },
  { title: 'Docker ps all', content: 'docker ps -a --format "table {{.ID}}\\t{{.Names}}\\t{{.Status}}\\t{{.Ports}}"', category: 'Docker', language: 'shell', tags: ['docker', 'containers'], isPinned: false },
  { title: 'Find large files', content: 'find . -type f -size +10M | sort -rh | head -20', category: 'Shell', language: 'shell', tags: ['files', 'disk'], isPinned: false },
  { title: 'npm audit fix', content: 'npm audit fix --force', category: 'npm', language: 'shell', tags: ['npm', 'security'], isPinned: false },
  { title: 'Git undo last commit', content: 'git reset --soft HEAD~1', category: 'Git', language: 'shell', tags: ['git', 'reset'], isPinned: false },
  { title: 'Check listening ports', content: 'netstat -ano | findstr LISTENING', category: 'Shell', language: 'shell', tags: ['ports', 'network'], isPinned: false },
  { title: 'Python virtual env', content: 'python -m venv .venv && .venv\\Scripts\\activate', category: 'Python', language: 'shell', tags: ['python', 'venv'], isPinned: false },
]

export function SnippetView() {
  const snippets = useStore((s) => s.snippets)
  const addSnippet = useStore((s) => s.addSnippet)
  const updateSnippet = useStore((s) => s.updateSnippet)
  const removeSnippet = useStore((s) => s.removeSnippet)
  const incrementSnippetUsage = useStore((s) => s.incrementSnippetUsage)
  const primeTerminalCommand = useStore((s) => s.primeTerminalCommand)
  const setView = useStore((s) => s.setView)

  const [query, setQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('__all__')
  const [adding, setAdding] = useState(false)
  const [editingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('Shell')
  const [newLanguage, setNewLanguage] = useState('shell')
  const [newTags, setNewTags] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const allSnippets = useMemo(() => {
    const pinned = snippets.filter((s) => s.isPinned)
    const rest = snippets.filter((s) => !s.isPinned).sort((a, b) => b.usageCount - a.usageCount)
    return [...pinned, ...rest]
  }, [snippets])

  const filtered = useMemo(() => {
    let list = allSnippets
    if (filterCategory !== '__all__') list = list.filter((s) => s.category === filterCategory)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [allSnippets, query, filterCategory])

  const categories = useMemo(() => {
    const cats = new Set(snippets.map((s) => s.category))
    return Array.from(cats).sort()
  }, [snippets])

  const handleAdd = useCallback(() => {
    if (!newTitle.trim() || !newContent.trim()) return
    addSnippet({
      id: generateId(), title: newTitle.trim(), content: newContent.trim(),
      category: newCategory, language: newLanguage,
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      isPinned: false, createdAt: new Date().toISOString(), usageCount: 0,
    })
    setNewTitle(''); setNewContent(''); setNewTags(''); setAdding(false)
  }, [newTitle, newContent, newCategory, newLanguage, newTags, addSnippet])

  const handleCopy = useCallback((id: string, content: string) => {
    void navigator.clipboard.writeText(content)
    setCopiedId(id); incrementSnippetUsage(id)
    setTimeout(() => setCopiedId(null), 1500)
  }, [incrementSnippetUsage])

  const handleRun = useCallback((snippet: Snippet) => {
    incrementSnippetUsage(snippet.id)
    primeTerminalCommand(snippet.content)
    setView('terminal')
  }, [incrementSnippetUsage, primeTerminalCommand, setView])

  const handleImportBuiltins = useCallback(() => {
    BUILTIN_SNIPPETS.forEach((s) => {
      addSnippet({ ...s, id: generateId(), createdAt: new Date().toISOString(), usageCount: 0 })
    })
  }, [addSnippet])

  const handleExport = useCallback(() => {
    const json = JSON.stringify(snippets, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sloerspace-snippets.json'; a.click()
    URL.revokeObjectURL(url)
  }, [snippets])

  const handleImport = useCallback(() => {
    setImportError(null)
    try {
      const parsed = JSON.parse(importText.trim()) as Snippet[]
      if (!Array.isArray(parsed)) { setImportError('Expected a JSON array'); return }
      parsed.forEach((s) => {
        if (s.title && s.content) {
          addSnippet({ ...s, id: generateId(), createdAt: s.createdAt ?? new Date().toISOString(), usageCount: s.usageCount ?? 0 })
        }
      })
      setImportText(''); setShowImport(false)
    } catch {
      setImportError('Invalid JSON')
    }
  }, [importText, addSnippet])

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <BookMarked size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Snippet Manager</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>{snippets.length} snippets</span>
          </div>
          <div className="flex items-center gap-1">
            {snippets.length === 0 && (
              <button onClick={handleImportBuiltins} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-medium" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                ✦ Load Builtins
              </button>
            )}
            <button onClick={handleExport} disabled={snippets.length === 0} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30" title="Export snippets">
              <Download size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
            <button onClick={() => setShowImport((s) => !s)} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Import snippets">
              <Upload size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
            <button onClick={() => { setAdding(true); setTimeout(() => titleRef.current?.focus(), 50) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
              <Plus size={11} /> Add
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <Search size={11} style={{ color: 'var(--text-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search snippets…"
              className="flex-1 bg-transparent outline-none text-[11px]" style={{ color: 'var(--text-primary)' }} />
            {query && <button onClick={() => setQuery('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>}
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 pb-2 overflow-x-auto">
            {['__all__', ...categories].map((cat) => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className="px-2.5 py-1 rounded-lg text-[9px] font-medium whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: filterCategory === cat ? 'var(--accent-subtle)' : 'transparent',
                  color: filterCategory === cat ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${filterCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                {cat === '__all__' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Import panel */}
        {showImport && (
          <div className="px-4 pb-3 space-y-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)', paddingTop: 8 }}>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
              placeholder='Paste JSON array of snippets…'
              className="w-full bg-transparent outline-none resize-none font-mono text-[10px] p-2 rounded-lg"
              style={{ border: `1px solid ${importError ? 'var(--error)' : 'var(--border)'}`, color: 'var(--text-primary)', minHeight: 60 }} />
            {importError && <div className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--error)' }}><AlertCircle size={10} />{importError}</div>}
            <div className="flex items-center gap-2">
              <button onClick={handleImport} disabled={!importText.trim()} className="px-3 py-1 rounded-lg text-[10px] font-medium disabled:opacity-40" style={{ background: 'var(--accent)', color: '#fff' }}>Import</button>
              <button onClick={() => { setShowImport(false); setImportText(''); setImportError(null) }} className="px-3 py-1 rounded-lg text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Add form */}
        {adding && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface-1)', border: '1px solid var(--accent)' }}>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input ref={titleRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Snippet title…"
                  className="w-full px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-transparent outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full text-[10px] px-2 py-1.5 rounded-lg outline-none"
                  style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <input value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} placeholder="Language (shell, python…)"
                  className="w-full px-2 py-1.5 rounded-lg text-[10px] bg-transparent outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="col-span-2">
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Command or code snippet…"
                  className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-transparent outline-none resize-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', minHeight: 72 }} />
              </div>
              <div className="col-span-2">
                <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags (comma separated)"
                  className="w-full px-2.5 py-1.5 rounded-lg text-[10px] bg-transparent outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setAdding(false)} className="px-3 py-1 rounded-lg text-[10px]" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={handleAdd} disabled={!newTitle.trim() || !newContent.trim()}
                className="px-3 py-1 rounded-lg text-[10px] font-medium disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}>Save Snippet</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <BookMarked size={28} style={{ color: 'var(--text-muted)' }} />
            <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {query || filterCategory !== '__all__' ? 'No matching snippets' : 'No snippets yet'}
            </div>
            {!query && filterCategory === '__all__' && (
              <div className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                Add snippets manually or load the built-in collection to get started
              </div>
            )}
          </div>
        )}

        {/* Snippet cards */}
        {filtered.map((snippet) => {
          const isCopied = copiedId === snippet.id
          const isEditing = editingId === snippet.id
          return (
            <div key={snippet.id} className="group rounded-xl overflow-hidden transition-all"
              style={{ background: 'var(--surface-1)', border: `1px solid ${snippet.isPinned ? 'var(--accent)' : 'var(--border)'}` }}>
              <div className="flex items-start gap-3 px-3 py-2.5">
                {snippet.isPinned && <Pin size={10} className="shrink-0 mt-1" style={{ color: 'var(--accent)' }} />}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{snippet.title}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>{snippet.category}</span>
                    {snippet.language && snippet.language !== 'shell' && (
                      <span className="text-[8px] shrink-0" style={{ color: 'var(--text-muted)' }}>{snippet.language}</span>
                    )}
                  </div>
                  <pre className="text-[10px] font-mono truncate" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: isEditing ? 'none' : 36, overflow: 'hidden' }}>
                    {snippet.content}
                  </pre>
                  {snippet.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {snippet.tags.map((t) => (
                        <span key={t} className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                          <Tag size={7} />{t}
                        </span>
                      ))}
                    </div>
                  )}
                  {snippet.usageCount > 0 && (
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>used {snippet.usageCount}×</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => updateSnippet(snippet.id, { isPinned: !snippet.isPinned })}
                    className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title={snippet.isPinned ? 'Unpin' : 'Pin'}>
                    <Pin size={10} style={{ color: snippet.isPinned ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </button>
                  <button onClick={() => handleCopy(snippet.id, snippet.content)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Copy">
                    {isCopied ? <Check size={10} style={{ color: '#38dd92' }} /> : <Copy size={10} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button onClick={() => handleRun(snippet)} className="p-1 rounded hover:bg-[rgba(79,140,255,0.15)]" title="Run in terminal">
                    <Play size={10} style={{ color: 'var(--accent)' }} />
                  </button>
                  <button onClick={() => removeSnippet(snippet.id)} className="p-1 rounded hover:bg-[rgba(255,71,87,0.1)]">
                    <Trash2 size={10} style={{ color: '#ff6f96' }} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{filtered.length} shown · {snippets.filter((s) => s.isPinned).length} pinned</span>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{categories.length} categories</span>
      </div>
    </div>
  )
}
