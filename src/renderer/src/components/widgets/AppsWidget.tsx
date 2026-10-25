import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { Search, Zap, Star } from 'lucide-react'
import { HITODAMA_EASING } from '../../shared'

interface AppItem {
  id: string
  name: string
  tail: string
  starred?: boolean
  section: 'STARRED' | 'RECENT' | 'APPLICATIONS'
  target: string
}

const DEFAULT_APPS: AppItem[] = [
  // Starred
  { id: 'spotify', name: 'Spotify', tail: 'Application', starred: true, section: 'STARRED', target: 'spotify.exe' },
  { id: 'vscode', name: 'Visual Studio Code', tail: 'Application', starred: true, section: 'STARRED', target: 'code' },

  // Recent
  { id: 'chrome', name: 'Google Chrome', tail: 'Application', starred: false, section: 'RECENT', target: 'https://google.com' },
  { id: 'discord', name: 'Discord', tail: 'Application', starred: false, section: 'RECENT', target: 'discord.exe' },
  { id: 'explorer', name: 'File Explorer', tail: 'Application', starred: false, section: 'RECENT', target: 'explorer.exe' },

  // Applications
  { id: 'minecraft', name: 'Minecraft', tail: 'Game', starred: false, section: 'APPLICATIONS', target: 'minecraft.exe' },
  { id: 'valorant', name: 'Valorant', tail: 'Game', starred: false, section: 'APPLICATIONS', target: 'valorant.exe' },
  { id: 'calculator', name: 'Calculator', tail: 'Application', starred: false, section: 'APPLICATIONS', target: 'calc.exe' },
  { id: 'canva', name: 'Canva', tail: 'Application', starred: false, section: 'APPLICATIONS', target: 'https://canva.com' },
  { id: 'notepad', name: 'Notepad', tail: 'Application', starred: false, section: 'APPLICATIONS', target: 'notepad.exe' },
  { id: 'terminal', name: 'Terminal', tail: 'Application', starred: false, section: 'APPLICATIONS', target: 'powershell.exe' },
  { id: 'taskmgr', name: 'Task Manager', tail: 'Application', starred: false, section: 'APPLICATIONS', target: 'taskmgr.exe' }
]

const QUICK_CHIPS = ['gmail', 'Gta 5', 'terminal', 'downloads']

