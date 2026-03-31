'use client'

import { generateId, useStore } from '@/store/useStore'
import { useState } from 'react'
import { FileText, Plus, X, Globe, User, ArrowRight, Copy, Check, Edit3, Search } from 'lucide-react'

const SYSTEM_PROMPTS = [
  { id: 'sys-1', title: 'Code Review', content: 'Review the code for bugs, security issues, and performance problems. Suggest improvements.' },
  { id: 'sys-2', title: 'Test Writer', content: 'Write comprehensive unit tests for the given code. Cover edge cases and error scenarios.' },
  { id: 'sys-3', title: 'Documentation', content: 'Generate clear documentation including JSDoc comments, README sections, and API docs.' },
  { id: 'sys-4', title: 'Refactor', content: 'Refactor the code to improve readability, maintainability, and follow best practices.' },
  { id: 'sys-5', title: 'Debug Helper', content: 'Analyze the error and suggest a fix. Explain the root cause and prevention strategies.' },
]

export function PromptsPage() {
  const { prompts, addPrompt, removePrompt } = useStore()
  const [activeTab, setActiveTab] = useState<'my' | 'system'>('my')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingPrompt, setEditingPrompt] = useState<{ id: string; title: string; content: string } | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const openEditPrompt = (p: typeof prompts[0]) => {
    setEditingPrompt(p)
    setEditTitle(p.title)
    setEditContent(p.content)
  }

  const saveEditPrompt = () => {
    if (!editingPrompt || !editTitle.trim()) return
    removePrompt(editingPrompt.id)
    addPrompt({ id: editingPrompt.id, title: editTitle.trim(), content: editContent.trim(), isSystem: false, createdAt: new Date().toISOString() })
    setEditingPrompt(null)
  }

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) })
  }

  const filteredPrompts = prompts.filter((p) =>
    !searchQuery.trim() || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = () => {
    if (!title.trim()) return
    addPrompt({ id: generateId(), title: title.trim(), content: content.trim(), isSystem: false, createdAt: new Date().toISOString() })
    setTitle(''); setContent(''); setShowCreate(false)
  }

  const tabs = [
    { id: 'my' as const, label: 'My Prompts', icon: User, count: prompts.length },
    { id: 'system' as const, label: 'System', icon: Globe },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 lg:px-7" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Prompts</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{prompts.length} prompts</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-[11px]">
            <Plus size={12} /> New Prompt
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-7">
      <div className="mb-5 inline-flex gap-2 rounded-[24px] border border-[var(--border)] bg-[rgba(9,15,24,0.72)] p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 text-[11px] px-4 py-2 rounded-[18px] font-semibold transition-all"
              style={{
                background: active ? 'linear-gradient(135deg, rgba(79,140,255,0.16), rgba(40,231,197,0.08))' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${active ? 'rgba(163,209,255,0.18)' : 'transparent'}`,
              }}>
              <Icon size={12} style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }} /> {tab.label}
              {tab.count !== undefined && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-[var(--border)]" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>{tab.count}</span>}
            </button>
          )
        })}
      </div>

      {activeTab === 'my' && prompts.length > 0 && (
        <div className="mb-4 flex items-center gap-2 max-w-md rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-3 py-2">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search prompts..." className="flex-1 bg-transparent text-[12px] outline-none" style={{ color: 'var(--text-primary)' }} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}><X size={12} /></button>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'my' && prompts.length === 0 && (
          <div className="premium-panel-elevated mesh-overlay flex min-h-[540px] flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,var(--accent),rgba(40,231,197,0.82))] text-[#04111d] shadow-[0_20px_50px_rgba(79,140,255,0.24)]">
              <FileText size={24} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: 'var(--text-muted)' }}>
              Reusable Prompt System
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>No prompts yet</h2>
            <p className="text-[13px] text-center max-w-xl leading-7 mb-5" style={{ color: 'var(--text-secondary)' }}>
              Save premium prompt templates to accelerate coding, reviews, debugging and agent coordination flows.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-[12px]">
              <Plus size={14} /> Create first prompt
            </button>
          </div>
        )}

        {activeTab === 'my' && prompts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 cascade-in">
            {filteredPrompts.map((p) => (
              <div key={p.id} className="group overflow-hidden p-5 liquid-glass hover-lift-3d chromatic-border rounded-[24px]">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Custom</div>
                    <h3 className="mt-1 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => copyToClipboard(p.id, p.content)}
                      className="p-1 rounded-xl transition-all hover:bg-[var(--surface-3)]" title="Copy prompt"
                      style={{ color: copiedId === p.id ? 'var(--success)' : 'var(--text-muted)' }}>
                      {copiedId === p.id ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <button onClick={() => openEditPrompt(p)}
                      className="p-1 rounded-xl transition-all hover:bg-[var(--surface-3)]" title="Edit prompt"
                      style={{ color: 'var(--text-muted)' }}>
                      <Edit3 size={11} />
                    </button>
                    <button onClick={() => removePrompt(p.id)}
                      className="p-1 rounded-xl transition-all hover:bg-[rgba(255,71,87,0.12)]"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}>
                      <X size={11} />
                    </button>
                  </div>
                </div>

                <div className="mb-3 rounded-[20px] border border-[var(--border)] bg-[rgba(7,12,20,0.84)] p-4 text-[11px] line-clamp-4 leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {p.content}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  <span>{p.content.length} chars</span>
                  <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    Ready <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SYSTEM_PROMPTS.map((p) => (
              <div key={p.id} className="premium-panel p-5 transition-all duration-300 hover:-translate-y-1">
                <div className="mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ background: 'rgba(72,152,255,0.1)' }}>
                    <Globe size={11} style={{ color: 'var(--info)' }} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>System</div>
                    <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(7,12,20,0.84)] p-4 text-[11px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {p.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="premium-panel-elevated w-[520px] max-w-[calc(100vw-32px)] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>New Prompt</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Prompt title..." value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" autoFocus />
              <textarea placeholder="Prompt content..." value={content} onChange={(e) => setContent(e.target.value)} className="input-field resize-none h-40 text-[11px]" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="btn-ghost text-[11px]">Cancel</button>
                <button onClick={handleCreate} className="btn-primary text-[11px]">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditingPrompt(null)}>
          <div className="premium-panel-elevated w-[520px] max-w-[calc(100vw-32px)] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Edit Prompt</h2>
              <button onClick={() => setEditingPrompt(null)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Prompt title..." value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field" autoFocus />
              <textarea placeholder="Prompt content..." value={editContent} onChange={(e) => setEditContent(e.target.value)} className="input-field resize-none h-40 text-[11px]" />
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{editContent.length} chars</span>
                <div className="flex gap-2">
                  <button onClick={() => setEditingPrompt(null)} className="btn-ghost text-[11px]">Cancel</button>
                  <button onClick={saveEditPrompt} className="btn-primary text-[11px]">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
