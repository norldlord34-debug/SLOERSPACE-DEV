'use client'

import Image from 'next/image'
import { useStore, ViewId } from '@/store/useStore'
import { useState } from 'react'
import { Terminal, Kanban, Bot, FileText, Settings, Zap, Home, PanelLeftClose, PanelLeftOpen, Globe, FileCode, BookOpen, Server, KeyRound, MonitorPlay, Share2, ImageIcon, History, BarChart3, Activity, Network, BookMarked, Layers3 } from 'lucide-react'


const PRIMARY_NAV: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'canvas', label: 'Canvas', icon: Layers3 },
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'swarm-launch', label: 'Swarm', icon: Zap },
  { id: 'prompts', label: 'Prompts', icon: FileText },
]

const SECONDARY_NAV: { id: ViewId; label: string; icon: React.ElementType }[] = [
  { id: 'browser', label: 'Browser', icon: Globe },
  { id: 'editor', label: 'Code Editor', icon: FileCode },
  { id: 'notebook', label: 'Notebook', icon: BookOpen },
  { id: 'ssh', label: 'SSH', icon: Server },
  { id: 'env', label: 'Env Vars', icon: KeyRound },
  { id: 'preview', label: 'Preview', icon: MonitorPlay },
  { id: 'history', label: 'History', icon: History },
  { id: 'codebase', label: 'Codebase', icon: BarChart3 },
  { id: 'system', label: 'System', icon: Activity },
  { id: 'ports', label: 'Ports', icon: Network },
  { id: 'snippets', label: 'Snippets', icon: BookMarked },
  { id: 'sessions', label: 'Sessions', icon: Share2 },
  { id: 'file-preview', label: 'File Preview', icon: ImageIcon },
]