export const AppsWidget: React.FC = () => {
  const [search, setSearch] = useState('')
  const [apps, setApps] = useState<AppItem[]>(() => {
    try {
      const saved = localStorage.getItem('hitodama_starred_apps')
      if (saved) {
        const starredIds = new Set<string>(JSON.parse(saved))
        return DEFAULT_APPS.map((a) => ({
          ...a,
          starred: starredIds.has(a.id),
          section: starredIds.has(a.id) ? 'STARRED' : a.section === 'STARRED' ? 'APPLICATIONS' : a.section
        }))
      }
    } catch {}
    return DEFAULT_APPS
  })

  const [focusedIndex, setFocusedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Save starred preferences
  const toggleStar = useCallback((appId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setApps((prev) => {
      const next = prev.map((a) => {
        if (a.id === appId) {
          const nextStarred = !a.starred
          return {
            ...a,
            starred: nextStarred,
            section: (nextStarred ? 'STARRED' : 'APPLICATIONS') as AppItem['section']
          }
        }
        return a
      })
      try {
        const starred = next.filter((a) => a.starred).map((a) => a.id)
        localStorage.setItem('hitodama_starred_apps', JSON.stringify(starred))
      } catch {}
      return next
    })
  }, [])

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps
    const q = search.toLowerCase()
    return apps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.tail.toLowerCase().includes(q)
    )
  }, [apps, search])

  // Group by sections
  const groupedSections = useMemo(() => {
    const starred = filteredApps.filter((a) => a.section === 'STARRED')
    const recent = filteredApps.filter((a) => a.section === 'RECENT')
    const applications = filteredApps.filter(
      (a) => a.section === 'APPLICATIONS' && !a.starred
    )

    const list: { title: string; items: AppItem[] }[] = []
    if (starred.length > 0) list.push({ title: 'STARRED', items: starred })
    if (recent.length > 0) list.push({ title: 'RECENT', items: recent })
    if (applications.length > 0) list.push({ title: 'APPLICATIONS', items: applications })
    return list
  }, [filteredApps])

  const flatItems = useMemo(() => {
    return groupedSections.flatMap((s) => s.items)
  }, [groupedSections])

  const handleLaunch = useCallback(async (item: AppItem): Promise<void> => {
    if (window.isDelulu?.launchShortcut) {
      await window.isDelulu.launchShortcut(item.id, item.target)
    } else {
      console.log(`[AppsWidget] Launch: ${item.name} -> ${item.target}`)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % (flatItems.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + flatItems.length) % (flatItems.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = flatItems[focusedIndex]
      if (target) {
        handleLaunch(target)
      }
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        height: '560px',
        boxSizing: 'border-box'
      }}
      onKeyDown={handleKeyDown}
    >
      {/* ── Search Bar ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#1C1C1E',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          boxSizing: 'border-box'
        }}
      >
        <Search size={18} color="#8E919A" style={{ marginRight: '10px', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setFocusedIndex(0)
          }}
          placeholder="Search apps, files and snippets…"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#F4F5F7',
            fontSize: '13px',
            fontWeight: 500
          }}
          autoFocus
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#8E919A',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          Win+A
        </span>
      </div>

      {/* ── Frequent Chips ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {QUICK_CHIPS.map((chip) => (
          <motion.button
            key={chip}
            onClick={() => {
              setSearch(chip)
              inputRef.current?.focus()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#F4F5F7',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap size={12} fill="var(--hitodama-accent, #D7B56D)" color="var(--hitodama-accent, #D7B56D)" />
            {chip}
          </motion.button>
        ))}
      </div>

      {/* ── Grouped App List ────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          paddingRight: '4px'
        }}
      >
        {groupedSections.map((group) => (
          <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Section Header */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#6E727A',
                letterSpacing: '0.04em',
                paddingLeft: '4px',
                marginBottom: '2px'
              }}
            >
              {group.title}
            </span>

            {/* Rows */}
            {group.items.map((appItem) => {
              const flatIdx = flatItems.indexOf(appItem)
              const isFocused = flatIdx === focusedIndex

              return (
                <motion.div
                  key={appItem.id}
                  onClick={() => handleLaunch(appItem)}
                  onPointerEnter={() => setFocusedIndex(flatIdx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    backgroundColor: isFocused
                      ? 'rgba(215, 181, 109, 0.14)'
                      : 'transparent',
                    border: isFocused
                      ? '1px solid rgba(215, 181, 109, 0.32)'
                      : '1px solid transparent',
                    transition: 'background-color 140ms ease, border-color 140ms ease'
                  }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.14, ease: HITODAMA_EASING }}
                >
                  {/* Left: Tile Badge + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: '#26282E',
                        color: '#F4F5F7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 600
                      }}
                    >
                      {appItem.name.charAt(0)}
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isFocused ? 600 : 500,
                        color: isFocused ? '#FFFFFF' : '#E0E2E8'
                      }}
                    >
                      {appItem.name}
                    </span>
                  </div>

                  {/* Right: Action / Tail + Star */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isFocused ? 'var(--hitodama-accent, #D7B56D)' : '#8E919A',
                        fontWeight: isFocused ? 600 : 500
                      }}
                    >
                      {isFocused ? '↵ Open' : appItem.tail}
                    </span>
                    <button
                      onClick={(e) => toggleStar(appItem.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        color: appItem.starred
                          ? 'var(--hitodama-accent, #D7B56D)'
                          : '#5E6268'
                      }}
                      title={appItem.starred ? 'Unstar' : 'Star'}
                    >
                      <Star
                        size={15}
                        fill={appItem.starred ? 'var(--hitodama-accent, #D7B56D)' : 'none'}
                        strokeWidth={appItem.starred ? 0 : 2}
                      />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AppsWidget
