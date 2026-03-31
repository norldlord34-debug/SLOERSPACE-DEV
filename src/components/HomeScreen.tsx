'use client'

import Image from 'next/image'
import { useStore } from '@/store/useStore'
import { Layers3, Terminal, Zap, Globe, BookOpen, Server, ArrowUpRight, Sparkles, Command, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'

const ACTIONS: Array<{
  id: 'workspace-wizard' | 'swarm-launch' | 'canvas-wizard' | 'browser' | 'notebook' | 'ssh'
  icon: LucideIcon
  label: string
  sub: string
  desc: string
  shortcut: string
  color: string
  rgb: string
  badge?: string
}> = [
  { id: 'workspace-wizard', icon: Terminal, label: 'SloerSpace', sub: 'Terminal Grid', desc: 'Split terminal grids with AI agents running in parallel. Your full dev stack in one pane.', shortcut: 'Ctrl+T', color: '#4f8cff', rgb: '79,140,255' },
  { id: 'swarm-launch', icon: Zap, label: 'SloerSwarm', sub: 'Agent Fleet', desc: 'Launch a coordinated team of AI agents. Give the goal — they plan, build, and ship the code.', shortcut: 'Ctrl+S', color: '#ffbf62', rgb: '255,191,98' },
  { id: 'canvas-wizard', icon: Layers3, label: 'SloerCanvas', sub: 'Free Canvas', desc: 'Draggable, resizable terminals on an infinite canvas. Organize your sessions spatially.', shortcut: 'Ctrl+K', color: '#28e7c5', rgb: '40,231,197', badge: 'ALPHA' },
  { id: 'browser', icon: Globe, label: 'SloerBrowser', sub: 'Web Engine', desc: 'Native WebView2 browser inside your workspace. Tabs, bookmarks, zero restrictions.', shortcut: 'Ctrl+B', color: '#c084fc', rgb: '192,132,252', badge: 'NEW' },
  { id: 'notebook', icon: BookOpen, label: 'Notebook', sub: 'Runbooks', desc: 'Markdown + executable command cells. Onboarding docs, release scripts, live playbooks.', shortcut: 'Ctrl+⇧+N', color: '#8fc2ff', rgb: '143,194,255', badge: 'NEW' },
  { id: 'ssh', icon: Server, label: 'SSH Remote', sub: 'Secure Shell', desc: 'Save SSH targets, test connectivity, open remote shells in one click.', shortcut: 'Ctrl+⇧+S', color: '#38dd92', rgb: '56,221,146', badge: 'NEW' },
]

type HomeActionId = (typeof ACTIONS)[number]['id']

/* ─── Physics Particle Field ─────────────────────────────────────── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    let W = 0
    let H = 0

    const resize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(W * dpr))
      canvas.height = Math.max(1, Math.floor(H * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    interface TrailPoint { x: number; y: number }
    interface P { x: number; y: number; vx: number; vy: number; r: number; t: number; seed: number; trail: TrailPoint[] }

    const COUNT = 88
    const LINK = 160
    const TRAIL_LEN = 8
    const pts: P[] = Array.from({ length: COUNT }, () => {
      const x = Math.random() * (W || 1200)
      const y = Math.random() * (H || 800)

      return {
        x,
        y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 0.7 + Math.random() * 1.6,
        t: Math.random(),
        seed: Math.random(),
        trail: Array.from({ length: TRAIL_LEN }, () => ({ x, y })),
      }
    })

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

    const draw = (time: number) => {
      const seconds = time * 0.001
      ctx.clearRect(0, 0, W, H)
      const cx = W * 0.5
      const cy = H * 0.42

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 260)
      core.addColorStop(0, 'rgba(79,140,255,0.08)')
      core.addColorStop(0.45, 'rgba(40,231,197,0.03)')
      core.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, 260, 0, Math.PI * 2)
      ctx.fillStyle = core
      ctx.fill()

      for (const p of pts) {
        const dx = cx - p.x
        const dy = cy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001

        p.vx += dx * 0.00005
        p.vy += dy * 0.00005
        p.vx += (-dy / dist) * 0.018
        p.vy += (dx / dist) * 0.018

        const vortexX = cx + Math.cos(seconds * 0.75 + p.seed * Math.PI * 2) * W * 0.16
        const vortexY = cy + Math.sin(seconds * 0.95 + p.seed * Math.PI * 2) * H * 0.14
        p.vx += (vortexX - p.x) * 0.000012
        p.vy += (vortexY - p.y) * 0.000012

        p.vx += Math.cos(seconds * 0.8 + p.seed * 9) * 0.0025
        p.vy += Math.sin(seconds * 0.65 + p.seed * 11) * 0.0025

        if (mouse.current.active) {
          const mdx = p.x - mouse.current.x
          const mdy = p.y - mouse.current.y
          const md2 = mdx * mdx + mdy * mdy + 1
          if (md2 < 150000) {
            const inv = 1 / Math.sqrt(md2)
            const radial = 220 / md2
            const tangential = 110 / md2
            p.vx += mdx * radial + (-mdy * inv) * tangential
            p.vy += mdy * radial + (mdx * inv) * tangential
          }
        }

        p.vx *= 0.984
        p.vy *= 0.984
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (spd > 1.35) {
          p.vx = p.vx / spd * 1.35
          p.vy = p.vy / spd * 1.35
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < 12) p.vx += 0.08
        if (p.x > W - 12) p.vx -= 0.08
        if (p.y < 12) p.vy += 0.08
        if (p.y > H - 12) p.vy -= 0.08

        p.x = clamp(p.x, 0, W)
        p.y = clamp(p.y, 0, H)
        p.trail.unshift({ x: p.x, y: p.y })
        if (p.trail.length > TRAIL_LEN) p.trail.pop()
      }

      for (const p of pts) {
        const r = Math.round(lerp(79, 40, p.t))
        const g = Math.round(lerp(140, 231, p.t))
        const b = Math.round(lerp(255, 197, p.t))

        ctx.beginPath()
        p.trail.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < LINK) {
            const a = (1 - d / LINK) * 0.24
            const ri = Math.round(lerp(79, 40, pts[i].t)), gi = Math.round(lerp(140, 231, pts[i].t)), bi = Math.round(lerp(255, 197, pts[i].t))
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(${ri},${gi},${bi},${a})`; ctx.lineWidth = 0.6; ctx.stroke()
          }
        }
      }

      for (const p of pts) {
        const r = Math.round(lerp(79, 40, p.t)), g = Math.round(lerp(140, 231, p.t)), b = Math.round(lerp(255, 197, p.t))
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        grd.addColorStop(0, `rgba(${r},${g},${b},1)`); grd.addColorStop(0.4, `rgba(${r},${g},${b},0.4)`); grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }
    animId = requestAnimationFrame(draw)

    const parent = canvas.parentElement
    const onMove = (e: MouseEvent) => {
      const rc = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rc.left, y: e.clientY - rc.top, active: true }
    }
    const onLeave = () => { mouse.current = { x: -9999, y: -9999, active: false } }
    parent?.addEventListener('mousemove', onMove)
    parent?.addEventListener('mouseleave', onLeave)

    return () => { cancelAnimationFrame(animId); ro.disconnect(); parent?.removeEventListener('mousemove', onMove); parent?.removeEventListener('mouseleave', onLeave) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.78 }} />
}

function MissionControlPreview({ onOpen }: { onOpen: (id: HomeActionId) => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-[30px] border p-5 backdrop-blur-xl md:p-6"
      style={{
        background: 'linear-gradient(180deg, rgba(6,10,16,0.92), rgba(5,8,14,0.84))',
        borderColor: 'rgba(79,140,255,0.14)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.32)',
      }}
    >
      <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle at 18% 18%, rgba(79,140,255,0.12), transparent 30%), radial-gradient(circle at 82% 22%, rgba(40,231,197,0.08), transparent 28%), linear-gradient(180deg, rgba(6,10,16,0.92), rgba(4,7,12,0.86))' }} />
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(79,140,255,0.55), rgba(40,231,197,0.55), transparent)' }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ background: 'rgba(40,231,197,0.08)', borderColor: 'rgba(40,231,197,0.18)', color: 'var(--secondary)' }}
            >
              <Sparkles size={12} />
              Live orchestration
            </div>
            <div className="mt-4 text-[28px] font-black tracking-[-0.04em] md:text-[30px]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Mission control
            </div>
            <p className="mt-2 max-w-[420px] text-[12.5px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.42)' }}>
              Launch workspaces, canvases, browsers and remote shells from one intelligent surface.
            </p>
          </div>
          <kbd
            className="shrink-0 rounded-full border px-3 py-1 text-[10px] font-mono"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            Ctrl + K
          </kbd>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[24px] border p-4" style={{ background: 'rgba(7,12,20,0.74)', borderColor: 'rgba(79,140,255,0.14)' }}>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              <Command size={12} style={{ color: 'var(--accent)' }} />
              Command mesh
            </div>
            <div className="mt-4 space-y-2">
              {ACTIONS.slice(0, 4).map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => onOpen(action.id)}
                  className="flex w-full items-center gap-3 rounded-[16px] border px-3 py-2 text-left transition-all hover:translate-x-0.5"
                  style={{
                    background: index === 0 ? `rgba(${action.rgb},0.12)` : 'rgba(9,15,24,0.82)',
                    borderColor: index === 0 ? `rgba(${action.rgb},0.28)` : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="h-2 w-2 rounded-full" style={{ background: action.color, boxShadow: `0 0 12px ${action.color}` }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{action.label}</span>
                  <span className="ml-auto text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{action.shortcut}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border p-4" style={{ background: 'rgba(7,12,20,0.8)', borderColor: 'rgba(40,231,197,0.14)' }}>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                <Activity size={12} style={{ color: 'var(--secondary)' }} />
                Signal flow
              </div>
              <div className="mt-4 space-y-2">
                {[42, 76, 58, 88].map((width, index) => (
                  <div key={`${width}-${index}`} className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full animate-pulse"
                      style={{
                        width: `${width}%`,
                        background: index % 2 === 0
                          ? 'linear-gradient(90deg, rgba(79,140,255,0.9), rgba(79,140,255,0.25))'
                          : 'linear-gradient(90deg, rgba(40,231,197,0.9), rgba(40,231,197,0.25))',
                        animationDuration: `${2.4 + index * 0.4}s`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border p-4" style={{ background: 'rgba(7,12,20,0.8)', borderColor: 'rgba(79,140,255,0.12)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Velocity</div>
                  <div className="mt-2 text-[22px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>88</div>
                  <div className="text-[10px]" style={{ color: 'var(--secondary)' }}>active nodes</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Surface</div>
                  <div className="mt-2 text-[22px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>6</div>
                  <div className="text-[10px]" style={{ color: 'var(--accent)' }}>launch vectors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Home Screen ────────────────────────────────────────────────── */
export function HomeScreen() {
  const { setView, setWizardStep, hasCompletedOnboarding, setOnboardingCompleted } = useStore()
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => { setMounted(true) }, [])

  const onCardMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 14, y: ((e.clientY - r.top) / r.height - 0.5) * -14 })
  }, [])

  const go = (id: HomeActionId) => {
    if (!hasCompletedOnboarding) setOnboardingCompleted(true)
    if (id === 'workspace-wizard') { setWizardStep(1); setView('workspace-wizard'); return }
    if (id === 'canvas-wizard') { setWizardStep(1); setView('canvas-wizard'); return }
    if (id === 'browser') { setView('browser'); return }
    if (id === 'notebook') { setView('notebook'); return }
    if (id === 'ssh') { setView('ssh'); return }
    setView('swarm-launch')
  }

  return (
    <div className="relative h-full flex flex-col overflow-y-auto" style={{ background: 'radial-gradient(ellipse 120% 80% at 50% -5%, #060d1a 0%, #020508 55%, #010306 100%)' }}>

      {/* ─ Physics canvas background ─ */}
      <div className="absolute inset-0 overflow-hidden">
        <ParticleField />
        {/* Static gradient overlays layered on top of particles */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 82% 54% at 50% 0%, rgba(79,140,255,0.1) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 48% at 90% 88%, rgba(40,231,197,0.08) 0%, transparent 58%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 46% 38% at 10% 85%, rgba(192,132,252,0.05) 0%, transparent 52%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(163,209,255,0.18) 1px, transparent 1px)', backgroundSize: '44px 44px', opacity: 0.12 }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 52%, rgba(1,3,6,0.76) 100%)' }} />
        {/* Horizon glow */}
        <div className="absolute inset-x-0 h-px" style={{ top: '32%', background: 'linear-gradient(90deg, transparent 5%, rgba(79,140,255,0.2) 30%, rgba(40,231,197,0.28) 50%, rgba(79,140,255,0.2) 70%, transparent 95%)' }} />
      </div>

      {/* ─ Content ─ */}
      <div className="relative z-10 flex min-h-full w-full justify-center px-4 py-6 md:px-6 md:py-8">
        <div className="flex w-full max-w-[1280px] flex-col gap-6">

          {/* Hero */}
          <div className={`grid gap-6 xl:grid-cols-[1.08fr_0.92fr] transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div
              className="relative overflow-hidden rounded-[32px] border p-6 backdrop-blur-xl md:p-8"
              style={{
                background: 'linear-gradient(180deg, rgba(6,10,16,0.88), rgba(5,8,14,0.72))',
                borderColor: 'rgba(255,255,255,0.07)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.34)',
              }}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 18% 18%, rgba(79,140,255,0.14), transparent 28%), radial-gradient(circle at 76% 20%, rgba(40,231,197,0.08), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 35%)' }} />
              <div className="relative">
                {/* Logo */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative inline-flex items-center justify-center">
                      {/* Orbital ring */}
                      <div className="absolute rounded-full border border-[rgba(79,140,255,0.12)] animate-spin"
                        style={{ inset: -18, animationDuration: '18s', background: 'transparent' }} />
                      <div className="absolute rounded-full border border-[rgba(40,231,197,0.08)] animate-spin"
                        style={{ inset: -28, animationDuration: '26s', animationDirection: 'reverse' }} />
                      {/* Glow */}
                      <div className="absolute rounded-full animate-pulse"
                        style={{ inset: -8, background: 'radial-gradient(circle, rgba(79,140,255,0.2) 0%, rgba(40,231,197,0.1) 50%, transparent 70%)', animationDuration: '4s' }} />
                      {/* Logo container */}
                      <div className="relative h-[78px] w-[78px] rounded-[22px] overflow-hidden"
                        style={{
                          background: '#04080f',
                          boxShadow: '0 0 0 1px rgba(79,140,255,0.25), 0 0 0 4px rgba(79,140,255,0.06), 0 20px 60px rgba(0,0,0,0.6), 0 0 50px rgba(79,140,255,0.15)',
                        }}>
                        <Image src="/LOGO.png" alt="SloerSpace" width={78} height={78} className="h-full w-full object-cover" />
                      </div>
                    </div>

                    <div>
                      <div
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                        style={{ background: 'rgba(79,140,255,0.08)', borderColor: 'rgba(79,140,255,0.16)', color: 'var(--accent)' }}
                      >
                        <Sparkles size={12} />
                        AI-native dev operating system
                      </div>
                      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.34)' }}>
                        Parallel terminals • canvases • browser • swarm
                      </div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.52)' }}>
                    Home / Mission Surface
                  </div>
                </div>

                {/* Title */}
                <h1 className="max-w-[780px] text-[42px] font-black tracking-[-0.05em] leading-[0.94] sm:text-[56px] xl:text-[74px]"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    background: 'linear-gradient(160deg, #ffffff 0%, #d4e8ff 30%, #7eb8ff 60%, #28e7c5 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                  Build, browse and orchestrate from one premium command surface.
                </h1>

                {/* Subtitle row */}
                <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-[640px]">
                    <p className="text-[14px] leading-[1.8] md:text-[15px]" style={{ color: 'rgba(255,255,255,0.48)' }}>
                      SloerSpace merges terminal grids, spatial canvases, web workflows, notebooks and remote access into a single fast surface designed for flow.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {['Zero context switching', 'Physics-driven motion', 'Keyboard-first launch'].map((item) => (
                        <span key={item} className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => go('workspace-wizard')}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] transition-transform hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg, rgba(79,140,255,0.95), rgba(40,231,197,0.78))', color: '#06101c', boxShadow: '0 16px 40px rgba(79,140,255,0.28)' }}
                    >
                      Open workspace
                      <ArrowUpRight size={14} />
                    </button>
                    <button
                      onClick={() => go('swarm-launch')}
                      className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[12px] font-black uppercase tracking-[0.16em] transition-transform hover:-translate-y-0.5"
                      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                    >
                      Launch swarm
                      <Zap size={14} style={{ color: 'var(--warning)' }} />
                    </button>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { value: '06', label: 'launch vectors', tone: 'rgba(79,140,255,0.18)', color: 'var(--accent)' },
                    { value: '88', label: 'active particles', tone: 'rgba(40,231,197,0.16)', color: 'var(--secondary)' },
                    { value: '01', label: 'unified surface', tone: 'rgba(255,191,98,0.16)', color: 'var(--warning)' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-[22px] border p-4" style={{ background: 'rgba(7,12,20,0.74)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.34)' }}>{stat.label}</div>
                      <div className="mt-3 inline-flex rounded-full px-3 py-1 text-[28px] font-black tracking-[-0.04em]" style={{ background: stat.tone, color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <MissionControlPreview onOpen={go} />
          </div>

          {/* Cards grid */}
          <div className="w-full">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              {ACTIONS.map((a, i) => {
                const isH = hovered === a.id
                const Icon = a.icon
                const spanClass = i < 2
                  ? 'xl:col-span-6'
                  : i === 2
                    ? 'xl:col-span-5'
                    : i === 3
                      ? 'xl:col-span-4'
                      : i === 4
                        ? 'xl:col-span-3'
                        : 'md:col-span-2 xl:col-span-12'
                const isLarge = i < 2
                const highlights = i === 0
                  ? ['Parallel panes', 'Agent-ready boot']
                  : i === 1
                    ? ['Delegated execution', 'Goal-driven launch']
                    : i === 2
                      ? ['Spatial sessions', 'Drag and scale']
                      : i === 3
                        ? ['Tabs and bookmarks', 'Native browsing']
                        : i === 4
                          ? ['Executable docs', 'Command cells']
                          : ['Saved targets', 'Secure shell access', 'Connectivity test', 'One-click remote']

                return (
                  <button key={a.id} onClick={() => go(a.id)}
                    onMouseEnter={() => setHovered(a.id)}
                    onMouseLeave={() => { setHovered(null); setTilt({ x: 0, y: 0 }) }}
                    onMouseMove={onCardMove}
                    className={`group relative ${spanClass} text-left transition-all duration-500 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                    style={{
                      transitionDelay: `${120 + i * 60}ms`,
                      transform: isH ? `perspective(1000px) rotateY(${tilt.x * 0.65}deg) rotateX(${tilt.y * 0.65}deg) scale(1.02) translateY(-4px)` : 'perspective(1000px) rotateY(0) rotateX(0) scale(1) translateY(0)',
                      transformStyle: 'preserve-3d',
                    }}>
                    {/* Outer glow halo */}
                    <div className="absolute -inset-px rounded-[26px] opacity-0 group-hover:opacity-100 transition-opacity duration-400 blur-md"
                      style={{ background: `rgba(${a.rgb},0.24)` }} />
                    {/* Card surface */}
                    <div className="relative h-full rounded-[24px] overflow-hidden border"
                      style={{
                        background: isH
                          ? `linear-gradient(135deg, rgba(${a.rgb},0.13) 0%, rgba(${a.rgb},0.05) 52%, rgba(4,8,16,0.92) 100%)`
                          : `linear-gradient(135deg, rgba(${a.rgb},0.08) 0%, rgba(${a.rgb},0.03) 52%, rgba(4,8,16,0.86) 100%)`,
                        borderColor: isH ? `rgba(${a.rgb},0.34)` : 'rgba(255,255,255,0.06)',
                        boxShadow: isH ? `0 24px 56px rgba(0,0,0,0.5), 0 0 30px rgba(${a.rgb},0.12)` : '0 4px 24px rgba(0,0,0,0.3)',
                        minHeight: isLarge ? 260 : i === 5 ? 188 : 214,
                      }}>
                      {/* Shimmer line on hover */}
                      <div className="absolute top-0 inset-x-0 h-px transition-opacity duration-500"
                        style={{ background: `linear-gradient(90deg, transparent, rgba(${a.rgb},0.7), transparent)`, opacity: isH ? 1 : 0 }} />

                      <div className="p-5 md:p-6">
                        {/* Top row: icon + meta */}
                        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border transition-all duration-300"
                                style={{
                                  background: isH ? `rgba(${a.rgb},0.18)` : `rgba(${a.rgb},0.1)`,
                                  borderColor: isH ? `rgba(${a.rgb},0.4)` : `rgba(${a.rgb},0.2)`,
                                  boxShadow: isH ? `0 8px 24px rgba(${a.rgb},0.3)` : 'none',
                                }}>
                                <Icon size={22} style={{ color: a.color }} />
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                Launch vector {String(i + 1).padStart(2, '0')}
                              </div>
                              <div className="mt-2 text-[16px] font-bold md:text-[18px]" style={{ color: 'var(--text-primary)' }}>{a.label}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            {a.badge && (
                              <span className="text-[8px] font-black uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                                style={{ background: `rgba(${a.rgb},0.15)`, color: a.color, border: `1px solid rgba(${a.rgb},0.25)` }}>
                                {a.badge}
                              </span>
                            )}
                            <kbd className="text-[9px] font-mono px-2 py-0.5 rounded-md"
                              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              {a.shortcut}
                            </kbd>
                          </div>
                        </div>

                        {/* Labels */}
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: `rgba(${a.rgb},0.1)`, borderColor: `rgba(${a.rgb},0.18)`, color: a.color }}>
                              {a.sub}
                            </span>
                            <span className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.48)' }}>
                              {isLarge ? 'Priority lane' : 'Quick launch'}
                            </span>
                          </div>

                          <p className={`${isLarge ? 'max-w-[520px] text-[13px]' : 'text-[12px]'} leading-[1.75]`} style={{ color: 'rgba(255,255,255,0.42)' }}>
                            {a.desc}
                          </p>

                          <div className={`grid gap-2 ${i === 5 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
                            {highlights.map((item) => (
                              <div key={item} className="rounded-[16px] border px-3 py-2 text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.58)' }}>
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA row */}
                        <div className="mt-5 flex items-center gap-1 transition-all duration-300"
                          style={{ opacity: isH ? 1 : 0.76, transform: isH ? 'translateX(0)' : 'translateX(-2px)' }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: a.color }}>Open</span>
                          <ArrowUpRight size={11} style={{ color: a.color }} />
                        </div>
                      </div>

                      {/* Bottom accent bar */}
                      <div className="h-[2px] transition-all duration-500"
                        style={{ background: `linear-gradient(90deg, rgba(${a.rgb},0.72), rgba(${a.rgb},0.12))`, opacity: isH ? 1 : 0.65 }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bottom shortcuts */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDelay: '640ms' }}>
            <div className="rounded-[24px] border p-3 md:p-4" style={{ background: 'rgba(6,10,16,0.7)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.32)' }}>
                    Fast launch memory
                  </div>
                  <div className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Your shortest path to the most used surfaces.
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {[{ k: 'Ctrl+T', l: 'New Workspace' }, { k: 'Ctrl+B', l: 'Browser' }, { k: 'Ctrl+N', l: 'New Pane' }, { k: 'Ctrl+,', l: 'Settings' }].map((s) => (
                    <div key={s.k} className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-mono" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <kbd className="rounded px-2 py-0.5" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(163,209,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>{s.k}</kbd>
                      <span style={{ color: 'rgba(255,255,255,0.26)' }}>{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
