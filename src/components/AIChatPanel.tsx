'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Send, Trash2, Settings, Loader2, Bot, User, Copy, Check, Sparkles, AlertCircle, X } from 'lucide-react'
import { useStore, generateId } from '@/store/useStore'
import type { AIChatMessage, AIProvider } from '@/store/useStore'
import { aiChatCompletion } from '@/lib/desktop'

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  google: 'Gemini',
  ollama: 'Ollama',
}

const PROVIDER_COLORS: Record<AIProvider, string> = {
  openai: '#10a37f',
  anthropic: '#e8956a',
  google: '#4285f4',
  ollama: '#f5f5f5',
}

const SYSTEM_PROMPT = `You are SloerSpace AI, an expert development assistant integrated into an agentic terminal IDE. You help with:
- Shell commands, scripts, and terminal workflows
- Code debugging, refactoring, and architecture
- Git operations and version control
- DevOps, deployment, and CI/CD
- AI agent orchestration and multi-agent workflows
Be concise, technical, and direct. Format code in markdown code blocks with language tags. When suggesting commands, explain what they do briefly.`

export function AIChatPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const aiSettings = useStore((s) => s.aiSettings)
  const chatHistory = useStore((s) => s.aiChatHistory)
  const addMessage = useStore((s) => s.addAIChatMessage)
  const clearHistory = useStore((s) => s.clearAIChatHistory)
  const setView = useStore((s) => s.setView)
  const setSettingsTab = useStore((s) => s.setSettingsTab)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const provider = aiSettings.provider
  const hasApiKey = provider === 'ollama' || (
    (provider === 'anthropic' && aiSettings.anthropicApiKey) ||
    (provider === 'openai' && aiSettings.openaiApiKey) ||
    (provider === 'google' && aiSettings.googleApiKey)
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, isLoading])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const getApiKey = useCallback(() => {
    if (provider === 'anthropic') return aiSettings.anthropicApiKey
    if (provider === 'openai') return aiSettings.openaiApiKey
    if (provider === 'google') return aiSettings.googleApiKey
    return ''
  }, [provider, aiSettings])

  const getModel = useCallback(() => {
    if (provider === 'anthropic') return aiSettings.anthropicModel
    if (provider === 'openai') return aiSettings.openaiModel
    if (provider === 'google') return aiSettings.googleModel
    return aiSettings.ollamaModel
  }, [provider, aiSettings])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setError(null)
    setInput('')

    const userMsg: AIChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    }
    addMessage(userMsg)
    setIsLoading(true)

    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chatHistory.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ]

      const resp = await aiChatCompletion({
        provider,
        api_key: getApiKey(),
        model: getModel(),
        endpoint: provider === 'ollama' ? aiSettings.ollamaEndpoint : undefined,
        messages,
        max_tokens: 2048,
      })

      const assistantMsg: AIChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: resp.content || 'No response received.',
        createdAt: new Date().toISOString(),
        provider,
      }
      addMessage(assistantMsg)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, chatHistory, provider, getApiKey, getModel, aiSettings.ollamaEndpoint, addMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (!isOpen) return null

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--surface-0)', borderLeft: '1px solid var(--border)', width: 380 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(79,140,255,0.2), rgba(167,139,250,0.2))' }}>
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>SloerSpace AI</div>
            <div className="text-[9px]" style={{ color: PROVIDER_COLORS[provider] }}>
              {PROVIDER_LABELS[provider]} · {getModel()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setSettingsTab('ai-settings'); setView('settings') }} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="AI Settings" style={{ color: 'var(--text-muted)' }}>
            <Settings size={13} />
          </button>
          <button onClick={clearHistory} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Clear chat" style={{ color: 'var(--text-muted)' }}>
            <Trash2 size={13} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" title="Close" style={{ color: 'var(--text-muted)' }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {chatHistory.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(79,140,255,0.15), rgba(167,139,250,0.15))' }}>
              <MessageSquare size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Ask anything</div>
              <div className="text-[11px] max-w-[240px]" style={{ color: 'var(--text-muted)' }}>
                Commands, debugging, architecture, Git, DevOps — your AI assistant is ready.
              </div>
            </div>
            {!hasApiKey && (
              <button onClick={() => { setSettingsTab('ai-settings'); setView('settings') }}
                className="text-[10px] px-3 py-1.5 rounded-lg" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                Configure API Key →
              </button>
            )}
          </div>
        )}

        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{
              background: msg.role === 'user' ? 'var(--accent-subtle)' : 'rgba(167,139,250,0.15)',
            }}>
              {msg.role === 'user' ? <User size={12} style={{ color: 'var(--accent)' }} /> : <Bot size={12} style={{ color: '#a78bfa' }} />}
            </div>
            <div className={`flex-1 min-w-0 ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className="inline-block text-left px-3 py-2 rounded-2xl text-[11px] leading-relaxed max-w-full" style={{
                background: msg.role === 'user' ? 'var(--accent-subtle)' : 'var(--surface-1)',
                color: 'var(--text-primary)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(79,140,255,0.2)' : 'var(--border)'}`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
              <div className="flex items-center gap-1 mt-1" style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <button onClick={() => copyMessage(msg.id, msg.content)} className="p-0.5 rounded transition-all hover:bg-[rgba(255,255,255,0.06)]">
                    {copiedId === msg.id ? <Check size={10} style={{ color: 'var(--success)' }} /> : <Copy size={10} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                )}
                {msg.provider && (
                  <span className="text-[8px] font-mono" style={{ color: PROVIDER_COLORS[msg.provider] }}>{PROVIDER_LABELS[msg.provider]}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.15)' }}>
              <Bot size={12} style={{ color: '#a78bfa' }} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            <div className="text-[10px]" style={{ color: 'var(--error)' }}>{error}</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-end gap-2 px-3 py-2 rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasApiKey ? 'Ask SloerSpace AI...' : 'Configure API key in Settings first'}
            disabled={!hasApiKey || isLoading}
            rows={1}
            className="flex-1 bg-transparent outline-none text-[12px] resize-none max-h-[120px]"
            style={{ color: 'var(--text-primary)', minHeight: 20 }}
            spellCheck={false}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || !hasApiKey}
            className="p-1.5 rounded-lg transition-all disabled:opacity-30"
            style={{ color: 'var(--accent)' }}
          >
            <Send size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {PROVIDER_LABELS[provider]} · {getModel()} · Enter to send
          </span>
          <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{chatHistory.length} messages</span>
        </div>
      </div>
    </div>
  )
}
