'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  MonitorPlay, RefreshCw, ExternalLink, ChevronDown, Globe,
  Maximize2, Minimize2, AlertCircle
} from 'lucide-react'
import { useStore } from '@/store/useStore'

const COMMON_PORTS = [3000, 3001, 4000, 5000, 5173, 8000, 8080, 8888, 9000]

export function PreviewPanel() {
  const previewPort = useStore((s) => s.previewPort)
  const setPreviewPort = useStore((s) => s.setPreviewPort)

  const [customPort, setCustomPort] = useState(String(previewPort))
  const [url, setUrl] = useState(`http://localhost:${previewPort}`)
  const [inputUrl, setInputUrl] = useState(`http://localhost:${previewPort}`)
  const [key, setKey] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const u = `http://localhost:${previewPort}`
    setUrl(u)
    setInputUrl(u)
    setCustomPort(String(previewPort))
  }, [previewPort])

  const navigate = useCallback((target: string) => {
    let resolved = target.trim()
    if (resolved && !resolved.startsWith('http')) resolved = `http://${resolved}`
    setUrl(resolved)
    setInputUrl(resolved)
    setLoadError(false)
    setKey((k) => k + 1)
  }, [])

  const handlePortSelect = useCallback((port: number) => {
    setPreviewPort(port)
    navigate(`http://localhost:${port}`)
  }, [setPreviewPort, navigate])

  const handleAddressSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    navigate(inputUrl)
  }, [inputUrl, navigate])

  const refresh = useCallback(() => {
    setLoadError(false)
    setKey((k) => k + 1)
  }, [])

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50' : 'h-full'}`} style={{ background: 'var(--surface-0)' }}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
        <MonitorPlay size={14} style={{ color: 'var(--accent)' }} />

        {/* Port selector */}
        <div className="relative shrink-0">
          <select
            value={previewPort}
            onChange={(e) => handlePortSelect(Number(e.target.value))}
            className="appearance-none text-[10px] font-mono pl-2 pr-6 py-1 rounded-lg outline-none"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {COMMON_PORTS.map((p) => (
              <option key={p} value={p}>:{p}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>

        {/* Custom port input */}
        <input
          value={customPort}
          onChange={(e) => setCustomPort(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePortSelect(Number(customPort) || previewPort) }}
          placeholder="port"
          className="w-14 text-[10px] font-mono px-2 py-1 rounded-lg bg-transparent outline-none"
          style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />

        {/* Address bar */}
        <form onSubmit={handleAddressSubmit} className="flex-1 flex">
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--surface-0)', border: '1px solid var(--border)' }}>
            <Globe size={10} style={{ color: 'var(--text-muted)' }} />
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 text-[11px] font-mono bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </form>

        <button onClick={refresh} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Refresh">
          <RefreshCw size={13} style={{ color: 'var(--text-muted)' }} />
        </button>
        <button onClick={() => window.open(url, '_blank')} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Open in browser">
          <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
        </button>
        <button onClick={() => setFullscreen((f) => !f)} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {fullscreen ? <Minimize2 size={13} style={{ color: 'var(--accent)' }} /> : <Maximize2 size={13} style={{ color: 'var(--text-muted)' }} />}
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden">
        {loadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <AlertCircle size={32} style={{ color: 'var(--text-muted)' }} />
            <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Cannot connect to {url}</div>
            <div className="text-[11px] text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Make sure your dev server is running on port {previewPort}. Try{' '}
              <code className="font-mono text-[10px]">npm run dev</code> or{' '}
              <code className="font-mono text-[10px]">npx serve .</code>
            </div>
            <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium transition-all" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid rgba(79,140,255,0.2)' }}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <iframe
            key={key}
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            title="Preview"
            onError={() => setLoadError(true)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
          />
        )}
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: loadError ? 'var(--error)' : '#38dd92' }} />
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{url}</span>
      </div>
    </div>
  )
}
