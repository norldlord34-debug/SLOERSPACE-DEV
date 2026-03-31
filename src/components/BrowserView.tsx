'use client'

/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Globe, ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Search,
  Lock, Shield, Maximize2, Minimize2, ExternalLink, BookOpen,
  Copy, Check, Terminal, Wrench, Pin, Undo2,
  GripVertical, Columns2, Rows2
} from 'lucide-react'
import {
  isTauriApp,
  browserCreatePane,
  browserClosePane,
  browserNavigatePane,
  browserResizePane,
  browserToggleDevtools,
  browserSetVisible,
  getDefaultWorkingDirectory,
  ensureTerminalSession,
} from '@/lib/desktop'
import { useStore } from '@/store/useStore'
import type { SavedBrowserTab, BrowserSplitMode } from '@/store/useStore'
import { PtyTerminalEmulator } from '@/components/TerminalView'

/* ── Types ───────────────────────────────────────────────────── */

interface BrowserTab {
  id: string
  url: string
  title: string
  favicon?: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  history: string[]
  historyIndex: number
  pinned?: boolean
}

/* ── Helpers ──────────────────────────────────────────────────── */

let tabIdCounter = Date.now()
const nextTabId = () => `btab-${++tabIdCounter}`

const DEFAULT_HOME_URL = 'https://www.google.com'

