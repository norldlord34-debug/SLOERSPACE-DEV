'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Plus, Play, Trash2, ChevronUp, ChevronDown, FileText, Code,
  Download, Type, Loader2, FolderOpen, Save, X, AlertCircle, Check
} from 'lucide-react'
import { useStore, generateId } from '@/store/useStore'
import { runTerminalCommand, getDefaultWorkingDirectory, readFileContent, writeFileContent } from '@/lib/desktop'

/* ── Markdown ↔ Cells helpers ──────────────────────────────── */

function parseMarkdownToCells(md: string): NotebookCell[] {
  const cells: NotebookCell[] = []
  const codeBlockRe = /```(?:bash|shell|sh|zsh|powershell|cmd)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRe.exec(md)) !== null) {
    const before = md.slice(lastIndex, match.index).trim()
    if (before) cells.push({ id: generateId(), type: 'markdown', content: before })
    cells.push({ id: generateId(), type: 'code', content: match[1].trimEnd() })
    lastIndex = match.index + match[0].length
  }
  const after = md.slice(lastIndex).trim()
  if (after) cells.push({ id: generateId(), type: 'markdown', content: after })
  if (cells.length === 0) cells.push({ id: generateId(), type: 'markdown', content: md })
  return cells
}

function formatCellsToMarkdown(cells: NotebookCell[], title: string): string {
  const lines: string[] = [`# ${title}`, '']
  cells.forEach((cell) => {
    if (cell.type === 'markdown') {
      lines.push(cell.content.trim(), '')
    } else {
      lines.push('```bash', cell.content, '```', '')
      if (cell.output) lines.push('**Output:**', '```', cell.output, '```', '')
    }
  })
  return lines.join('\n')
}

/* ── Types ──────────────────────────────────────────────────── */

interface NotebookCell {
  id: string
  type: 'markdown' | 'code'
  content: string
  output?: string
  isRunning?: boolean
  exitCode?: number
}

/* ── Component ──────────────────────────────────────────────── */

