'use client'

import { useStore } from '@/store/useStore'
import { PtyTerminalEmulator } from '@/components/TerminalView'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw, ChevronLeft, ChevronRight, GripVertical, X, Layers3, Terminal, Circle } from 'lucide-react'

interface CanvasNode {
  paneId: string
  x: number
  y: number
  w: number
  h: number
}

type InteractionMode =
  | { kind: 'idle' }
  | { kind: 'drag'; paneId: string; startX: number; startY: number; nodeX: number; nodeY: number }
  | { kind: 'resize'; paneId: string; startX: number; startY: number; nodeW: number; nodeH: number }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }

const MIN_W = 280
const MIN_H = 180
const DEFAULT_W = 380
const DEFAULT_H = 260
const GAP = 16
const COLS = 3

function buildInitialLayout(paneIds: string[]): CanvasNode[] {
  return paneIds.map((paneId, index) => {
    const col = index % COLS
    const row = Math.floor(index / COLS)
    return {
      paneId,
      x: col * (DEFAULT_W + GAP) + GAP,
      y: row * (DEFAULT_H + GAP) + GAP,
      w: DEFAULT_W,
      h: DEFAULT_H,
    }
  })
}

export function SloerCanvas() {
  const activeTabId = useStore((s) => s.activeTabId)
  const workspaceTabs = useStore((s) => s.workspaceTabs)
  const terminalSessions = useStore((s) => s.terminalSessions)
  const setActivePane = useStore((s) => s.setActivePane)
  const addPaneToActiveWorkspace = useStore((s) => s.addPaneToActiveWorkspace)

  const activeWorkspace = useMemo(() => workspaceTabs.find((t) => t.id === activeTabId) ?? null, [workspaceTabs, activeTabId])
  const panes = useMemo(() => (activeTabId ? (terminalSessions[activeTabId] ?? []) : []), [activeTabId, terminalSessions])
  const activePaneId = useMemo(() => panes.find((p) => p.isActive)?.id ?? panes[0]?.id ?? null, [panes])

  const [nodes, setNodes] = useState<CanvasNode[]>([])
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<InteractionMode>({ kind: 'idle' })
  const [, forceRender] = useState(0)

  useEffect(() => {
    const ids = panes.map((p) => p.id)
    setNodes((prev) => {
      const existing = new Set(prev.map((n) => n.paneId))
      const newIds = ids.filter((id) => !existing.has(id))
      const kept = prev.filter((n) => ids.includes(n.paneId))
      if (newIds.length === 0 && kept.length === prev.length) return prev
      // Place new nodes in a grid layout continuing from existing nodes
      const totalKept = kept.length
      const added = newIds.map((paneId, i) => {
        const idx = totalKept + i
        const col = idx % COLS
        const row = Math.floor(idx / COLS)
        return { paneId, x: col * (DEFAULT_W + GAP) + GAP, y: row * (DEFAULT_H + GAP) + GAP, w: DEFAULT_W, h: DEFAULT_H }
      })
      return [...kept, ...added]
    })
  }, [panes])

  useEffect(() => {
    if (nodes.length === 0 && panes.length > 0) {
      setNodes(buildInitialLayout(panes.map((p) => p.id)))
    }
  }, [nodes.length, panes])

  const scale = zoom / 100

  const handleDragStart = useCallback((paneId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const node = nodes.find((n) => n.paneId === paneId)
    if (!node) return
    interactionRef.current = { kind: 'drag', paneId, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y }
    forceRender((c) => c + 1)
    setActivePane(paneId)
  }, [nodes, setActivePane])

  const handleResizeStart = useCallback((paneId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const node = nodes.find((n) => n.paneId === paneId)
    if (!node) return
    interactionRef.current = { kind: 'resize', paneId, startX: e.clientX, startY: e.clientY, nodeW: node.w, nodeH: node.h }
    forceRender((c) => c + 1)
  }, [nodes])

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const mode = interactionRef.current
      if (mode.kind === 'drag') {
        const dx = (e.clientX - mode.startX) / scale
        const dy = (e.clientY - mode.startY) / scale
        setNodes((prev) => prev.map((n) => n.paneId === mode.paneId ? { ...n, x: mode.nodeX + dx, y: mode.nodeY + dy } : n))
      } else if (mode.kind === 'resize') {
        const dx = (e.clientX - mode.startX) / scale
        const dy = (e.clientY - mode.startY) / scale
        setNodes((prev) => prev.map((n) => n.paneId === mode.paneId ? { ...n, w: Math.max(MIN_W, mode.nodeW + dx), h: Math.max(MIN_H, mode.nodeH + dy) } : n))
      } else if (mode.kind === 'pan') {
        setPan({ x: mode.panX + (e.clientX - mode.startX), y: mode.panY + (e.clientY - mode.startY) })
      }
    }

    const handleUp = () => {
      if (interactionRef.current.kind !== 'idle') {
        interactionRef.current = { kind: 'idle' }
        forceRender((c) => c + 1)
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp) }
  }, [scale])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (interactionRef.current.kind !== 'idle') return
    const target = e.target as HTMLElement
    if (target === canvasRef.current || target.dataset.canvasArea === 'true') {
      e.preventDefault()
      interactionRef.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
      forceRender((c) => c + 1)
    }
  }, [pan])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom((z) => Math.max(25, Math.min(200, z + (e.deltaY > 0 ? -5 : 5))))
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
    }
  }, [])

  const handleRemoveNode = useCallback((paneId: string) => {
    setNodes((prev) => prev.filter((n) => n.paneId !== paneId))
  }, [])

  const handleAddTerminal = useCallback(() => {
    addPaneToActiveWorkspace()
  }, [addPaneToActiveWorkspace])

  const paneMap = useMemo(() => new Map(panes.map((p) => [p.id, p])), [panes])
  const isInteracting = interactionRef.current.kind !== 'idle'

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      {sidebarOpen && (
        <aside className="flex h-full w-[180px] shrink-0 flex-col border-r liquid-glass" style={{ borderColor: 'var(--border)', borderRadius: 0 }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Layers3 size={14} style={{ color: 'var(--secondary)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Canvas</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ChevronLeft size={14} />
            </button>
          </div>
          <div className="px-3 py-2">
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{activeWorkspace?.name ?? 'Canvas'}</div>
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{panes.length} terminals active</div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {panes.map((pane, index) => {
              const isActive = pane.id === activePaneId
              return (
                <button
                  key={pane.id}
                  onClick={() => {
                    setActivePane(pane.id)
                    const node = nodes.find((n) => n.paneId === pane.id)
                    if (node) {
                      const container = canvasRef.current
                      if (container) {
                        const cx = container.clientWidth / 2
                        const cy = container.clientHeight / 2
                        setPan({ x: cx - (node.x + node.w / 2) * scale, y: cy - (node.y + node.h / 2) * scale })
                      }
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left transition-all"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, rgba(40,231,197,0.14), rgba(79,140,255,0.08))' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--secondary)' : '3px solid transparent',
                  }}
                >
                  <Circle size={8} fill={isActive ? 'var(--secondary)' : 'var(--text-muted)'} style={{ color: isActive ? 'var(--secondary)' : 'var(--text-muted)' }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      Thread {index + 1}
                    </div>
                    <div className="truncate text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {pane.cwd.split(/[\\/]/).pop() || pane.cwd}
                    </div>
                  </div>
                  {isActive && (
                    <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: 'rgba(40,231,197,0.15)', color: 'var(--secondary)' }}>01</span>
                  )}
                  <GripVertical size={10} style={{ color: 'var(--text-muted)' }} />
                </button>
              )
            })}
          </div>
          <div className="border-t p-3" style={{ borderColor: 'var(--border)' }}>
            <button onClick={handleAddTerminal} className="flex w-full items-center justify-center gap-2 rounded-[14px] border px-3 py-2.5 text-[11px] font-semibold transition-all" style={{ borderColor: 'var(--border)', color: 'var(--secondary)', background: 'rgba(40,231,197,0.06)' }}>
              <Terminal size={13} /> New Terminal
            </button>
          </div>
        </aside>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-[42px] shrink-0 items-center justify-between border-b px-4" style={{ borderColor: 'var(--border)', background: 'linear-gradient(180deg, rgba(8,13,22,0.96), rgba(7,12,20,0.92))' }}>
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <ChevronRight size={14} />
              </button>
            )}
            <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--secondary)' }}>Active Workspace</span>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{activeWorkspace?.name ?? 'Canvas'}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Drag headers to reposition. Scroll to pan.</span>
          </div>
          <div className="flex items-center gap-1 rounded-[14px] border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'rgba(9,15,24,0.72)' }}>
            <span className="px-2 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{zoom}%</span>
            <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
            <span className="px-2 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{panes.length} terminals</span>
            <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
            <button onClick={() => setZoom((z) => Math.max(25, z - 10))} className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-3)]"><Minus size={11} /></button>
            <button onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }) }} className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-3)]"><RotateCcw size={11} /></button>
            <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-3)]"><Plus size={11} /></button>
          </div>
        </div>

        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden"
          style={{ background: 'var(--surface-0)', cursor: interactionRef.current.kind === 'pan' ? 'grabbing' : isInteracting ? 'default' : 'default' }}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
          data-canvas-area="true"
        >
          {!sidebarOpen && (
            <div className="absolute left-0 top-0 z-20 flex h-full w-[30px] flex-col items-center border-r py-3 gap-1" style={{ borderColor: 'var(--border)', background: 'rgba(7,12,20,0.82)' }}>
              {panes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (panes[i]) setActivePane(panes[i].id)
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[8px] font-bold transition-all"
                  style={{
                    background: panes[i]?.id === activePaneId ? 'var(--secondary)' : 'transparent',
                    color: panes[i]?.id === activePaneId ? '#04111d' : 'var(--text-muted)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: '6000px',
              height: '6000px',
              position: 'relative',
            }}
            data-canvas-area="true"
          >
            {nodes.map((node) => {
              const pane = paneMap.get(node.paneId)
              if (!pane) return null
              const isActive = pane.id === activePaneId
              const paneIndex = panes.findIndex((p) => p.id === pane.id)

              return (
                <div
                  key={node.paneId}
                  className="absolute overflow-hidden rounded-[16px] border transition-shadow"
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.w,
                    height: node.h,
                    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    boxShadow: isActive ? '0 0 32px rgba(79,140,255,0.16), 0 12px 40px rgba(0,0,0,0.3)' : '0 8px 28px rgba(0,0,0,0.2)',
                    background: 'var(--terminal-bg)',
                    zIndex: isActive ? 20 : 10,
                  }}
                >
                  <div
                    className="flex h-[32px] items-center justify-between px-3 select-none"
                    style={{
                      background: isActive
                        ? 'linear-gradient(90deg, rgba(40,231,197,0.12), rgba(79,140,255,0.08))'
                        : 'linear-gradient(180deg, var(--surface-2), var(--surface-1))',
                      borderBottom: `1px solid ${isActive ? 'rgba(79,140,255,0.18)' : 'var(--border)'}`,
                      cursor: 'grab',
                    }}
                    onMouseDown={(e) => handleDragStart(node.paneId, e)}
                  >
                    <div className="flex items-center gap-2">
                      <Circle size={6} fill={isActive ? 'var(--secondary)' : 'var(--text-muted)'} style={{ color: isActive ? 'var(--secondary)' : 'var(--text-muted)' }} />
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>Thread {paneIndex + 1}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>{pane.cwd.split(/[\\/]/).pop()}</span>
                      {isActive && (
                        <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase" style={{ background: 'rgba(40,231,197,0.18)', color: 'var(--secondary)' }}>Live</span>
                      )}
                      {!isActive && (
                        <span className="rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>TTY</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.paneId) }}
                        className="flex h-4 w-4 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--error)]"
                      >
                        <X size={9} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex-1 overflow-hidden"
                    style={{ height: node.h - 32 }}
                    onClick={() => setActivePane(pane.id)}
                  >
                    <PtyTerminalEmulator
                      sessionId={pane.runtimeSessionId ?? pane.id}
                      cwd={pane.cwd}
                      paneIndex={paneIndex}
                      totalPanes={panes.length}
                    />
                  </div>

                  <div
                    className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
                    style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(79,140,255,0.3) 50%)' }}
                    onMouseDown={(e) => handleResizeStart(node.paneId, e)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
