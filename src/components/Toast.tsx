'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(46,213,115,0.1)', border: 'rgba(46,213,115,0.25)', icon: 'var(--success)' },
  error: { bg: 'rgba(255,71,87,0.1)', border: 'rgba(255,71,87,0.25)', icon: 'var(--error)' },
  warning: { bg: 'rgba(255,191,98,0.1)', border: 'rgba(255,191,98,0.25)', icon: 'var(--warning)' },
  info: { bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.25)', icon: 'var(--accent)' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false)
  const Icon = ICONS[toast.type]
  const color = COLORS[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl liquid-glass transition-all duration-300"
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        boxShadow: exiting ? '0 8px 20px rgba(0,0,0,0.2)' : '0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(100px) scale(0.92) rotateY(-5deg)' : 'translateX(0) scale(1) rotateY(0deg)',
        minWidth: '280px',
        maxWidth: '420px',
      }}
    >
      <Icon size={16} style={{ color: color.icon }} className="shrink-0" />
      <span className="text-[12px] font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{toast.message}</span>
      <button onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 300) }} className="p-1 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.08)] shrink-0" style={{ color: 'var(--text-muted)' }}>
        <X size={12} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2, 10)
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