const BOOKMARKS = [
  { label: 'Google', url: 'https://www.google.com', icon: '🔍' },
  { label: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { label: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚' },
  { label: 'MDN Docs', url: 'https://developer.mozilla.org', icon: '📖' },
  { label: 'npm', url: 'https://www.npmjs.com', icon: '📦' },
  { label: 'Tauri Docs', url: 'https://v2.tauri.app', icon: '🦀' },
  { label: 'Rust Docs', url: 'https://doc.rust-lang.org', icon: '⚙️' },
  { label: 'TypeScript', url: 'https://www.typescriptlang.org', icon: '🔷' },
]

const normalizeUrl = (input: string): string => {
  const trimmed = input.trim()
  if (!trimmed) return DEFAULT_HOME_URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return `https://${trimmed}`
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

const getDomainFromUrl = (url: string): string => {
  try { return new URL(url).hostname } catch { return url }
}

const getFaviconUrl = (url: string): string | undefined => {
  try {
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`
  } catch { return undefined }
}

const isSecure = (url: string): boolean => {
  try { return new URL(url).protocol === 'https:' } catch { return false }
}

const tabToSaved = (tab: BrowserTab): SavedBrowserTab => ({
  id: tab.id,
  url: tab.url,
  title: tab.title,
  history: tab.history.slice(-20),
  historyIndex: Math.min(tab.historyIndex, 19),
  pinned: tab.pinned,
  favicon: tab.favicon,
})

const savedToTab = (saved: SavedBrowserTab): BrowserTab => ({
  id: saved.id,
  url: saved.url,
  title: saved.title,
  favicon: saved.favicon,
  isLoading: false,
  canGoBack: saved.historyIndex > 0,
  canGoForward: saved.historyIndex < saved.history.length - 1,
  history: saved.history,
  historyIndex: saved.historyIndex,
  pinned: saved.pinned,
})

/* ── Real Terminal Pane (for split mode) ───────────────────────── */

function RealTerminalPane({ direction }: { direction: 'right' | 'bottom' }) {
  const [sessionId] = useState(() => `browser-split-pty-${Date.now()}`)
  const [cwd, setCwd] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDefaultWorkingDirectory().then((dir) => {
      if (cancelled) return
      setCwd(dir)
      ensureTerminalSession(sessionId, dir, 'Browser Terminal', 'local').then(() => {
        if (!cancelled) setReady(true)
      }).catch(() => {
        if (!cancelled) setReady(true)
      })
    })
    return () => { cancelled = true }
  }, [sessionId])

  const borderStyle = direction === 'right'
    ? { borderLeft: '1px solid var(--border)' }
    : { borderTop: '1px solid var(--border)' }

  return (
    <div className="h-full w-full flex flex-col" style={{ background: 'var(--surface-0)', ...borderStyle }}>
      <div className="flex items-center gap-2 px-3 py-1 shrink-0" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}>
        <Terminal size={11} style={{ color: 'var(--accent)' }} />
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Terminal</span>
        <span className="text-[9px] ml-auto font-mono" style={{ color: 'var(--text-muted)' }}>{cwd ? cwd.split(/[\\/]/).pop() : '...'}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {ready && cwd ? (
          <PtyTerminalEmulator sessionId={sessionId} cwd={cwd} paneIndex={0} totalPanes={1} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Starting terminal...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main BrowserView Component ───────────────────────────────── */

export function BrowserView() {
  const savedBrowserTabs = useStore((s) => s.browserTabs)
  const savedSplitMode = useStore((s) => s.browserSplitMode)
  const savedActiveTabId = useStore((s) => s.browserActiveTabId)
  const savedShowBookmarks = useStore((s) => s.browserShowBookmarks)
  const setBrowserTabs = useStore((s) => s.setBrowserTabs)
  const setBrowserSplitMode = useStore((s) => s.setBrowserSplitMode)
  const setBrowserActiveTabId = useStore((s) => s.setBrowserActiveTabId)
  const setBrowserShowBookmarks = useStore((s) => s.setBrowserShowBookmarks)

  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    if (savedBrowserTabs.length > 0) {
      return savedBrowserTabs.map(savedToTab)
    }
    return [{
      id: nextTabId(),
      url: DEFAULT_HOME_URL,
      title: 'New Tab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      history: [DEFAULT_HOME_URL],
      historyIndex: 0,
    }]
  })
  const [activeTabId, setActiveTabId] = useState(() => {
    if (savedActiveTabId && savedBrowserTabs.some((t) => t.id === savedActiveTabId)) return savedActiveTabId
    return tabs[0]?.id ?? ''
  })
  const [urlInput, setUrlInput] = useState(() => {
    const saved = savedBrowserTabs.find((t) => t.id === savedActiveTabId)
    return saved?.url ?? tabs[0]?.url ?? DEFAULT_HOME_URL
  })
  const [urlFocused, setUrlFocused] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(savedShowBookmarks)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isTauri, setIsTauri] = useState(false)
  const [useNative, setUseNative] = useState(false)
  const [nativePaneId, setNativePaneId] = useState<string | null>(null)
  const [showNewTabPage, setShowNewTabPage] = useState(() => savedBrowserTabs.length === 0)
  const [splitMode, setSplitMode] = useState<BrowserSplitMode>(savedSplitMode)
  const [devtoolsOpen, setDevtoolsOpen] = useState(false)

  // C) Pro tabs: closed tabs stack for restore
  const [closedTabs, setClosedTabs] = useState<BrowserTab[]>([])
  // C) Pro tabs: context menu
  const [ctxMenu, setCtxMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)

  // Drag state
  const [dragTabId, setDragTabId] = useState<string | null>(null)
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null)

  const urlInputRef = useRef<HTMLInputElement>(null)
  const contentAreaRef = useRef<HTMLDivElement>(null)
  const contentRectRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 800, height: 600 })
  const nativePaneIdRef = useRef<string | null>(null)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? tabs[0], [tabs, activeTabId])

  /* ── Persistence: debounced save to store ───────────────────── */
  const persistTabs = useCallback((currentTabs: BrowserTab[]) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      setBrowserTabs(currentTabs.map(tabToSaved))
    }, 800)
  }, [setBrowserTabs])

  useEffect(() => { persistTabs(tabs) }, [tabs, persistTabs])
  useEffect(() => { setBrowserSplitMode(splitMode) }, [splitMode, setBrowserSplitMode])
  useEffect(() => { setBrowserActiveTabId(activeTabId) }, [activeTabId, setBrowserActiveTabId])
  useEffect(() => { setBrowserShowBookmarks(showBookmarks) }, [showBookmarks, setBrowserShowBookmarks])

  /* ── Tauri detection → auto-enable native WebView2 ──────────── */
  useEffect(() => {
    const tauri = isTauriApp()
    setIsTauri(tauri)
    if (tauri) setUseNative(true)
  }, [])

  useEffect(() => { nativePaneIdRef.current = nativePaneId }, [nativePaneId])

  // Compute physical pixel rect for native webview.
  // Multiplies by devicePixelRatio — Rust uses PhysicalPosition/PhysicalSize.
  const computeContentRect = useCallback(() => {
    const el = contentAreaRef.current
    if (!el) return { x: 0, y: 0, width: 800, height: 600 }

    const dpr = window.devicePixelRatio || 1

    // Walk up offset chain for absolute position in CSS pixels
    let absTop = 0
    let absLeft = 0
    let current: HTMLElement | null = el
    while (current) {
      absTop += current.offsetTop
      absLeft += current.offsetLeft
      current = current.offsetParent as HTMLElement | null
    }

    // Force right edge to viewport — then convert to physical pixels
    const viewportWidth = document.documentElement.clientWidth
    const cssWidth = viewportWidth - absLeft
    const cssHeight = el.clientHeight

    return {
      x: Math.round(absLeft * dpr),
      y: Math.round(absTop * dpr),
      width: Math.max(10, Math.round(cssWidth * dpr)),
      height: Math.max(10, Math.round(cssHeight * dpr)),
    }
  }, [])

  /* ── Native webview: CREATE once per tab ID ───────────────────── */
  useEffect(() => {
    if (!useNative || !activeTab) return
    const paneLabel = `native-browser-${activeTab.id}`

    let cancelled = false
    const init = async () => {
      await new Promise((r) => setTimeout(r, 200))
      if (cancelled || !contentAreaRef.current) return

      const rect = computeContentRect()
      if (rect.width < 10 || rect.height < 10) return
      contentRectRef.current = rect

      if (nativePaneIdRef.current && nativePaneIdRef.current !== paneLabel) {
        await browserClosePane(nativePaneIdRef.current)
      }
      if (cancelled) return

      const result = await browserCreatePane(paneLabel, activeTab.url, rect.x, rect.y, rect.width, rect.height)
      if (result && !cancelled) {
        setNativePaneId(paneLabel)
        nativePaneIdRef.current = paneLabel
        if (showNewTabPage) await browserSetVisible(paneLabel, false)
        setTimeout(() => { if (!cancelled) updateTab(activeTab.id, { isLoading: false }) }, 1200)

        // Double-check after 600ms in case layout shifted
        setTimeout(() => {
          if (cancelled || !nativePaneIdRef.current) return
          const r2 = computeContentRect()
          if (Math.abs(r2.width - rect.width) > 2 || Math.abs(r2.height - rect.height) > 2) {
            browserResizePane(nativePaneIdRef.current, r2.x, r2.y, r2.width, r2.height)
            contentRectRef.current = r2
          }
        }, 600)
      }
    }
    init()
    return () => {
      cancelled = true
      if (nativePaneIdRef.current) {
        browserClosePane(nativePaneIdRef.current)
        nativePaneIdRef.current = null
        setNativePaneId(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useNative, activeTab?.id])

  /* ── Show/hide native webview for new tab page ─────────────── */
  useEffect(() => {
    if (!useNative || !nativePaneIdRef.current) return
    browserSetVisible(nativePaneIdRef.current, !showNewTabPage)
  }, [useNative, showNewTabPage])

  /* ── Resize polling using offset-based computation ──────────── */
  useEffect(() => {
    if (!useNative || !nativePaneId) return
    const interval = setInterval(() => {
      if (!contentAreaRef.current || !nativePaneIdRef.current) return
      const r = computeContentRect()
      const prev = contentRectRef.current
      if (Math.abs(r.x - prev.x) > 1 || Math.abs(r.y - prev.y) > 1 ||
          Math.abs(r.width - prev.width) > 1 || Math.abs(r.height - prev.height) > 1) {
        contentRectRef.current = r
        browserResizePane(nativePaneIdRef.current, r.x, r.y, r.width, r.height)
      }
    }, 150)
    return () => clearInterval(interval)
  }, [useNative, nativePaneId, computeContentRect])

  // Immediate resize when split mode changes
  useEffect(() => {
    if (!useNative || !nativePaneIdRef.current) return
    const timer = setTimeout(() => {
      const rect = computeContentRect()
      contentRectRef.current = rect
      if (nativePaneIdRef.current) browserResizePane(nativePaneIdRef.current, rect.x, rect.y, rect.width, rect.height)
    }, 120)
    return () => clearTimeout(timer)
  }, [useNative, splitMode, computeContentRect])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (nativePaneIdRef.current) { browserClosePane(nativePaneIdRef.current); nativePaneIdRef.current = null } }
  }, [])

  useEffect(() => {
    if (activeTab && !urlFocused) setUrlInput(activeTab.url)
  }, [activeTab, activeTab?.url, urlFocused])

  /* ── Tab actions ────────────────────────────────────────────── */
  const updateTab = useCallback((tabId: string, updates: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...updates } : t)))
  }, [])

  const navigateTo = useCallback((url: string, tabId?: string) => {
    const targetId = tabId || activeTabId
    const tab = tabs.find((t) => t.id === targetId)
    if (!tab) return
    const normalized = normalizeUrl(url)
    const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), normalized]
    updateTab(targetId, {
      url: normalized, title: getDomainFromUrl(normalized), isLoading: true,
      favicon: getFaviconUrl(normalized),
      history: newHistory, historyIndex: newHistory.length - 1,
      canGoBack: newHistory.length > 1, canGoForward: false,
    })
    setUrlInput(normalized)
    setShowNewTabPage(false)
    if (useNative && nativePaneId) {
      browserNavigatePane(nativePaneId, normalized).then(() => {
        setTimeout(() => updateTab(targetId, { isLoading: false }), 1500)
      })
    }
  }, [activeTabId, tabs, updateTab, useNative, nativePaneId])

  const goBack = useCallback(() => {
    if (!activeTab || activeTab.historyIndex <= 0) return
    const newIndex = activeTab.historyIndex - 1
    const url = activeTab.history[newIndex]
    updateTab(activeTab.id, { url, title: getDomainFromUrl(url), favicon: getFaviconUrl(url), isLoading: true, historyIndex: newIndex, canGoBack: newIndex > 0, canGoForward: true })
    setUrlInput(url)
    setShowNewTabPage(false)
    if (useNative && nativePaneId) browserNavigatePane(nativePaneId, url).then(() => setTimeout(() => updateTab(activeTab.id, { isLoading: false }), 1500))
  }, [activeTab, updateTab, useNative, nativePaneId])

  const goForward = useCallback(() => {
    if (!activeTab || activeTab.historyIndex >= activeTab.history.length - 1) return
    const newIndex = activeTab.historyIndex + 1
    const url = activeTab.history[newIndex]
    updateTab(activeTab.id, { url, title: getDomainFromUrl(url), favicon: getFaviconUrl(url), isLoading: true, historyIndex: newIndex, canGoBack: true, canGoForward: newIndex < activeTab.history.length - 1 })
    setUrlInput(url)
    if (useNative && nativePaneId) browserNavigatePane(nativePaneId, url).then(() => setTimeout(() => updateTab(activeTab.id, { isLoading: false }), 1500))
  }, [activeTab, updateTab, useNative, nativePaneId])

  const refresh = useCallback(() => {
    if (!activeTab) return
    updateTab(activeTab.id, { isLoading: true })
    if (useNative && nativePaneId) {
      browserNavigatePane(nativePaneId, activeTab.url).then(() => setTimeout(() => updateTab(activeTab.id, { isLoading: false }), 1500))
    }
  }, [activeTab, updateTab, useNative, nativePaneId])

  const goHome = useCallback(() => { navigateTo(DEFAULT_HOME_URL) }, [navigateTo])

  const addTab = useCallback((url?: string) => {
    const targetUrl = url || DEFAULT_HOME_URL
    const newTab: BrowserTab = { id: nextTabId(), url: targetUrl, title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false, history: [targetUrl], historyIndex: 0 }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
    setUrlInput(targetUrl)
    setShowNewTabPage(true)
  }, [])

  const closeTab = useCallback((tabId: string) => {
    const tabToClose = tabs.find((t) => t.id === tabId)
    if (tabToClose?.pinned) return
    if (tabToClose) setClosedTabs((prev) => [tabToClose, ...prev].slice(0, 10))
    if (useNative && tabId === activeTabId && nativePaneId) { browserClosePane(nativePaneId); setNativePaneId(null) }
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId)
      if (next.length === 0) {
        const newTab: BrowserTab = { id: nextTabId(), url: DEFAULT_HOME_URL, title: 'New Tab', isLoading: false, canGoBack: false, canGoForward: false, history: [DEFAULT_HOME_URL], historyIndex: 0 }
        setActiveTabId(newTab.id); setUrlInput(DEFAULT_HOME_URL); setShowNewTabPage(true)
        return [newTab]
      }
      if (activeTabId === tabId) {
        const closedIndex = prev.findIndex((t) => t.id === tabId)
        const nextActive = next[Math.min(closedIndex, next.length - 1)]
        setActiveTabId(nextActive.id); setUrlInput(nextActive.url)
      }
      return next
    })
  }, [activeTabId, useNative, nativePaneId, tabs])

  const restoreClosedTab = useCallback(() => {
    if (closedTabs.length === 0) return
    const [restored, ...rest] = closedTabs
    setClosedTabs(rest)
    const restoredTab: BrowserTab = { ...restored, id: nextTabId(), isLoading: false }
    setTabs((prev) => [...prev, restoredTab])
    setActiveTabId(restoredTab.id)
    setUrlInput(restoredTab.url)
    setShowNewTabPage(false)
  }, [closedTabs])

  const pinTab = useCallback((tabId: string) => {
    updateTab(tabId, { pinned: true })
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId)
      if (!tab) return prev
      const pinned = prev.filter((t) => t.pinned || t.id === tabId)
      const unpinned = prev.filter((t) => !t.pinned && t.id !== tabId)
      return [...pinned.map((t) => t.id === tabId ? { ...t, pinned: true } : t), ...unpinned]
    })
  }, [updateTab])

  const unpinTab = useCallback((tabId: string) => {
    updateTab(tabId, { pinned: false })
  }, [updateTab])

  const handleUrlSubmit = useCallback((e: React.FormEvent) => { e.preventDefault(); navigateTo(urlInput); urlInputRef.current?.blur() }, [urlInput, navigateTo])
  const copyUrl = useCallback(() => { navigator.clipboard.writeText(activeTab?.url || ''); setCopied(true); setTimeout(() => setCopied(false), 1500) }, [activeTab])

  const toggleDevtools = useCallback(() => {
    if (nativePaneIdRef.current) {
      browserToggleDevtools(nativePaneIdRef.current).then((open) => setDevtoolsOpen(open))
    }
  }, [])

  /* ── Drag to reorder tabs ───────────────────────────────────── */
  const handleDragStart = useCallback((tabId: string) => { setDragTabId(tabId) }, [])
  const handleDragOver = useCallback((tabId: string) => { if (dragTabId && tabId !== dragTabId) setDragOverTabId(tabId) }, [dragTabId])
  const handleDragEnd = useCallback(() => {
    if (dragTabId && dragOverTabId && dragTabId !== dragOverTabId) {
      setTabs((prev) => {
        const dragIndex = prev.findIndex((t) => t.id === dragTabId)
        const overIndex = prev.findIndex((t) => t.id === dragOverTabId)
        if (dragIndex === -1 || overIndex === -1) return prev
        const next = [...prev]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(overIndex, 0, moved)
        return next
      })
    }
    setDragTabId(null)
    setDragOverTabId(null)
  }, [dragTabId, dragOverTabId])

  /* ── Keyboard shortcuts ─────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'l' || e.key === 'L') { e.preventDefault(); urlInputRef.current?.focus(); urlInputRef.current?.select() }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); refresh() }
      if (e.key === 'i' || e.key === 'I') { if (e.shiftKey) { e.preventDefault(); toggleDevtools() } }
      if (e.key === 'T' && e.shiftKey) { e.preventDefault(); restoreClosedTab() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [refresh, toggleDevtools, restoreClosedTab])

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => setCtxMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [ctxMenu])

  /* ── Split mode helpers ─────────────────────────────────────── */
  const cycleSplitMode = useCallback(() => {
    const modes: BrowserSplitMode[] = ['full', 'split-right', 'split-bottom']
    const idx = modes.indexOf(splitMode)
    setSplitMode(modes[(idx + 1) % modes.length])
  }, [splitMode])

  const splitIcon = splitMode === 'full' ? Columns2 : splitMode === 'split-right' ? Rows2 : Maximize2
  const SplitIcon = splitIcon

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* ── Tab Bar with drag-to-reorder + pin + context menu ──── */}
      <div className="flex items-center gap-0.5 px-2 pt-1 shrink-0" style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const isDragging = tab.id === dragTabId
          const isDragOver = tab.id === dragOverTabId
          const isPinned = !!tab.pinned
          return (
            <div
              key={tab.id}
              draggable={!isPinned}
              onDragStart={() => !isPinned && handleDragStart(tab.id)}
              onDragOver={(e) => { e.preventDefault(); handleDragOver(tab.id) }}
              onDragEnd={handleDragEnd}
              onClick={() => { setActiveTabId(tab.id); setUrlInput(tab.url); if (tab.url !== DEFAULT_HOME_URL) setShowNewTabPage(false); setCtxMenu(null) }}
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ tabId: tab.id, x: e.clientX, y: e.clientY }) }}
              className={`group relative flex items-center gap-1.5 py-2 rounded-t-lg transition-all ${isPinned ? 'px-2 min-w-[40px] max-w-[60px] cursor-default' : 'px-3 min-w-[100px] max-w-[200px] cursor-grab'}`}
              style={{
                background: isActive ? 'var(--surface-0)' : 'transparent',
                borderLeft: isDragOver ? '2px solid var(--accent)' : isActive ? '1px solid var(--border)' : '1px solid transparent',
                borderRight: isActive ? '1px solid var(--border)' : '1px solid transparent',
                borderTop: isActive ? '2px solid var(--accent)' : isPinned ? '2px solid rgba(168,85,247,0.5)' : '2px solid transparent',
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              {!isPinned && <GripVertical size={10} className="opacity-0 group-hover:opacity-40 shrink-0" style={{ color: 'var(--text-muted)' }} />}
              {tab.isLoading ? (
                <div className="w-3 h-3 shrink-0 border-[1.5px] rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              ) : tab.favicon ? (
                <img src={tab.favicon} alt="" className="w-3.5 h-3.5 shrink-0 rounded-sm" style={{ imageRendering: 'auto' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <Globe size={12} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
              )}
              {!isPinned && (
                <span className="text-[10px] truncate flex-1" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {tab.title || getDomainFromUrl(tab.url)}
                </span>
              )}
              {!isPinned && (
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all hover:bg-[rgba(255,255,255,0.1)]"
                >
                  <X size={10} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
            </div>
          )
        })}
        <button onClick={() => addTab()} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="New Tab">
          <Plus size={13} style={{ color: 'var(--text-muted)' }} />
        </button>
        {closedTabs.length > 0 && (
          <button onClick={restoreClosedTab} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)] ml-auto" title="Restore Closed Tab (Ctrl+Shift+T)">
            <Undo2 size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* ── Tab Context Menu ──────────────────────────────────── */}
      {ctxMenu && (
        <div
          className="fixed z-50 py-1 rounded-lg shadow-xl min-w-[160px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y, background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {(() => {
            const ctxTab = tabs.find((t) => t.id === ctxMenu.tabId)
            if (!ctxTab) return null
            return (
              <>
                {ctxTab.pinned ? (
                  <button onClick={() => { unpinTab(ctxMenu.tabId); setCtxMenu(null) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }}>
                    <Pin size={12} /> Unpin Tab
                  </button>
                ) : (
                  <button onClick={() => { pinTab(ctxMenu.tabId); setCtxMenu(null) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }}>
                    <Pin size={12} /> Pin Tab
                  </button>
                )}
                <button onClick={() => { refresh(); setCtxMenu(null) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }}>
                  <RotateCw size={12} /> Reload
                </button>
                <button onClick={() => { addTab(ctxTab.url); setCtxMenu(null) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }}>
                  <Copy size={12} /> Duplicate Tab
                </button>
                {!ctxTab.pinned && (
                  <>
                    <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
                    <button onClick={() => { closeTab(ctxMenu.tabId); setCtxMenu(null) }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-[rgba(255,255,255,0.06)]" style={{ color: '#ef4444' }}>
                      <X size={12} /> Close Tab
                    </button>
                  </>
                )}
                {closedTabs.length > 0 && (
                  <>
                    <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
                    <button onClick={() => { restoreClosedTab(); setCtxMenu(null) }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }}>
                      <Undo2 size={12} /> Restore Closed Tab
                    </button>
                  </>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ── Navigation Bar ────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0" style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-0.5">
          <button onClick={goBack} disabled={!activeTab?.canGoBack} className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }} title="Back"><ArrowLeft size={14} /></button>
          <button onClick={goForward} disabled={!activeTab?.canGoForward} className="p-1.5 rounded-lg transition-all disabled:opacity-30 hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }} title="Forward"><ArrowRight size={14} /></button>
          <button onClick={refresh} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }} title="Refresh"><RotateCw size={13} className={activeTab?.isLoading ? 'animate-spin' : ''} /></button>
          <button onClick={goHome} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }} title="Home"><Home size={13} /></button>
        </div>

        <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all" style={{
            background: urlFocused ? 'var(--surface-2)' : 'var(--surface-1)',
            border: urlFocused ? '1px solid var(--accent)' : '1px solid var(--border)',
            boxShadow: urlFocused ? '0 0 0 3px rgba(79,140,255,0.15)' : 'none',
          }}>
            {activeTab && isSecure(activeTab.url) ? <Lock size={11} style={{ color: '#22c55e', flexShrink: 0 }} /> : <Shield size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            <input ref={urlInputRef} type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              onFocus={() => { setUrlFocused(true); urlInputRef.current?.select() }} onBlur={() => setUrlFocused(false)}
              className="flex-1 bg-transparent outline-none text-[12px]" style={{ color: 'var(--text-primary)' }} placeholder="Search or enter URL..." spellCheck={false} />
            <button type="button" onClick={copyUrl} className="p-0.5 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Copy URL">
              {copied ? <Check size={11} style={{ color: '#22c55e' }} /> : <Copy size={11} style={{ color: 'var(--text-muted)' }} />}
            </button>
          </div>
        </form>

        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowBookmarks(!showBookmarks)} className="p-1.5 rounded-lg transition-all" title="Bookmarks"
            style={{ color: showBookmarks ? 'var(--accent)' : 'var(--text-muted)', background: showBookmarks ? 'rgba(79,140,255,0.1)' : 'transparent' }}>
            <BookOpen size={13} />
          </button>
          <button onClick={cycleSplitMode} className="p-1.5 rounded-lg transition-all" title={`Layout: ${splitMode}`}
            style={{ color: splitMode !== 'full' ? 'var(--accent)' : 'var(--text-muted)', background: splitMode !== 'full' ? 'rgba(79,140,255,0.1)' : 'transparent' }}>
            <SplitIcon size={13} />
          </button>
          {isTauri && (
            <button onClick={toggleDevtools} className="p-1.5 rounded-lg transition-all" title="DevTools (Ctrl+Shift+I)"
              style={{ color: devtoolsOpen ? 'var(--accent)' : 'var(--text-muted)', background: devtoolsOpen ? 'rgba(79,140,255,0.1)' : 'transparent' }}>
              <Wrench size={13} />
            </button>
          )}
          <button onClick={() => { if (activeTab) window.open(activeTab.url, '_blank') }} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }} title="Open External">
            <ExternalLink size={13} />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }} title="Fullscreen">
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ── Bookmarks Bar ─────────────────────────────────────── */}
      {showBookmarks && (
        <div className="flex items-center gap-1 px-3 py-1 shrink-0 overflow-x-auto" style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--border)' }}>
          {BOOKMARKS.map((b) => (
            <button key={b.url} onClick={() => navigateTo(b.url)} className="flex items-center gap-1 px-2 py-0.5 rounded-md whitespace-nowrap transition-all text-[10px] shrink-0 hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-[11px]">{b.icon}</span><span>{b.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Content Area (browser + optional split terminal) ──── */}
      <div className={`flex-1 flex overflow-hidden ${splitMode === 'split-bottom' ? 'flex-col' : 'flex-row'}`}>
        {/* Browser content */}
        <div ref={contentAreaRef} className="flex-1 relative overflow-hidden" style={{ background: useNative ? 'var(--surface-0)' : '#fff' }}>
          {activeTab?.isLoading && !showNewTabPage && (
            <div className="absolute top-0 left-0 right-0 z-10 h-[2px]">
              <div className="h-full" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', animation: 'loading-bar 1.5s ease-in-out infinite' }} />
            </div>
          )}

          {useNative && !showNewTabPage && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
              {activeTab?.isLoading && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Loading {getDomainFromUrl(activeTab.url)}...</span>
                </div>
              )}
            </div>
          )}

          {/* Native mode: webview rendered by OS on top of this area */}
          {/* No iframe fallback — pure native WebView2 */}

          {showNewTabPage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'var(--surface-0)' }}>
              <div className="flex flex-col items-center gap-6 max-w-lg">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(79,140,255,0.2), rgba(167,139,250,0.2))' }}>
                  <Globe size={32} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>SloerSpace Browser</h2>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Browse the web directly inside your workspace</p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {BOOKMARKS.map((b) => (
                    <button key={b.url} onClick={() => navigateTo(b.url)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}>
                      <span className="text-2xl">{b.icon}</span>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).querySelector('input') as HTMLInputElement; if (input?.value.trim()) navigateTo(input.value) }} className="w-full max-w-md">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input type="text" className="flex-1 bg-transparent outline-none text-[13px]" style={{ color: 'var(--text-primary)' }} placeholder="Search or type a URL..." spellCheck={false} autoFocus />
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Split terminal pane (real PTY) */}
        {splitMode !== 'full' && (
          <div style={{ width: splitMode === 'split-right' ? '40%' : '100%', height: splitMode === 'split-bottom' ? '40%' : '100%', minWidth: splitMode === 'split-right' ? 280 : undefined, minHeight: splitMode === 'split-bottom' ? 150 : undefined }}>
            <RealTerminalPane direction={splitMode === 'split-right' ? 'right' : 'bottom'} />
          </div>
        )}
      </div>

      {/* ── Status Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1 shrink-0" style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          {activeTab?.isLoading && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Loading {getDomainFromUrl(activeTab.url)}...</span>}
          {activeTab && !activeTab.isLoading && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {isSecure(activeTab.url) ? '🔒 Secure' : '⚠ Not Secure'} · {getDomainFromUrl(activeTab.url)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isTauri && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>WebView2</span>}
          {splitMode !== 'full' && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)' }}>SPLIT</span>}
          {devtoolsOpen && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,191,98,0.1)', color: '#ffbf62' }}>DEVTOOLS</span>}
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{tabs.length} tab{tabs.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@keyframes loading-bar { 0% { transform: translateX(-100%); } 50% { transform: translateX(0); } 100% { transform: translateX(100%); } }` }} />
    </div>
  )
}
