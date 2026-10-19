import React, { useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphingIsland } from './components/island/MorphingIsland'
import { EnergySaverPill } from './components/island/EnergySaverPill'
import { LowBatteryPill } from './components/island/LowBatteryPill'
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
    setStatusMessage,
    setBatteryState
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

  // Centralized State Machine for HIDDEN, NORMAL_REVEALING, COLLAPSED, EXPANDED, NOTIFICATIONS, PINNED
  const {
    state: machineState,
    currentMode,
    chargingPhase,
    energySaverPhase,
    lowBatteryPhase,
    welcomePhase,
    welcomeSessionId,
    energySaverMode,
    energySaverThreshold,
    isChargingActive,
    isDirectHandoff,
    isNotificationActive,
    activeNotification,
    batteryState: machineBatteryState,
    setBatteryState: setMachineBatteryState,
    handlePointerEnter,
    handlePointerLeave,
    expand,
    collapse,
    reveal,
    hide,
    triggerCharging,
    triggerEnergySaver,
    triggerLowBattery,
    triggerWelcome,
    completeWelcome,
    dismissWelcome,
    dismissCharging,
    dismissNotification,
    clearTimer
  } = useIslandStateMachine({
    initialMode: mode,
    preferences,
    onModeChange: (nextMode: IslandMode) => {
      setMode(nextMode)
    },
    updateMouseHitTest
  })

  const handleWelcomeComplete = useCallback(() => {
    hasShownWelcomeRef.current = true
    console.log(`[APP ${Date.now()}] [is-delulu:renderer] handleWelcomeComplete called.`)
    completeWelcome()
  }, [completeWelcome])

  const currentModeRef = useRef(currentMode)
  currentModeRef.current = currentMode
  const isChargingActiveRef = useRef(isChargingActive)
  isChargingActiveRef.current = isChargingActive
  const isNotificationActiveRef = useRef(isNotificationActive)
  isNotificationActiveRef.current = isNotificationActive
  const welcomePhaseRef = useRef(welcomePhase)
  welcomePhaseRef.current = welcomePhase

  // Track whether welcome has been shown this session (once per startup)
  const hasShownWelcomeRef = useRef(false)

  const prevChargingRef = useRef<boolean | null>(null)
  const prevEnergySaverRef = useRef<boolean | null>(null)
  const prevBatteryPercentRef = useRef<number | null>(null)
  const wasLowBatteryTriggeredRef = useRef<boolean>(false)
  const isStartupRef = useRef(true)

  // Apply accent palette CSS variables to document root
  const applyAccentPalette = useCallback(
    (palette: AccentPalette, themeMode: 'light' | 'dark') => {
      setAccentPalette(palette)
      currentPaletteRef.current = palette
      const isLight = themeMode === 'light'
      const rawPrimary = isLight ? palette.primaryLight : palette.primary
      const primary =
        !isLight && (rawPrimary === '#BBFF00' || rawPrimary === '#60A5FA') ? '#A3E635' : rawPrimary
      const secondary =
        !isLight && (palette.secondary === '#818CF8') ? '#8B5CF6' : palette.secondary
      const highlight =
        !isLight && (palette.highlight === '#A78BFA') ? '#00F0FF' : palette.highlight
      const root = document.documentElement

      // Derive per-channel RGBA glow vars for primary, secondary and highlight colors
      // so the island surface gradient can use all three palette colors independently
      const hexToRgbChannels = (hex: string): [number, number, number] => {
        try {
          const clean = hex.replace('#', '').trim()
          const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
          const num = parseInt(full, 16)
          return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
        } catch {
          return [163, 230, 53]
        }
      }

      const [pr, pg, pb] = hexToRgbChannels(primary)
      const [sr, sg, sb] = hexToRgbChannels(secondary)
      const [hr, hg, hb] = hexToRgbChannels(highlight)

      root.style.setProperty('--accent', primary)
      root.style.setProperty('--accent-secondary', secondary)
      root.style.setProperty('--accent-highlight', highlight)
      root.style.setProperty(
        '--accent-glow',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.16)` : `rgba(${pr}, ${pg}, ${pb}, 0.12)`
      )
      root.style.setProperty(
        '--accent-subtle',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.07)` : `rgba(${pr}, ${pg}, ${pb}, 0.08)`
      )
      root.style.setProperty(
        '--accent-border',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.20)` : `rgba(${pr}, ${pg}, ${pb}, 0.32)`
      )
      root.style.setProperty(
        '--border-active',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.35)` : `rgba(${pr}, ${pg}, ${pb}, 0.40)`
      )
      root.style.setProperty(
        '--border-glass',
        isLight ? 'rgba(255, 255, 255, 0.80)' : 'rgba(255, 255, 255, 0.07)'
      )
      const textAccent = isLight
        ? primary
        : palette.text === '#BBFF00' || palette.text === '#818CF8'
        ? '#A3E635'
        : palette.text || '#A3E635'
      root.style.setProperty('--text-accent', textAccent)
      root.style.setProperty(
        '--accent-secondary-glow',
        isLight ? `rgba(${sr}, ${sg}, ${sb}, 0.14)` : `rgba(${sr}, ${sg}, ${sb}, 0.08)`
      )
      root.style.setProperty(
        '--accent-highlight-glow',
        isLight ? `rgba(${hr}, ${hg}, ${hb}, 0.12)` : `rgba(${hr}, ${hg}, ${hb}, 0.06)`
      )

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

    // Sync initial mode with native window state
    if (window.isDelulu.getIslandMode) {
      window.isDelulu.getIslandMode().then((loadedMode) => {
        if (welcomePhaseRef.current === 'active' || isNotificationActiveRef.current) return
        if (loadedMode === 'hidden') {
          hide()
        } else if (loadedMode === 'expanded') {
          expand()
        } else if (loadedMode === 'collapsed') {
          collapse()
        }
      })
    }

    // 2. Initial telemetry & services load
    window.isDelulu.getSystemStats().then(setSystemStats)
    window.isDelulu.getClipboardHistory().then(setClipboardItems)
    window.isDelulu.getMediaState().then(setMediaState)
    window.isDelulu.getRoutines().then(setRoutines)

    // 3. Subscriptions
    const unsubSystem = window.isDelulu.onSystemStatsUpdate(setSystemStats)
    const unsubClip = window.isDelulu.onClipboardUpdate(setClipboardItems)

    const unsubMode = window.isDelulu.onIslandModeChanged((nextMode) => {
      if (welcomePhaseRef.current === 'active' || isNotificationActiveRef.current) return
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
      if (isChargingActiveRef.current) return
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

    // Battery state subscription (for store/SystemWidget use, charging, energy saver, low battery detection)
    const unsubBattery = window.isDelulu.onBatteryStateUpdate
      ? window.isDelulu.onBatteryStateUpdate((state) => {
          setBatteryState(state)
          setMachineBatteryState(state)

          const isConnected = state.isOnAC === true || state.isCharging === true
          const prevConnected = prevChargingRef.current
          const pct = state.percent
          const prevPct = prevBatteryPercentRef.current
          const isEnergySaver = state.isEnergySaver === true
          const prevEnergySaver = prevEnergySaverRef.current

          // Reset low battery trigger if battery rises strictly above 30%
          if (pct !== null && pct > 30) {
            wasLowBatteryTriggeredRef.current = false
          }

          if (!isStartupRef.current) {
            // 1. Charging connection edge
            if (isConnected && prevConnected === false) {
              triggerCharging(state)
            }

            // 2. Charging disconnection edge
            if (prevConnected === true && !isConnected) {
              dismissCharging()
              // If user unplugs while already at or below 30%, trigger low battery once
              if (pct !== null && pct <= 30 && !wasLowBatteryTriggeredRef.current) {
                wasLowBatteryTriggeredRef.current = true
                triggerLowBattery(state)
              }
            }

            // 3. Low Battery downward crossing on battery power:
            // Trigger when crossing from > 30% to <= 30% while NOT connected to power
            if (
              !isConnected &&
              prevPct !== null &&
              prevPct > 30 &&
              pct !== null &&
              pct <= 30 &&
              !wasLowBatteryTriggeredRef.current
            ) {
              wasLowBatteryTriggeredRef.current = true
              triggerLowBattery(state)
            }
          }

          prevChargingRef.current = isConnected
          prevBatteryPercentRef.current = pct
          if (state.isEnergySaver !== null && state.isEnergySaver !== undefined) {
            prevEnergySaverRef.current = isEnergySaver
          }
        })
      : () => {}

    const unsubCharging = window.isDelulu.onChargingTriggered
      ? window.isDelulu.onChargingTriggered((state) => {
          triggerCharging(state)
        })
      : () => {}

    const unsubChargingPriority = window.isDelulu.onChargingPriority
      ? window.isDelulu.onChargingPriority(() => {
          // Handled via battery monitor and coordinator queue
        })
      : () => {}

    const unsubEnergySaver = window.isDelulu.onEnergySaverChanged
      ? window.isDelulu.onEnergySaverChanged((data) => {
          console.log(
            `[APP ${Date.now()}] [is-delulu:renderer] Received battery:energy-saver-changed event: mode=${data.mode}, threshold=${data.threshold}`
          )
          triggerEnergySaver(data.mode, data.threshold)
        })
      : () => {}

    // Listen for system lifecycle events (e.g. resume from sleep/hibernation)
    const unsubLifecycle = window.isDelulu.onLifecycleEvent
      ? window.isDelulu.onLifecycleEvent((evt) => {
          console.log(`[APP ${Date.now()}] [is-delulu:renderer] Received lifecycle event: ${evt.type}`)
          if (evt.type === 'resume') {
            hasShownWelcomeRef.current = false
            console.log(
              `[APP ${Date.now()}] [is-delulu:renderer] Triggering welcome greeting sequence on resume.`
            )
            triggerWelcome(true)
          }
        })
      : () => {}

    // Listen for window-revealed welcome trigger from main process (ensures window is physically visible before animating)
    const unsubStartWelcome = window.isDelulu.onStartWelcome
      ? window.isDelulu.onStartWelcome(() => {
          console.log(`[APP ${Date.now()}] [is-delulu:renderer] onStartWelcome received from main process. welcomePhase=${welcomePhaseRef.current}`)
          hasShownWelcomeRef.current = false
          triggerWelcome(true)
        })
      : () => {}

    // Load initial battery state without startup delay
    window.isDelulu.getBatteryState().then((initial) => {
      setBatteryState(initial)
      setMachineBatteryState(initial)
      const isConnected = initial.isOnAC === true || initial.isCharging === true
      prevChargingRef.current = isConnected
      prevBatteryPercentRef.current = initial.percent
      if (initial.isEnergySaver !== null && initial.isEnergySaver !== undefined) {
        prevEnergySaverRef.current = initial.isEnergySaver === true
      }
      if (isConnected) {
        console.log(
          `[APP ${Date.now()}] [is-delulu:renderer] Startup with charger connected: queuing startup charging notification.`
        )
        triggerCharging(initial)
      } else if (initial.percent !== null && initial.percent <= 30) {
        // App launches with <= 30% on battery: this is an eligible low-battery notification
        // Enqueue it to run after welcome greeting completes!
        wasLowBatteryTriggeredRef.current = true
        console.log(
          `[APP ${Date.now()}] [is-delulu:renderer] Startup with low battery: enqueuing eligible low-battery notification.`
        )
        triggerLowBattery(initial)
      }
      isStartupRef.current = false
    })

    // Authoritative welcome sequence initialization
    if (window.isDelulu && window.isDelulu.checkWelcome) {
      window.isDelulu.checkWelcome().then(({ shouldWelcome }) => {
        console.log(`[APP ${Date.now()}] [is-delulu:renderer] checkWelcome response: shouldWelcome=${shouldWelcome}, welcomePhase=${welcomePhaseRef.current}`)
        if (shouldWelcome) {
          if (welcomePhaseRef.current !== 'active') {
            console.log(
              `[APP ${Date.now()}] [is-delulu:renderer] Triggering welcome greeting sequence for fresh application startup.`
            )
            triggerWelcome(true)
          }
        } else {
          hasShownWelcomeRef.current = true
          if (welcomePhaseRef.current === 'active') {
            completeWelcome()
          }
        }
      })
    } else if (!window.isDelulu) {
      triggerWelcome(true)
    }

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
      unsubStartWelcome()
      unsubSystem()
      unsubClip()
      unsubMedia()
      unsubBattery()
      unsubCharging()
      unsubChargingPriority()
      unsubEnergySaver()
      unsubLifecycle()
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
    setBatteryState,
    setMachineBatteryState,
    triggerCharging,
    triggerEnergySaver,
    triggerLowBattery,
    triggerWelcome,
    dismissWelcome,
    dismissCharging,
    dismissNotification,
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
      // 1. While any notification is active, hit-test the active notification pill surface
      // to permit clicking into the dashboard, without triggering normal island hover
      if (isNotificationActiveRef.current) {
        const notifSurface = isChargingActiveRef.current
          ? document.getElementById('island-surface')
          : document.querySelector('.energy-saver-pill-surface, .low-battery-pill-surface')
        if (notifSurface) {
          const rect = notifSurface.getBoundingClientRect()
          const isInside =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          updateMouseHitTest(isInside)
        } else {
          updateMouseHitTest(false)
        }
        return
      }

      // 1b. While welcome animation is active, let clicks pass through
      if (welcomePhaseRef.current === 'active') {
        updateMouseHitTest(false)
        return
      }

      // 2. While island is hidden, ensure clicks pass through transparent window
      if (currentMode === 'hidden') {
        updateMouseHitTest(false)
        return
      }

      // 3. Normal visible island surface hit-testing
      const surface = document.getElementById('island-surface')
      if (!surface) {
        updateMouseHitTest(false)
        return
      }

      const rect = surface.getBoundingClientRect()
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      updateMouseHitTest(isInside)

      if (isInside) {
        handlePointerEnter()
      } else {
        handlePointerLeave()
      }
    }

    const handleWindowMouseLeave = (): void => {
      updateMouseHitTest(false)
      if (!isNotificationActiveRef.current) {
        handlePointerLeave()
      }
    }

    const handleWindowBlur = (): void => {
      updateMouseHitTest(false)
      if (!isNotificationActiveRef.current) {
        handlePointerLeave()
      }
    }

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true })
    window.addEventListener('mouseleave', handleWindowMouseLeave)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseleave', handleWindowMouseLeave)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [currentMode, handlePointerEnter, handlePointerLeave, updateMouseHitTest])

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
      {/* Energy Saver notification pill — rendered at top-center */}
      {(activeNotification === 'energy_saver' || energySaverPhase === 'exiting') && (
        <EnergySaverPill
          phase={energySaverPhase}
          mode={energySaverMode}
          threshold={energySaverThreshold}
          onClick={() => {
            dismissNotification()
            expand()
          }}
        />
      )}

      {/* Low Battery notification pill — rendered at top-center */}
      {(activeNotification === 'low_battery' || lowBatteryPhase === 'exiting') && (
        <LowBatteryPill
          phase={lowBatteryPhase}
          batteryState={machineBatteryState}
          onClick={() => {
            dismissNotification()
            expand()
          }}
        />
      )}

      {/* Single coherent morphing island container (handles collapsed clock, welcome, and charging seamlessly) */}
      <MorphingIsland
        mode={currentMode}
        onExpand={() => {
          if (isChargingActive) {
            dismissCharging()
          }
          expand()
        }}
        onCollapse={collapse}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        isChargingActive={isChargingActive}
        chargingPhase={chargingPhase}
        batteryState={machineBatteryState}
        hasPendingCharging={
          isChargingActive ||
          machineBatteryState?.isOnAC === true ||
          machineBatteryState?.isCharging === true
        }
        isNotificationActive={isNotificationActive}
        welcomeActive={welcomePhase === 'active'}
        welcomeKey={welcomeSessionId}
        onWelcomeComplete={handleWelcomeComplete}
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
