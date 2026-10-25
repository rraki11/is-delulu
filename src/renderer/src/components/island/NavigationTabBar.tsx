import React, { useRef, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { ExpandedTab, HITODAMA_EASING } from '../../shared'

export interface HitodamaTabDef {
  id: ExpandedTab
  label: string
  width: number
}

export const HITODAMA_TABS: HitodamaTabDef[] = [
  { id: 'controls',  label: 'Controls',  width: 83 },
  { id: 'today',     label: 'Today',     width: 64 },
  { id: 'stats',     label: 'Stats',     width: 60 },
  { id: 'clipboard', label: 'Clipboard', width: 90 },
  { id: 'apps',      label: 'Apps',      width: 58 },
  { id: 'wallpaper', label: 'Wallpaper', width: 94 },
  { id: 'power',     label: 'Power',     width: 67 }
]

// Normalize legacy tab IDs to Hitodama tab IDs
export function normalizeTab(tab: ExpandedTab): ExpandedTab {
  switch (tab) {
    case 'launcher':
      return 'apps'
    case 'calendar':
      return 'today'
    case 'system':
      return 'stats'
    case 'media':
      return 'controls'
    case 'routines':
      return 'wallpaper'
    default:
      return tab
  }
}

interface NavigationTabBarProps {
  activeTab: ExpandedTab
  setActiveTab: (tab: ExpandedTab) => void
  panelWidth?: number
}

export const NavigationTabBar: React.FC<NavigationTabBarProps> = ({
  activeTab,
  setActiveTab,
  panelWidth = 640
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const normalizedActive = normalizeTab(activeTab)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = (index + 1) % HITODAMA_TABS.length
        setActiveTab(HITODAMA_TABS[nextIndex].id)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIndex = (index - 1 + HITODAMA_TABS.length) % HITODAMA_TABS.length
        setActiveTab(HITODAMA_TABS[prevIndex].id)
      }
    },
    [setActiveTab]
  )

  // Hitodama centered formula: left = 18 + (panelWidth - 36 - totalTabWidth) / 2
  // Total tabs width = sum(width) + 6px * (length - 1) = 516 + 36 = 552px
  const totalTabsWidth = HITODAMA_TABS.reduce((acc, t) => acc + t.width, 0) + 6 * (HITODAMA_TABS.length - 1)

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Hitodama Navigation Tabs"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        width: '100%',
        padding: '12px 0 8px 0',
        boxSizing: 'border-box',
        userSelect: 'none',
        position: 'relative',
        zIndex: 10
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          maxWidth: `${totalTabsWidth}px`
        }}
      >
        {HITODAMA_TABS.map((tab, idx) => {
          const isActive = normalizedActive === tab.id
          return (
            <motion.button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`hitodama-nav-tab-btn ${isActive ? 'active' : ''}`}
              style={{
                width: `${tab.width}px`,
                height: '30px',
                borderRadius: '9999px',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                letterSpacing: '-0.01em',
                position: 'relative',
                background: 'transparent',
                color: isActive
                  ? 'var(--wallpaper-accent-foreground, var(--text-on-accent, #141310))'
                  : '#8E919A',
                padding: 0,
                WebkitTapHighlightColor: 'transparent'
              }}
              whileTap={{ scale: 0.96 }}
            >
              {isActive && (
                <motion.div
                  layoutId="hitodama-active-tab-indicator"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9999px',
                    background: 'var(--wallpaper-accent-primary, var(--hitodama-accent, #D7B56D))',
                    boxShadow:
                      '0 2px 8px rgba(0, 0, 0, 0.28), 0 0 10px var(--wallpaper-accent-glow, rgba(215, 181, 109, 0.2))',
                    zIndex: 1
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 35
                  }}
                />
              )}
              <span
                style={{
                  position: 'relative',
                  zIndex: 2,
                  pointerEvents: 'none',
                  transition: 'color 180ms ease'
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
