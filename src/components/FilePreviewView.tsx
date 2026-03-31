'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  FileText, Image, Code, FolderOpen, X, Copy, Check,
  ZoomIn, ZoomOut, ExternalLink, Loader2
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { readFileContent, getAssetUrl } from '@/lib/desktop'

/* ── helpers ──────────────────────────────────────────────── */

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'])
const CODE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'rs', 'py', 'go', 'java', 'kt', 'cpp', 'c', 'cs', 'rb', 'php', 'swift', 'sh', 'bash', 'sql', 'xml', 'toml', 'yaml', 'yml', 'css', 'scss', 'html', 'vue', 'svelte'])

function getExt(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

function detectType(path: string): 'image' | 'markdown' | 'json' | 'code' | 'text' {
  const ext = getExt(path)
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (ext === 'md' || ext === 'mdx') return 'markdown'
  if (ext === 'json') return 'json'
  if (CODE_EXTS.has(ext)) return 'code'
  return 'text'
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-[13px] font-bold mt-3 mb-1" style="color:var(--text-primary)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[15px] font-bold mt-4 mb-1.5" style="color:var(--text-primary)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[18px] font-bold mt-4 mb-2" style="color:var(--text-primary)">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded text-[10px] font-mono" style="background:rgba(255,255,255,0.08);color:#8fc2ff">$1</code>')
    .replace(/```[\s\S]*?```/g, (match) => {
      const inner = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      return `<pre class="px-3 py-2 rounded-xl my-2 text-[10px] font-mono overflow-x-auto" style="background:rgba(0,0,0,0.25);color:var(--text-secondary);white-space:pre-wrap">${inner}</pre>`
    })
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-[11px] mb-0.5" style="color:var(--text-secondary)">• $1</li>')
    .replace(/^> (.+)$/gm, '<blockquote class="pl-3 my-1 text-[10px] italic" style="border-left:2px solid var(--accent);color:var(--text-muted)">$1</blockquote>')
    .replace(/\n\n/g, '<br/>')
}

function formatJsonTree(obj: unknown, depth = 0): string {
  const indent = '  '.repeat(depth)
  if (obj === null) return '<span style="color:#ff6f96">null</span>'
  if (typeof obj === 'boolean') return `<span style="color:#f87171">${obj}</span>`
  if (typeof obj === 'number') return `<span style="color:#7fdbca">${obj}</span>`
  if (typeof obj === 'string') return `<span style="color:#a8ff78">"${obj.slice(0, 200)}${obj.length > 200 ? '…' : ''}"</span>`
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    const items = obj.slice(0, 50).map((v) => `${indent}  ${formatJsonTree(v, depth + 1)}`).join(',\n')
    const more = obj.length > 50 ? `\n${indent}  <span style="color:var(--text-muted)">… +${obj.length - 50} items</span>` : ''
    return `[\n${items}${more}\n${indent}]`
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>).slice(0, 50)
    if (entries.length === 0) return '{}'
    const items = entries.map(([k, v]) => `${indent}  <span style="color:#8fc2ff">"${k}"</span>: ${formatJsonTree(v, depth + 1)}`).join(',\n')
    const more = Object.keys(obj as object).length > 50 ? `\n${indent}  <span style="color:var(--text-muted)">… +${Object.keys(obj as object).length - 50} keys</span>` : ''
    return `{\n${items}${more}\n${indent}}`
  }
  return String(obj)
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/* ── component ────────────────────────────────────────────── */

