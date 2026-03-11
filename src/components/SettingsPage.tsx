'use client'

import { useStore, ThemeId, AgentCli, SettingsTab } from '@/store/useStore'
import { Palette, Keyboard, Bot, User, Key, ExternalLink, LogOut, Download, FileText, Check, Sparkles, ShieldCheck, Command, Upload, Database, Trash2, AlertTriangle, ChevronRight, Mail } from 'lucide-react'
import { useState, useRef } from 'react'

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'ai-agents', label: 'AI Agents', icon: Bot },
  { id: 'account', label: 'Account', icon: User },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'data' as SettingsTab, label: 'Data', icon: Database },
]

const DARK_THEMES: { id: ThemeId; name: string; colors: string[] }[] = [
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', colors: ['#f38ba8', '#a6e3a1', '#89b4fa'] },
  { id: 'github-dark', name: 'GitHub Dark', colors: ['#f0883e', '#3fb950', '#58a6ff'] },
  { id: 'rose-pine', name: 'Rosé Pine', colors: ['#eb6f92', '#9ccfd8', '#c4a7e7'] },
  { id: 'one-dark-pro', name: 'One Dark Pro', colors: ['#e06c75', '#98c379', '#61afef'] },
  { id: 'nord', name: 'Nord', colors: ['#bf616a', '#a3be8c', '#81a1c1'] },
  { id: 'everforest-dark', name: 'Everforest Dark', colors: ['#e67e80', '#a7c080', '#7fbbb3'] },
  { id: 'poimandres', name: 'Poimandres', colors: ['#d0679d', '#5de4c7', '#add7ff'] },
  { id: 'sloerspace', name: 'SloerSpace', colors: ['#ef4444', '#22c55e', '#3b82f6'] },
  { id: 'oled-dark', name: 'OLED Dark', colors: ['#ff3333', '#00ff88', '#4488ff'] },
  { id: 'neon-tech', name: 'Neon Tech', colors: ['#ff4466', '#00ffcc', '#44aaff'] },
  { id: 'dracula', name: 'Dracula', colors: ['#ff5555', '#50fa7b', '#bd93f9'] },
  { id: 'synthwave', name: 'Synthwave', colors: ['#fe4450', '#72f1b8', '#36f9f6'] },
]

const LIGHT_THEMES: { id: ThemeId; name: string; colors: string[] }[] = [
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', colors: ['#d20f39', '#40a02b', '#1e66f5'] },
  { id: 'github-light', name: 'GitHub Light', colors: ['#cf222e', '#1a7f37', '#0969da'] },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', colors: ['#b4637a', '#56949f', '#907aa9'] },
]

const AGENTS_LIST: { id: AgentCli; name: string; desc: string; cmd: string }[] = [
  { id: 'claude', name: 'Claude', desc: 'Anthropic Claude Code CLI', cmd: 'claude' },
  { id: 'codex', name: 'Codex', desc: 'OpenAI Codex CLI', cmd: 'codex' },
  { id: 'gemini', name: 'Gemini', desc: 'Google Gemini CLI', cmd: 'gemini' },
  { id: 'opencode', name: 'OpenCode', desc: 'OpenCode TUI agent', cmd: 'opencode' },
  { id: 'cursor', name: 'Cursor', desc: 'Cursor Agent CLI', cmd: 'agent' },
]

const SHORTCUTS = [
  { category: 'Workspaces', items: [
    { label: 'New workspace tab', keys: ['Ctrl', 'T'] },
    { label: 'Close workspace', keys: ['Ctrl', 'Shift', 'W'] },
    { label: 'Next workspace', keys: ['Ctrl', 'Shift', ']'] },
    { label: 'Previous workspace', keys: ['Ctrl', 'Shift', '['] },
  ]},
  { category: 'Panes', items: [
    { label: 'New session', keys: ['Ctrl', 'N'] },
    { label: 'Split horizontal', keys: ['Ctrl', 'D'] },
    { label: 'Split vertical', keys: ['Ctrl', 'Shift', 'D'] },
    { label: 'Close active pane', keys: ['Ctrl', 'W'] },
    { label: 'Next pane', keys: ['Ctrl', ']'] },
    { label: 'Previous pane', keys: ['Ctrl', '['] },
  ]},
  { category: 'AI Features', items: [
    { label: 'AI assistance', keys: ['Ctrl', 'K'] },
  ]},
]

