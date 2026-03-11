'use client'

import { useStore } from '@/store/useStore'
import type { AgentRole, SwarmAgent, SwarmMessage } from '@/store/useStore'
import { useState, useEffect, useMemo } from 'react'
import {
  StopCircle, Activity, Bot, FolderOpen,
  Layers3, Workflow, ArrowRight, Terminal,
  Minus, Plus, Move, Send, AlertTriangle, UserPlus,
  BookOpen, CheckCircle2, Crown, Hammer, MessageSquareText, Search, ShieldCheck, Sparkles
} from 'lucide-react'

const ROLE_META: Record<AgentRole, {
  label: string
  color: string
  icon: typeof Crown
}> = {
  coord: { label: 'Coordinator', color: 'var(--accent)', icon: Crown },
  builder: { label: 'Builder', color: 'var(--info)', icon: Hammer },
  reviewer: { label: 'Reviewer', color: 'var(--warning)', icon: ShieldCheck },
  scout: { label: 'Scout', color: 'var(--secondary)', icon: Search },
  custom: { label: 'Custom', color: 'var(--text-secondary)', icon: Sparkles },
}

function formatElapsed(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}m ${(totalSeconds % 60).toString().padStart(2, '0')}s`
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getStatusTone(agent: SwarmAgent) {
  if (agent.status === 'error') {
    return { label: 'Error', color: 'var(--error)' }
  }

  if (agent.status === 'complete') {
    return { label: 'Done', color: 'var(--success)' }
  }

  if (agent.status === 'running') {
    return { label: 'Live', color: 'var(--accent)' }
  }

  return { label: 'Idle', color: 'var(--text-muted)' }
}

function formatAgentRuntime(agent: SwarmAgent, nowMs: number) {
  const startedAtMs = new Date(agent.startedAt).getTime()

  if (!Number.isFinite(startedAtMs)) {
    return agent.runtime
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
  return formatElapsed(elapsedSeconds)
}

function buildGraphNodes(agents: SwarmAgent[]) {
  const laneOrder: AgentRole[] = ['coord', 'builder', 'reviewer', 'scout', 'custom']
  const laneOffsets: Record<AgentRole, number> = {
    coord: 120,
    builder: 305,
    reviewer: 490,
    scout: 675,
    custom: 860,
  }
  const canvasWidth = 1160
  const sidePadding = 90
  const rowGap = 132

  const nodes = laneOrder.flatMap((lane) => {
    const group = agents.filter((agent) => agent.role === lane)
    const maxColumns = lane === 'builder' ? 5 : lane === 'scout' ? 4 : 3

    return group.map((agent, index) => {
      const row = Math.floor(index / maxColumns)
      const col = index % maxColumns
      const rowItems = Math.min(maxColumns, group.length - row * maxColumns)
      const rowSpacing = (canvasWidth - sidePadding * 2) / (rowItems + 1)

      return {
        agent,
        x: sidePadding + rowSpacing * (col + 1),
        y: laneOffsets[lane] + row * rowGap,
        lane,
      }
    })
  })

  return {
    width: canvasWidth,
    height: Math.max(940, nodes.reduce((max, node) => Math.max(max, node.y), 0) + 120),
    nodes,
  }
}

function ConversationFeed({
  messages,
  emptyLabel,
  compact,
}: {
  messages: SwarmMessage[]
  emptyLabel: string
  compact?: boolean
}) {
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6">
        <div>
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <MessageSquareText size={16} />
          </div>
          <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>No messages yet.</div>
          <div className="mt-2 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>{emptyLabel}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {messages.map((message) => {
        const outgoing = message.senderRole === 'operator'
        const system = message.senderRole === 'system'
        const tone = system
          ? { border: 'rgba(255,191,98,0.22)', bg: 'rgba(255,191,98,0.08)', color: 'var(--warning)' }
          : outgoing
            ? { border: 'rgba(79,140,255,0.26)', bg: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }
            : { border: 'var(--border)', bg: 'rgba(4,9,18,0.72)', color: 'var(--text-secondary)' }

        return (
          <div key={message.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`${compact ? 'max-w-[92%]' : 'max-w-[78%]'} rounded-2xl border px-3 py-2.5 transition-all`}
              style={{
                borderColor: tone.border,
                background: tone.bg,
                boxShadow: outgoing ? '0 12px 32px rgba(79,140,255,0.1)' : '0 12px 32px rgba(0,0,0,0.18)',
                backdropFilter: 'blur(18px) saturate(1.12)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: tone.color }}>
                  {message.senderName}
                </span>
                <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>{formatClock(message.createdAt)}</span>
                <span className="text-[8px] uppercase" style={{ color: 'var(--text-muted)' }}>
                  {message.target === 'all' ? 'broadcast' : `to ${message.target === 'operator' ? 'operator' : 'agent'}`}
                </span>
              </div>
              <div className="mt-2 text-[11px] leading-6" style={{ color: system ? 'var(--warning)' : 'var(--text-primary)' }}>
                {message.content}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SwarmDashboard() {
  // FIX: Use separate atomic selectors to avoid infinite re-renders (Zustand v5 Object.is)
  const stopSwarm = useStore((s) => s.stopSwarm)
  const sendSwarmMessage = useStore((s) => s.sendSwarmMessage)
  const setView = useStore((s) => s.setView)
  const activeTabId = useStore((s) => s.activeTabId)
  const swarmSessions = useStore((s) => s.swarmSessions)
  const terminalSessions = useStore((s) => s.terminalSessions)
  const workspaceTabs = useStore((s) => s.workspaceTabs)
  const swarmSession = useMemo(
    () => (activeTabId ? (swarmSessions[activeTabId] ?? null) : null),
    [activeTabId, swarmSessions]
  )
  const activeTab = useMemo(
    () => workspaceTabs.find((t) => t.id === activeTabId) ?? null,
    [workspaceTabs, activeTabId]
  )
  const swarmActive = swarmSession?.status === 'active'
  const [elapsed, setElapsed] = useState(0)
  const [zoom, setZoom] = useState(70)
  const [nowMs, setNowMs] = useState(Date.now())
  const [mode, setMode] = useState<'mission' | 'console'>('mission')
  const [focusedAgentId, setFocusedAgentId] = useState<'all' | string>('all')
  const [messageTarget, setMessageTarget] = useState<'all' | string>('all')
  const [draftMessage, setDraftMessage] = useState('')
  const sessionAgents = swarmSession?.agents ?? []
  const sessionMessages = swarmSession?.messages ?? []
  const graphLayout = useMemo(() => buildGraphNodes(sessionAgents), [sessionAgents])
  const graphConnections = useMemo(() => {
    const coordinatorNodes = graphLayout.nodes.filter((node) => node.agent.role === 'coord')
    const fallbackNode = graphLayout.nodes[0]

    return graphLayout.nodes
      .filter((node) => node.agent.role !== 'coord')
      .map((node, index) => ({
        from: coordinatorNodes[index % Math.max(1, coordinatorNodes.length)] ?? fallbackNode,
        to: node,
      }))
      .filter((connection) => connection.from && connection.to)
  }, [graphLayout])
  const activityItems = useMemo(() => {
    const messageItems = sessionMessages.map((message) => ({
      id: message.id,
      label: message.senderName,
      meta: message.senderRole,
      detail: message.content,
      createdAt: message.createdAt,
    }))
    const agentItems = sessionAgents.map((agent) => ({
      id: `agent-${agent.id}`,
      label: agent.name,
      meta: agent.role,
      detail: agent.task || 'Booting CLI session',
      createdAt: agent.startedAt,
    }))

    return [...messageItems, ...agentItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 24)
  }, [sessionAgents, sessionMessages])

  useEffect(() => {
    if (!swarmSession?.startedAt) {
      setElapsed(0)
      return
    }

    const syncElapsed = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(swarmSession.startedAt as string).getTime()) / 1000)))
      setNowMs(Date.now())
    }

    syncElapsed()

    if (!swarmActive) {
      return
    }

    const timer = setInterval(syncElapsed, 1000)
    return () => clearInterval(timer)
  }, [swarmActive, swarmSession?.startedAt])

  useEffect(() => {
    if (!swarmSession) {
      setFocusedAgentId('all')
      setMessageTarget('all')
      setDraftMessage('')
      return
    }

    if (focusedAgentId !== 'all' && !swarmSession.agents.some((agent) => agent.id === focusedAgentId)) {
      setFocusedAgentId('all')
    }

    if (messageTarget !== 'all' && !swarmSession.agents.some((agent) => agent.id === messageTarget)) {
      setMessageTarget('all')
    }
  }, [swarmSession, focusedAgentId, messageTarget])

  if (!swarmSession) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="premium-panel-elevated mesh-overlay max-w-xl w-full p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,var(--warning),var(--error))] text-[#160904] shadow-[0_20px_50px_rgba(255,191,98,0.22)]">
            <Workflow size={24} />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] mb-3" style={{ color: 'var(--text-muted)' }}>
            SloerSwarm Mission Control
          </div>
          <div className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            No active SloerSwarm session
          </div>
          <p className="text-[13px] leading-7 mb-5 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Launch a new mission to inspect objective context, live agent coordination and execution telemetry from a premium command dashboard.
          </p>
          <button onClick={() => setView('swarm-launch')} className="btn-primary text-[12px] inline-flex items-center gap-2">
            <ArrowRight size={14} /> New Swarm
          </button>
        </div>
      </div>
    )
  }

  const fmtElapsed = formatElapsed(elapsed)
  const agents = sessionAgents
  const messages = sessionMessages
  const done = agents.filter(a => a.status === 'complete').length
  const working = agents.filter(a => a.status === 'running').length
  const idle = agents.filter(a => a.status === 'idle').length
  const coordinators = agents.filter((agent) => agent.role === 'coord')
  const executionAgents = agents.filter((agent) => agent.role !== 'coord')
  const alerts = agents.filter((agent) => agent.status === 'error').length
  const forOperator = messages.filter((message) => message.target === 'operator' || message.kind === 'alert').length
  const readyForReview = done
  const quiet = idle
  const terminalCount = activeTabId ? (terminalSessions[activeTabId]?.length ?? 0) : 0
  const focusedAgent = focusedAgentId === 'all' ? null : agents.find((agent) => agent.id === focusedAgentId) ?? null
  const focusedRoleMeta = focusedAgent ? ROLE_META[focusedAgent.role] : null
  const filteredMessages = focusedAgentId === 'all'
    ? messages
    : messages.filter((message) => (
      message.senderId === focusedAgentId
      || message.target === focusedAgentId
      || message.target === 'all'
    ))
  const compactMessages = filteredMessages.slice(-6)
  const submitMessage = () => {
    if (!draftMessage.trim()) {
      return
    }

    sendSwarmMessage(messageTarget, draftMessage)
    setDraftMessage('')
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden swarm-shell">
      {/* ── Breadcrumb header bar ── */}
      <div className="shrink-0 px-4 pt-3 pb-2 swarm-content">
        <div className="flex items-center justify-between rounded-[24px] border px-4 py-2.5" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(6,10,18,0.64)', backdropFilter: 'blur(22px) saturate(1.16)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <img src="/LOGO.png" alt="" className="h-5 w-5 rounded-md" />
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {(swarmSession.name || activeTab?.name) ?? 'SloerSwarm'}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="text-[10px] font-mono truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>
            {swarmSession.workingDirectory.split(/[\\/]/).pop()}
          </span>
          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md"
            style={{
              background: swarmActive ? 'rgba(46,213,115,0.15)' : 'rgba(255,191,98,0.15)',
              color: swarmActive ? 'var(--success)' : 'var(--warning)',
            }}>
            {swarmActive ? 'ACTIVE' : 'COMPLETE'}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{fmtElapsed}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 rounded-full px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(170,221,255,0.08)' }}>
            <span className="text-[9px] font-mono" style={{ color: 'var(--success)' }}>{working} active</span>
            <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>• {done} done</span>
            <span className="text-[9px] font-mono" style={{ color: alerts > 0 ? 'var(--error)' : 'var(--text-muted)' }}>• {alerts} errors</span>
          </div>
          <button onClick={() => setView('terminal')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: 'var(--accent)', color: '#04111d' }}>
            <Terminal size={11} /> Terminals {terminalCount > 0 ? `${terminalCount}` : ''}
          </button>
          {swarmActive && (
            <button onClick={stopSwarm} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--error)', border: '1px solid rgba(255,71,87,0.2)' }}>
              <StopCircle size={11} /> Stop All
            </button>
          )}
        </div>
      </div>
      </div>

      {/* ── MISSION label ── */}
      <div className="shrink-0 px-4 pb-3 swarm-content">
        <div className="flex items-center justify-between gap-3 rounded-[22px] border px-4 py-2.5" style={{ borderColor: 'rgba(170,221,255,0.06)', background: 'rgba(4,8,14,0.5)', backdropFilter: 'blur(18px) saturate(1.15)' }}>
        <div className="min-w-0 flex items-center gap-2 overflow-hidden">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>Mission</span>
          <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{swarmSession.objective}</span>
          {swarmSession.knowledgeFiles.length > 0 && (
            <span className="hidden lg:inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
              <BookOpen size={10} /> {swarmSession.knowledgeFiles.length} files
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('mission')}
            className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-all"
            style={{
              background: mode === 'mission' ? 'rgba(79,140,255,0.12)' : 'transparent',
              color: mode === 'mission' ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            <span className="inline-flex items-center gap-1.5"><Workflow size={11} /> Mission</span>
          </button>
          <button
            onClick={() => setMode('console')}
            className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-all"
            style={{
              background: mode === 'console' ? 'rgba(79,140,255,0.12)' : 'transparent',
              color: mode === 'console' ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            <span className="inline-flex items-center gap-1.5"><MessageSquareText size={11} /> Console</span>
          </button>
        </div>
      </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 swarm-content">
        {/* ── Left: Canvas area ── */}
        <div className="flex-1 overflow-hidden min-w-0 relative">
          {/* Zoom controls */}
          <div className="absolute top-3 left-3 z-10 inline-flex flex-col gap-1">
            <div className="swarm-panel-soft flex items-center gap-1 rounded-lg p-1">
              <button onClick={() => setZoom(Math.max(30, zoom - 10))} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }}>
                <Minus size={12} />
              </button>
              <span className="text-[9px] font-mono w-8 text-center" style={{ color: 'var(--text-secondary)' }}>{zoom}%</span>
              <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }}>
                <Plus size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1 text-[8px] font-mono px-2" style={{ color: 'var(--text-muted)' }}>
              <Move size={8} /> Drag Canvas
            </div>
          </div>

          {mode === 'mission' ? (
            <div className="h-full overflow-auto px-5 pb-6 pt-16">
              <div className="mx-auto min-w-[1080px]" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                {/* Control Layer */}
                <div className="mt-2 rounded-2xl border p-5 swarm-hover-lift" style={{ borderColor: 'rgba(163,209,255,0.12)', background: 'linear-gradient(180deg,rgba(6,11,19,0.96),rgba(4,8,14,0.98))' }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers3 size={14} style={{ color: 'var(--accent)' }} />
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Control Layer</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Coordinator logic, routing, and task assignment stay grouped here.</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
                      {coordinators.length} agent{coordinators.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="swarm-grid-backdrop relative overflow-hidden rounded-[24px] border p-6" style={{ borderColor: 'rgba(79,140,255,0.12)', background: 'radial-gradient(circle at top, rgba(9,18,32,0.92), rgba(3,8,14,0.98))' }}>
                    <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`} preserveAspectRatio="none">
                      {graphConnections.map((connection, index) => (
                        <path
                          key={`${connection.to.agent.id}-${index}`}
                          d={`M ${connection.from.x} ${connection.from.y} C ${connection.from.x} ${(connection.from.y + connection.to.y) / 2}, ${connection.to.x} ${(connection.from.y + connection.to.y) / 2}, ${connection.to.x} ${connection.to.y}`}
                          fill="none"
                          stroke={ROLE_META[connection.to.agent.role].color}
                          strokeOpacity="0.46"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      ))}
                    </svg>

                    <div className="relative" style={{ width: `${graphLayout.width}px`, height: `${graphLayout.height}px` }}>
                      {(['coord', 'builder', 'reviewer', 'scout', 'custom'] as AgentRole[]).map((role) => {
                        const laneNodes = graphLayout.nodes.filter((node) => node.lane === role)

                        if (laneNodes.length === 0) {
                          return null
                        }

                        return (
                          <div
                            key={role}
                            className="absolute left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-[0.22em]"
                            style={{ top: `${laneNodes[0].y - 70}px`, color: ROLE_META[role].color }}
                          >
                            {ROLE_META[role].label}s ({laneNodes.length})
                          </div>
                        )
                      })}

                      {graphLayout.nodes.map((node, index) => {
                        const roleMeta = ROLE_META[node.agent.role]
                        const RoleIcon = roleMeta.icon
                        const statusTone = getStatusTone(node.agent)

                        return (
                          <button
                            key={node.agent.id}
                            onClick={() => {
                              setFocusedAgentId(node.agent.id)
                              setMessageTarget(node.agent.id)
                            }}
                            className="absolute w-[210px] rounded-2xl border px-4 py-3 text-left transition-all swarm-hover-lift"
                            style={{
                              left: `${node.x - 105}px`,
                              top: `${node.y - 42}px`,
                              borderColor: focusedAgentId === node.agent.id ? `${roleMeta.color}66` : 'rgba(255,255,255,0.08)',
                              background: focusedAgentId === node.agent.id ? 'rgba(10,17,28,0.98)' : 'rgba(6,12,20,0.94)',
                              boxShadow: focusedAgentId === node.agent.id ? `0 18px 58px ${roleMeta.color}22` : '0 10px 32px rgba(0,0,0,0.18)',
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: `${roleMeta.color}20`, color: roleMeta.color }}>
                                  <RoleIcon size={12} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{node.agent.name}</div>
                                  <div className="text-[8px] font-bold uppercase tracking-[0.18em]" style={{ color: roleMeta.color }}>{roleMeta.label}</div>
                                </div>
                              </div>
                              <div className="text-[8px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>{index + 1}</div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[9px]">
                              <span className="w-2 h-2 rounded-full" style={{ background: statusTone.color }} />
                              <span style={{ color: statusTone.color }}>{statusTone.label}</span>
                              <span className="ml-auto font-mono" style={{ color: 'var(--text-muted)' }}>{formatAgentRuntime(node.agent, nowMs)}</span>
                            </div>
                            <div className="mt-2 text-[9px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                              {node.agent.cli}
                            </div>
                            <div className="mt-1 text-[9px] leading-5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                              {node.agent.task || 'Booting CLI session'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Handoff visual connector */}
                <div className="flex justify-center py-3">
                  <div className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Handoff</div>
                </div>

                {/* Execution Layer */}
                <div className="rounded-2xl border p-5 swarm-hover-lift" style={{ borderColor: 'rgba(40,231,197,0.12)', background: 'linear-gradient(180deg,rgba(7,17,20,0.94),rgba(4,10,12,0.98))' }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot size={14} style={{ color: 'var(--secondary)' }} />
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Execution Layer</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Builders, scouts, and reviewers share one collaborative delivery surface.</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg" style={{ background: 'rgba(40,231,197,0.12)', color: 'var(--secondary)' }}>
                      {executionAgents.length} agents
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {executionAgents.map((agent) => {
                      const statusTone = getStatusTone(agent)
                      const roleMeta = ROLE_META[agent.role]

                      return (
                        <button
                          key={agent.id}
                          onClick={() => {
                            setFocusedAgentId(agent.id)
                            setMessageTarget(agent.id)
                          }}
                          className="rounded-xl border p-4 text-left transition-all swarm-hover-lift"
                          style={{
                            borderColor: focusedAgentId === agent.id ? `${roleMeta.color}66` : 'var(--border)',
                            background: 'linear-gradient(180deg,rgba(10,17,28,0.9),rgba(8,13,22,0.96))',
                            boxShadow: focusedAgentId === agent.id ? `0 18px 48px ${roleMeta.color}18` : '0 10px 28px rgba(0,0,0,0.14)',
                          }}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${roleMeta.color}20`, color: roleMeta.color }}>{roleMeta.label}</span>
                              <div className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
                              <div className="text-[8px] uppercase" style={{ color: 'var(--text-muted)' }}>{agent.cli}</div>
                            </div>
                            <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{formatAgentRuntime(agent, nowMs)}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: statusTone.color }} />
                            <span className="text-[10px]" style={{ color: statusTone.color }}>
                              {statusTone.label}
                            </span>
                            {agent.autoApprove && (
                              <span className="ml-auto inline-flex items-center gap-1 text-[8px] font-bold uppercase" style={{ color: 'var(--success)' }}>
                                <CheckCircle2 size={10} /> auto
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono truncate mb-2" style={{ color: 'var(--text-muted)' }}>
                            PS {swarmSession.workingDirectory}&gt;
                          </div>
                          <div className="text-[9px] leading-5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                            {agent.task}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {!swarmActive && (
                  <div className="mt-5 rounded-xl border p-5 swarm-hover-lift" style={{ borderColor: 'rgba(255,191,98,0.16)', background: 'rgba(255,191,98,0.06)' }}>
                    <div className="mb-3 flex items-center gap-3">
                      <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Swarm stopped</div>
                    </div>
                    <div className="text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                      Results are preserved. Launch a new mission when you want to resume coordinated execution.
                    </div>
                    <button onClick={() => setView('swarm-launch')} className="btn-primary mt-4 text-[12px] inline-flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, var(--warning), var(--error))', color: '#160904' }}>
                      <ArrowRight size={14} /> New mission
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full grid grid-cols-[250px_minmax(0,1fr)] gap-0">
              <div className="border-r overflow-y-auto" style={{ borderColor: 'var(--border)', background: 'rgba(4,9,18,0.72)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-primary)' }}>Agents</div>
                  <div className="text-[9px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{agents.length} live members</div>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      setFocusedAgentId('all')
                      setMessageTarget('all')
                    }}
                    className="w-full rounded-xl px-3 py-3 text-left transition-all swarm-hover-lift"
                    style={{
                      background: focusedAgentId === 'all' ? 'rgba(79,140,255,0.12)' : 'transparent',
                      color: focusedAgentId === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
                      border: focusedAgentId === 'all' ? '1px solid rgba(79,140,255,0.22)' : '1px solid transparent',
                    }}
                  >
                    <div className="text-[11px] font-semibold">All Agents</div>
                    <div className="text-[9px] uppercase tracking-[0.16em] mt-1" style={{ color: 'var(--text-muted)' }}>Broadcast</div>
                  </button>
                  {agents.map((agent) => {
                    const roleMeta = ROLE_META[agent.role]
                    const statusTone = getStatusTone(agent)
                    const RoleIcon = roleMeta.icon

                    return (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setFocusedAgentId(agent.id)
                          setMessageTarget(agent.id)
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left transition-all swarm-hover-lift"
                        style={{
                          background: focusedAgentId === agent.id ? 'rgba(79,140,255,0.12)' : 'transparent',
                          border: focusedAgentId === agent.id ? '1px solid rgba(79,140,255,0.22)' : '1px solid transparent',
                          boxShadow: focusedAgentId === agent.id ? `0 16px 40px ${roleMeta.color}12` : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${roleMeta.color}20`, color: roleMeta.color }}>
                            <RoleIcon size={12} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
                            <div className="mt-1 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em]">
                              <span style={{ color: roleMeta.color }}>{roleMeta.label}</span>
                              <span style={{ color: 'var(--text-muted)' }}>•</span>
                              <span style={{ color: statusTone.color }}>{statusTone.label}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col overflow-hidden">
                <div className="shrink-0 px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(6,10,18,0.48)', backdropFilter: 'blur(16px) saturate(1.12)' }}>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-primary)' }}>Console</div>
                    <div className="mt-1 text-[11px] flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span>{focusedAgent ? `${focusedAgent.name} · ${ROLE_META[focusedAgent.role].label}` : 'All agents'}</span>
                      {focusedRoleMeta && (
                        <span className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]" style={{ background: `${focusedRoleMeta.color}18`, color: focusedRoleMeta.color }}>
                          focused
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {filteredMessages.length} msg
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <ConversationFeed
                    messages={filteredMessages}
                    emptyLabel="Send one below or wait for agents to communicate."
                  />
                </div>
                <div className="shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.12)' }}>
                  <div className="flex items-center gap-2">
                    <select
                      value={messageTarget}
                      onChange={(e) => setMessageTarget(e.target.value)}
                      className="rounded-xl border bg-[rgba(4,9,18,0.72)] px-3 py-2 text-[10px] font-semibold outline-none transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="all">All Agents</option>
                      {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                    </select>
                    <div className="flex-1 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(4,9,18,0.72)', backdropFilter: 'blur(16px) saturate(1.12)' }}>
                      <input
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            submitMessage()
                          }
                        }}
                        disabled={!swarmActive}
                        placeholder="Message swarm..."
                        className="flex-1 bg-transparent text-[11px] outline-none"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <button onClick={submitMessage} disabled={!swarmActive || !draftMessage.trim()} style={{ color: 'var(--accent)' }} className="transition-all disabled:opacity-30 hover:scale-105">
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Operator panel ── */}
        <div className="shrink-0 w-[320px] flex flex-col overflow-hidden" style={{ borderLeft: '1px solid var(--border)', background: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(16px) saturate(1.08)' }}>
          {/* Operator View */}
          <div className="shrink-0 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(7,12,20,0.42)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={13} style={{ color: 'var(--warning)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-primary)' }}>Operator View</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[9px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--error)' }}>{alerts} escalations</span>
              <span className="text-[9px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>{forOperator} for operator</span>
              <span className="text-[9px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(40,231,197,0.12)', color: 'var(--secondary)' }}>{readyForReview} ready for review</span>
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <span className="text-[9px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(255,191,98,0.12)', color: 'var(--warning)' }}>{quiet} quiet</span>
              <span className="text-[9px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>{terminalCount} terminals</span>
            </div>
          </div>

          {/* Operator Console */}
          <div className="shrink-0 px-4 py-3 min-h-[260px]" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(4,8,14,0.28)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FolderOpen size={12} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-primary)' }}>Operator Console</span>
              </div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>{filteredMessages.length} msg</span>
            </div>
            <div className="max-h-[180px] overflow-y-auto pr-1">
              <ConversationFeed
                messages={compactMessages}
                emptyLabel="Send one below or wait for agents to communicate."
                compact
              />
            </div>
            {mode === 'mission' && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1 text-[8px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <span>TO:</span>
                  <select
                    value={messageTarget}
                    onChange={(e) => setMessageTarget(e.target.value)}
                    className="bg-transparent text-[8px] font-semibold outline-none"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <option value="all">All Agents</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 flex items-center gap-1 rounded-lg border px-2 py-1.5" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(4,9,18,0.5)', backdropFilter: 'blur(16px) saturate(1.1)' }}>
                  <input
                    type="text"
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submitMessage()
                      }
                    }}
                    disabled={!swarmActive}
                    placeholder="Type a message to the swarm..."
                    className="flex-1 bg-transparent text-[9px] outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button className="p-0.5 rounded transition-all hover:bg-[var(--surface-3)] disabled:opacity-30 hover:scale-105" style={{ color: 'var(--accent)' }} onClick={submitMessage} disabled={!swarmActive || !draftMessage.trim()}>
                    <Send size={10} />
                  </button>
                </div>
              </div>
            )}
            {mode === 'console' && (
              <div className="mt-3 text-[10px] leading-5" style={{ color: 'var(--text-muted)' }}>
                Expanded console is active in the main workspace. Use the left roster to focus an agent stream.
              </div>
            )}
          </div>

          {/* Live Activity */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={12} style={{ color: 'var(--warning)' }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-primary)' }}>Live Activity</span>
              </div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>{working} active</span>
            </div>
            <div className="space-y-1">
              {activityItems.map((item) => {
                const itemColor = item.meta === 'system'
                  ? 'var(--warning)'
                  : item.meta === 'operator'
                    ? 'var(--accent)'
                    : ROLE_META[item.meta as AgentRole]?.color ?? 'var(--text-muted)'
                return (
                  <div key={item.id} className="flex items-center gap-2.5 rounded-lg border p-2 transition-all hover:bg-[rgba(255,255,255,0.02)]" style={{ borderColor: 'rgba(170,221,255,0.05)', background: 'rgba(7,12,20,0.24)' }}>
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: `${itemColor}15` }}>
                      <Bot size={10} style={{ color: itemColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                        <span className="text-[8px]" style={{ color: itemColor }}>· {typeof item.meta === 'string' ? item.meta : 'event'}</span>
                      </div>
                      <div className="text-[8px] font-mono mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {item.detail}
                      </div>
                    </div>
                    <div className="text-[8px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>{formatClock(item.createdAt)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5" style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {agents.length} agents total · {messages.length} messages · {swarmSession.knowledgeFiles.length} knowledge files
        </span>
        <button onClick={() => setView('swarm-launch')} className="flex items-center gap-1.5 text-[10px] font-semibold transition-all hover:opacity-80" style={{ color: 'var(--accent)' }}>
          <UserPlus size={11} /> + Add Agent
        </button>
      </div>
    </div>
  )
}
