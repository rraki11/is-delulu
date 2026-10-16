import React, { useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphingIsland } from './components/island/MorphingIsland'
import { useIslandStore } from './store/useIslandStore'
import { useIslandStateMachine } from './hooks/useIslandStateMachine'
import { IslandMode, AccentPalette } from '../../shared/types'

export const App: React.FC = () => {
  const {
    mode,
    setMode,
    preferences,
    setPreferences,
    setTheme,
    setAccentPalette,
    setSystemStats,
    setClipboardItems,
    setMediaState,
    setRoutines,
    statusMessage,
    setStatusMessage
  } = useIslandStore()

  const isIgnoringRef = useRef(true)
  const currentThemeRef = useRef<'light' | 'dark'>('dark')
  const currentPaletteRef = useRef<AccentPalette | null>(null)

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
    hide,
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

  // Apply accent palette CSS variables to document root
  const applyAccentPalette = useCallback(
    (palette: AccentPalette, themeMode: 'light' | 'dark') => {
      setAccentPalette(palette)
      currentPaletteRef.current = palette
      const isLight = themeMode === 'light'
      const primary = isLight ? palette.primaryLight : palette.primary
      const root = document.documentElement
      root.style.setProperty('--accent', primary)
      root.style.setProperty('--accent-secondary', palette.secondary)
      root.style.setProperty('--accent-highlight', palette.highlight)
      root.style.setProperty('--accent-glow', palette.glow)
      root.style.setProperty('--accent-subtle', palette.subtle)
      root.style.setProperty('--accent-border', palette.border)
      root.style.setProperty('--border-active', palette.border)
      root.style.setProperty('--border-glass', palette.subtle)
      root.style.setProperty('--text-accent', isLight ? primary : palette.text)

      // Derive per-channel RGBA glow vars for secondary and highlight colors
      // so the island surface gradient can use all three palette colors independently
      const hexToRgbChannels = (hex: string): [number, number, number] => {
        try {
          const clean = hex.replace('#', '').trim()
          const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
          const num = parseInt(full, 16)
          return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
        } catch {
          return [139, 92, 246]
        }
      }
      const [sr, sg, sb] = hexToRgbChannels(palette.secondary)
      const [hr, hg, hb] = hexToRgbChannels(palette.highlight)
      root.style.setProperty('--accent-secondary-glow', `rgba(${sr}, ${sg}, ${sb}, 0.22)`)
      root.style.setProperty('--accent-highlight-glow', `rgba(${hr}, ${hg}, ${hb}, 0.18)`)

      // Calculate accessible contrast for text rendered directly on --accent backgrounds
      let lum = 0.5
      try {
        const clean = primary.replace('#', '').trim()
        const fullHex = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
        const num = parseInt(fullHex, 16)
        const r = (num >> 16) & 255
        const g = (num >> 8) & 255
        const b = num & 255
        lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      } catch {}
      root.style.setProperty('--text-on-accent', lum > 0.65 ? '#0A0D0E' : '#FFFFFF')
    },
    [setAccentPalette]
  )

  // Apply theme to DOM
  const applyTheme = useCallback(
    (themeName: 'light' | 'dark') => {
      currentThemeRef.current = themeName
      setTheme(themeName)
      document.documentElement.dataset.theme = themeName
      if (currentPaletteRef.current) {
        applyAccentPalette(currentPaletteRef.current, themeName)
      }
    },
    [setTheme, applyAccentPalette]
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
      } else if (nextMode === 'hidden') {
        hide()
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

    // Load initial accent palette and subscribe to updates
    if (window.isDelulu.getAccentPalette) {
      window.isDelulu.getAccentPalette().then((palette) => {
        applyAccentPalette(palette, currentThemeRef.current)
      })
    }

    const unsubAccent = window.isDelulu.onAccentPaletteChanged
      ? window.isDelulu.onAccentPaletteChanged((palette) => {
          applyAccentPalette(palette, currentThemeRef.current)
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
      unsubAccent()
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

    const handleWindowMouseLeave = (): void => {
      handlePointerLeave()
    }

    const handleWindowBlur = (): void => {
      handlePointerLeave()
    }

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true })
    window.addEventListener('mouseleave', handleWindowMouseLeave)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseleave', handleWindowMouseLeave)
      window.removeEventListener('blur', handleWindowBlur)
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
        overflow: 'hidden',
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
