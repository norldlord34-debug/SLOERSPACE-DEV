'use client'

import Image from 'next/image'
import { generateId, useStore } from '@/store/useStore'
import { useState } from 'react'
import { Bot, Plus, X, Sparkles, ArrowRight, Edit3, Copy, Check } from 'lucide-react'

const DEFAULT_AGENT_PROMPT = 'You are a helpful AI assistant.\n\nKey behaviors:\n- Be concise but thorough\n- Ask clarifying questions when needed\n- Provide examples when helpful'

export function AgentsPage() {
  const { customAgents, addCustomAgent, removeCustomAgent } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState(DEFAULT_AGENT_PROMPT)
  const [editingAgent, setEditingAgent] = useState<{ id: string; name: string; systemPrompt: string; createdAt: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const openEditAgent = (agent: typeof customAgents[0]) => {
    setEditingAgent(agent)
    setEditName(agent.name)
    setEditPrompt(agent.systemPrompt)
  }

  const saveEditAgent = () => {
    if (!editingAgent || !editName.trim()) return
    removeCustomAgent(editingAgent.id)
    addCustomAgent({ id: editingAgent.id, name: editName.trim(), systemPrompt: editPrompt.trim(), createdAt: editingAgent.createdAt || new Date().toISOString() })
    setEditingAgent(null)
  }

  const copyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) })
  }

  const handleCreate = () => {
    if (!name.trim()) return
    addCustomAgent({ id: generateId(), name: name.trim(), systemPrompt: prompt.trim(), createdAt: new Date().toISOString() })
    setName(''); setPrompt(DEFAULT_AGENT_PROMPT); setShowCreate(false)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 lg:px-7" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Agents</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{customAgents.length} agents</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-[10px] flex items-center gap-1.5">
            <Plus size={11} /> New Project
          </button>
          <button className="btn-ghost text-[10px] flex items-center gap-1.5">
            <Edit3 size={11} /> Link Folder
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-[11px]">
            <Plus size={12} /> New Agent
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-7">
        {customAgents.length === 0 ? (
          <div className="premium-panel-elevated mesh-overlay flex min-h-[540px] flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,var(--accent),rgba(40,231,197,0.82))] text-[#04111d] shadow-[0_20px_50px_rgba(79,140,255,0.24)]">
              <Bot size={24} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: 'var(--text-muted)' }}>
              Custom Agent System
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>No agents yet</h2>
            <p className="text-[13px] text-center max-w-xl leading-7 mb-5" style={{ color: 'var(--text-secondary)' }}>
              Create premium AI agents with dedicated system behavior, reusable tone and task-specific execution profiles.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-[12px]">
              <Plus size={14} /> Create first agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 cascade-in perspective-container">
            {customAgents.map((agent) => (
              <div key={agent.id} className="group overflow-hidden p-5 liquid-glass hover-lift-3d chromatic-border rounded-[24px]">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[rgba(79,140,255,0.12)] text-[var(--accent)] shadow-[0_16px_34px_rgba(79,140,255,0.12)]">
                      <Bot size={16} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</h3>
                      <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Custom Agent</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => copyPrompt(agent.id, agent.systemPrompt)}
                      className="p-1 rounded-xl transition-all hover:bg-[var(--surface-3)]" title="Copy prompt"
                      style={{ color: copiedId === agent.id ? 'var(--success)' : 'var(--text-muted)' }}>
                      {copiedId === agent.id ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <button onClick={() => openEditAgent(agent)}
                      className="p-1 rounded-xl transition-all hover:bg-[var(--surface-3)]" title="Edit agent"
                      style={{ color: 'var(--text-muted)' }}>
                      <Edit3 size={11} />
                    </button>
                    <button onClick={() => removeCustomAgent(agent.id)}
                      className="p-1 rounded-xl transition-all hover:bg-[rgba(255,71,87,0.12)]" title="Delete agent"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>

                <div className="mb-3 rounded-[20px] border border-[var(--border)] bg-[rgba(7,12,20,0.84)] p-4 text-[11px] line-clamp-4 font-mono leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {agent.systemPrompt}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  <span>{agent.systemPrompt.length} chars</span>
                  <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    Ready <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="premium-panel-elevated w-[520px] max-w-[calc(100vw-32px)] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-[16px] overflow-hidden border border-white/10">
                <Image src="/LOGO.png" alt="SloerSpace" width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-lg font-bold flex-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Create Agent</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}><X size={15} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="label">Name</div>
                <input type="text" placeholder="e.g. Code Review Bot" value={name} onChange={(e) => setName(e.target.value)} className="input-field" autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="label flex items-center gap-1"><Sparkles size={10} /> System Prompt</div>
                  <button className="text-[9px] font-semibold" style={{ color: 'var(--accent)' }}>Templates</button>
                </div>
                <textarea value={prompt} onChange={(e) => { if (e.target.value.length <= 1000) setPrompt(e.target.value) }} className="input-field resize-none h-40 font-mono text-[11px]" />
                <div className="text-right text-[9px] font-mono mt-1" style={{ color: prompt.length > 900 ? 'var(--warning)' : 'var(--text-muted)' }}>{prompt.length} / 1000</div>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button onClick={() => setShowCreate(false)} className="btn-ghost text-[11px]">Cancel</button>
                <button onClick={handleCreate} className="btn-primary text-[11px]">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditingAgent(null)}>
          <div className="premium-panel-elevated w-[520px] max-w-[calc(100vw-32px)] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-[16px] overflow-hidden border border-white/10">
                <Image src="/LOGO.png" alt="SloerSpace" width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-lg font-bold flex-1" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Edit Agent</h2>
              <button onClick={() => setEditingAgent(null)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="label">Name</div>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="label flex items-center gap-1"><Sparkles size={10} /> System Prompt</div>
                  <button className="text-[9px] font-semibold" style={{ color: 'var(--accent)' }}>Templates</button>
                </div>
                <textarea value={editPrompt} onChange={(e) => { if (e.target.value.length <= 1000) setEditPrompt(e.target.value) }} className="input-field resize-none h-40 font-mono text-[11px]" />
                <div className="text-right text-[9px] font-mono mt-1" style={{ color: editPrompt.length > 900 ? 'var(--warning)' : 'var(--text-muted)' }}>{editPrompt.length} / 1000</div>
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button onClick={() => setEditingAgent(null)} className="btn-ghost text-[11px]">Cancel</button>
                <button onClick={saveEditAgent} className="btn-primary text-[11px]">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
