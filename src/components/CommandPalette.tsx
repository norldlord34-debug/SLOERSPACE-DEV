'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import {
  Search, Terminal, Kanban, Bot, FileText, Settings, Zap, Home,
  Sparkles, X, ArrowRight, Hash, Layers
} from 'lucide-react'

interface PaletteItem {
  id: string
  label: string
  description: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  category: 'navigation' | 'action' | 'workspace' | 'task' | 'agent' | 'prompt'
  action: () => void
  keywords: string[]
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const {
    setView, workspaceTabs, setActiveTab, kanbanTasks,
    customAgents, prompts,
  } = useStore()

  const items = useMemo<PaletteItem[]>(() => {
    const navItems: PaletteItem[] = [
      { id: 'nav-home', label: 'Go to Home', description: 'Overview dashboard', icon: Home, category: 'navigation', action: () => { setView('home'); onClose() }, keywords: ['home', 'overview', 'dashboard'] },
      { id: 'nav-terminal', label: 'Go to Terminal', description: 'Terminal grid workspace', icon: Terminal, category: 'navigation', action: () => { setView('terminal'); onClose() }, keywords: ['terminal', 'shell', 'console', 'cmd'] },
      { id: 'nav-kanban', label: 'Go to Kanban', description: 'Task delivery board', icon: Kanban, category: 'navigation', action: () => { setView('kanban'); onClose() }, keywords: ['kanban', 'tasks', 'board', 'todo'] },
      { id: 'nav-agents', label: 'Go to Agents', description: 'AI agent library', icon: Bot, category: 'navigation', action: () => { setView('agents'); onClose() }, keywords: ['agents', 'ai', 'bot', 'claude', 'codex'] },
      { id: 'nav-prompts', label: 'Go to Prompts', description: 'Prompt system library', icon: FileText, category: 'navigation', action: () => { setView('prompts'); onClose() }, keywords: ['prompts', 'templates', 'library'] },
      { id: 'nav-settings', label: 'Go to Settings', description: 'Executive settings', icon: Settings, category: 'navigation', action: () => { setView('settings'); onClose() }, keywords: ['settings', 'config', 'preferences'] },
      { id: 'nav-swarm', label: 'Launch SloerSwarm', description: 'Multi-agent coordination', icon: Zap, category: 'navigation', action: () => { setView('swarm-launch'); onClose() }, keywords: ['swarm', 'multi', 'agent', 'parallel'] },
    ]

    const actionItems: PaletteItem[] = [
      { id: 'act-workspace', label: 'New Workspace', description: 'Create a new terminal workspace', icon: Terminal, category: 'action', action: () => { setView('workspace-wizard'); onClose() }, keywords: ['new', 'workspace', 'create', 'terminal'] },
      { id: 'act-swarm', label: 'New Swarm Session', description: 'Launch parallel agent execution', icon: Zap, category: 'action', action: () => { setView('swarm-launch'); onClose() }, keywords: ['new', 'swarm', 'launch'] },
    ]

    const workspaceItems: PaletteItem[] = workspaceTabs.map((tab) => ({
      id: `ws-${tab.id}`,
      label: tab.name,
      description: `Workspace · ${tab.paneCount} panes`,
      icon: Layers,
      category: 'workspace' as const,
      action: () => { setActiveTab(tab.id); setView(tab.view); onClose() },
      keywords: [tab.name.toLowerCase(), 'workspace'],
    }))

    const taskItems: PaletteItem[] = kanbanTasks.slice(0, 20).map((task) => ({
      id: `task-${task.id}`,
      label: task.title,
      description: `${task.column} · ${task.priority}`,
      icon: Hash,
      category: 'task' as const,
      action: () => { setView('kanban'); onClose() },
      keywords: [task.title.toLowerCase(), task.column.toLowerCase(), task.priority.toLowerCase()],
    }))

    const agentItems: PaletteItem[] = customAgents.map((agent) => ({
      id: `agent-${agent.id}`,
      label: agent.name,
      description: agent.systemPrompt.slice(0, 60),
      icon: Bot,
      category: 'agent' as const,
      action: () => { setView('agents'); onClose() },
      keywords: [agent.name.toLowerCase()],
    }))

    const promptItems: PaletteItem[] = prompts.slice(0, 15).map((prompt) => ({
      id: `prompt-${prompt.id}`,
      label: prompt.title,
      description: prompt.content.slice(0, 60),
      icon: Sparkles,
      category: 'prompt' as const,
      action: () => { setView('prompts'); onClose() },
      keywords: [prompt.title.toLowerCase()],
    }))

    return [...navItems, ...actionItems, ...workspaceItems, ...taskItems, ...agentItems, ...promptItems]
  }, [setView, onClose, workspaceTabs, setActiveTab, kanbanTasks, customAgents, prompts])

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 20)
    const q = query.toLowerCase().trim()
    return items.filter((item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some((kw) => kw.includes(q))
    ).slice(0, 20)
  }, [query, items])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      filtered[selectedIndex].action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    action: 'Quick Actions',
    workspace: 'Workspaces',
    task: 'Tasks',
    agent: 'Agents',
    prompt: 'Prompts',
  }

  let lastCategory = ''

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[var(--border)] shadow-2xl"
        style={{ background: 'var(--surface-0)' }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, views, tasks, agents..."
            className="flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: 'var(--text-primary)' }}
          />
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--surface-3)] transition-colors">
            <X size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
          {filtered.map((item, index) => {
            const Icon = item.icon
            const showCategory = item.category !== lastCategory
            lastCategory = item.category
            return (
              <div key={item.id}>
                {showCategory && (
                  <div className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                    {categoryLabels[item.category]}
                  </div>
                )}
                <button
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all"
                  style={{
                    background: index === selectedIndex ? 'rgba(79,140,255,0.12)' : 'transparent',
                    borderColor: index === selectedIndex ? 'rgba(143,194,255,0.18)' : 'transparent',
                  }}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: index === selectedIndex ? 'rgba(79,140,255,0.18)' : 'var(--surface-2)',
                      color: index === selectedIndex ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                    <div className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.description}</div>
                  </div>
                  {index === selectedIndex && <ArrowRight size={14} style={{ color: 'var(--accent)' }} />}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-2.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="premium-kbd text-[9px]">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="premium-kbd text-[9px]">↵</kbd> Select</span>
            <span className="flex items-center gap-1"><kbd className="premium-kbd text-[9px]">Esc</kbd> Close</span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  )
}
