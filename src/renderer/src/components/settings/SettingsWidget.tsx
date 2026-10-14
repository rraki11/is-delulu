import React from 'react'
import {
  User,
  Clock,
  Palette,
  Pin,
  Monitor,
  Sun,
  Moon,
  Sparkles,
  Command,
  Check
} from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { AppearanceMode, ClockFormat } from '../../shared'

export const SettingsWidget: React.FC = () => {
  const { preferences, setPreferences, setStatusMessage } = useIslandStore()

  const handleUpdateName = async (name: string): Promise<void> => {
    setPreferences({ userName: name })
    if (window.isDelulu) {
      await window.isDelulu.updatePreferences({ userName: name })
    }
  }

  const handleSetClockFormat = async (format: ClockFormat): Promise<void> => {
    setPreferences({ clockFormat: format })
    if (window.isDelulu) {
      await window.isDelulu.updatePreferences({ clockFormat: format })
      setStatusMessage(`Clock set to ${format === '12h' ? '12-Hour' : '24-Hour'} format`)
    }
  }

  const handleSetAppearance = async (mode: AppearanceMode): Promise<void> => {
    setPreferences({ appearance: mode })
    if (window.isDelulu) {
      await window.isDelulu.updatePreferences({ appearance: mode })
      setStatusMessage(`Theme set to ${mode === 'system' ? 'System Default' : mode === 'light' ? 'Light Mode' : 'Dark Mode'}`)
    }
  }

  const handleTogglePin = async (): Promise<void> => {
    const next = !preferences?.isPinned
    setPreferences({ isPinned: next })
    if (window.isDelulu) {
      await window.isDelulu.updatePreferences({ isPinned: next })
      setStatusMessage(next ? 'Island pinned open' : 'Island unpinned (auto-hide enabled)')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '2px 0'
      }}
    >

      {/* 1. Display Name Section */}
      <div
        className="glass-surface"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={14} color="var(--accent)" />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Display Name
          </span>
        </div>
        <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
          Shown in time-of-day greetings across the companion interface.
        </p>

        <div style={{ position: 'relative', marginTop: '2px' }}>
          <input
            type="text"
            value={preferences?.userName || ''}
            onChange={(e) => handleUpdateName(e.target.value)}
            placeholder="Enter your name (e.g. Shubham)"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '11.5px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-button)',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color var(--transition-fast)'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </div>

        {preferences?.userName && (
          <div
            style={{
              fontSize: '10.5px',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '2px'
            }}
          >
            <Check size={11} />
            <span>Greeting: "Good evening, {preferences.userName.trim()}"</span>
          </div>
        )}
      </div>

      {/* 2. Clock Format Section */}
      <div
        className="glass-surface"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={14} color="var(--accent)" />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Clock Format
          </span>
        </div>
        <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
          Controls the digital time presentation on both the collapsed pill and header.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginTop: '2px'
          }}
        >
          <button
            onClick={() => handleSetClockFormat('12h')}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                preferences?.clockFormat === '12h'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                preferences?.clockFormat === '12h'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                preferences?.clockFormat === '12h'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: preferences?.clockFormat === '12h' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)'
            }}
          >
            {preferences?.clockFormat === '12h' && <Check size={12} />}
            <span>12-Hour (8:30 PM)</span>
          </button>

          <button
            onClick={() => handleSetClockFormat('24h')}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                preferences?.clockFormat === '24h'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                preferences?.clockFormat === '24h'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                preferences?.clockFormat === '24h'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: preferences?.clockFormat === '24h' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)'
            }}
          >
            {preferences?.clockFormat === '24h' && <Check size={12} />}
            <span>24-Hour (20:30)</span>
          </button>
        </div>
      </div>

      {/* 3. Appearance Section (System / Light / Dark) */}
      <div
        className="glass-surface"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={14} color="var(--accent)" />
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Appearance
          </span>
        </div>
        <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
          Select between system default synchronization and forced light/dark themes.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '2px'
          }}
        >
          {/* System Default */}
          <button
            onClick={() => handleSetAppearance('system')}
            style={{
              padding: '9px 8px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                preferences?.appearance === 'system'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                preferences?.appearance === 'system'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                preferences?.appearance === 'system'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: preferences?.appearance === 'system' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Monitor size={15} />
            <span>System Default</span>
          </button>

          {/* Light Mode */}
          <button
            onClick={() => handleSetAppearance('light')}
            style={{
              padding: '9px 8px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                preferences?.appearance === 'light'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                preferences?.appearance === 'light'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                preferences?.appearance === 'light'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: preferences?.appearance === 'light' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Sun size={15} />
            <span>Light Mode</span>
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => handleSetAppearance('dark')}
            style={{
              padding: '9px 8px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                preferences?.appearance === 'dark'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                preferences?.appearance === 'dark'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                preferences?.appearance === 'dark'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: preferences?.appearance === 'dark' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Moon size={15} />
            <span>Dark Mode</span>
          </button>
        </div>
      </div>

      {/* 4. Island Pinning & Hover Behavior */}
      <div
        className="glass-surface"
        style={{
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Pin size={14} color="var(--accent)" style={{ marginTop: '2px' }} />
          <div>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Pin Island Open
            </span>
            <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Keep the island visible at all times. When unpinned, the island auto-hides and reveals on top-screen hover.
            </p>
          </div>
        </div>

        <button
          onClick={handleTogglePin}
          style={{
            padding: '5px 12px',
            borderRadius: '9999px',
            backgroundColor: preferences?.isPinned
              ? 'var(--accent)'
              : 'rgba(125, 125, 125, 0.15)',
            color: preferences?.isPinned ? '#0A0D0E' : 'var(--text-secondary)',
            border: 'none',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          {preferences?.isPinned ? 'Pinned' : 'Auto-Hide'}
        </button>
      </div>

      {/* 5. Shortcuts Reference */}
      <div
        className="glass-surface"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          backgroundColor: 'rgba(125, 125, 125, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Command size={13} color="var(--text-muted)" />
          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
            Toggle Island shortcut
          </span>
        </div>
        <kbd
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontFamily: 'monospace'
          }}
        >
          Ctrl + Shift + Space
        </kbd>
      </div>
    </div>
  )
}
export default SettingsWidget
