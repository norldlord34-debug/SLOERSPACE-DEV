'use client'

import { useStore, ViewId } from '@/store/useStore'
import { useState } from 'react'
import { Terminal, Kanban, Bot, FileText, Settings, Zap, Home, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ElementType; shortcut: string }[] = [
  { id: 'home', label: 'Home', icon: Home, shortcut: '⌘H' },
  { id: 'terminal', label: 'Terminal', icon: Terminal, shortcut: '⌘1' },
  { id: 'kanban', label: 'Kanban Board', icon: Kanban, shortcut: '⌘2' },
  { id: 'agents', label: 'Agents', icon: Bot, shortcut: '⌘3' },
  { id: 'prompts', label: 'Prompts', icon: FileText, shortcut: '⌘4' },
  { id: 'swarm-launch', label: 'SloerSwarm', icon: Zap, shortcut: '⌘S' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '⌘,' },
]

export function NavigationMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { setView, currentView, userProfile } = useStore()
  const [collapsed, setCollapsed] = useState(false)

  const desktopWidth = collapsed ? 'w-[60px]' : 'w-[220px]'

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex ${desktopWidth} shrink-0 p-2 pr-0 transition-all duration-300 ease-out`}>
        <div className="h-full w-full overflow-hidden rounded-2xl flex flex-col" style={{ background: 'rgba(8,13,22,0.6)', borderRight: '1px solid var(--border)' }}>
          <div className="flex h-full flex-col p-2">
            {/* Logo */}
            <div className={`flex items-center ${collapsed ? 'justify-center py-3' : 'gap-2.5 px-3 py-3'} mb-2`}>
              <div className="h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/10 shrink-0">
                <img src="/LOGO.png" alt="SloerSpace" className="h-full w-full object-cover" />
              </div>
              {!collapsed && <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace</div>}
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {!collapsed && <div className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Navigate</div>}
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex w-full items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-left transition-all`}
                    style={{ background: isActive ? 'rgba(79,140,255,0.1)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(79,140,255,0.1)' : 'transparent' }}
                  >
                    {isActive && <div className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: 'var(--accent)' }} />}
                    <Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                    {!collapsed && <span className="flex-1 text-[12px] font-medium" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>}
                    {!collapsed && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>{item.shortcut}</span>}
                  </button>
                )
              })}
            </div>

            {/* Footer — user + collapse toggle */}
            {!collapsed ? (
              <div className="mt-2 space-y-1.5">
                <div className="px-3 py-2.5 rounded-xl flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                      {userProfile.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{userProfile.username}</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{
                    background: userProfile.plan === 'pro' ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.05)',
                    color: userProfile.plan === 'pro' ? 'var(--accent)' : 'var(--text-muted)',
                  }}>{userProfile.plan === 'pro' ? 'PRO' : 'FREE'}</span>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-all hover:bg-[rgba(255,255,255,0.03)]"
                  style={{ color: 'var(--text-muted)' }}
                  title="Collapse menu"
                >
                  <PanelLeftClose size={14} />
                  <span className="text-[10px]">Collapse</span>
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }} title={userProfile.username}>
                  {userProfile.username.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={() => setCollapsed(false)}
                  className="w-full flex items-center justify-center py-2 rounded-xl transition-all hover:bg-[rgba(255,255,255,0.03)]"
                  style={{ color: 'var(--text-muted)' }}
                  title="Expand menu"
                >
                  <PanelLeftOpen size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <div
        className="fixed inset-y-0 left-0 z-50 w-[260px] p-3 transition-all duration-300 ease-out lg:hidden"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-104%)',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="premium-panel-elevated h-full w-full overflow-hidden rounded-2xl">
          <div className="flex h-full flex-col p-3">
            <div className="flex items-center gap-2.5 px-3 py-3 mb-2">
              <div className="h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/10 shrink-0">
                <img src="/LOGO.png" alt="SloerSpace" className="h-full w-full object-cover" />
              </div>
              <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace</div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5">
              <div className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Navigate</div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.id
                return (
                  <button key={item.id} onClick={() => { setView(item.id); onClose() }}
                    className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                    style={{ background: isActive ? 'rgba(79,140,255,0.1)' : 'transparent' }}>
                    {isActive && <div className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: 'var(--accent)' }} />}
                    <Icon size={16} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <span className="flex-1 text-[12px] font-medium" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>{item.shortcut}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
