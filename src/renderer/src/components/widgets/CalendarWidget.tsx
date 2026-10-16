import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar as CalendarIcon,
  Clock,
  Sparkles
} from 'lucide-react'
import { CalendarEvent } from '../../shared'
import { useIslandStore } from '../../store/useIslandStore'
import {
  formatDateKey,
  loadCalendarEvents,
  addCalendarEvent,
  removeCalendarEvent,
  toggleCalendarEvent
} from '../../utils/calendarStorage'

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

interface CalendarDayCell {
  date: Date
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  hasEvents: boolean
}

export const CalendarWidget: React.FC = () => {
  const { preferences, setStatusMessage } = useIslandStore()
  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => formatDateKey(today), [today])

  // Active viewed year & month
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth())

  // Selected date
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate])

  // Navigation direction for animation
  const [navDirection, setNavDirection] = useState<'left' | 'right'>('right')

  // Events state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventTime, setNewEventTime] = useState('')

  // Load events from local storage on mount
  useEffect(() => {
    setEvents(loadCalendarEvents())
  }, [])

  // Filter events for selected date
  const selectedEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedDateKey)
  }, [events, selectedDateKey])

  // Map of date keys that have at least one event
  const datesWithEvents = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => set.add(e.date))
    return set
  }, [events])

  // Month navigation
  const handlePrevMonth = (): void => {
    setNavDirection('left')
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = (): void => {
    setNavDirection('right')
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleJumpToToday = (): void => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
    setSelectedDate(now)
    setStatusMessage('Jumped to Today')
  }

  // Generate calendar grid days (Monday-first)
  const calendarGrid = useMemo<CalendarDayCell[]>(() => {
    const cells: CalendarDayCell[] = []

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    // In JS: Sun=0, Mon=1, ..., Sat=6. For Monday start: (day + 6) % 7
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7

    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    // 1. Trailing days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i)
      const dKey = formatDateKey(prevDate)
      cells.push({
        date: prevDate,
        dateKey: dKey,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
        hasEvents: datesWithEvents.has(dKey)
      })
    }

    // 2. Days of current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const cellDate = new Date(currentYear, currentMonth, day)
      const dKey = formatDateKey(cellDate)
      cells.push({
        date: cellDate,
        dateKey: dKey,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
        hasEvents: datesWithEvents.has(dKey)
      })
    }

    // 3. Leading days for next month to complete standard 35 or 42 grid cells
    const remainingCells = (7 - (cells.length % 7)) % 7
    const totalTarget = cells.length + remainingCells < 35 ? 35 : cells.length + remainingCells
    const extraNeeded = totalTarget - cells.length

    for (let day = 1; day <= extraNeeded; day++) {
      const nextDate = new Date(currentYear, currentMonth + 1, day)
      const dKey = formatDateKey(nextDate)
      cells.push({
        date: nextDate,
        dateKey: dKey,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        isSelected: dKey === selectedDateKey,
        hasEvents: datesWithEvents.has(dKey)
      })
    }

    return cells
  }, [currentYear, currentMonth, todayKey, selectedDateKey, datesWithEvents])

  // Select day handler
  const handleSelectDay = (cell: CalendarDayCell): void => {
    setSelectedDate(cell.date)
    // If user clicked adjacent month, synchronize viewed month as well
    if (!cell.isCurrentMonth) {
      setCurrentYear(cell.date.getFullYear())
      setCurrentMonth(cell.date.getMonth())
    }
  }

  // Event creation
  const handleAddEvent = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!newEventTitle.trim()) return

    const created = addCalendarEvent(selectedDateKey, newEventTitle, newEventTime)
    setEvents((prev) => [...prev, created])
    setNewEventTitle('')
    setNewEventTime('')
    setStatusMessage(`Added event for ${selectedDate.toLocaleDateString()}`)
  }

  const handleDeleteEvent = (id: string): void => {
    const updated = removeCalendarEvent(id)
    setEvents(updated)
    setStatusMessage('Event deleted')
  }

  const handleToggleEvent = (id: string): void => {
    const updated = toggleCalendarEvent(id)
    setEvents(updated)
  }

  // Formatted date string for selected date
  const formattedSelectedHeader = useMemo(() => {
    return selectedDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [selectedDate])

  const isSelectedToday = selectedDateKey === todayKey

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        maxWidth: '460px',
        margin: '0 auto',
        paddingBottom: '8px'
      }}
    >
      {/* Main Calendar Card - Direct visual realization of reference mockup */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#141519',
          backgroundImage: 'linear-gradient(180deg, #18191E 0%, #121316 100%)',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          padding: '16px 20px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Animated accent gradient orbs — drift behind all content */}
        <div className="cal-accent-orb" />

        {/* Top Notch Accent Glow & Horizontal Neon Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          {/* Neon violet light bar */}
          <div
            style={{
              width: '86px',
              height: '3.5px',
              borderRadius: '999px',
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 12px var(--accent), 0 0 24px var(--accent-glow)'
            }}
          />
          {/* Subtle curved notch silhouette */}
          <div
            style={{
              width: '92px',
              height: '14px',
              backgroundColor: 'rgba(10, 11, 14, 0.95)',
              borderRadius: '0 0 14px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          />
        </div>

        {/* Calendar Navigation Header (< Feb 2026 >) */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
            marginBottom: '14px',
            padding: '0 4px'
          }}
        >
          {/* Previous Month Circular Button */}
          <button
            onClick={handlePrevMonth}
            title="Previous month"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              color: '#E4E4E7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.16s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'scale(1.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Centered Month & Year Title (Clickable to jump to Today) */}
          <div
            onClick={handleJumpToToday}
            title="Click to jump to today"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 12px',
              borderRadius: '12px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <span
              className="font-display"
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: '#FFFFFF',
                letterSpacing: '-0.01em'
              }}
            >
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </div>

          {/* Next Month Circular Button */}
          <button
            onClick={handleNextMonth}
            title="Next month"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              color: '#E4E4E7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.16s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              e.currentTarget.style.transform = 'scale(1.06)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday Row (MON TUE WED THU FRI SAT SUN) */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            marginBottom: '8px',
            textAlign: 'center'
          }}
        >
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#71717A',
                letterSpacing: '0.06em',
                userSelect: 'none'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            rowGap: '3px',
            columnGap: '0px'
          }}
        >
          {calendarGrid.map((cell) => {
            const isSelected = cell.isSelected
            const isCurrentMonth = cell.isCurrentMonth
            const isToday = cell.isToday
            const hasEvents = cell.hasEvents

            return (
              <div
                key={cell.dateKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '38px'
                }}
              >
                <button
                  onClick={() => handleSelectDay(cell)}
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                    // Vibrant glowing accent for selected date; transparent otherwise
                    background: isSelected
                      ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%)'
                      : isToday
                      ? 'var(--accent-subtle)'
                      : 'transparent',
                    boxShadow: isSelected
                      ? '0 0 20px var(--accent-glow), 0 3px 10px var(--accent-subtle)'
                      : 'none',
                    borderWidth: isToday && !isSelected ? '1.5px' : '0px',
                    borderStyle: isToday && !isSelected ? 'solid' : 'none',
                    borderColor: isToday && !isSelected ? 'var(--accent-border)' : 'transparent',
                    color: isSelected
                      ? '#FFFFFF'
                      : isCurrentMonth
                      ? '#FFFFFF'
                      : 'rgba(255, 255, 255, 0.22)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.transform = 'scale(1.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = isToday
                        ? 'var(--accent-subtle)'
                        : 'transparent'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                >
                  <span
                    className="tabular-nums font-display"
                    style={{
                      fontSize: '15px',
                      fontWeight: isSelected ? 700 : isCurrentMonth ? 500 : 400,
                      lineHeight: 1
                    }}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Tiny event indicator dot */}
                  {hasEvents && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '4px',
                        width: '3.5px',
                        height: '3.5px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#FFFFFF' : 'var(--accent-highlight)',
                        boxShadow: isSelected ? '0 0 4px #FFFFFF' : '0 0 6px var(--accent)'
                      }}
                    />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Date Details & Event Agenda Panel */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'rgba(20, 21, 25, 0.85)',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Date header and today jump badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            paddingBottom: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={14} color="var(--accent-highlight)" />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#FFFFFF'
              }}
            >
              {formattedSelectedHeader}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isSelectedToday ? (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  backgroundColor: 'var(--accent-subtle)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid var(--accent-border)'
                }}
              >
                Today
              </span>
            ) : (
              <button
                onClick={handleJumpToToday}
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#A1A1AA',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '3px 9px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.14s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF'
                  e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#A1A1AA'
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                }}
              >
                Go to Today
              </button>
            )}
          </div>
        </div>

        {/* Event List for this date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {selectedEvents.length === 0 ? (
            <div
              style={{
                fontSize: '12px',
                color: '#71717A',
                fontStyle: 'italic',
                padding: '6px 2px'
              }}
            >
              No events scheduled for this day.
            </div>
          ) : (
            selectedEvents.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flex: 1,
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => handleToggleEvent(evt.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: evt.completed ? 'var(--accent)' : '#71717A',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={evt.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {evt.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: evt.completed ? '#71717A' : '#F4F4F5',
                        textDecoration: evt.completed ? 'line-through' : 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {evt.title}
                    </span>
                    {evt.time && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--accent-highlight)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Clock size={10} />
                        {evt.time}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteEvent(evt.id)}
                  title="Delete event"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#71717A',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '6px',
                    transition: 'color 0.14s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#EF4444'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#71717A'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Quick Add Event Form */}
        <form
          onSubmit={handleAddEvent}
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '4px'
          }}
        >
          <input
            type="text"
            placeholder="Add reminder / event..."
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '12px',
              color: '#FFFFFF',
              outline: 'none',
              transition: 'border-color 0.15s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-border)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            }}
          />

          <input
            type="text"
            placeholder="Time (optional)"
            value={newEventTime}
            onChange={(e) => setNewEventTime(e.target.value)}
            style={{
              width: '100px',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '7px 8px',
              fontSize: '11px',
              color: '#FFFFFF',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={!newEventTitle.trim()}
            title="Add event"
            style={{
              backgroundColor: newEventTitle.trim() ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: newEventTitle.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}

export default CalendarWidget
