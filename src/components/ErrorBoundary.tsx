'use client'

import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackTitle?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallbackTitle?: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-8 aurora-bg">
          <div className="max-w-md w-full text-center liquid-glass-heavy rounded-[28px] p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,71,87,0.14)' }}>
              <AlertTriangle size={24} style={{ color: 'var(--error)' }} />
            </div>
            <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            <p className="text-[12px] mb-4 leading-6" style={{ color: 'var(--text-secondary)' }}>
              {this.state.error?.message || 'An unexpected error occurred in this section.'}
            </p>
            <div className="mb-4 p-3 rounded-xl text-left font-mono text-[10px] max-h-[120px] overflow-y-auto" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {this.state.error?.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace available'}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary text-[11px] inline-flex items-center gap-2"
            >
              <RotateCcw size={12} /> Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
