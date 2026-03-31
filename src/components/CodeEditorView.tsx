'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { X, Save, FileCode, FolderOpen, ChevronRight, GitBranch } from 'lucide-react'
import { readFileContent, writeFileContent, getDefaultWorkingDirectory } from '@/lib/desktop'
import { useStore } from '@/store/useStore'
import { FileExplorer } from '@/components/FileExplorer'
import { GitPanel } from '@/components/GitPanel'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false })

/* ── Language detection ────────────────────────────────────── */

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  rs: 'rust', py: 'python', go: 'go', java: 'java', c: 'c', cpp: 'cpp', h: 'c',
  cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
  html: 'html', css: 'css', scss: 'scss', less: 'less',
  md: 'markdown', sql: 'sql', sh: 'shell', bash: 'shell', ps1: 'powershell',
  dockerfile: 'dockerfile', makefile: 'makefile',
}

function detectLanguage(path: string): string {
  const name = path.split(/[\\/]/).pop()?.toLowerCase() ?? ''
  if (name === 'dockerfile') return 'dockerfile'
  if (name === 'makefile') return 'makefile'
  const ext = name.split('.').pop() ?? ''
  return EXT_TO_LANG[ext] ?? 'plaintext'
}

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/* ── Tab interface ─────────────────────────────────────────── */

interface EditorTab {
  path: string
  name: string
  language: string
  content: string
  originalContent: string
  isDirty: boolean
  isBinary: boolean
}

/* ── Component ─────────────────────────────────────────────── */

export function CodeEditorView() {
  const [tabs, setTabs] = useState<EditorTab[]>([])
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null)
  const [showExplorer, setShowExplorer] = useState(true)
  const [showGit, setShowGit] = useState(false)
  const [rootPath, setRootPath] = useState('')
  const [saving, setSaving] = useState(false)

  const activeWorkspace = useStore((s) => {
    const id = s.activeTabId
    return id ? s.workspaceTabs.find((t) => t.id === id) : null
  })

  useEffect(() => {
    const dir = activeWorkspace?.workingDirectory
    if (dir) { setRootPath(dir); return }
    getDefaultWorkingDirectory().then(setRootPath)
  }, [activeWorkspace?.workingDirectory])

  const activeTab = tabs.find((t) => t.path === activeTabPath) ?? null

  const openFile = useCallback(async (fullPath: string) => {
    const existing = tabs.find((t) => t.path === fullPath)
    if (existing) { setActiveTabPath(fullPath); return }

    try {
      const result = await readFileContent(fullPath)
      const tab: EditorTab = {
        path: fullPath,
        name: getFileName(fullPath),
        language: detectLanguage(fullPath),
        content: result.content,
        originalContent: result.content,
        isDirty: false,
        isBinary: result.is_binary,
      }
      setTabs((prev) => [...prev, tab])
      setActiveTabPath(fullPath)
    } catch (e) {
      console.error('Failed to open file:', e)
    }
  }, [tabs])

  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.path !== path)
      if (activeTabPath === path) {
        const idx = prev.findIndex((t) => t.path === path)
        const nextActive = next[Math.min(idx, next.length - 1)]
        setActiveTabPath(nextActive?.path ?? null)
      }
      return next
    })
  }, [activeTabPath])

  const updateContent = useCallback((path: string, value: string | undefined) => {
    if (value === undefined) return
    setTabs((prev) => prev.map((t) =>
      t.path === path ? { ...t, content: value, isDirty: value !== t.originalContent } : t
    ))
  }, [])

  const saveFile = useCallback(async () => {
    if (!activeTab || !activeTab.isDirty) return
    setSaving(true)
    try {
      await writeFileContent(activeTab.path, activeTab.content)
      setTabs((prev) => prev.map((t) =>
        t.path === activeTab.path ? { ...t, originalContent: t.content, isDirty: false } : t
      ))
    } catch (e) {
      console.error('Failed to save:', e)
    }
    setSaving(false)
  }, [activeTab])

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && activeTab) {
        e.preventDefault()
        saveFile()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTab, saveFile])

  return (
    <div className="h-full flex" style={{ background: 'var(--surface-0)' }}>
      {/* File Explorer Sidebar */}
      {showExplorer && rootPath && (
        <FileExplorer
          rootPath={rootPath}
          onFileSelect={openFile}
          onClose={() => setShowExplorer(false)}
        />
      )}

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar */}
        <div className="flex items-center shrink-0 overflow-x-auto" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}>
          {!showExplorer && (
            <button onClick={() => setShowExplorer(true)} className="p-2 shrink-0 hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }} title="Show Explorer">
              <FolderOpen size={14} />
            </button>
          )}
          <button onClick={() => setShowGit(!showGit)} className="p-2 shrink-0 hover:bg-[rgba(255,255,255,0.06)]" title="Toggle Git Panel"
            style={{ color: showGit ? 'var(--accent)' : 'var(--text-muted)' }}>
            <GitBranch size={14} />
          </button>
          {tabs.map((tab) => {
            const isActive = tab.path === activeTabPath
            return (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className="group flex items-center gap-1.5 px-3 py-2 cursor-pointer shrink-0 transition-all"
                style={{
                  background: isActive ? 'var(--surface-0)' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  borderRight: '1px solid var(--border)',
                }}
              >
                <FileCode size={12} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                <span className="text-[11px] whitespace-nowrap" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {tab.name}
                </span>
                {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.path) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[rgba(255,255,255,0.1)] transition-all"
                >
                  <X size={10} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            )
          })}
        </div>

        {/* Breadcrumb */}
        {activeTab && (
          <div className="flex items-center gap-1 px-3 py-1 shrink-0 text-[10px] overflow-x-auto" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            {activeTab.path.replace(/\\/g, '/').split('/').filter(Boolean).map((segment, i, arr) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={8} className="shrink-0" />}
                <span className={i === arr.length - 1 ? 'font-medium' : ''} style={{ color: i === arr.length - 1 ? 'var(--text-primary)' : undefined }}>
                  {segment}
                </span>
              </React.Fragment>
            ))}
            {activeTab.isDirty && (
              <button onClick={saveFile} disabled={saving} className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                <Save size={9} /> {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        )}

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          {activeTab && !activeTab.isBinary ? (
            <MonacoEditor
              height="100%"
              language={activeTab.language}
              value={activeTab.content}
              onChange={(v) => updateContent(activeTab.path, v)}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
                fontLigatures: true,
                minimap: { enabled: true, scale: 1 },
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                tabSize: 2,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
                padding: { top: 12 },
                renderWhitespace: 'selection',
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                automaticLayout: true,
              }}
            />
          ) : activeTab?.isBinary ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileCode size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-3" />
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Binary file</div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Cannot display binary content</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileCode size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-3" />
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Open a file to start editing</div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {showExplorer ? 'Click a file in the explorer' : 'Toggle the file explorer with the folder icon'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-3 py-1 shrink-0" style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            {activeTab && (
              <>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>
                  {activeTab.language.toUpperCase()}
                </span>
                {activeTab.isDirty && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,191,98,0.1)', color: '#ffbf62' }}>MODIFIED</span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {tabs.length} file{tabs.length !== 1 ? 's' : ''} open
            </span>
          </div>
        </div>
      </div>

      {/* Git Panel */}
      {showGit && rootPath && (
        <GitPanel cwd={rootPath} onClose={() => setShowGit(false)} />
      )}
    </div>
  )
}
