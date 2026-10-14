import React, { useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphingIsland } from './components/island/MorphingIsland'
import { useIslandStore } from './store/useIslandStore'
import { useIslandStateMachine } from './hooks/useIslandStateMachine'
import { IslandMode } from '../../shared/types'

export const App: React.FC = () => {
  const {
    mode,
    setMode,
    preferences,
    setPreferences,
    setTheme,
    setSystemStats,
    setClipboardItems,
    setMediaState,
    setRoutines,
    statusMessage,
    setStatusMessage
  } = useIslandStore()

  const isIgnoringRef = useRef(true)

  // Coordinate click-through pass-through for transparent window regions
  const updateMouseHitTest = useCallback((isInsideIsland: boolean) => {
    if (!window.isDelulu || typeof window.isDelulu.setIgnoreMouseEvents !== 'function') return

    if (isInsideIsland) {
      if (isIgnoringRef.current) {
        isIgnoringRef.current = false
        window.isDelulu.setIgnoreMouseEvents(false)
      }
    } else {
      if (!isIgnoringRef.current) {
        isIgnoringRef.current = true
        window.isDelulu.setIgnoreMouseEvents(true, true)
      }
    }
  }, [])

  // Centralized State Machine for HIDDEN, COLLAPSED, EXPANDED, PINNED
  const {
    state: machineState,
    currentMode,
    handlePointerEnter,
    handlePointerLeave,
    expand,
    collapse,
    reveal,
    clearTimer
  } = useIslandStateMachine({
    initialMode: mode,
    preferences,
    onModeChange: (nextMode: IslandMode) => {
      setMode(nextMode)
    },
    updateMouseHitTest
  })

  const currentModeRef = useRef(currentMode)
  currentModeRef.current = currentMode

  // Apply theme to DOM
  const applyTheme = useCallback(
    (themeName: 'light' | 'dark') => {
      setTheme(themeName)
      document.documentElement.dataset.theme = themeName
    },
    [setTheme]
  )

  // Initialize data, preferences, theme, and IPC event subscriptions
  useEffect(() => {
    if (!window.isDelulu) return

    // 1. Load preferences & sync theme
    window.isDelulu.getPreferences().then((loadedPrefs) => {
      setPreferences(loadedPrefs)
      if (loadedPrefs.appearance === 'system') {
        window.isDelulu.getResolvedTheme().then(applyTheme)
      } else {
        applyTheme(loadedPrefs.appearance)
      }
    })

    // 2. Initial telemetry & services load
    window.isDelulu.getSystemStats().then(setSystemStats)
    window.isDelulu.getClipboardHistory().then(setClipboardItems)
    window.isDelulu.getMediaState().then(setMediaState)
    window.isDelulu.getRoutines().then(setRoutines)

    // 3. Subscriptions
    const unsubSystem = window.isDelulu.onSystemStatsUpdate(setSystemStats)
    const unsubClip = window.isDelulu.onClipboardUpdate(setClipboardItems)

    const unsubMode = window.isDelulu.onIslandModeChanged((nextMode) => {
      if (nextMode === currentModeRef.current) return
      if (nextMode === 'expanded') {
        expand()
      } else if (nextMode === 'collapsed') {
        collapse()
      }
    })

    const unsubReveal = window.isDelulu.onIslandReveal(() => {
      reveal()
    })

    const unsubHover = window.isDelulu.onIslandHoverState((isHovered) => {
      if (isHovered) {
        handlePointerEnter()
      } else {
        handlePointerLeave()
      }
    })

    const unsubDebug = window.isDelulu.onForceVisibleChanged((isForced) => {
      if (isForced) {
        reveal()
      }
      setStatusMessage(isForced ? 'Debug: Force-Visible ON' : 'Debug: Force-Visible OFF')
    })

    const unsubPrefs = window.isDelulu.onPreferencesChanged((updatedPrefs) => {
      setPreferences(updatedPrefs)
      if (updatedPrefs.appearance === 'system') {
        window.isDelulu.getResolvedTheme().then(applyTheme)
      } else {
        applyTheme(updatedPrefs.appearance)
      }
    })

    const unsubTheme = window.isDelulu.onThemeChanged((theme) => {
      if (preferences?.appearance === 'system') {
        applyTheme(theme)
      }
    })

    const unsubMedia = window.isDelulu.onMediaStateUpdate
      ? window.isDelulu.onMediaStateUpdate((media) => {
          setMediaState(media)
        })
      : () => {}

    return () => {
      unsubSystem()
      unsubClip()
      unsubMedia()
      unsubMode()
      unsubReveal()
      unsubHover()
      unsubDebug()
      unsubPrefs()
      unsubTheme()
      clearTimer()
    }
  }, [
    setSystemStats,
    setClipboardItems,
    setMediaState,
    setRoutines,
    setPreferences,
    applyTheme,
    expand,
    collapse,
    reveal,
    handlePointerEnter,
    handlePointerLeave,
    clearTimer,
    preferences?.appearance
  ])

  // Track global pointer movements for hit testing & click pass-through
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent): void => {
      if (currentMode === 'hidden') return
      const surface = document.getElementById('island-surface')
      if (!surface) return

      const rect = surface.getBoundingClientRect()
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (isInside) {
        handlePointerEnter()
      } else {
        handlePointerLeave()
      }
    }

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [currentMode, handlePointerEnter, handlePointerLeave])

  // Handle Escape key to collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && (currentMode === 'expanded' || machineState === 'EXPANDED')) {
        collapse()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentMode, machineState, collapse])

  // Clear toast feedback after delay
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null)
      }, 2400)
      return () => clearTimeout(timer)
    }
  }, [statusMessage, setStatusMessage])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        background: 'transparent',
        pointerEvents: 'none'
      }}
    >
      {/* Single coherent morphing island container */}
      <MorphingIsland
        mode={currentMode}
        onExpand={expand}
        onCollapse={collapse}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      {/* Floating Status Toast Feedback */}
      <AnimatePresence>
        {statusMessage && currentMode === 'expanded' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'fixed',
              bottom: '12px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-active)',
              borderRadius: '9999px',
              padding: '6px 14px',
              boxShadow: 'var(--shadow-pill)',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              pointerEvents: 'none',
              zIndex: 9999
            }}
          >
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default App
