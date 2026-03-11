'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[SloerSpace Error Boundary]', error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: '#0a0e17',
      color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', monospace",
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '1.5rem', color: '#ef4444', marginBottom: '1rem' }}>
        SloerSpace — Runtime Error
      </h1>
      <pre style={{
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: '12px',
        padding: '1.5rem',
        maxWidth: '800px',
        width: '100%',
        overflow: 'auto',
        fontSize: '0.8rem',
        lineHeight: '1.6',
        color: '#fbbf24',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: '60vh',
      }}>
        {error.name}: {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button
        onClick={() => reset()}
        style={{
          marginTop: '1.5rem',
          padding: '0.75rem 2rem',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        Retry
      </button>
    </div>
  )
}
