'use client'

import Image from 'next/image'
import { useStore, ViewId } from '@/store/useStore'
import { ArrowRight, ArrowUpRight, Bot, FileText, FolderOpen, Kanban, Layers3, Shield, Terminal, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const PRIMARY_ACTIONS = [
  {
    id: 'workspace-wizard' as const,
    icon: Terminal,
    label: 'Open a workspace',
    desc: 'Start a terminal workspace for real execution, split panes, and command-driven flow.',
    shortcut: 'Ctrl+T',
    tone: 'rgba(79,140,255,0.16)',
  },
  {
    id: 'swarm-launch' as const,
    icon: Zap,
    label: 'Launch a swarm',
    desc: 'Coordinate multiple agents around one objective when the task needs parallel lanes.',
    shortcut: 'Ctrl+S',
    tone: 'rgba(255,191,98,0.14)',
  },
]

const SURFACE_LINKS = [
  {
    view: 'kanban' as const,
    icon: Kanban,
    label: 'Kanban',
    desc: 'Track delivery, status, and priorities.',
  },
  {
    view: 'agents' as const,
    icon: Bot,
    label: 'Agents',
    desc: 'Manage roles, defaults, and reusable agent profiles.',
  },
  {
    view: 'prompts' as const,
    icon: FileText,
    label: 'Prompts',
    desc: 'Store repeatable instructions and templates.',
  },
  {
    view: 'settings' as const,
    icon: Shield,
    label: 'Settings',
    desc: 'Appearance, account, updates, and runtime preferences.',
  },
]

type HomeActionId = (typeof PRIMARY_ACTIONS)[number]['id']
type HomeSurfaceTarget = ViewId | HomeActionId

function summarizePath(path: string) {
  const trimmed = path.trim()
  if (!trimmed) {
    return ''
  }

  const segments = trimmed.split(/[\\/]/).filter(Boolean)
  if (segments.length <= 3) {
    return trimmed
  }

  return `${segments[0]}\\…\\${segments.slice(-2).join('\\')}`
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'var(--accent)',
}: {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  accent?: string
}) {
  return (
    <div className="rounded-[24px] border p-5 premium-panel premium-card-shell" style={{ borderColor: 'var(--border)', background: 'rgba(7,12,20,0.54)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{label}</div>
          <div className="mt-2 text-[26px] font-semibold tracking-[-0.05em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
      </div>
      <div className="mt-3 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>{hint}</div>
    </div>
  )
}

export function HomeScreen() {
  const {
    setView,
    setWizardStep,
    hasCompletedOnboarding,
    setOnboardingCompleted,
    workspaceTabs,
    swarmSessions,
    prompts,
    customAgents,
    recentProjects,
  } = useStore()

  const workspaceCount = workspaceTabs.length
  const swarmCount = Object.keys(swarmSessions).length
  const recentProjectList = recentProjects.slice(0, 4)
  const primaryCtaLabel = workspaceCount > 0 ? 'Resume workspaces' : 'Create first workspace'

  const finishOnboarding = () => {
    if (!hasCompletedOnboarding) {
      setOnboardingCompleted(true)
    }
  }

  const openWorkspace = () => {
    finishOnboarding()
    setWizardStep(1)
    setView('workspace-wizard')
  }

  const openSwarm = () => {
    finishOnboarding()
    setView('swarm-launch')
  }

  const handlePrimaryAction = (id: HomeActionId) => {
    if (id === 'workspace-wizard') {
      openWorkspace()
      return
    }
    openSwarm()
  }

  const openSurface = (target: HomeSurfaceTarget) => {
    if (target === 'workspace-wizard') {
      openWorkspace()
      return
    }
    if (target === 'swarm-launch') {
      openSwarm()
      return
    }
    finishOnboarding()
    setView(target)
  }

  return (
    <div className="relative flex h-full flex-col overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="home-orb-scene">
          <div className="home-orb home-orb-primary" />
          <div className="home-orb home-orb-secondary" />
          <div className="home-orb-ring" />
          <div className="home-orb-grid" />
        </div>
      </div>

      <div className="relative z-10 flex-1 px-5 py-5 sm:px-7 sm:py-7 xl:px-10 xl:py-8">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5">
          <section className="premium-panel-elevated premium-card-shell relative overflow-hidden px-6 py-7 md:px-8 md:py-8 xl:px-10 xl:py-9">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 16% 18%, rgba(79,140,255,0.16), transparent 28%), radial-gradient(circle at 84% 16%, rgba(40,231,197,0.10), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 46%)' }} />
            <div className="pointer-events-none absolute -right-10 top-[-10px] hidden opacity-[0.10] lg:block">
              <Image src="/LOGO.png" alt="" width={220} height={220} className="h-[220px] w-[220px] object-contain" />
            </div>

            <div className="relative z-10 max-w-[780px]">
              <div className="mt-1 flex items-center gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] ring-1 ring-white/10 shadow-[0_0_40px_rgba(79,140,255,0.18)]">
                  <Image src="/LOGO.png" alt="SloerSpace logo" width={56} height={56} className="h-full w-full object-contain" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>SloerSpace Dev</div>
                  <div className="mt-1 text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Resume execution, context, and navigation without the onboarding layer.
                  </div>
                </div>
              </div>

              <h1 className="mt-7 max-w-[820px] text-[34px] font-semibold tracking-[-0.06em] md:text-[54px]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 0.96 }}>
                Your operational home is ready
                <br />
                to route you back into work.
              </h1>

              <p className="mt-5 max-w-[760px] text-[14px] leading-8" style={{ color: 'var(--text-secondary)' }}>
                Use this surface to resume execution, open a fresh workspace, launch a swarm, and inspect your saved project context without re-entering the guided setup experience.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={openWorkspace} className="btn-primary flex items-center gap-2">
                  {primaryCtaLabel}
                  <ArrowRight size={15} />
                </button>
                <button onClick={openSwarm} className="btn-secondary flex items-center gap-2">
                  Launch Swarm
                  <Zap size={14} />
                </button>
              </div>
            </div>

            <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  label: 'Workspaces',
                  value: String(workspaceCount),
                  detail: workspaceCount > 0 ? 'Execution surfaces ready to resume.' : 'Create a workspace to start shipping.',
                  icon: Terminal,
                },
                {
                  label: 'Swarms',
                  value: String(swarmCount),
                  detail: swarmCount > 0 ? 'Parallel agent sessions available now.' : 'Launch a swarm when the mission needs lanes.',
                  icon: Zap,
                },
                {
                  label: 'Recent paths',
                  value: String(recentProjectList.length),
                  detail: recentProjectList.length > 0 ? 'Project roots are saved for faster re-entry.' : 'Recent repositories will appear here.',
                  icon: FolderOpen,
                },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.label} className="rounded-[22px] border p-5 premium-card-shell" style={{ borderColor: 'var(--border)', background: 'rgba(7,12,20,0.50)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
                        <Icon size={16} />
                      </div>
                      <div className="text-[24px] font-semibold tracking-[-0.05em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {item.value}
                      </div>
                    </div>
                    <div className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                    <div className="mt-2 text-[12px] leading-7" style={{ color: 'var(--text-secondary)' }}>{item.detail}</div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {PRIMARY_ACTIONS.map((action) => {
              const Icon = action.icon

              return (
                <button
                  key={action.id}
                  onClick={() => handlePrimaryAction(action.id)}
                  className="rounded-[28px] border p-7 text-left transition-all premium-panel premium-card-shell premium-interactive"
                  style={{ borderColor: 'var(--border)', background: 'rgba(7,12,20,0.52)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px]" style={{ background: action.tone, border: '1px solid var(--border)' }}>
                      <Icon size={20} style={{ color: action.id === 'swarm-launch' ? 'var(--warning)' : 'var(--accent)' }} />
                    </div>
                    <div className="premium-kbd">{action.shortcut}</div>
                  </div>
                  <div className="mt-6 text-[20px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{action.label}</div>
                  <div className="mt-4 max-w-[460px] text-[13px] leading-8" style={{ color: 'var(--text-secondary)' }}>{action.desc}</div>
                  <div className="mt-7 flex items-center gap-2 text-[12px] font-semibold" style={{ color: action.id === 'swarm-launch' ? 'var(--warning)' : 'var(--accent)' }}>
                    Open
                    <ArrowRight size={14} />
                  </div>
                </button>
              )
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Workspaces"
                value={String(workspaceCount)}
                hint={workspaceCount > 0 ? 'You already have execution surfaces ready to resume.' : 'No workspaces yet. Start with a shell workspace.'}
                icon={Terminal}
              />
              <MetricCard
                label="Swarm sessions"
                value={String(swarmCount)}
                hint={swarmCount > 0 ? 'Swarm dashboards are available in your current state.' : 'No active swarm sessions yet.'}
                icon={Zap}
                accent="var(--warning)"
              />
              <MetricCard
                label="Custom agents"
                value={String(customAgents.length)}
                hint={customAgents.length > 0 ? 'Your agent roster already has reusable profiles.' : 'Define reusable agents when you want repeatable operating roles.'}
                icon={Bot}
              />
              <MetricCard
                label="Prompt library"
                value={String(prompts.length)}
                hint={prompts.length > 0 ? 'Reusable prompts are available for faster mission setup.' : 'Start saving prompts to reduce setup friction.'}
                icon={FileText}
              />
            </div>

            <div className="premium-panel premium-card-shell p-6 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Other surfaces</div>
                  <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.05em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Jump where you need to go</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px]" style={{ background: 'rgba(79,140,255,0.08)', border: '1px solid var(--border)' }}>
                  <Layers3 size={17} style={{ color: 'var(--accent)' }} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {SURFACE_LINKS.map((item) => {
                  const Icon = item.icon

                  return (
                    <button
                      key={item.view}
                      onClick={() => openSurface(item.view)}
                      className="rounded-[22px] border p-4 text-left transition-all premium-card-shell premium-interactive"
                      style={{ borderColor: 'var(--border)', background: 'rgba(7,12,20,0.48)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'rgba(79,140,255,0.10)', border: '1px solid var(--border)' }}>
                          <Icon size={16} style={{ color: 'var(--accent)' }} />
                        </div>
                        <ArrowUpRight size={15} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div className="mt-4 text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                      <div className="mt-2 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>{item.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="premium-panel premium-card-shell p-6 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Recent project paths</div>
                <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.05em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Resume familiar contexts</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px]" style={{ background: 'rgba(79,140,255,0.08)', border: '1px solid var(--border)' }}>
                <FolderOpen size={17} style={{ color: 'var(--accent)' }} />
              </div>
            </div>

            {recentProjectList.length > 0 ? (
              <div className="mt-5 space-y-3">
                {recentProjectList.map((projectPath) => (
                  <div key={projectPath} className="rounded-[20px] border px-4 py-4" style={{ borderColor: 'var(--border)', background: 'rgba(7,12,20,0.48)' }}>
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Project</div>
                    <div className="mt-2 text-[13px] font-semibold break-all" style={{ color: 'var(--text-primary)' }}>{summarizePath(projectPath)}</div>
                    <div className="mt-1 text-[11px] break-all" style={{ color: 'var(--text-secondary)' }}>{projectPath}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[20px] border px-5 py-6" style={{ borderColor: 'var(--border)', background: 'rgba(7,12,20,0.48)' }}>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>No recent paths yet</div>
                <div className="mt-3 max-w-[720px] text-[12px] leading-8" style={{ color: 'var(--text-secondary)' }}>
                  Once you start opening workspaces and projects, recent locations will show up here for faster re-entry.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
