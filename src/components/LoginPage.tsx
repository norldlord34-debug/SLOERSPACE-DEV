'use client'

import { useStore } from '@/store/useStore'
import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Zap, Terminal, Kanban, Bot, ArrowRight, Sparkles } from 'lucide-react'

export function LoginPage() {
  const { login, setView } = useStore()
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
    login(email.trim(), password)
    setLoading(false)
    setView('home')
  }

  const handleSkip = () => {
    login('guest@sloerspace.dev', 'local')
    setView('home')
  }

  return (
    <div className="h-full flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg, rgba(3,5,10,1), rgba(5,9,16,1))' }}>
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute right-0 bottom-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(40,231,197,0.08),transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[900px] grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* Left — Branding */}
        <div className="hidden lg:flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl overflow-hidden ring-1 ring-white/10">
              <img src="/LOGO.png" alt="SloerSpace" className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>SloerSpace</div>
              <div className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Dev Environment</div>
            </div>
          </div>

          <h1 className="text-[32px] font-bold leading-tight mb-4" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
            Build the future.
          </h1>
          <p className="text-[14px] leading-7 mb-8" style={{ color: 'var(--text-secondary)' }}>
            Terminal-native workspaces, branded around speed, focus, and coordinated execution.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Terminal, label: 'Multi-Pane Terminals', desc: 'Up to 16 parallel grids' },
              { icon: Zap, label: 'Warp-Style Blocks', desc: 'Collapsible command output' },
              { icon: Kanban, label: 'Built-in Kanban', desc: 'Task board with drag & drop' },
              { icon: Bot, label: 'AI Agent Fleet', desc: '5 agent CLIs supported' },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.6)] p-3">
                <f.icon size={14} style={{ color: 'var(--accent)' }} className="mb-2" />
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Auth form */}
        <div className="premium-panel-elevated p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
              <img src="/LOGO.png" alt="SloerSpace" className="h-full w-full object-cover" />
            </div>
            <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace Dev</div>
          </div>

          <div className="mb-6">
            <h2 className="text-[20px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'login' ? 'Sign in to your SloerSpace account' : 'Get started with SloerSpace Dev'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Email</label>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-3 py-2.5 focus-within:border-[var(--accent)]">
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
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-3 py-2.5 focus-within:border-[var(--accent)]">
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

            {error && (
              <div className="text-[11px] font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,71,87,0.1)', color: 'var(--error)', border: '1px solid rgba(255,71,87,0.2)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold transition-all"
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

          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-[11px] font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleSkip}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-semibold transition-all hover:bg-[var(--surface-3)]"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <Sparkles size={12} />
              Continue as Guest
            </button>
            <p className="mt-2 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Free plan — Public Library, Templates & Settings
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