export function FilePreviewView() {
  const filePreviewPath = useStore((s) => s.filePreviewPath)
  const setFilePreviewPath = useStore((s) => s.setFilePreviewPath)
  const setView = useStore((s) => s.setView)

  const [pathInput, setPathInput] = useState(filePreviewPath ?? '')
  const [showPathBar, setShowPathBar] = useState(!filePreviewPath)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [imgZoom, setImgZoom] = useState(1)
  const [fileSize, setFileSize] = useState(0)
  const [fileLines, setFileLines] = useState(0)

  const loadFile = useCallback(async (path: string) => {
    setLoading(true); setError(null); setContent(null)
    try {
      const type = detectType(path)
      if (type === 'image') {
        setContent('__image__')
        setFileSize(0); setFileLines(0)
      } else {
        const result = await readFileContent(path)
        if (result.is_binary) { setError('Binary file — cannot display as text.'); return }
        setContent(result.content)
        setFileSize(result.size)
        setFileLines(result.content.split('\n').length)
      }
      setFilePreviewPath(path)
      setShowPathBar(false)
    } catch {
      setError('Could not open file. Check the path and try again.')
    } finally { setLoading(false) }
  }, [setFilePreviewPath])

  useEffect(() => {
    if (filePreviewPath) void loadFile(filePreviewPath)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePathSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (pathInput.trim()) void loadFile(pathInput.trim())
  }, [pathInput, loadFile])

  const handleCopy = useCallback(() => {
    if (content && content !== '__image__') {
      void navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [content])

  const path = filePreviewPath ?? ''
  const fileName = path.split(/[\\/]/).pop() ?? ''
  const ext = getExt(path)
  const type = path ? detectType(path) : 'text'

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-4 py-2">
          {type === 'image' ? <Image size={15} style={{ color: 'var(--accent)' }} />
            : type === 'markdown' ? <FileText size={15} style={{ color: '#8fc2ff' }} />
            : <Code size={15} style={{ color: '#38dd92' }} />}
          <span className="text-[13px] font-semibold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
            {fileName || 'File Preview'}
          </span>
          {ext && <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>.{ext}</span>}
          {fileSize > 0 && <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>{formatBytes(fileSize)}</span>}
          <div className="flex items-center gap-0.5 ml-1">
            <button onClick={() => setShowPathBar((s) => !s)} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Open file">
              <FolderOpen size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
            {content && content !== '__image__' && (
              <button onClick={handleCopy} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Copy content">
                {copied ? <Check size={13} style={{ color: '#38dd92' }} /> : <Copy size={13} style={{ color: 'var(--text-muted)' }} />}
              </button>
            )}
            {type === 'image' && (
              <>
                <button onClick={() => setImgZoom((z) => Math.min(z + 0.25, 4))} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)]"><ZoomIn size={13} style={{ color: 'var(--text-muted)' }} /></button>
                <button onClick={() => setImgZoom((z) => Math.max(z - 0.25, 0.25))} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)]"><ZoomOut size={13} style={{ color: 'var(--text-muted)' }} /></button>
              </>
            )}
            <button onClick={() => { setView('editor'); setFilePreviewPath(path) }} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.06)]" title="Open in Code Editor">
              <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Path bar */}
        {showPathBar && (
          <form onSubmit={handlePathSubmit} className="flex items-center gap-2 px-4 py-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
            <FolderOpen size={12} style={{ color: 'var(--accent)' }} />
            <input value={pathInput} onChange={(e) => setPathInput(e.target.value)}
              placeholder="/path/to/file.ts  or  C:\Users\..."
              className="flex-1 bg-transparent outline-none text-[11px] font-mono px-2 py-1 rounded-lg"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} autoFocus />
            <button type="submit" disabled={!pathInput.trim() || loading}
              className="px-3 py-1 rounded-lg text-[10px] font-medium disabled:opacity-40"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              {loading ? 'Loading…' : 'Open'}
            </button>
            {filePreviewPath && (
              <button type="button" onClick={() => setShowPathBar(false)} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]">
                <X size={12} style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full gap-2" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={18} className="animate-spin" />
            <span className="text-[11px]">Loading…</span>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FileText size={28} style={{ color: 'var(--text-muted)' }} />
            <div className="text-[12px]" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}
        {!loading && !error && !content && !filePreviewPath && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FolderOpen size={32} style={{ color: 'var(--text-muted)' }} />
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>No file open</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Click the folder icon or use the path bar to open a file</div>
          </div>
        )}

        {/* Image */}
        {!loading && !error && content === '__image__' && path && (
          <div className="flex items-center justify-center min-h-full p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAssetUrl(path)}
              alt={fileName}
              style={{ transform: `scale(${imgZoom})`, transformOrigin: 'center', maxWidth: '100%', imageRendering: 'pixelated' }}
              onError={() => setError('Could not load image.')}
            />
          </div>
        )}

        {/* Markdown */}
        {!loading && !error && content && content !== '__image__' && type === 'markdown' && (
          <div className="px-8 py-6 max-w-3xl mx-auto">
            <div
              className="prose-like leading-relaxed text-[12px]"
              style={{ color: 'var(--text-secondary)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        )}

        {/* JSON */}
        {!loading && !error && content && content !== '__image__' && type === 'json' && (
          <div className="p-4 overflow-auto">
            <pre className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}
              dangerouslySetInnerHTML={{ __html: (() => { try { return formatJsonTree(JSON.parse(content)) } catch { return content } })() }}
            />
          </div>
        )}

        {/* Code / Text */}
        {!loading && !error && content && content !== '__image__' && (type === 'code' || type === 'text') && (
          <div className="flex h-full">
            {/* Line numbers */}
            <div className="select-none px-3 py-4 text-right shrink-0" style={{ background: 'rgba(0,0,0,0.15)', borderRight: '1px solid var(--border)', minWidth: 48 }}>
              {content.split('\n').map((_, i) => (
                <div key={i} className="text-[9px] font-mono leading-[1.6rem]" style={{ color: 'var(--text-muted)' }}>{i + 1}</div>
              ))}
            </div>
            <pre className="flex-1 px-4 py-4 text-[11px] font-mono leading-[1.6rem] overflow-x-auto" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre', background: 'transparent' }}>
              {content}
            </pre>
          </div>
        )}
      </div>

      {/* Status bar */}
      {content && content !== '__image__' && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-1" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{fileLines} lines</span>
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{formatBytes(fileSize)}</span>
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{type.toUpperCase()}</span>
          <span className="flex-1 text-right text-[9px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{path}</span>
        </div>
      )}
    </div>
  )
}
