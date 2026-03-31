'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Folder, FolderOpen, File, FileText, FileCode, FileJson, Image as ImageIcon,
  ChevronRight, ChevronDown, RefreshCw, Search, X, Hash
} from 'lucide-react'
import { getDirectoryTree, type TreeEntry } from '@/lib/desktop'

/* ── File icon mapping ──────────────────────────────────────── */

const EXT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  ts: { icon: FileCode, color: '#3178c6' },
  tsx: { icon: FileCode, color: '#3178c6' },
  js: { icon: FileCode, color: '#f7df1e' },
  jsx: { icon: FileCode, color: '#f7df1e' },
  rs: { icon: FileCode, color: '#dea584' },
  py: { icon: FileCode, color: '#3776ab' },
  go: { icon: FileCode, color: '#00add8' },
  json: { icon: FileJson, color: '#cbcb41' },
  md: { icon: FileText, color: '#519aba' },
  css: { icon: FileCode, color: '#563d7c' },
  html: { icon: FileCode, color: '#e34f26' },
  toml: { icon: FileText, color: '#9c4121' },
  yaml: { icon: FileText, color: '#cb171e' },
  yml: { icon: FileText, color: '#cb171e' },
  lock: { icon: Hash, color: 'var(--text-muted)' },
  png: { icon: ImageIcon, color: '#a074c4' },
  jpg: { icon: ImageIcon, color: '#a074c4' },
  svg: { icon: ImageIcon, color: '#ffb13b' },
  ico: { icon: ImageIcon, color: '#a074c4' },
}

function getFileIcon(name: string, isDir: boolean) {
  if (isDir) return { icon: Folder, color: 'var(--accent)' }
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_ICONS[ext] ?? { icon: File, color: 'var(--text-muted)' }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`
}

/* ── Component ──────────────────────────────────────────────── */

export function FileExplorer({
  rootPath,
  onFileSelect,
  onClose,
}: {
  rootPath: string
  onFileSelect: (fullPath: string) => void
  onClose?: () => void
}) {
  const [tree, setTree] = useState<TreeEntry[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadTree = useCallback(async () => {
    if (!rootPath) return
    setIsLoading(true)
    const entries = await getDirectoryTree(rootPath, 4)
    setTree(entries)
    setIsLoading(false)
    // Auto-expand first level
    const firstLevelDirs = entries.filter((e) => e.is_dir && e.depth === 0).map((e) => e.path)
    setExpandedDirs(new Set(firstLevelDirs))
  }, [rootPath])

  useEffect(() => { loadTree() }, [loadTree])

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const handleClick = useCallback((entry: TreeEntry) => {
    if (entry.is_dir) {
      toggleDir(entry.path)
    } else {
      setSelectedPath(entry.path)
      // Build full path
      const fullPath = rootPath.replace(/[\\/]$/, '') + '/' + entry.path
      onFileSelect(fullPath.replace(/\//g, '\\'))
    }
  }, [toggleDir, rootPath, onFileSelect])

  const visibleEntries = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return tree.filter((e) => e.name.toLowerCase().includes(q))
    }
    return tree.filter((entry) => {
      if (entry.depth === 0) return true
      // Check if all parent segments are expanded
      const parts = entry.path.split('/')
      for (let i = 1; i < parts.length; i++) {
        const parentPath = parts.slice(0, i).join('/')
        if (!expandedDirs.has(parentPath)) return false
      }
      return true
    })
  }, [tree, expandedDirs, searchQuery])

  const rootName = rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)', borderRight: '1px solid var(--border)', width: 260 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Folder size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-muted)' }}>{rootName}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={loadTree} className="p-1 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Refresh" style={{ color: 'var(--text-muted)' }}>
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }}>
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Search size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="flex-1 bg-transparent outline-none text-[10px]"
            style={{ color: 'var(--text-primary)' }}
            spellCheck={false}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-0.5 rounded hover:bg-[rgba(255,255,255,0.06)]">
              <X size={8} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {visibleEntries.length === 0 && !isLoading && (
          <div className="px-3 py-6 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {searchQuery ? 'No files match' : 'Empty directory'}
          </div>
        )}

        {visibleEntries.map((entry) => {
          const { icon: FileIcon, color } = getFileIcon(entry.name, entry.is_dir)
          const isExpanded = expandedDirs.has(entry.path)
          const isSelected = selectedPath === entry.path
          const indent = searchQuery ? 0 : entry.depth

          return (
            <button
              key={entry.path}
              onClick={() => handleClick(entry)}
              className="w-full flex items-center gap-1.5 py-[3px] pr-2 text-left transition-all hover:bg-[rgba(255,255,255,0.04)] group"
              style={{
                paddingLeft: 8 + indent * 16,
                background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {/* Chevron for dirs */}
              {entry.is_dir ? (
                isExpanded ? <ChevronDown size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              ) : (
                <span className="w-[10px]" />
              )}

              {/* Icon */}
              {entry.is_dir && isExpanded ? (
                <FolderOpen size={13} style={{ color, flexShrink: 0 }} />
              ) : (
                <FileIcon size={13} style={{ color, flexShrink: 0 }} />
              )}

              {/* Name */}
              <span className="text-[11px] truncate flex-1" style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {entry.name}
              </span>

              {/* Size */}
              {!entry.is_dir && entry.size > 0 && (
                <span className="text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  {formatSize(entry.size)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {tree.filter((e) => !e.is_dir).length} files · {tree.filter((e) => e.is_dir).length} dirs
        </span>
      </div>
    </div>
  )
}
