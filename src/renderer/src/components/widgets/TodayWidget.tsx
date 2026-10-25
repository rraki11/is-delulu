import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sun, Check, Plus, CornerDownLeft } from 'lucide-react'
import { HITODAMA_EASING } from '../../shared'
import { useIslandStore } from '../../store/useIslandStore'

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export const TodayWidget: React.FC = () => {
  const { preferences } = useIslandStore()
  const [timeState, setTimeState] = useState({
    hour: '09',
    minute: '41',
    period: 'AM',
    dayStr: 'Tue 29'
  })

  // To-do list state persisted to localStorage
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const saved = localStorage.getItem('hitodama_todos')
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      { id: '1', text: 'Subscribe to Otism', completed: true },
      { id: '2', text: 'Call Mom', completed: false },
      { id: '3', text: 'Gym 6:00 PM', completed: false }
    ]
  })

  const [newTodoText, setNewTodoText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Real-time clock update
  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date()
      const is12h = preferences?.clockFormat !== '24h'
      let h = now.getHours()
      const period = h >= 12 ? 'PM' : 'AM'
      if (is12h) {
        h = h % 12
        if (h === 0) h = 12
      }
      const hourStr = String(h).padStart(2, '0')
      const minuteStr = String(now.getMinutes()).padStart(2, '0')
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayName = days[now.getDay()]
      const dateNum = now.getDate()

      setTimeState({
        hour: hourStr,
        minute: minuteStr,
        period: is12h ? period : '',
        dayStr: `${dayName} ${dateNum}`
      })
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [preferences?.clockFormat])

  const toggleTodo = (id: string): void => {
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      try {
        localStorage.setItem('hitodama_todos', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const handleAddTodo = (): void => {
    if (!newTodoText.trim()) return
    const newItem: TodoItem = {
      id: `todo-${Date.now()}`,
      text: newTodoText.trim(),
      completed: false
    }
    const next = [...todos, newItem]
    setTodos(next)
    setNewTodoText('')
    setIsAdding(false)
    try {
      localStorage.setItem('hitodama_todos', JSON.stringify(next))
    } catch {}
  }

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length
  const progressRatio = totalCount > 0 ? completedCount / totalCount : 0
  const ringCircumference = 2 * Math.PI * 13

  // Week days generation around current date
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const todayDate = new Date().getDate()
  const weekDates = [28, 29, 30, 1, 2, 3, 4]

  return (
    <div
      style={{
        display: 'flex',
        gap: '14px',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        padding: '6px 0',
        userSelect: 'none'
      }}
    >
      {/* â”€â”€ Left Rail: Clock & Weather Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '176px' }}>
        {/* Large Digital Clock Card (176px Ã— 214px) */}
        <div
          style={{
            width: '176px',
            height: '214px',
            borderRadius: '16px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
          }}
        >
          {/* Hour */}
          <span
            className="tabular-nums font-mono"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '54px',
              fontWeight: 700,
              color: '#F4F5F7',
              lineHeight: 1,
              letterSpacing: '-0.04em'
            }}
          >
            {timeState.hour}
          </span>

          {/* Animated Blinking Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0' }}>
            {[-1, 0, 1].map((dot) => (
              <motion.span
                key={dot}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: dot === 0 ? 'var(--hitodama-accent, #D7B56D)' : '#8E919A'
                }}
                animate={dot === 0 ? { opacity: [1, 0.3, 1] } : undefined}
                transition={dot === 0 ? { duration: 1.5, repeat: Infinity, ease: 'linear' } : undefined}
              />
            ))}
          </div>

          {/* Minute */}
          <span
            className="tabular-nums font-mono"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '54px',
              fontWeight: 700,
              color: '#F4F5F7',
              lineHeight: 1,
              letterSpacing: '-0.04em'
            }}
          >
            {timeState.minute}
          </span>

          {/* Footer Badge */}
          <span
            style={{
              marginTop: '12px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#8E919A',
              letterSpacing: '0.02em'
            }}
          >
            {timeState.period ? `${timeState.period} Â· ` : ''}{timeState.dayStr}
          </span>
        </div>

        {/* Weather Card (176px Ã— 142px) */}
        <div
          style={{
            width: '176px',
            height: '142px',
            borderRadius: '16px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxSizing: 'border-box'
          }}
        >
          <Sun size={32} color="#F2C94C" strokeWidth={2} />
          <span className="tabular-nums font-mono" style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 700, color: '#F4F5F7' }}>
            32°C
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: '#8E919A', fontWeight: 500 }}>
            Mostly clear
          </span>
        </div>
      </div>

      {/* ── Right Rail: Calendar & To-Do Cards ───────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '354px' }}>
        {/* Weekly Calendar Card (354px × 182px) */}
        <div
          style={{
            width: '354px',
            height: '182px',
            borderRadius: '16px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '14px 16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Calendar Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: '#F4F5F7' }}>
              This week
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: '#8E919A', fontWeight: 500 }}>
              Sep 28 – Oct 4
            </span>
          </div>

          {/* 7-Day Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {weekDays.map((day, idx) => {
              const dNum = weekDates[idx]
              const isToday = dNum === todayDate || idx === 1

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: '#6E727A', fontWeight: 500 }}>
                    {day}
                  </span>
                  <div
                    className="tabular-nums font-mono"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isToday ? 'var(--hitodama-accent, #D7B56D)' : 'transparent',
                      color: isToday ? '#141310' : '#D0D2D8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: isToday ? 700 : 500
                    }}
                  >
                    {dNum}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Next Agenda Callout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)'
            }}
          >
            <div
              style={{
                width: '3px',
                height: '24px',
                borderRadius: '2px',
                backgroundColor: 'var(--hitodama-accent, #D7B56D)'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--hitodama-accent, #D7B56D)' }}>
                Next Â· 11:00 AM
              </span>
              <span style={{ fontSize: '11px', color: '#8E919A' }}>
                Daily AI news research
              </span>
            </div>
          </div>
        </div>

        {/* To-Do / Timer Card (354px Ã— 174px) */}
        <div
          style={{
            width: '354px',
            height: '174px',
            borderRadius: '16px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '14px 16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Header with Circular Counter Ring */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#F4F5F7' }}>
              To-Do List
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="24" height="24" viewBox="0 0 30 30" aria-hidden="true">
                <circle
                  cx="15"
                  cy="15"
                  r="13"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="15"
                  cy="15"
                  r="13"
                  fill="none"
                  stroke="var(--hitodama-accent, #D7B56D)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${ringCircumference * progressRatio} ${ringCircumference}`}
                  transform="rotate(-90 15 15)"
                />
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#8E919A' }}>
                {completedCount} / {totalCount}
              </span>
            </div>
          </div>

          {/* Interactive To-Do Items List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '76px',
              overflowY: 'auto'
            }}
          >
            {todos.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => toggleTodo(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  opacity: item.completed ? 0.45 : 1,
                  transition: 'opacity 160ms ease'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: item.completed
                      ? 'none'
                      : '1.5px solid rgba(255, 255, 255, 0.35)',
                    backgroundColor: item.completed ? 'var(--hitodama-accent, #D7B56D)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#141310'
                  }}
                >
                  {item.completed && <Check size={12} strokeWidth={3} />}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#F4F5F7',
                    textDecoration: item.completed ? 'line-through' : 'none'
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {/* Add a to-do row */}
          {isAdding ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTodo()
                  if (e.key === 'Escape') setIsAdding(false)
                }}
                placeholder="New task..."
                style={{
                  flex: 1,
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  outline: 'none',
                  color: '#F4F5F7',
                  padding: '0 8px',
                  fontSize: '11px'
                }}
                autoFocus
              />
              <button
                onClick={handleAddTodo}
                style={{
                  background: 'var(--hitodama-accent, #D7B56D)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#141310',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <CornerDownLeft size={12} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#8E919A',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '2px 0'
              }}
            >
              <Plus size={14} />
              <span>Add a to-doâ€¦</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TodayWidget
