'use client'

import Image from 'next/image'
import { useStore } from '@/store/useStore'
import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Zap, Terminal, Kanban, Bot, ArrowRight, Sparkles } from 'lucide-react'

const ACCESS_PILLARS = [
  { icon: Terminal, label: 'Terminal runtime', desc: 'Execution starts from real panes, not abstract demos.' },
  { icon: Zap, label: 'Swarm orchestration', desc: 'Parallel lanes stay visible when the task grows.' },
  { icon: Kanban, label: 'Delivery surfaces', desc: 'Boards, prompts, and workspaces stay one jump away.' },
  { icon: Bot, label: 'Agent posture', desc: 'Reusable roles and operator control remain close to runtime.' },
] as const

export function LoginPage() {
  const { login, setView, setOnboardingCompleted, setShowOnStartup } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return }
    if (mode === 'signup' && password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')

    // Simulate auth delay
    await new Promise((r) => setTimeout(r, 800))
    if (mode === 'signup') {
      setOnboardingCompleted(false)
      setShowOnStartup(true)
    } else {
      setOnboardingCompleted(true)
    }
    login(email.trim(), password)
    setLoading(false)
    setView('home')
  }

  const handleSkip = () => {
    setOnboardingCompleted(true)
    setShowOnStartup(true)
    login('guest@sloerspace.dev', 'local')
    setView('home')
  }

  return (
    <div className="h-full flex items-center justify-center p-6 aurora-bg particle-field" style={{ background: 'radial-gradient(circle at top, rgba(79,140,255,0.12), transparent 22%), linear-gradient(180deg, rgba(3,5,10,1), rgba(5,9,16,1))' }}>
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute right-0 bottom-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(40,231,197,0.08),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'linear-gradient(rgba(143,194,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(143,194,255,0.05) 1px, transparent 1px)', backgroundSize: '38px 38px' }} />
      </div>

      <div className="relative z-10 w-full max-w-[1120px] grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        {/* Left — Branding */}
        <div className="hidden xl:flex flex-col justify-between rounded-[34px] p-8 card-3d liquid-glass-heavy premium-card-shell" style={{ borderColor: 'rgba(170,221,255,0.12)' }}>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl overflow-hidden ring-1 ring-white/10">
                <Image src="/LOGO.png" alt="SloerSpace" width={48} height={48} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>SloerSpace</div>
                <div className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Operator Access</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
                Desktop runtime
              </span>
              <span className="rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                Local access flow
              </span>
            </div>

            <h1 className="mt-8 text-[38px] font-bold leading-[1.02]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Access the workspace stack without losing the premium operator feel.
            </h1>
            <p className="mt-5 max-w-[560px] text-[14px] leading-7" style={{ color: 'var(--text-secondary)' }}>
              Sign in if you already know the product. Create an account if you want the first-run onboarding to guide you into your initial workspace and startup preferences.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {ACCESS_PILLARS.map((f) => (
                <div key={f.label} className="rounded-[24px] border p-4" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(10,17,28,0.62)' }}>
                  <f.icon size={15} style={{ color: 'var(--accent)' }} className="mb-3" />
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</div>
                  <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-muted)' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border p-5" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(6,11,19,0.72)' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
              Access behavior
            </div>
            <div className="mt-3 grid gap-3">
              <div className="rounded-[20px] border px-4 py-3" style={{ borderColor: 'rgba(170,221,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign in</div>
                <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>Return to the standard operational home and keep the product out of your way.</div>
              </div>
              <div className="rounded-[20px] border px-4 py-3" style={{ borderColor: 'rgba(170,221,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Create account</div>
                <div className="mt-1 text-[11px] leading-6" style={{ color: 'var(--text-secondary)' }}>Open the premium onboarding flow reserved for new users and keep it on startup until you finish it.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Auth form */}
        <div className="premium-panel-elevated premium-card-shell p-6 md:p-8 lg:p-9" style={{ background: 'linear-gradient(180deg, rgba(7,12,20,0.88), rgba(4,9,18,0.96))' }}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
                <Image src="/LOGO.png" alt="SloerSpace" width={40} height={40} className="h-full w-full object-cover" />
              </div>
              <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace Dev</div>
            </div>
            <span className="rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' }}>
              Operator auth
            </span>
          </div>

          <div className="rounded-[22px] border p-1 mb-6" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(5,10,18,0.7)' }}>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="rounded-[18px] px-4 py-3 text-[11px] font-semibold transition-all"
                style={{
                  background: mode === 'login' ? 'rgba(79,140,255,0.14)' : 'transparent',
                  color: mode === 'login' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError('') }}
                className="rounded-[18px] px-4 py-3 text-[11px] font-semibold transition-all"
                style={{
                  background: mode === 'signup' ? 'rgba(79,140,255,0.14)' : 'transparent',
                  color: mode === 'signup' ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                Create account
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
              {mode === 'login' ? 'Returning operator' : 'New operator'}
            </div>
            <h2 className="mt-2 text-[28px] font-bold tracking-[-0.05em]" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login'
                ? 'Sign in to enter the standard operational home and resume execution quickly.'
                : 'Create an account to unlock the new-user onboarding flow and configure your first runtime surface.'}
            </p>
          </div>

          <div className="mb-6 rounded-[22px] border px-4 py-4" style={{ borderColor: 'rgba(170,221,255,0.08)', background: 'rgba(6,11,19,0.68)' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: mode === 'signup' ? 'var(--accent)' : 'var(--text-muted)' }}>
              {mode === 'signup' ? 'Onboarding enabled' : 'Direct access'}
            </div>
            <div className="mt-2 text-[12px] leading-6" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'signup'
                ? 'New accounts keep the premium onboarding visible on startup until you complete it.'
                : 'Sign-in skips the first-run framing and moves you into the regular home surface.'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Email</label>
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-4 py-3 focus-within:border-[var(--accent)]">
                <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent text-[12px] outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Password</label>
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-4 py-3 focus-within:border-[var(--accent)]">
                <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-[12px] outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="rounded-[20px] border px-4 py-3 text-[11px] leading-6" style={{ borderColor: 'rgba(79,140,255,0.14)', background: 'rgba(79,140,255,0.08)', color: 'var(--text-secondary)' }}>
                Use at least 6 characters. After account creation, the first-run onboarding remains available only for this new-user path.
              </div>
            )}

            {error && (
              <div className="text-[11px] font-semibold px-4 py-3 rounded-[20px]" style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--error)', border: '1px solid rgba(255,71,87,0.2)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[12px] font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), rgba(40,231,197,0.8))',
                color: '#04111d',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-[#04111d]/30 border-t-[#04111d] animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleSkip}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-[11px] font-semibold transition-all hover:bg-[var(--surface-3)]"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <Sparkles size={12} />
              Continue as Guest
            </button>
            <p className="mt-3 text-center text-[10px] leading-5" style={{ color: 'var(--text-muted)' }}>
              Guest access keeps the free plan surface available for quick evaluation: Public Library, Templates, Settings, and the standard home flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
