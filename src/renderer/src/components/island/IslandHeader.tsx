import React, { useState, useEffect } from 'react'
import { Pin, Minimize2, Settings } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'

interface IslandHeaderProps {
  onCollapse: () => void
}

export const IslandHeader: React.FC<IslandHeaderProps> = ({ onCollapse }) => {
  const { preferences, setPreferences, activeTab, setActiveTab, setStatusMessage } = useIslandStore()
  const [greeting, setGreeting] = useState<string>('')
  const [timeStr, setTimeStr] = useState<string>('')

  useEffect(() => {
    const updateHeaderClock = (): void => {
      const now = new Date()
      const hour = now.getHours()

      let baseGreeting = 'Good evening'
      if (hour < 12) baseGreeting = 'Good morning'
      else if (hour < 17) baseGreeting = 'Good afternoon'

      const name = preferences?.userName?.trim()
      setGreeting(name ? `${baseGreeting}, ${name}` : baseGreeting)

      const is12h = preferences?.clockFormat === '12h'
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: is12h ? 'numeric' : '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: is12h
        })
      )
    }

    updateHeaderClock()
    const timer = setInterval(updateHeaderClock, 1000)
    return () => clearInterval(timer)
  }, [preferences?.userName, preferences?.clockFormat])

  const handleTogglePin = async (): Promise<void> => {
    const next = !preferences?.isPinned
    setPreferences({ isPinned: next })
    if (window.isDelulu) {
      await window.isDelulu.updatePreferences({ isPinned: next })
      setStatusMessage(next ? 'Island pinned open' : 'Island unpinned (auto-hide active)')
    }
  }

  const handleOpenSettings = (): void => {
    setActiveTab(activeTab === 'settings' ? 'launcher' : 'settings')
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        userSelect: 'none'
      }}
    >
      {/* Dynamic Greeting & Live Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em'
          }}
        >
          {greeting}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
        <span
          className="tabular-nums"
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}
        >
          {timeStr}
        </span>
      </div>

      {/* Control Buttons (Settings, Pin, Collapse) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <button
          className="btn-icon"
          title="Personalization Settings"
          onClick={handleOpenSettings}
          style={{
            color: activeTab === 'settings' ? 'var(--accent)' : 'var(--text-secondary)',
            borderColor: activeTab === 'settings' ? 'var(--border-active)' : 'var(--border-subtle)',
            backgroundColor: activeTab === 'settings' ? 'var(--accent-subtle)' : undefined
          }}
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>

        <button
          className="btn-icon"
          title={preferences?.isPinned ? 'Unpin Island (Enable Auto-hide)' : 'Pin Island Open'}
          onClick={handleTogglePin}
          style={{
            color: preferences?.isPinned ? 'var(--accent)' : 'var(--text-secondary)',
            borderColor: preferences?.isPinned ? 'var(--border-active)' : 'var(--border-subtle)',
            backgroundColor: preferences?.isPinned ? 'var(--accent-subtle)' : undefined
          }}
          aria-label="Toggle Pin"
        >
          <Pin size={14} />
        </button>

        <button
          className="btn-icon"
          title="Collapse Island (Esc)"
          onClick={onCollapse}
          aria-label="Collapse Island"
        >
          <Minimize2 size={14} />
        </button>
      </div>
    </div>
  )
}
export default IslandHeader
