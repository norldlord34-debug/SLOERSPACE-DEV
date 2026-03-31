'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useCallback } from 'react'
import { useStore } from '@/store/useStore'
import {
  Search, Terminal, Kanban, Bot, FileText, Settings, Zap, Home,
  Sparkles, X, ArrowRight, Hash, Layers, Globe, BookOpen, Server, KeyRound, MonitorPlay, Share2, ImageIcon, History, BarChart3, Activity, Network, BookMarked
} from 'lucide-react'

interface PaletteItem {
  id: string
  label: string
  description: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  category: 'navigation' | 'action' | 'workspace' | 'task' | 'agent' | 'prompt' | 'command'
  action: () => void
  keywords: string[]
}

function buildCommandPaletteLabel(command: string) {
  const compact = command.trim().replace(/\s+/g, ' ')
  return compact.length > 42 ? `${compact.slice(0, 39)}...` : compact
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const {
    setView, workspaceTabs, setActiveTab, kanbanTasks, setWizardStep, setWizardLayout, setWizardAgentConfig,
    customAgents, prompts, commandSnippets, starredCommands, terminalSessions, primeTerminalCommand,
    workspacePresets, launchWorkspace,
  } = useStore()

  const openTerminalWithCommand = useCallback((command: string, preferredWorkspaceId?: string) => {
    primeTerminalCommand(command)
    const preferredTerminalTab = preferredWorkspaceId
      ? workspaceTabs.find((tab) => tab.id === preferredWorkspaceId && tab.view === 'terminal')
      : null
    const firstTerminalTab = preferredTerminalTab ?? workspaceTabs.find((tab) => tab.view === 'terminal')
    if (firstTerminalTab) {
      setActiveTab(firstTerminalTab.id)
      setView('terminal')
    } else {
      setView('workspace-wizard')
    }
    onClose()
  }, [onClose, primeTerminalCommand, setActiveTab, setView, workspaceTabs])

  const items = useMemo<PaletteItem[]>(() => {
    const navItems: PaletteItem[] = [
      { id: 'nav-home', label: 'Go to Home', description: 'Overview dashboard', icon: Home, category: 'navigation', action: () => { setView('home'); onClose() }, keywords: ['home', 'overview', 'dashboard'] },
      { id: 'nav-terminal', label: 'Go to Terminal', description: 'Terminal grid workspace', icon: Terminal, category: 'navigation', action: () => { setView('terminal'); onClose() }, keywords: ['terminal', 'shell', 'console', 'cmd'] },
      { id: 'nav-kanban', label: 'Go to Kanban', description: 'Task delivery board', icon: Kanban, category: 'navigation', action: () => { setView('kanban'); onClose() }, keywords: ['kanban', 'tasks', 'board', 'todo'] },
      { id: 'nav-agents', label: 'Go to Agents', description: 'AI agent library', icon: Bot, category: 'navigation', action: () => { setView('agents'); onClose() }, keywords: ['agents', 'ai', 'bot', 'claude', 'codex'] },
      { id: 'nav-prompts', label: 'Go to Prompts', description: 'Prompt system library', icon: FileText, category: 'navigation', action: () => { setView('prompts'); onClose() }, keywords: ['prompts', 'templates', 'library'] },
      { id: 'nav-settings', label: 'Go to Settings', description: 'Executive settings', icon: Settings, category: 'navigation', action: () => { setView('settings'); onClose() }, keywords: ['settings', 'config', 'preferences'] },
      { id: 'nav-swarm', label: 'Launch SloerSwarm', description: 'Multi-agent coordination', icon: Zap, category: 'navigation', action: () => { setView('swarm-launch'); onClose() }, keywords: ['swarm', 'multi', 'agent', 'parallel'] },
      { id: 'nav-browser', label: 'Open Browser', description: 'Native WebView2 browser', icon: Globe, category: 'navigation', action: () => { setView('browser'); onClose() }, keywords: ['browser', 'web', 'internet', 'google', 'url', 'search'] },
      { id: 'nav-editor', label: 'Open Code Editor', description: 'Monaco editor with file explorer (Ctrl+E)', icon: Layers, category: 'navigation', action: () => { setView('editor'); onClose() }, keywords: ['editor', 'code', 'file', 'monaco', 'edit', 'open'] },
      { id: 'nav-notebook', label: 'Open Notebook', description: 'Runbooks with executable cells (Ctrl+Shift+N)', icon: BookOpen, category: 'navigation', action: () => { setView('notebook'); onClose() }, keywords: ['notebook', 'runbook', 'notes', 'cells', 'markdown'] },
      { id: 'nav-ssh', label: 'Open SSH Manager', description: 'Saved connections & remote shells (Ctrl+Shift+S)', icon: Server, category: 'navigation', action: () => { setView('ssh'); onClose() }, keywords: ['ssh', 'remote', 'server', 'connect', 'linux'] },
      { id: 'nav-env', label: 'Env Var Manager', description: 'Manage environment variables & .env files (Ctrl+Shift+E)', icon: KeyRound, category: 'navigation', action: () => { setView('env'); onClose() }, keywords: ['env', 'environment', 'variable', 'secret', 'key', 'dotenv'] },
      { id: 'nav-preview', label: 'Preview Panel', description: 'Live localhost preview (Ctrl+Shift+P)', icon: MonitorPlay, category: 'navigation', action: () => { setView('preview'); onClose() }, keywords: ['preview', 'localhost', 'browser', 'dev server', 'port', 'live'] },
      { id: 'nav-sessions', label: 'Session Sharing', description: 'Export/import workspace sessions (Ctrl+Shift+X)', icon: Share2, category: 'navigation', action: () => { setView('sessions'); onClose() }, keywords: ['session', 'share', 'export', 'import', 'workspace', 'backup'] },
      { id: 'nav-file-preview', label: 'File Preview', description: 'Preview images, markdown, JSON, code files (Ctrl+Shift+F)', icon: ImageIcon, category: 'navigation', action: () => { setView('file-preview'); onClose() }, keywords: ['file', 'preview', 'image', 'markdown', 'json', 'open', 'view'] },
      { id: 'nav-history', label: 'Command History', description: 'Search across all terminal command histories (Ctrl+Shift+H)', icon: History, category: 'navigation', action: () => { setView('history'); onClose() }, keywords: ['history', 'command', 'search', 'terminal', 'previous', 'ran'] },
      { id: 'nav-codebase', label: 'Codebase Indexer', description: 'Language stats, LOC counter, largest files (Ctrl+Shift+I)', icon: BarChart3, category: 'navigation', action: () => { setView('codebase'); onClose() }, keywords: ['codebase', 'index', 'language', 'stats', 'loc', 'lines', 'code'] },
      { id: 'nav-system', label: 'System Monitor', description: 'CPU, RAM, disk, top processes with live sparklines (Ctrl+Shift+M)', icon: Activity, category: 'navigation', action: () => { setView('system'); onClose() }, keywords: ['system', 'monitor', 'cpu', 'ram', 'memory', 'disk', 'processes', 'stats'] },
      { id: 'nav-ports', label: 'Port Manager', description: 'Scan active ports, kill processes by PID (Ctrl+Shift+O)', icon: Network, category: 'navigation', action: () => { setView('ports'); onClose() }, keywords: ['port', 'ports', 'network', 'pid', 'kill', 'process', 'listening'] },
      { id: 'nav-snippets', label: 'Snippet Manager', description: 'Reusable command/code snippets with search (Ctrl+Shift+Q)', icon: BookMarked, category: 'navigation', action: () => { setView('snippets'); onClose() }, keywords: ['snippet', 'snippets', 'command', 'shortcut', 'reuse', 'library'] },
      { id: 'nav-ai-chat', label: 'Open AI Chat', description: 'AI assistant (Ctrl+J)', icon: Sparkles, category: 'navigation', action: () => { onClose() }, keywords: ['ai', 'chat', 'assistant', 'claude', 'gpt', 'gemini', 'ollama', 'ask'] },
      { id: 'nav-ai-settings', label: 'AI Provider Settings', description: 'Configure API keys & models', icon: Settings, category: 'navigation', action: () => { setView('settings'); onClose() }, keywords: ['ai', 'api', 'key', 'provider', 'ollama', 'openai', 'anthropic'] },
    ]

    const presetItems: PaletteItem[] = workspacePresets.map((preset) => ({
      id: `preset-${preset.id}`,
      label: `Launch: ${preset.name}`,
      description: `${preset.layoutCount === 1 ? 'Single' : `${preset.layoutCount} panes`} · ${preset.workingDirectory.split(/[\/]/).pop() || preset.workingDirectory}`,
      icon: BookMarked,
      category: 'workspace' as const,
      action: () => {
        const cfg = { claude: 0, codex: 0, gemini: 0, opencode: 0, cursor: 0, droid: 0, copilot: 0 } as Record<import('@/store/useStore').AgentCli, number>
        Object.entries(preset.agentConfig).forEach(([k, v]) => { if (k in cfg) cfg[k as import('@/store/useStore').AgentCli] = v as number })
        setWizardLayout(preset.layoutCount)
        setWizardAgentConfig(cfg)
        launchWorkspace({
          workingDirectory: preset.workingDirectory,
          agentConfig: cfg,
          customBootstrapCommand: preset.customCommand?.trim() || undefined,
          name: preset.name,
        })
        onClose()
      },
      keywords: [preset.name.toLowerCase(), 'preset', 'launch', 'workspace'],
    }))

    const actionItems: PaletteItem[] = [
      { id: 'act-workspace', label: 'New Workspace', description: 'Create a new terminal workspace', icon: Terminal, category: 'action', action: () => { setWizardStep(1); setView('workspace-wizard'); onClose() }, keywords: ['new', 'workspace', 'create', 'terminal'] },
      { id: 'act-swarm', label: 'New Swarm Session', description: 'Launch parallel agent execution', icon: Zap, category: 'action', action: () => { setView('swarm-launch'); onClose() }, keywords: ['new', 'swarm', 'launch'] },
      { id: 'act-git-status', label: 'Prime Git Status', description: 'Open or create a terminal workflow for git status', icon: Terminal, category: 'action', action: () => openTerminalWithCommand('git status'), keywords: ['git', 'status', 'repo'] },
      { id: 'act-run-tests', label: 'Prime Test Command', description: 'Queue a common test command in the terminal', icon: Terminal, category: 'action', action: () => openTerminalWithCommand('npm test'), keywords: ['test', 'jest', 'vitest', 'qa'] },
      { id: 'act-browser', label: 'New Browser Tab', description: 'Open browser with a new tab', icon: Globe, category: 'action', action: () => { setView('browser'); onClose() }, keywords: ['browser', 'tab', 'web', 'new'] },
      { id: 'act-browse-github', label: 'Browse GitHub', description: 'Open GitHub in browser', icon: Globe, category: 'action', action: () => { setView('browser'); onClose() }, keywords: ['github', 'repo', 'git', 'browse'] },
      { id: 'act-browse-docs', label: 'Browse Documentation', description: 'Open MDN / docs in browser', icon: Globe, category: 'action', action: () => { setView('browser'); onClose() }, keywords: ['docs', 'documentation', 'mdn', 'reference'] },
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

    const recentRuntimeEntries = Object.entries(terminalSessions)
      .flatMap(([workspaceId, panes]) => {
        const workspaceName = workspaceTabs.find((tab) => tab.id === workspaceId)?.name ?? 'Workspace'

        return panes.flatMap((pane) => {
          const sessionCommand = pane.runtimeSession?.lastCommand ? [pane.runtimeSession.lastCommand] : []
          const commandHistory = pane.commandHistory ?? []
          const candidateCommands = [...sessionCommand, ...commandHistory.filter((command) => command !== pane.runtimeSession?.lastCommand)]

          return candidateCommands.slice(0, 4).map((command, index) => ({
            workspaceId,
            workspaceName,
            paneLabel: pane.label || pane.agentCli || `Pane ${index + 1}`,
            command,
            updatedAtMs: (pane.runtimeSession?.updatedAtMs ?? 0) - index,
            exitCode: pane.runtimeSession?.lastCommand === command ? pane.runtimeSession?.lastExitCode ?? null : null,
            sessionKind: pane.runtimeSession?.sessionKind ?? pane.sessionKind ?? 'local',
          }))
        })
      })
      .sort((left, right) => right.updatedAtMs - left.updatedAtMs)

    const recentRuntimeCommandItems: PaletteItem[] = []
    const seenRecentCommands = new Set<string>()

    for (const entry of recentRuntimeEntries) {
      const normalizedCommand = entry.command.trim().toLowerCase()

      if (!normalizedCommand || seenRecentCommands.has(normalizedCommand)) {
        continue
      }

      seenRecentCommands.add(normalizedCommand)
      recentRuntimeCommandItems.push({
        id: `recent-runtime-${entry.workspaceId}-${normalizedCommand}`,
        label: buildCommandPaletteLabel(entry.command),
        description: `${entry.workspaceName} · ${entry.paneLabel} · ${entry.sessionKind}${entry.exitCode !== null ? ` · exit ${entry.exitCode}` : ''}`,
        icon: Terminal,
        category: 'command' as const,
        action: () => openTerminalWithCommand(entry.command, entry.workspaceId),
        keywords: [
          entry.command.toLowerCase(),
          entry.workspaceName.toLowerCase(),
          entry.paneLabel.toLowerCase(),
          entry.sessionKind.toLowerCase(),
          'recent',
          'runtime',
          'session',
          'replay',
          'terminal',
        ],
      })

      if (recentRuntimeCommandItems.length >= 12) {
        break
      }
    }

    const snippetItems: PaletteItem[] = commandSnippets.slice(0, 12).map((snippet) => ({
      id: `snippet-${snippet.id}`,
      label: snippet.name,
      description: snippet.command,
      icon: Terminal,
      category: 'command' as const,
      action: () => openTerminalWithCommand(snippet.command),
      keywords: [snippet.name.toLowerCase(), snippet.command.toLowerCase(), 'workflow', 'snippet', 'terminal'],
    }))

    const favoriteCommandItems: PaletteItem[] = starredCommands.slice(0, 12).map((command) => ({
      id: `favorite-${command}`,
      label: buildCommandPaletteLabel(command),
      description: 'Starred terminal command',
      icon: Terminal,
      category: 'command' as const,
      action: () => openTerminalWithCommand(command),
      keywords: [command.toLowerCase(), 'favorite', 'starred', 'terminal'],
    }))

    return [...presetItems, ...navItems, ...actionItems, ...recentRuntimeCommandItems, ...favoriteCommandItems, ...snippetItems, ...workspaceItems, ...taskItems, ...agentItems, ...promptItems]
  }, [setView, onClose, workspaceTabs, setActiveTab, kanbanTasks, customAgents, prompts, commandSnippets, starredCommands, terminalSessions, openTerminalWithCommand, workspacePresets, launchWorkspace, setWizardStep, setWizardLayout, setWizardAgentConfig])

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
    command: 'Command Flows',
  }

  let lastCategory = ''

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[var(--border)] shadow-2xl liquid-glass-heavy"
        style={{ background: 'rgba(3,5,10,0.85)' }}
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
