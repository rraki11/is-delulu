import { CalendarEvent } from '../shared'

const STORAGE_KEY = 'is-delulu:calendar-events-v1'

const formatZero = (n: number): string => (n < 10 ? `0${n}` : `${n}`)

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear()
  const m = formatZero(date.getMonth() + 1)
  const d = formatZero(date.getDate())
  return `${y}-${m}-${d}`
}

export const getInitialEvents = (): CalendarEvent[] => {
  const today = new Date()
  const todayKey = formatDateKey(today)

  // One tomorrow
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowKey = formatDateKey(tomorrow)

  return [
    {
      id: 'evt-init-1',
      date: todayKey,
      title: 'Deep Work & Project Review',
      time: '10:00 AM',
      completed: false,
      createdAt: Date.now() - 3600000
    },
    {
      id: 'evt-init-2',
      date: todayKey,
      title: 'Team Sync & Island Check-in',
      time: '02:30 PM',
      completed: true,
      createdAt: Date.now() - 1800000
    },
    {
      id: 'evt-init-3',
      date: tomorrowKey,
      title: 'Sprint Planning & Architecture',
      time: '11:15 AM',
      completed: false,
      createdAt: Date.now()
    }
  ]
}

export const loadCalendarEvents = (): CalendarEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const defaults = getInitialEvents()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(raw) as CalendarEvent[]
  } catch (err) {
    console.error('Failed to parse calendar events:', err)
    return []
  }
}

export const saveCalendarEvents = (events: CalendarEvent[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch (err) {
    console.error('Failed to save calendar events:', err)
  }
}

export const addCalendarEvent = (
  date: string,
  title: string,
  time?: string
): CalendarEvent => {
  const events = loadCalendarEvents()
  const newEvent: CalendarEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date,
    title: title.trim(),
    time: time?.trim() || undefined,
    completed: false,
    createdAt: Date.now()
  }
  events.push(newEvent)
  saveCalendarEvents(events)
  return newEvent
}

export const removeCalendarEvent = (id: string): CalendarEvent[] => {
  const events = loadCalendarEvents().filter((e) => e.id !== id)
  saveCalendarEvents(events)
  return events
}

export const toggleCalendarEvent = (id: string): CalendarEvent[] => {
  const events = loadCalendarEvents().map((e) =>
    e.id === id ? { ...e, completed: !e.completed } : e
  )
  saveCalendarEvents(events)
  return events
}
