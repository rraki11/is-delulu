import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { IslandHeader } from './IslandHeader'
import { NavigationTabBar } from './NavigationTabBar'
import { CommandSearch } from '../launcher/CommandSearch'
import { ShortcutGrid } from '../launcher/ShortcutGrid'
import { CalendarWidget } from '../widgets/CalendarWidget'
import { SystemWidget } from '../widgets/SystemWidget'
import { ClipboardWidget } from '../widgets/ClipboardWidget'
import { MediaWidget } from '../widgets/MediaWidget'
import { RoutinesWidget } from '../widgets/RoutinesWidget'
import { SettingsWidget } from '../settings/SettingsWidget'
import { useIslandStore } from '../../store/useIslandStore'
import { IslandMode, WINDOW_CONFIG } from '../../shared'

interface MorphingIslandProps {
  mode: IslandMode
  onExpand: () => void
  onCollapse: () => void
  onPointerEnter?: () => void
  onPointerLeave?: () => void
}

export const MorphingIsland: React.FC<MorphingIslandProps> = ({
  mode,
  onExpand,
  onCollapse,
  onPointerEnter,
  onPointerLeave
}) => {
  const preferences = useIslandStore((s) => s.preferences)
  const activeTab = useIslandStore((s) => s.activeTab)
  const setActiveTab = useIslandStore((s) => s.setActiveTab)
  const setStatusMessage = useIslandStore((s) => s.setStatusMessage)
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date()
      const is12h = preferences?.clockFormat === '12h'
      setTime(
        now.toLocaleTimeString([], {
          hour: is12h ? 'numeric' : '2-digit',
          minute: '2-digit',
          hour12: is12h
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [preferences?.clockFormat])

  const handleExecuteAction = async (id: string, target?: string): Promise<void> => {
    if (id === 'calendar' || id === 'cmd-open-calendar') {
      setActiveTab('calendar')
      return
    }
    if (window.isDelulu) {
      if (id.startsWith('cmd-')) {
        const result = await window.isDelulu.runCommand(id)
        setStatusMessage(result.message)
      } else {
        const result = await window.isDelulu.launchShortcut(id, target)
        setStatusMessage(result.message)
      }
    } else {
      setStatusMessage(`Action triggered: ${id}`)
    }
  }

  const isExpanded = mode === 'expanded'
  const isHidden = mode === 'hidden'

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 540
  )

  useEffect(() => {
    const handleResize = (): void => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const targetWidth = isExpanded ? WINDOW_CONFIG.panel.width : WINDOW_CONFIG.pill.width
  const integerLeft = Math.floor((windowWidth - targetWidth) / 2)

  return (
    <>
      {/* Wallpaper-adaptive gradient halo — sits OUTSIDE overflow:hidden so it bleeds */}
      <motion.div
        aria-hidden="true"
        className="island-accent-glow"
        initial={false}
        animate={{
          left: integerLeft - 18,
          width: targetWidth + 36,
          height: (isExpanded ? WINDOW_CONFIG.panel.height : WINDOW_CONFIG.pill.height) + 16,
          borderRadius: isExpanded ? '0px 0px 30px 30px' : '0px 0px 24px 24px',
          y: isHidden ? -48 : 0,
          opacity: isHidden ? 0 : 1
        }}
        transition={{
          type: 'spring',
          stiffness: 360,
          damping: 30,
          mass: 0.8
        }}
        style={{
          position: 'absolute',
          top: 0,
          transformOrigin: 'top center',
          originX: 0.5,
          originY: 0,
          pointerEvents: 'none',
          zIndex: 99
        }}
      />

      <motion.div
        id="island-surface"
        role={mode === 'collapsed' ? 'button' : undefined}
        tabIndex={mode === 'collapsed' ? 0 : undefined}
        onClick={mode === 'collapsed' ? onExpand : undefined}
        onKeyDown={
          mode === 'collapsed'
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onExpand()
                }
              }
            : undefined
        }
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        initial={false}
        animate={{
          left: integerLeft,
          width: targetWidth,
          height: isExpanded ? WINDOW_CONFIG.panel.height : WINDOW_CONFIG.pill.height,
          borderRadius: isExpanded ? '0px 0px 22px 22px' : '0px 0px 17px 17px',
          backgroundColor: isExpanded ? 'var(--bg-panel)' : 'var(--bg-pill)',
          boxShadow: isHidden
            ? 'none'
            : isExpanded
            ? 'var(--shadow-panel)'
            : 'var(--shadow-pill)',
          y: isHidden ? -48 : 0,
          opacity: isHidden ? 0 : 1
        }}
        whileTap={
          mode === 'collapsed'
            ? { scale: 0.98 }
            : undefined
        }
        transition={{
          type: 'spring',
          stiffness: 360,
          damping: 30,
          mass: 0.8
        }}
        onAnimationComplete={() => {
          if (mode === 'hidden' && window.isDelulu) {
            window.isDelulu.setIslandMode('hidden')
          }
        }}
        title={mode === 'collapsed' ? 'Click to expand' : undefined}
        style={{
          position: 'absolute',
          top: 0,
          transformOrigin: 'top center',
          originX: 0.5,
          originY: 0,
          border: 'none',
          overflow: 'hidden',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: mode === 'collapsed' ? 'pointer' : 'default',
          userSelect: 'none',
          outline: 'none',
          pointerEvents: isHidden ? 'none' : 'auto',
          zIndex: 100
        }}
      >
        {/* Wallpaper-adaptive animated gradient — three color orbs drift independently */}
        <div className={`island-gradient-stage${isExpanded ? ' expanded' : ''}`} aria-hidden="true">
          <div className="island-grad-orb island-grad-orb--primary" />
          <div className="island-grad-orb island-grad-orb--secondary" />
          <div className="island-grad-orb island-grad-orb--highlight" />
        </div>

      {/* Collapsed Pill Content (Minimal Digital Clock Only) */}
      {!isExpanded && (
        <motion.div
          key="pill-clock"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            boxSizing: 'border-box',
            pointerEvents: 'auto'
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 500,
              color: '#F4F5F0',
              letterSpacing: '0',
              lineHeight: 1
            }}
          >
            {time}
          </span>
        </motion.div>
      )}

      {/* Expanded Panel Dashboard Content */}
      {isExpanded && (
        <motion.div
          key="expanded-dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            width: '520px',
            height: '536px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {/* Panel Header */}
          <IslandHeader onCollapse={onCollapse} />

        {/* Navigation Tab Bar */}
        <NavigationTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Active Tab View */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              {activeTab === 'launcher' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <CommandSearch onExecuteAction={handleExecuteAction} />
                  <ShortcutGrid onLaunch={handleExecuteAction} />
                </div>
              )}
              {activeTab === 'calendar' && <CalendarWidget />}
              {activeTab === 'system' && <SystemWidget />}
              {activeTab === 'clipboard' && <ClipboardWidget />}
              {activeTab === 'media' && <MediaWidget />}
              {activeTab === 'routines' && <RoutinesWidget />}
              {activeTab === 'settings' && <SettingsWidget />}
            </motion.div>
          </AnimatePresence>
        </div>
        </motion.div>
      )}
      </motion.div>
    </>
  )
}

export default MorphingIsland