function NavButton({ item, isActive, collapsed, onClick }: {
  item: { id: ViewId; label: string; icon: React.ElementType }
  isActive: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      title={item.label}
      className={`relative flex w-full items-center ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-2.5 py-2'} rounded-lg text-left transition-all duration-150`}
      style={{ background: isActive ? 'var(--accent-subtle)' : 'transparent' }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      {isActive && <div className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full" style={{ background: 'var(--accent)' }} />}
      <Icon size={15} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
      {!collapsed && <span className="flex-1 text-[11.5px] font-medium truncate" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>}
    </button>
  )
}

export function NavigationMenu({ isOpen, onClose, hideDesktop = false }: { isOpen: boolean; onClose: () => void; hideDesktop?: boolean }) {
  const { setView, currentView, userProfile, isTrialActive, setSettingsTab, workspaceTabs, setWizardStep } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const trialActive = isTrialActive()
  const accessLabel = userProfile.plan === 'pro' ? 'PRO' : trialActive ? 'TRIAL' : 'FREE'
  const desktopWidth = collapsed ? 'w-[54px]' : 'w-[200px]'

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`${hideDesktop ? 'hidden' : 'hidden lg:flex'} ${desktopWidth} shrink-0 p-2 pr-0 transition-all duration-300 ease-out`}>
        <div className="h-full w-full overflow-hidden rounded-2xl flex flex-col liquid-glass" style={{ borderRight: '1px solid var(--border)' }}>
          <div className="flex h-full flex-col px-1.5 py-2 min-h-0">
            {/* Logo */}
            <div className={`flex items-center ${collapsed ? 'justify-center py-2 px-0' : 'gap-2 px-2 py-2'} mb-1`}>
              <div className="h-7 w-7 overflow-hidden rounded-xl shrink-0"
                style={{ background: '#030812', boxShadow: '0 0 0 1.5px rgba(79,140,255,0.45), 0 4px 14px rgba(79,140,255,0.25)' }}>
                <Image src="/LOGO.png" alt="SloerSpace" width={28} height={28} className="h-full w-full object-cover" />
              </div>
              {!collapsed && <div className="text-[12px] font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace</div>}
            </div>

            {/* Scrollable nav items area */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-0.5 pb-1" style={{ scrollbarWidth: 'none' }}>
            {/* Primary nav */}
            {!collapsed && <div className="px-2 mb-1 text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Workspaces</div>}
            {PRIMARY_NAV.map((item) => (
              <NavButton key={item.id} item={item} isActive={currentView === item.id} collapsed={collapsed}
                onClick={() => {
                  if (item.id === 'canvas') {
                    const hasCanvas = workspaceTabs.some((t) => t.kind === 'canvas')
                    if (hasCanvas) { setView('canvas') } else { setWizardStep(1); setView('canvas-wizard') }
                  } else {
                    setView(item.id)
                  }
                }} />
            ))}

            {/* Divider */}
            <div className="my-1 mx-2 h-px" style={{ background: 'var(--border)' }} />

            {/* Secondary nav — capped, show more toggle */}
            {!collapsed && <div className="px-2 mb-1 text-[8.5px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Tools</div>}
            {(showAll ? SECONDARY_NAV : SECONDARY_NAV.slice(0, 6)).map((item) => (
              <NavButton key={item.id} item={item} isActive={currentView === item.id} collapsed={collapsed}
                onClick={() => setView(item.id)} />
            ))}
            {!collapsed && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span className="text-[10px] font-medium">{showAll ? '↑ Show less' : `+ ${SECONDARY_NAV.length - 6} more`}</span>
              </button>
            )}
            </div>{/* end scrollable area */}

            {/* Settings — pinned */}
            <NavButton item={{ id: 'settings', label: 'Settings', icon: Settings }} isActive={currentView === 'settings'} collapsed={collapsed}
              onClick={() => setView('settings')} />

            {/* Footer */}
            {!collapsed ? (
              <div className="mt-1 space-y-1">
                <button
                  onClick={() => { setView('settings'); setSettingsTab('account') }}
                  className="w-full px-2.5 py-2 rounded-lg flex items-center gap-2 transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                    {userProfile.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-[10.5px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{userProfile.username}</span>
                  <span className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0" style={{
                    background: trialActive ? 'rgba(255,191,98,0.12)' : userProfile.plan === 'pro' ? 'rgba(79,140,255,0.12)' : 'rgba(255,255,255,0.05)',
                    color: trialActive ? 'var(--warning)' : userProfile.plan === 'pro' ? 'var(--accent)' : 'var(--text-muted)',
                  }}>{accessLabel}</span>
                </button>
                <button onClick={() => setCollapsed(true)} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  <PanelLeftClose size={13} /><span className="text-[10px]">Collapse</span>
                </button>
              </div>
            ) : (
              <div className="mt-1 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }} title={userProfile.username}>
                  {userProfile.username.charAt(0).toUpperCase()}
                </div>
                <button onClick={() => setCollapsed(false)} className="w-full flex items-center justify-center py-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  <PanelLeftOpen size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <div className="fixed inset-y-0 left-0 z-50 w-[240px] p-3 transition-all duration-300 ease-out lg:hidden"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-104%)', opacity: isOpen ? 1 : 0 }}>
        <div className="premium-panel-elevated h-full w-full overflow-hidden rounded-2xl">
          <div className="flex h-full flex-col px-2 py-3 gap-0.5">
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="h-7 w-7 overflow-hidden rounded-xl shrink-0"
                style={{ background: '#030812', boxShadow: '0 0 0 1.5px rgba(79,140,255,0.45), 0 4px 14px rgba(79,140,255,0.25)' }}>
                <Image src="/LOGO.png" alt="SloerSpace" width={28} height={28} className="h-full w-full object-cover" />
              </div>
              <div className="text-[12px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace</div>
            </div>
            {[...PRIMARY_NAV, ...SECONDARY_NAV, { id: 'settings' as ViewId, label: 'Settings', icon: Settings }].map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              return (
                <button key={item.id} onClick={() => { setView(item.id); onClose() }}
                  className="relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all"
                  style={{ background: isActive ? 'var(--accent-subtle)' : 'transparent' }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'var(--accent-subtle)' : 'transparent' }}>
                  {isActive && <div className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full" style={{ background: 'var(--accent)' }} />}
                  <Icon size={15} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span className="text-[11.5px] font-medium" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
