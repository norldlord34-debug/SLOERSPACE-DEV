'use client'

import { generateId, useStore, KanbanTask } from '@/store/useStore'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, X, GripVertical, Columns3, Search, Edit3, Trash2, Filter, AlertTriangle, ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react'

const COLUMNS: { id: KanbanTask['column']; label: string; dot: string }[] = [
  { id: 'todo', label: 'TO DO', dot: 'var(--text-muted)' },
  { id: 'in-progress', label: 'IN PROGRESS', dot: 'var(--accent)' },
  { id: 'in-review', label: 'IN REVIEW', dot: 'var(--warning)' },
  { id: 'complete', label: 'COMPLETE', dot: 'var(--success)' },
  { id: 'cancelled', label: 'CANCELLED', dot: 'var(--error)' },
]

const COL_IDS = COLUMNS.map(c => c.id)

const PRIORITIES: { id: KanbanTask['priority']; label: string; bg: string; fg: string }[] = [
  { id: 'critical', label: 'Critical', bg: 'var(--error)', fg: '#fff' },
  { id: 'high', label: 'High', bg: 'var(--warning-glow)', fg: 'var(--warning)' },
  { id: 'medium', label: 'Medium', bg: 'var(--accent-subtle)', fg: 'var(--info)' },
  { id: 'low', label: 'Low', bg: 'var(--surface-3)', fg: 'var(--text-muted)' },
]

function getNextCol(col: KanbanTask['column']): KanbanTask['column'] | null {
  const i = COL_IDS.indexOf(col)
  return i < COL_IDS.length - 1 ? COL_IDS[i + 1] : null
}
function getPrevCol(col: KanbanTask['column']): KanbanTask['column'] | null {
  const i = COL_IDS.indexOf(col)
  return i > 0 ? COL_IDS[i - 1] : null
}

