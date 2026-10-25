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
  Check,
  Image as ImageIcon,
  Pipette,
  RotateCcw
} from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { AppearanceMode, ClockFormat, AccentThemeMode } from '../../shared'

export const SettingsWidget: React.FC = () => {
  const { preferences, setPreferences, setStatusMessage, accentPalette } = useIslandStore()

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

  const handleSetAccentMode = async (mode: AccentThemeMode): Promise<void> => {
    setPreferences({ accentMode: mode })
    if (window.isDelulu) {
      await window.isDelulu.updatePreferences({ accentMode: mode })
      setStatusMessage(
        `Accent theme set to ${
          mode === 'wallpaper' ? 'Windows Wallpaper (Auto)' : mode === 'manual' ? 'Manual Color' : 'Default Palette'
        }`
      )
    }
  }

  const handleUpdateManualColor = async (color: string): Promise<void> => {
    setPreferences({ accentMode: 'manual', manualAccentColor: color })
    if (window.isDelulu) {
      await window.isDelulu.updatePreferences({ accentMode: 'manual', manualAccentColor: color })
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
          <span
            className="font-display"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0'
            }}
          >
            Display Name
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
              fontFamily: 'var(--font-text)',
              fontSize: '12px',
              letterSpacing: '0',
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
              fontSize: '11px',
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
          <span
            className="font-display"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0'
            }}
          >
            Clock Format
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
              fontSize: '12px',
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
              fontSize: '12px',
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
          <span
            className="font-display"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0'
            }}
          >
            Appearance
          </span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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

      {/* 4. Accent Theme Engine (Wallpaper / Manual / Default) */}
      <div
        className="glass-surface"
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={14} color="var(--accent)" />
            <span
              className="font-display"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0'
              }}
            >
              Accent Theme
            </span>
          </div>
          {accentPalette?.primary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent-glow)'
                }}
              />
              <span className="tabular-nums font-mono" style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {accentPalette.primary}
              </span>
            </div>
          )}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Automatically adapt accent colors to your Windows wallpaper or select a custom tint.
        </p>

        {/* Mode Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '2px'
          }}
        >
          {/* Wallpaper Mode */}
          <button
            onClick={() => handleSetAccentMode('wallpaper')}
            style={{
              padding: '9px 8px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                (preferences?.accentMode || 'wallpaper') === 'wallpaper'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                (preferences?.accentMode || 'wallpaper') === 'wallpaper'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                (preferences?.accentMode || 'wallpaper') === 'wallpaper'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: (preferences?.accentMode || 'wallpaper') === 'wallpaper' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <ImageIcon size={15} />
            <span>Wallpaper</span>
          </button>

          {/* Manual Mode */}
          <button
            onClick={() => handleSetAccentMode('manual')}
            style={{
              padding: '9px 8px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                preferences?.accentMode === 'manual'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                preferences?.accentMode === 'manual'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                preferences?.accentMode === 'manual'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: preferences?.accentMode === 'manual' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Pipette size={15} />
            <span>Manual</span>
          </button>

          {/* Default Mode */}
          <button
            onClick={() => handleSetAccentMode('default')}
            style={{
              padding: '9px 8px',
              borderRadius: 'var(--radius-button)',
              backgroundColor:
                preferences?.accentMode === 'default'
                  ? 'var(--accent-subtle)'
                  : 'rgba(125, 125, 125, 0.06)',
              border:
                preferences?.accentMode === 'default'
                  ? '1px solid var(--border-active)'
                  : '1px solid var(--border-subtle)',
              color:
                preferences?.accentMode === 'default'
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: preferences?.accentMode === 'default' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <RotateCcw size={15} />
            <span>Default</span>
          </button>
        </div>

        {/* Manual Color Picker Controls */}
        {preferences?.accentMode === 'manual' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '4px',
              padding: '10px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-button)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Choose Custom Accent
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={preferences?.manualAccentColor || '#8B5CF6'}
                  onChange={(e) => handleUpdateManualColor(e.target.value)}
                  style={{
                    width: '28px',
                    height: '24px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                  title="Pick custom color"
                />
                <span className="tabular-nums font-mono" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {preferences?.manualAccentColor || '#8B5CF6'}
                </span>
              </div>
            </div>

            {/* Quick Preset Swatches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {['#8B5CF6', '#3B82F6', '#00F0FF', '#10B981', '#BBFF00', '#F59E0B', '#EC4899'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleUpdateManualColor(preset)}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: preset,
                    border: preferences?.manualAccentColor === preset ? '2px solid #FFFFFF' : '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: preferences?.manualAccentColor === preset ? `0 0 8px ${preset}` : 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform var(--transition-fast)'
                  }}
                  title={preset}
                />
              ))}
            </div>
          </div>
        )}

        {/* Live Palette Swatches Preview */}
        {accentPalette && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    backgroundColor: accentPalette.primary,
                    boxShadow: `0 0 6px ${accentPalette.glow}`
                  }}
                  title={`Primary: ${accentPalette.primary}`}
                />
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    backgroundColor: accentPalette.secondary
                  }}
                  title={`Secondary: ${accentPalette.secondary}`}
                />
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    backgroundColor: accentPalette.highlight
                  }}
                  title={`Highlight: ${accentPalette.highlight}`}
                />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {(preferences?.accentMode || 'wallpaper') === 'wallpaper'
                  ? accentPalette.sourceWallpaper
                    ? `Wallpaper: ${accentPalette.sourceWallpaper.split(/[\\\\/]/).pop()}`
                    : 'Windows Wallpaper Active'
                  : preferences?.accentMode === 'manual'
                  ? 'Custom Palette Active'
                  : 'Default Palette Active'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Island Pinning & Hover Behavior */}
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
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Pin Island Open
            </span>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
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
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
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
            fontFamily: 'var(--font-mono)'
          }}
        >
          Ctrl + Shift + Space
        </kbd>
      </div>
    </div>
  )
}
export default SettingsWidget
