'use client'

import Image from 'next/image'
import { useStore } from '@/store/useStore'
import { X, Check, Sparkles, Terminal, Bot, Key, Zap, Shield } from 'lucide-react'

const FREE_FEATURES = [
  { label: 'Public Library', desc: 'Browse SloerSpace system skills' },
  { label: 'Explore Templates', desc: 'View curated prompts and examples' },
  { label: 'Settings & Billing', desc: 'Manage your account and plan' },
]

const PRO_FEATURES = [
  { icon: Bot, label: 'SloerMCP', desc: 'AI agent protocol server' },
  { icon: Terminal, label: 'SloerCode', desc: 'CLI for vibe coding' },
  { icon: Sparkles, label: 'SloerSpace', desc: 'Vibe coding environment' },
  { icon: Zap, label: 'SloerVoice', desc: 'Voice to code interface' },
  { icon: Shield, label: 'Premium Skills', desc: 'Agent capabilities' },
  { icon: Key, label: 'Priority Support', desc: 'Fast response times' },
]

export function UpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { startTrial } = useStore()

  if (!isOpen) return null

  const handleStartTrial = () => {
    startTrial()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in" onClick={onClose}>
      <div className="relative w-[780px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-64px)] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 p-1.5 rounded-xl transition-all hover:bg-[var(--surface-3)]" style={{ color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>

        <div className="grid md:grid-cols-2 gap-0 rounded-[24px] overflow-hidden liquid-glass-heavy chromatic-border" style={{ border: '1px solid var(--border)' }}>
          {/* Free Plan */}
          <div className="p-6 md:p-8" style={{ background: 'linear-gradient(180deg, rgba(8,13,22,0.98), rgba(5,9,16,0.99))' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-1 ring-white/10">
                <Image src="/LOGO.png" alt="SloerSpace" width={40} height={40} className="h-full w-full object-cover" />
              </div>
              <div className="text-[14px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace</div>
            </div>

            <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Upgrade to Pro
            </h2>
            <p className="text-[12px] mb-6" style={{ color: 'var(--text-secondary)' }}>
              Terminal Workspaces is a Pro feature. Upgrade your plan to unlock it.
            </p>

            <div className="rounded-2xl border border-[var(--border)] p-4" style={{ background: 'rgba(10,17,28,0.6)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Free Plan</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Included</span>
              </div>
              <div className="space-y-3">
                {FREE_FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--success)', color: '#fff' }}>
                      <Check size={9} strokeWidth={3} />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="p-6 md:p-8" style={{ background: 'linear-gradient(180deg, rgba(12,18,30,0.98), rgba(8,13,22,0.99))', borderLeft: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Pro Plan</span>
              <div>
                <span className="text-[28px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>$20</span>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {PRO_FEATURES.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>
                    <Check size={9} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                    <span className="text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>— {f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleStartTrial}
              className="w-full rounded-xl py-3 text-[12px] font-bold transition-all"
              style={{ background: 'linear-gradient(135deg, var(--accent), rgba(40,231,197,0.8))', color: '#04111d' }}
            >
              Start 7-Day Free Trial
            </button>

            <button onClick={onClose} className="w-full mt-2 py-2 text-[11px] font-medium text-center transition-colors" style={{ color: 'var(--text-muted)' }}>
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