interface DragState {
  taskId: string
  originCol: KanbanTask['column']
  startX: number
  startY: number
  currentX: number
  currentY: number
  cardRect: DOMRect
  isDragging: boolean
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
  onPointerDown,
  isDragging,
  movedTaskId,
}: {
  task: KanbanTask
  onEdit: () => void
  onDelete: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  canMoveLeft: boolean
  canMoveRight: boolean
  onPointerDown: (e: React.PointerEvent, taskId: string, col: KanbanTask['column']) => void
  isDragging: boolean
  movedTaskId: string | null
}) {
  const pri = PRIORITIES.find(p => p.id === task.priority)
  const justMoved = movedTaskId === task.id

  return (
    <div
      data-task-id={task.id}
      onPointerDown={(e) => onPointerDown(e, task.id, task.column)}
      className="group relative rounded-[18px] transition-all duration-300 select-none touch-none liquid-glass hover-lift-3d"
      style={{
        border: `1px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
        opacity: isDragging ? 0.3 : 1,
        transform: justMoved ? 'scale(1.03)' : undefined,
        boxShadow: justMoved ? '0 0 20px rgba(79,140,255,0.25)' : undefined,
        cursor: 'grab',
      }}
    >
      {/* Swipe move buttons */}
      <div className="absolute inset-y-0 left-0 z-10 flex items-center -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {canMoveLeft && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveLeft() }}
            className="flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110"
            style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 16px rgba(79,140,255,0.4)' }}
            title={`Move to ${COLUMNS[COL_IDS.indexOf(task.column) - 1]?.label}`}
          >
            <ChevronLeft size={14} strokeWidth={3} />
          </button>
        )}
      </div>
      <div className="absolute inset-y-0 right-0 z-10 flex items-center translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {canMoveRight && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveRight() }}
            className="flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110"
            style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 16px rgba(79,140,255,0.4)' }}
            title={`Move to ${COLUMNS[COL_IDS.indexOf(task.column) + 1]?.label}`}
          >
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2">
          <GripVertical size={12} className="mt-0.5 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity" style={{ color: 'var(--text-muted)' }} />
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{task.title}</h3>
            {task.description && <p className="text-[11px] mt-2 line-clamp-2 leading-6" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1.5 rounded-xl transition-all hover:bg-[var(--surface-3)]"
              title="Edit task"
              style={{ color: 'var(--text-muted)' }}
            ><Edit3 size={11} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded-xl transition-all hover:bg-[rgba(255,71,87,0.12)]"
              title="Delete task"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
            ><Trash2 size={11} /></button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          {pri && (
            <span className="text-[8px] font-bold uppercase tracking-[0.16em] px-2 py-1 rounded-full" style={{ background: pri.bg, color: pri.fg }}>{pri.label}</span>
          )}
          <span className="inline-flex items-center gap-1 text-[9px] font-mono opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            <MoveHorizontal size={10} /> drag to move
          </span>
        </div>
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { kanbanTasks, addKanbanTask, moveKanbanTask, removeKanbanTask, updateKanbanTask } = useStore()
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<KanbanTask['priority']>('medium')
  const [newColumn, setNewColumn] = useState<KanbanTask['column']>('todo')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<KanbanTask['priority'] | 'all'>('all')
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState<KanbanTask['priority']>('medium')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [movedTaskId, setMovedTaskId] = useState<string | null>(null)

  // Drag state
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverCol, setHoverCol] = useState<KanbanTask['column'] | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const colRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const filteredTasks = kanbanTasks.filter((task) => {
    const matchesSearch = !searchQuery.trim() || task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesSearch && matchesPriority
  })

  const openEditTask = (task: KanbanTask) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDesc(task.description)
    setEditPriority(task.priority)
  }

  const saveEditTask = () => {
    if (!editingTask || !editTitle.trim()) return
    updateKanbanTask(editingTask.id, { title: editTitle.trim(), description: editDesc.trim(), priority: editPriority })
    setEditingTask(null)
  }

  const handleConfirmDelete = () => {
    if (confirmDeleteId) { removeKanbanTask(confirmDeleteId); setConfirmDeleteId(null) }
  }

  const handleAddTask = () => {
    if (!newTitle.trim()) return
    addKanbanTask({
      id: generateId(),
      title: newTitle.trim(), description: newDesc.trim(), column: newColumn, priority: newPriority,
      createdAt: new Date().toISOString(),
    })
    setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setShowNewTask(false)
  }

  const flashMoved = (taskId: string) => {
    setMovedTaskId(taskId)
    setTimeout(() => setMovedTaskId(null), 500)
  }

  const moveTaskLeft = (task: KanbanTask) => {
    const prev = getPrevCol(task.column)
    if (prev) { moveKanbanTask(task.id, prev); flashMoved(task.id) }
  }

  const moveTaskRight = (task: KanbanTask) => {
    const next = getNextCol(task.column)
    if (next) { moveKanbanTask(task.id, next); flashMoved(task.id) }
  }

  // Pointer drag system
  const handlePointerDown = useCallback((e: React.PointerEvent, taskId: string, col: KanbanTask['column']) => {
    if ((e.target as HTMLElement).closest('button')) return
    const card = (e.target as HTMLElement).closest('[data-task-id]') as HTMLElement
    if (!card) return
    const rect = card.getBoundingClientRect()
    setDrag({
      taskId,
      originCol: col,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      cardRect: rect,
      isDragging: false,
    })
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  useEffect(() => {
    if (!drag) return

    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const moved = Math.abs(dx) > 5 || Math.abs(dy) > 5

      setDrag(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY, isDragging: prev.isDragging || moved } : null)

      if (moved || drag.isDragging) {
        // Find which column we're over
        let foundCol: KanbanTask['column'] | null = null
        colRefs.current.forEach((el, colId) => {
          const r = el.getBoundingClientRect()
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
            foundCol = colId as KanbanTask['column']
          }
        })
        setHoverCol(foundCol)
      }
    }

    const handleUp = () => {
      if (drag.isDragging && hoverCol && hoverCol !== drag.originCol) {
        moveKanbanTask(drag.taskId, hoverCol)
        flashMoved(drag.taskId)
      }
      setDrag(null)
      setHoverCol(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, hoverCol, moveKanbanTask])

  const ghostX = drag ? drag.currentX - drag.cardRect.width / 2 : 0
  const ghostY = drag ? drag.currentY - drag.cardRect.height / 2 : 0
  const draggedTaskData = drag ? kanbanTasks.find(t => t.id === drag.taskId) : null

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Top header bar — matches reference */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 lg:px-7" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Kanban Board</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{kanbanTasks.length} tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-[10px] flex items-center gap-1.5">
            <Plus size={11} /> New Project
          </button>
          <button className="btn-ghost text-[10px] flex items-center gap-1.5">
            <Columns3 size={11} /> Link Folder
          </button>
          <button onClick={() => setShowNewTask(true)} className="btn-primary flex items-center gap-2 text-[11px]">
            <Plus size={12} /> New Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 lg:px-7">

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-md flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[rgba(10,17,28,0.76)] px-3 py-2">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-[12px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}><X size={12} /></button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: 'var(--text-muted)' }} />
          <button
            onClick={() => setFilterPriority('all')}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
            style={{ background: filterPriority === 'all' ? 'var(--accent-subtle)' : 'var(--surface-2)', border: `1px solid ${filterPriority === 'all' ? 'var(--accent)' : 'var(--border)'}`, color: filterPriority === 'all' ? 'var(--accent)' : 'var(--text-secondary)' }}
          >All</button>
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterPriority(p.id)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
              style={{ background: filterPriority === p.id ? 'var(--accent-subtle)' : 'var(--surface-2)', border: `1px solid ${filterPriority === p.id ? 'var(--accent)' : 'var(--border)'}`, color: filterPriority === p.id ? 'var(--accent)' : 'var(--text-secondary)' }}
            >{p.label}</button>
          ))}
        </div>
      </div>

      <div className="premium-panel-elevated p-4 md:p-5" ref={boardRef}>
        <div className="flex gap-3 overflow-x-auto">
        {COLUMNS.map((col) => {
          const tasks = filteredTasks.filter((t) => t.column === col.id)
          const isDropTarget = drag?.isDragging && hoverCol === col.id && drag.originCol !== col.id
          const isDragSource = drag?.isDragging && drag.originCol === col.id
          return (
            <div
              key={col.id}
              ref={(el) => { if (el) colRefs.current.set(col.id, el); else colRefs.current.delete(col.id) }}
              className="premium-panel min-w-[260px] flex-1 flex flex-col transition-all duration-300"
              style={{
                background: isDropTarget
                  ? 'linear-gradient(180deg, rgba(79,140,255,0.18), rgba(8,13,22,0.92))'
                  : isDragSource
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(8,13,22,0.92))'
                  : undefined,
                borderColor: isDropTarget ? 'var(--accent)' : undefined,
                transform: isDropTarget ? 'scale(1.01)' : 'none',
                boxShadow: isDropTarget ? '0 0 30px rgba(79,140,255,0.15), inset 0 0 30px rgba(79,140,255,0.05)' : 'none',
              }}
            >
              <div className="px-4 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="w-2.5 h-2.5 rounded-full transition-transform duration-300" style={{ background: col.dot, transform: isDropTarget ? 'scale(1.4)' : 'none' }} />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: col.dot }}>{col.label}</span>
                <span className="text-[9px] font-mono ml-auto px-2 py-0.5 rounded-full border border-[var(--border)]" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>{tasks.length}</span>
              </div>

              {/* Drop indicator */}
              {isDropTarget && (
                <div className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3 transition-all animate-pulse"
                  style={{ borderColor: 'var(--accent)', background: 'rgba(79,140,255,0.06)' }}>
                  <MoveHorizontal size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Drop here</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {tasks.length === 0 && !isDropTarget && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                      <Columns3 size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No tasks</span>
                  </div>
                )}
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => openEditTask(task)}
                    onDelete={() => setConfirmDeleteId(task.id)}
                    onMoveLeft={() => moveTaskLeft(task)}
                    onMoveRight={() => moveTaskRight(task)}
                    canMoveLeft={!!getPrevCol(task.column)}
                    canMoveRight={!!getNextCol(task.column)}
                    onPointerDown={handlePointerDown}
                    isDragging={drag?.isDragging === true && drag.taskId === task.id}
                    movedTaskId={movedTaskId}
                  />
                ))}
              </div>

              <button onClick={() => { setNewColumn(col.id); setShowNewTask(true) }}
                className="flex items-center justify-center gap-1 px-3 py-3 text-[10px] font-semibold transition-colors"
                style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--surface-1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
              ><Plus size={11} /> Add</button>
            </div>
          )
        })}
        </div>
      </div>

      {/* Floating ghost card */}
      {drag?.isDragging && draggedTaskData && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: ghostX,
            top: ghostY,
            width: drag.cardRect.width,
            transform: 'rotate(3deg) scale(1.04)',
            transition: 'transform 0.1s ease',
          }}
        >
          <div className="rounded-[18px] p-4 shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(15,22,36,0.97), rgba(10,15,28,0.99))',
              border: '2px solid var(--accent)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 40px rgba(79,140,255,0.2)',
            }}>
            <div className="flex items-start gap-2">
              <GripVertical size={12} className="mt-0.5 opacity-40" style={{ color: 'var(--text-muted)' }} />
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{draggedTaskData.title}</h3>
                {draggedTaskData.description && <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{draggedTaskData.description}</p>}
              </div>
            </div>
            {hoverCol && hoverCol !== drag.originCol && (
              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                <ChevronRight size={10} />
                Moving to {COLUMNS.find(c => c.id === hoverCol)?.label}
              </div>
            )}
          </div>
        </div>
      )}

      {showNewTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowNewTask(false)}>
          <div className="premium-panel-elevated w-[480px] max-w-[calc(100vw-32px)] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>New Task</h2>
              <button onClick={() => setShowNewTask(false)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              ><X size={15} /></button>
            </div>

            <div className="space-y-3">
              <input type="text" placeholder="Task title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                className="input-field" autoFocus />
              <textarea placeholder="Description (optional)..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                className="input-field resize-none h-28" />

              <div>
                <div className="label">Column</div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {COLUMNS.map((c) => (
                    <button key={c.id} onClick={() => setNewColumn(c.id)}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                      style={{
                        background: newColumn === c.id ? 'var(--accent-subtle)' : 'var(--surface-2)',
                        border: `1px solid ${newColumn === c.id ? 'var(--accent)' : 'var(--border)'}`,
                        color: newColumn === c.id ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    ><span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />{c.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <div className="label">Priority</div>
                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button key={p.id} onClick={() => setNewPriority(p.id)}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: newPriority === p.id ? 'var(--accent-subtle)' : 'var(--surface-2)',
                        border: `1px solid ${newPriority === p.id ? 'var(--accent)' : 'var(--border)'}`,
                        color: newPriority === p.id ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowNewTask(false)} className="btn-ghost text-[11px]">Cancel</button>
                <button onClick={handleAddTask} className="btn-primary text-[11px]">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setEditingTask(null)}>
          <div className="premium-panel-elevated w-[480px] max-w-[calc(100vw-32px)] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Edit Task</h2>
              <button onClick={() => setEditingTask(null)} className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Task title..." value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="input-field" autoFocus />
              <textarea placeholder="Description (optional)..." value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                className="input-field resize-none h-28" />
              <div>
                <div className="label">Priority</div>
                <div className="flex gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button key={p.id} onClick={() => setEditPriority(p.id)}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        background: editPriority === p.id ? 'var(--accent-subtle)' : 'var(--surface-2)',
                        border: `1px solid ${editPriority === p.id ? 'var(--accent)' : 'var(--border)'}`,
                        color: editPriority === p.id ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setEditingTask(null)} className="btn-ghost text-[11px]">Cancel</button>
                <button onClick={saveEditTask} className="btn-primary text-[11px]">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setConfirmDeleteId(null)}>
          <div className="premium-panel-elevated w-[400px] max-w-[calc(100vw-32px)] p-6 animate-scale-in text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,71,87,0.14)' }}>
              <AlertTriangle size={24} style={{ color: 'var(--error)' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Delete Task?</h2>
            <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone. The task will be permanently removed.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost text-[11px]">Cancel</button>
              <button onClick={handleConfirmDelete} className="text-[11px] font-semibold px-4 py-2 rounded-xl transition-all" style={{ background: 'var(--error)', color: '#fff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