function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`premium-panel p-5 ${className}`}>{children}</div>
}

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(79,140,255,0.12)] shadow-[0_16px_34px_rgba(79,140,255,0.12)]">
          <Icon size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h1>
          <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
        </div>
      </div>

      <div className="premium-chip">
        <Sparkles size={12} style={{ color: 'var(--warning)' }} />
        Executive Control
      </div>
    </div>
  )
}

function ThemeCard({ name, colors, isActive, onClick }: { name: string; colors: string[]; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative rounded-[18px] p-2.5 text-left transition-all group"
      style={{
        background: isActive ? 'linear-gradient(180deg, rgba(79,140,255,0.16), rgba(40,231,197,0.08))' : 'linear-gradient(180deg, rgba(10,17,28,0.92), rgba(8,13,22,0.96))',
        border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 12px 30px rgba(79,140,255,0.14)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = isActive ? 'var(--accent)' : 'var(--border)' }}
    >
      {isActive && (
        <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: 'var(--accent)' }}>
          <Check size={10} className="text-white" />
        </div>
      )}
      {/* Mini preview */}
      <div className="rounded-[12px] overflow-hidden mb-2.5 relative" style={{ background: 'rgba(0,0,0,0.3)', height: '64px' }}>
        {/* Traffic lights */}
        <div className="flex items-center gap-1 px-2.5 pt-2">
          {colors.map((c, i) => <div key={i} className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: c }} />)}
        </div>
        {/* Simulated code lines */}
        <div className="px-2.5 pt-2 space-y-[3px]">
          <div className="flex gap-1">
            <div className="h-[3px] rounded-full" style={{ width: '18%', background: colors[2], opacity: 0.7 }} />
            <div className="h-[3px] rounded-full" style={{ width: '30%', background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div className="flex gap-1">
            <div className="h-[3px] rounded-full" style={{ width: '10%', background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-[3px] rounded-full" style={{ width: '22%', background: colors[1], opacity: 0.6 }} />
            <div className="h-[3px] rounded-full" style={{ width: '15%', background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex gap-1">
            <div className="h-[3px] rounded-full" style={{ width: '10%', background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-[3px] rounded-full" style={{ width: '28%', background: colors[0], opacity: 0.5 }} />
          </div>
          <div className="flex gap-1">
            <div className="h-[3px] rounded-full" style={{ width: '35%', background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>
      </div>
      <div className="text-[11px] font-semibold px-0.5" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{name}</div>
    </button>
  )
}

export function SettingsPage() {
  const store = useStore()
  const { settingsTab, setSettingsTab, theme, setTheme, defaultAgent, setDefaultAgent, userProfile } = store
  const [exportMsg, setExportMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    try {
      const data = localStorage.getItem('sloerspace-dev-store')
      if (!data) { setExportMsg('No data to export'); return }
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sloerspace-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg('Data exported successfully!')
      setTimeout(() => setExportMsg(''), 3000)
    } catch { setExportMsg('Export failed') }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string
        JSON.parse(raw)
        localStorage.setItem('sloerspace-dev-store', raw)
        setImportMsg('Data imported! Reloading...')
        setTimeout(() => window.location.reload(), 1500)
      } catch { setImportMsg('Invalid backup file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    localStorage.removeItem('sloerspace-dev-store')
    setShowResetConfirm(false)
    window.location.reload()
  }

  return (
    <div className="h-full overflow-hidden px-5 py-6 lg:px-7 lg:py-7">
      <div className="grid h-full gap-5 xl:grid-cols-[290px_1fr]">
        <aside className="premium-panel-elevated min-h-0 p-4 md:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-[18px] border border-white/10 shadow-[0_16px_34px_rgba(79,140,255,0.14)]">
              <img src="/LOGO.png" alt="SloerSpace" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Executive Settings</div>
              <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace Control</div>
            </div>
          </div>

          <div className="premium-panel mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Operator</div>
                <div className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.username}</div>
              </div>
              <div className="premium-chip" style={{ color: 'var(--success)' }}>
                <ShieldCheck size={12} />
                {userProfile.plan.toUpperCase()}
              </div>
            </div>
            <div className="text-[11px] font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{userProfile.email}</div>
          </div>

          <div className="space-y-1.5">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon
              const active = settingsTab === tab.id

              return (
                <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-[20px] text-[12px] font-semibold transition-all relative"
                  style={{
                    background: active ? 'linear-gradient(135deg, rgba(79,140,255,0.16), rgba(40,231,197,0.08))' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'rgba(163,209,255,0.18)' : 'transparent'}`,
                  }}
                >
                  {active && <div className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--accent), var(--secondary))' }} />}
                  <div className="flex h-9 w-9 items-center justify-center rounded-[16px]" style={{ background: active ? 'rgba(79,140,255,0.12)' : 'rgba(9,15,24,0.72)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <Icon size={15} />
                  </div>
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="premium-panel mt-4 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
              <Command size={12} style={{ color: 'var(--accent)' }} />
              Quick key
            </div>
            <div className="premium-kbd inline-flex">Ctrl + ,</div>
          </div>
        </aside>

        <div className="premium-panel-elevated min-h-0 overflow-hidden">
          <div className="border-b border-[var(--border)] px-6 py-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="premium-chip" style={{ color: 'var(--warning)' }}>
                <Sparkles size={12} />
                Premium Console
              </div>
              <div className="premium-chip">
                <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                Live preferences
              </div>
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Settings & personalization
            </div>
            <div className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Tune the shell, agents, account settings and shortcuts from a single elevated control surface.
            </div>
          </div>

          <div className="h-[calc(100%-120px)] overflow-y-auto p-6">
        {settingsTab === 'appearance' && (
          <div className="max-w-4xl space-y-4">
            <SectionHeader icon={Palette} title="Appearance" desc="Theme and display preferences" />

            <SettingsCard>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Dark Themes</div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {DARK_THEMES.map((t) => (
                  <ThemeCard key={t.id} name={t.name} colors={t.colors} isActive={theme === t.id} onClick={() => setTheme(t.id)} />
                ))}
              </div>
            </SettingsCard>

            <SettingsCard>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Light Themes</div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {LIGHT_THEMES.map((t) => (
                  <ThemeCard key={t.id} name={t.name} colors={t.colors} isActive={theme === t.id} onClick={() => setTheme(t.id)} />
                ))}
              </div>
            </SettingsCard>

            <SettingsCard>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Theme JSON</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button className="btn-primary text-[9px] py-1.5 px-3">Open Wizard</button>
                  <button className="btn-secondary text-[9px] py-1.5 px-3">Import JSON</button>
                  <button className="btn-secondary text-[9px] py-1.5 px-3">Export Current</button>
                  <button className="btn-ghost text-[9px] py-1.5 px-3" style={{ color: 'var(--accent)' }}>Duplicate Current</button>
                </div>
              </div>
              <div className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
                Uses schema version 1 (&apos;sloerspace.theme&apos;). Import supports custom theme IDs and validates required tokens.
              </div>
              <div className="p-3 rounded-xl mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Active Theme Quality: 100/100</div>
                <div className="text-[10px]" style={{ color: 'var(--success)' }}>Meets current accessibility and layer-separation baselines.</div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--info)' }}>ℹ</span> Theme changes are applied instantly and saved automatically.
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'shortcuts' && (
          <div className="max-w-3xl">
            <SectionHeader icon={Keyboard} title="Shortcuts" desc="Keyboard bindings reference" />
            {SHORTCUTS.map((section) => (
              <SettingsCard key={section.category} className="mb-3">
                <div className="px-3 py-2 rounded-[18px] mb-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{section.category}</span>
                </div>
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-2.5 transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={i} className="premium-kbd">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </SettingsCard>
            ))}
          </div>
        )}

        {settingsTab === 'ai-agents' && (
          <div className="max-w-3xl">
            <SectionHeader icon={Bot} title="AI Agents" desc="Default coding agent for tasks" />
            <SettingsCard>
              <div className="space-y-1.5">
                {AGENTS_LIST.map((agent) => {
                  const active = defaultAgent === agent.id
                  return (
                    <button key={agent.id} onClick={() => setDefaultAgent(agent.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                      style={{
                        background: active ? 'var(--accent-subtle)' : 'transparent',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${active ? 'var(--accent)' : 'var(--text-muted)'}` }}>
                        {active && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{agent.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{agent.cmd}</span>
                    </button>
                  )
                })}
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'account' && (
          <div className="max-w-2xl">
            <SectionHeader icon={User} title="Account" desc="Manage your profile, billing, and current session." />

            <div className="space-y-4">
              {/* PROFILE */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--text-muted)' }}>Profile</div>
              <SettingsCard>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '2px solid var(--accent)' }}>
                    {userProfile.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.username}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(46,213,115,0.15)', color: 'var(--success)' }}>● Active</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <Mail size={10} /> {userProfile.email}
                    </div>
                  </div>
                </div>
                <button className="btn-secondary text-[10px] flex items-center gap-1.5 mb-4">
                  <ExternalLink size={10} /> Edit Profile
                </button>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Email</div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{userProfile.email}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Account ID</div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{userProfile.accountId.slice(0, 8)}...{userProfile.accountId.slice(-4)}</div>
                  </div>
                </div>
              </SettingsCard>

              {/* BILLING */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mt-6 mb-2" style={{ color: 'var(--text-muted)' }}>Billing</div>
              <SettingsCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: userProfile.plan === 'pro' ? 'var(--accent-subtle)' : 'var(--surface-3)', border: `1px solid ${userProfile.plan === 'pro' ? 'rgba(79,140,255,0.2)' : 'var(--border)'}` }}>
                      <Bot size={16} style={{ color: userProfile.plan === 'pro' ? 'var(--accent)' : 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: userProfile.plan === 'pro' ? 'rgba(46,213,115,0.15)' : 'var(--surface-3)', color: userProfile.plan === 'pro' ? 'var(--success)' : 'var(--text-muted)' }}>
                          {userProfile.plan === 'pro' ? 'Active' : 'Current'}
                        </span>
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {userProfile.plan === 'pro' ? 'Full access to all SloerSpace features' : 'Limited access — upgrade for full features'}
                      </div>
                    </div>
                  </div>
                  <button className="btn-primary text-[10px] flex items-center gap-1">
                    <ExternalLink size={10} /> {userProfile.plan === 'pro' ? 'Manage Plan' : 'Upgrade'}
                  </button>
                </div>

                <div className="space-y-1">
                  <button className="w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-[var(--surface-2)]" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                      <div className="text-left">
                        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>View Plans</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Compare plans and pricing</div>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-[var(--surface-2)]" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <Key size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="text-left">
                        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Payment Methods</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Update cards and billing details</div>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={12} /> Payments are handled securely through Stripe and open in your browser.
                </div>
              </SettingsCard>

              {/* SESSION */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mt-6 mb-2" style={{ color: 'var(--text-muted)' }}>Session</div>
              <SettingsCard>
                <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                    <Command size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Current Device</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>This Session</span>
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SloerSpace Desktop · {store.sessionDevice || 'Windows'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <LogOut size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign Out</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>End your session on this device</div>
                    </div>
                  </div>
                  <button onClick={() => { store.logout(); store.setView('login') }} className="btn-ghost text-[10px] flex items-center gap-1">
                    <LogOut size={10} /> Sign Out
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={12} /> Your session is encrypted. Sign out when using shared devices.
                </div>
              </SettingsCard>

              {/* DEBUG */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mt-6 mb-2" style={{ color: 'var(--text-muted)' }}>Debug</div>
              <SettingsCard>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Download size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Updates</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Current version: 0.1.0</div>
                    </div>
                  </div>
                  <button className="btn-secondary text-[10px] flex items-center gap-1"><Download size={10} /> Check for Updates</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Log file</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>For debugging auth and API issues.</div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 p-2.5 rounded-lg font-mono text-[9px] flex items-center justify-between" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <span>C:\Users\...\AppData\Local\sloerspace\logs\sloerspace-tauri.log</span>
                  <button className="btn-ghost text-[8px] px-2 py-1">Show in Explorer</button>
                </div>
              </SettingsCard>
            </div>
          </div>
        )}

        {settingsTab === 'api-keys' && (
          <div className="max-w-2xl">
            <SectionHeader icon={Key} title="API Keys" desc="Create and manage API keys for MCP and programmatic SloerSpace access." />
            {userProfile.plan === 'free' ? (
              <SettingsCard className="flex flex-col items-center p-10 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(79,140,255,0.15)' }}>
                  <Key size={24} style={{ color: 'var(--accent)' }} />
                </div>
                <h2 className="text-[15px] font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Pro Plan Required</h2>
                <p className="text-[11px] text-center max-w-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                  API keys are available on the Pro plan. Upgrade to create keys for MCP and programmatic SloerSpace access.
                </p>
                <button className="btn-primary flex items-center gap-2 text-[11px]">
                  <Sparkles size={12} /> Upgrade to Pro
                </button>
              </SettingsCard>
            ) : (
              <div className="space-y-4">
                <SettingsCard>
                  <div className="flex items-center justify-between mb-4">
                    <div className="label">Your API Keys</div>
                    <button className="btn-primary flex items-center gap-2 text-[10px]"><Key size={11} /> Generate New Key</button>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <Key size={18} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-2" />
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No API keys created yet. Generate one to get started.</div>
                  </div>
                </SettingsCard>
                <SettingsCard>
                  <div className="label">Usage</div>
                  <div className="text-[10px] leading-6" style={{ color: 'var(--text-muted)' }}>
                    API keys provide programmatic access to SloerSpace MCP endpoints. Keep your keys secure and never share them publicly.
                  </div>
                </SettingsCard>
              </div>
            )}
          </div>
        )}

        {(settingsTab as string) === 'data' && (
          <div className="max-w-2xl">
            <SectionHeader icon={Database} title="Data Management" desc="Export, import, and reset your data" />

            <div className="space-y-4">
              <SettingsCard>
                <div className="label">Export Data</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Download all your workspaces, tasks, agents, prompts and settings as a JSON backup file.
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={handleExport} className="btn-primary flex items-center gap-2 text-[11px]">
                    <Download size={12} /> Export Backup
                  </button>
                  {exportMsg && <span className="text-[11px] font-semibold" style={{ color: 'var(--success)' }}>{exportMsg}</span>}
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="label">Import Data</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Restore from a previously exported JSON backup file. This will replace all current data.
                </p>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                <div className="flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2 text-[11px]">
                    <Upload size={12} /> Import Backup
                  </button>
                  {importMsg && <span className="text-[11px] font-semibold" style={{ color: importMsg.includes('Reloading') ? 'var(--success)' : 'var(--error)' }}>{importMsg}</span>}
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="label" style={{ color: 'var(--error)' }}>Danger Zone</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Reset all data to factory defaults. This removes all workspaces, tasks, agents, prompts, and settings.
                </p>
                <button onClick={() => setShowResetConfirm(true)} className="text-[11px] font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2" style={{ background: 'rgba(255,71,87,0.12)', color: 'var(--error)', border: '1px solid rgba(255,71,87,0.2)' }}>
                  <Trash2 size={12} /> Reset All Data
                </button>
              </SettingsCard>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowResetConfirm(false)}>
            <div className="premium-panel-elevated w-[400px] max-w-[calc(100vw-32px)] p-6 animate-scale-in text-center" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,71,87,0.14)' }}>
                <AlertTriangle size={24} style={{ color: 'var(--error)' }} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Reset All Data?</h2>
              <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>This will permanently delete all your workspaces, tasks, agents, prompts, and settings. This cannot be undone.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="btn-ghost text-[11px]">Cancel</button>
                <button onClick={handleReset} className="text-[11px] font-semibold px-4 py-2 rounded-xl transition-all" style={{ background: 'var(--error)', color: '#fff' }}>Reset Everything</button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}