export function NotebookView() {
  const [cells, setCells] = useState<NotebookCell[]>([
    { id: generateId(), type: 'markdown', content: '# My Notebook\n\nWrite documentation and run commands inline.' },
    { id: generateId(), type: 'code', content: 'echo "Hello from SloerSpace Notebook"' },
  ])
  const [focusedCellId, setFocusedCellId] = useState<string | null>(null)
  const [cwd, setCwd] = useState('')
  const [notebookName, setNotebookName] = useState('Untitled Notebook')
  const [editingName, setEditingName] = useState(false)
  const cellRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const [filePath, setFilePath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [showPathBar, setShowPathBar] = useState<'open' | 'save' | null>(null)
  const [pathInput, setPathInput] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const isMountedRef = useRef(false)

  const activeWorkspace = useStore((s) => {
    const id = s.activeTabId
    return id ? s.workspaceTabs.find((t) => t.id === id) : null
  })

  useEffect(() => {
    const dir = activeWorkspace?.workingDirectory
    if (dir) { setCwd(dir); return }
    getDefaultWorkingDirectory().then(setCwd)
  }, [activeWorkspace?.workingDirectory])

  const addCell = useCallback((type: 'markdown' | 'code', afterId?: string) => {
    const newCell: NotebookCell = { id: generateId(), type, content: '' }
    setCells((prev) => {
      if (afterId) {
        const idx = prev.findIndex((c) => c.id === afterId)
        const next = [...prev]
        next.splice(idx + 1, 0, newCell)
        return next
      }
      return [...prev, newCell]
    })
    setTimeout(() => {
      setFocusedCellId(newCell.id)
      cellRefs.current[newCell.id]?.focus()
    }, 50)
  }, [])

  const removeCell = useCallback((id: string) => {
    setCells((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const updateCell = useCallback((id: string, content: string) => {
    setCells((prev) => prev.map((c) => c.id === id ? { ...c, content } : c))
  }, [])

  const moveCell = useCallback((id: string, direction: -1 | 1) => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === id)
      if (idx === -1) return prev
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
  }, [])

  const runCell = useCallback(async (id: string) => {
    const cell = cells.find((c) => c.id === id)
    if (!cell || cell.type !== 'code' || !cell.content.trim()) return

    setCells((prev) => prev.map((c) => c.id === id ? { ...c, isRunning: true, output: undefined } : c))

    try {
      const result = await runTerminalCommand(cell.content.trim(), cwd)
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim() || '(no output)'
      setCells((prev) => prev.map((c) => c.id === id ? { ...c, isRunning: false, output, exitCode: result.exitCode } : c))
    } catch (e) {
      setCells((prev) => prev.map((c) => c.id === id ? { ...c, isRunning: false, output: `Error: ${e}`, exitCode: 1 } : c))
    }
  }, [cells, cwd])

  const runAllCells = useCallback(async () => {
    for (const cell of cells) {
      if (cell.type === 'code' && cell.content.trim()) {
        await runCell(cell.id)
      }
    }
  }, [cells, runCell])

  const exportMarkdown = useCallback(() => {
    const lines = [`# ${notebookName}`, '']
    cells.forEach((cell) => {
      if (cell.type === 'markdown') {
        lines.push(cell.content, '')
      } else {
        lines.push('```bash', cell.content, '```', '')
        if (cell.output) {
          lines.push('**Output:**', '```', cell.output, '```', '')
        }
      }
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${notebookName.replace(/\s+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [cells, notebookName])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, cellId: string, cellType: string) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && cellType === 'code') {
      e.preventDefault()
      runCell(cellId)
    }
  }, [runCell])

  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return }
    setIsDirty(true)
    setSaveSuccess(false)
  }, [cells, notebookName])

  const handleOpenFile = useCallback(async (path: string) => {
    setFileError(null)
    try {
      const result = await readFileContent(path)
      if (result.is_binary) { setFileError('Cannot open binary file'); return }
      const parsed = parseMarkdownToCells(result.content)
      setCells(parsed)
      setFilePath(path)
      const fileName = path.split(/[\\/]/).pop() ?? 'Notebook'
      setNotebookName(fileName.replace(/\.md$/i, ''))
      isMountedRef.current = false
      setIsDirty(false)
      setShowPathBar(null)
      setPathInput('')
    } catch {
      setFileError('Could not open file. Check the path and try again.')
    }
  }, [])

  const handleSaveFile = useCallback(async (path: string) => {
    setIsSaving(true)
    setFileError(null)
    try {
      await writeFileContent(path, formatCellsToMarkdown(cells, notebookName))
      setFilePath(path)
      setIsDirty(false)
      setSaveSuccess(true)
      setShowPathBar(null)
      setPathInput('')
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      setFileError('Could not save file. Check the path and try again.')
    } finally {
      setIsSaving(false)
    }
  }, [cells, notebookName])

  const handlePathBarSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!pathInput.trim()) return
    if (showPathBar === 'open') void handleOpenFile(pathInput.trim())
    else if (showPathBar === 'save') void handleSaveFile(pathInput.trim())
  }, [pathInput, showPathBar, handleOpenFile, handleSaveFile])

  const openSaveBar = useCallback(() => {
    setShowPathBar('save')
    setPathInput(filePath ?? `${notebookName.replace(/\s+/g, '-').toLowerCase()}.md`)
    setFileError(null)
  }, [filePath, notebookName])

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <FileText size={16} style={{ color: 'var(--accent)' }} />
            {editingName ? (
              <input value={notebookName} onChange={(e) => setNotebookName(e.target.value)} onBlur={() => setEditingName(false)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false) }}
                className="text-[13px] font-semibold bg-transparent outline-none px-1 rounded" style={{ color: 'var(--text-primary)', border: '1px solid var(--accent)' }} autoFocus />
            ) : (
              <button onClick={() => setEditingName(true)} className="text-[13px] font-semibold hover:underline flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                {notebookName}
                {isDirty && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>●</span>}
              </button>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>{cells.length} cells</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={runAllCells} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all hover:scale-105" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
              <Play size={11} /> Run All
            </button>
            <button onClick={() => { setShowPathBar('open'); setPathInput(''); setFileError(null) }} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }} title="Open .md from disk">
              <FolderOpen size={14} />
            </button>
            <button onClick={openSaveBar} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: saveSuccess ? '#38dd92' : isDirty ? 'var(--accent)' : 'var(--text-muted)' }} title="Save to disk (Ctrl+S)">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}
            </button>
            <button onClick={exportMarkdown} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }} title="Export / download as Markdown">
              <Download size={14} />
            </button>
          </div>
        </div>

        {/* Path bar (open or save) */}
        {showPathBar && (
          <form onSubmit={handlePathBarSubmit} className="flex items-center gap-2 px-4 py-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
            <span className="text-[9px] font-bold uppercase tracking-wider shrink-0" style={{ color: 'var(--accent)' }}>
              {showPathBar === 'open' ? 'Open file' : 'Save to'}
            </span>
            <input
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder={showPathBar === 'open' ? '/path/to/notebook.md' : `${notebookName.replace(/\s+/g, '-').toLowerCase()}.md`}
              className="flex-1 bg-transparent outline-none text-[11px] font-mono px-2 py-1 rounded-lg"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            {fileError && (
              <span className="flex items-center gap-1 text-[9px] shrink-0" style={{ color: 'var(--error)' }}>
                <AlertCircle size={10} /> {fileError}
              </span>
            )}
            <button type="submit" disabled={!pathInput.trim() || isSaving} className="px-3 py-1 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40" style={{ background: 'var(--accent)', color: '#fff' }}>
              {showPathBar === 'open' ? 'Open' : isSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setShowPathBar(null); setFileError(null) }} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]">
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          </form>
        )}
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {cells.map((cell) => {
          const isFocused = focusedCellId === cell.id
          return (
            <div key={cell.id} className="group rounded-xl transition-all" style={{
              border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
              background: isFocused ? 'var(--surface-1)' : 'transparent',
            }}>
              {/* Cell header */}
              <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  {cell.type === 'code' ? (
                    <Code size={11} style={{ color: '#38dd92' }} />
                  ) : (
                    <Type size={11} style={{ color: '#8fc2ff' }} />
                  )}
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {cell.type === 'code' ? 'Shell' : 'Markdown'}
                  </span>
                  {cell.type === 'code' && cell.exitCode !== undefined && (
                    <span className="text-[8px] px-1 py-0.5 rounded" style={{
                      background: cell.exitCode === 0 ? 'rgba(56,221,146,0.1)' : 'rgba(255,111,150,0.1)',
                      color: cell.exitCode === 0 ? '#38dd92' : '#ff6f96',
                    }}>
                      exit {cell.exitCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {cell.type === 'code' && (
                    <button onClick={() => runCell(cell.id)} disabled={cell.isRunning} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Run (Ctrl+Enter)">
                      {cell.isRunning ? <Loader2 size={10} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <Play size={10} style={{ color: '#38dd92' }} />}
                    </button>
                  )}
                  <button onClick={() => moveCell(cell.id, -1)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]"><ChevronUp size={10} style={{ color: 'var(--text-muted)' }} /></button>
                  <button onClick={() => moveCell(cell.id, 1)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]"><ChevronDown size={10} style={{ color: 'var(--text-muted)' }} /></button>
                  <button onClick={() => removeCell(cell.id)} className="p-1 rounded hover:bg-[rgba(255,71,87,0.1)]"><Trash2 size={10} style={{ color: 'var(--text-muted)' }} /></button>
                </div>
              </div>

              {/* Cell content */}
              <textarea
                ref={(el) => { cellRefs.current[cell.id] = el }}
                value={cell.content}
                onChange={(e) => updateCell(cell.id, e.target.value)}
                onFocus={() => setFocusedCellId(cell.id)}
                onKeyDown={(e) => handleKeyDown(e, cell.id, cell.type)}
                className="w-full bg-transparent outline-none resize-none px-3 py-2 text-[12px] leading-relaxed"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: cell.type === 'code' ? "'JetBrains Mono', 'Cascadia Code', Consolas, monospace" : 'inherit',
                  minHeight: 60,
                }}
                placeholder={cell.type === 'code' ? 'Enter command...' : 'Write markdown...'}
                spellCheck={cell.type === 'markdown'}
              />

              {/* Cell output */}
              {cell.type === 'code' && cell.output && (
                <div className="px-3 py-2 text-[10px] font-mono leading-relaxed overflow-x-auto" style={{
                  borderTop: '1px solid var(--border)',
                  background: 'rgba(0,0,0,0.2)',
                  color: cell.exitCode === 0 ? 'var(--text-secondary)' : '#ff6f96',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}>
                  {cell.output}
                </div>
              )}
            </div>
          )
        })}

        {/* Add cell buttons */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => addCell('code')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all" style={{ color: '#38dd92', border: '1px dashed rgba(56,221,146,0.3)' }}>
            <Plus size={10} /> Code Cell
          </button>
          <button onClick={() => addCell('markdown')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all" style={{ color: '#8fc2ff', border: '1px dashed rgba(143,194,255,0.3)' }}>
            <Plus size={10} /> Markdown Cell
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)' }}>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {cells.filter((c) => c.type === 'code').length} code · {cells.filter((c) => c.type === 'markdown').length} markdown
          {isDirty && <span className="ml-2" style={{ color: 'var(--accent)' }}>● unsaved</span>}
        </span>
        <span className="text-[9px] font-mono truncate max-w-[50%]" style={{ color: 'var(--text-muted)' }} title={filePath ?? cwd}>
          {filePath ?? cwd}
        </span>
      </div>
    </div>
  )
}
