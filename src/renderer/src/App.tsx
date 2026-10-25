import React, { useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MorphingIsland } from './components/island/MorphingIsland'
import { EnergySaverPill } from './components/island/EnergySaverPill'
import { LowBatteryPill } from './components/island/LowBatteryPill'
import { useIslandStore } from './store/useIslandStore'
import { useIslandStateMachine } from './hooks/useIslandStateMachine'
import { IslandMode, AccentPalette } from '../../shared/types'
import { perfTracker } from '../../shared/perf'

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
  const cachedSurfaceRectRef = useRef<{ left: number; right: number; top: number; bottom: number } | null>(null)
  const wasInsidePointerRef = useRef(false)

  // Double-rAF handshake: signals to main process once the initial frame is rendered to display window with 0 blank frames
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        perfTracker.record('first_rendered_frame')
        window.isDelulu?.notifyRendererReady?.()
      })
    })
  }, [])

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
    enqueueNotification,
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
    perfTracker.record('welcome_sequence_done')
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
      const fallbackPrimary = isLight ? '#6366F1' : '#A3E635'
      const fallbackSecondary = '#8B5CF6'
      const fallbackHighlight = '#00F0FF'

      const rawPrimary = (isLight ? (palette.primaryLight || palette.primary) : palette.primary) || fallbackPrimary
      const primary = rawPrimary
      const secondary = palette.secondary || fallbackSecondary
      const highlight = palette.highlight || fallbackHighlight
      const root = document.documentElement

      // Helper to convert hex to RGB channels
      const hexToRgbChannels = (hex: string): [number, number, number] => {
        try {
          const clean = hex.replace('#', '').trim()
          const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
          const num = parseInt(full, 16)
          return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
        } catch {
          return isLight ? [99, 102, 241] : [163, 230, 53]
        }
      }

      // Convert HSL to Hex
      const hslToHexStr = (h: number, s: number, l: number): string => {
        const c = (1 - Math.abs(2 * l - 1)) * s
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
        const m = l - c / 2
        let r1 = 0, g1 = 0, b1 = 0
        if (0 <= h && h < 60) { r1 = c; g1 = x; b1 = 0 }
        else if (60 <= h && h < 120) { r1 = x; g1 = c; b1 = 0 }
        else if (120 <= h && h < 180) { r1 = 0; g1 = c; b1 = x }
        else if (180 <= h && h < 240) { r1 = 0; g1 = x; b1 = c }
        else if (240 <= h && h < 300) { r1 = x; g1 = 0; b1 = c }
        else if (300 <= h && h < 360) { r1 = c; g1 = 0; b1 = x }
        const r = Math.round((r1 + m) * 255)
        const g = Math.round((g1 + m) * 255)
        const b = Math.round((b1 + m) * 255)
        return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
      }

      // Ensure accessible text color against background
      const ensureAccessibleText = (hex: string, forDark: boolean): string => {
        try {
          const [r255, g255, b255] = hexToRgbChannels(hex)
          const r = r255 / 255
          const g = g255 / 255
          const b = b255 / 255
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          let h = 0
          let s = 0
          const l = (max + min) / 2

          if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
            switch (max) {
              case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
              case g: h = ((b - r) / d + 2) * 60; break
              case b: h = ((r - g) / d + 4) * 60; break
            }
          }

          if (forDark) {
            // In dark mode, ensure text has lightness >= 0.62 for high contrast
            if (l < 0.62) {
              return hslToHexStr(h, Math.max(s, 0.65), 0.72)
            }
          } else {
            // In light mode, ensure text has lightness <= 0.42 for readability
            if (l > 0.42) {
              return hslToHexStr(h, Math.max(s, 0.70), 0.35)
            }
          }
          return hex
        } catch {
          return forDark ? '#A3E635' : '#4F46E5'
        }
      }

      const [pr, pg, pb] = hexToRgbChannels(primary)
      const [sr, sg, sb] = hexToRgbChannels(secondary)
      const [hr, hg, hb] = hexToRgbChannels(highlight)

      const textAccent = ensureAccessibleText(
        isLight ? primary : (palette.text || primary),
        !isLight
      )

      root.style.setProperty('--accent', primary)
      root.style.setProperty('--accent-secondary', secondary)
      root.style.setProperty('--accent-highlight', highlight)
      root.style.setProperty(
        '--accent-glow',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.16)` : `rgba(${pr}, ${pg}, ${pb}, 0.14)`
      )
      root.style.setProperty(
        '--accent-subtle',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.08)` : `rgba(${pr}, ${pg}, ${pb}, 0.10)`
      )
      root.style.setProperty(
        '--accent-border',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.22)` : `rgba(${pr}, ${pg}, ${pb}, 0.32)`
      )
      root.style.setProperty(
        '--border-active',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.35)` : `rgba(${pr}, ${pg}, ${pb}, 0.45)`
      )
      root.style.setProperty(
        '--border-glass',
        isLight ? 'rgba(255, 255, 255, 0.80)' : 'rgba(255, 255, 255, 0.07)'
      )
      root.style.setProperty('--text-accent', textAccent)
      root.style.setProperty(
        '--accent-secondary-glow',
        isLight ? `rgba(${sr}, ${sg}, ${sb}, 0.14)` : `rgba(${sr}, ${sg}, ${sb}, 0.08)`
      )
      root.style.setProperty(
        '--accent-highlight-glow',
        isLight ? `rgba(${hr}, ${hg}, ${hb}, 0.12)` : `rgba(${hr}, ${hg}, ${hb}, 0.06)`
      )

      // First Page (Launcher) dynamic palette tokens
      root.style.setProperty(
        '--badge-bg',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.10)` : `rgba(${pr}, ${pg}, ${pb}, 0.14)`
      )
      root.style.setProperty('--badge-text', textAccent)
      root.style.setProperty(
        '--search-icon-color',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.70)` : `rgba(${pr}, ${pg}, ${pb}, 0.75)`
      )
      root.style.setProperty(
        '--search-item-selected-bg',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.08)` : `rgba(${pr}, ${pg}, ${pb}, 0.12)`
      )
      root.style.setProperty(
        '--search-item-selected-border',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.25)` : `rgba(${pr}, ${pg}, ${pb}, 0.35)`
      )
      root.style.setProperty(
        '--search-item-icon-bg',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.14)` : `rgba(${pr}, ${pg}, ${pb}, 0.20)`
      )
      root.style.setProperty('--search-item-icon-color', primary)
      root.style.setProperty('--nav-item-active-color', primary)
      root.style.setProperty(
        '--border-card-hover',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.30)` : `rgba(${pr}, ${pg}, ${pb}, 0.40)`
      )
      root.style.setProperty(
        '--card-hover-glow',
        isLight ? `rgba(${pr}, ${pg}, ${pb}, 0.16)` : `rgba(${pr}, ${pg}, ${pb}, 0.14)`
      )

      // Calculate accessible contrast for text rendered directly on --accent backgrounds
      let lum = 0.5
      try {
        lum = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255
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

    // 2. Initial telemetry & services load (deferred slightly to avoid CPU contention with initial paint & welcome entrance)
    const secondaryLoadTimer = setTimeout(() => {
      if (window.isDelulu) {
        window.isDelulu.getSystemStats().then(setSystemStats)
        window.isDelulu.getClipboardHistory().then(setClipboardItems)
        window.isDelulu.getMediaState().then(setMediaState)
        window.isDelulu.getRoutines().then(setRoutines)
      }
    }, 450)

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
          if (welcomePhaseRef.current !== 'active') {
            hasShownWelcomeRef.current = false
            triggerWelcome(true)
          }
        })
      : () => {}

    // Load initial battery and welcome state together to prevent startup race conditions
    Promise.all([
      window.isDelulu && window.isDelulu.checkWelcome
        ? window.isDelulu.checkWelcome()
        : Promise.resolve({ shouldWelcome: false }),
      window.isDelulu.getBatteryState()
    ]).then(([{ shouldWelcome }, initial]) => {
      setBatteryState(initial)
      setMachineBatteryState(initial)
      const isConnected = initial.isOnAC === true || initial.isCharging === true
      prevChargingRef.current = isConnected
      prevBatteryPercentRef.current = initial.percent
      if (initial.isEnergySaver !== null && initial.isEnergySaver !== undefined) {
        prevEnergySaverRef.current = initial.isEnergySaver === true
      }

      console.log(
        `[APP ${Date.now()}] [is-delulu:renderer] Startup baseline: shouldWelcome=${shouldWelcome}, isConnected=${isConnected}, pct=${initial.percent}%`
      )

      if (shouldWelcome) {
        if (isConnected) {
          console.log(
            `[APP ${Date.now()}] [is-delulu:renderer] Startup with charger connected: queuing startup charging notification to play after welcome greeting.`
          )
          enqueueNotification({ type: 'charging', state: initial }, 'startup_charging')
        } else if (initial.percent !== null && initial.percent <= 30) {
          wasLowBatteryTriggeredRef.current = true
          console.log(
            `[APP ${Date.now()}] [is-delulu:renderer] Startup with low battery: queuing low-battery notification.`
          )
          enqueueNotification({ type: 'low_battery', target: initial }, 'startup_low_battery')
        }

        if (welcomePhaseRef.current !== 'active') {
          triggerWelcome(true)
        }
      } else {
        hasShownWelcomeRef.current = true
        if (isConnected) {
          triggerCharging(initial, false)
        }
      }

      isStartupRef.current = false
    })

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
      clearTimeout(secondaryLoadTimer)
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

  // Recalculate surface bounds only when mode, dimensions, or notification states change
  useEffect(() => {
    const updateRect = () => {
      const surface = document.getElementById('island-surface')
      if (surface) {
        const r = surface.getBoundingClientRect()
        cachedSurfaceRectRef.current = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
      } else {
        cachedSurfaceRectRef.current = null
      }
    }

    updateRect()
    const timer = setTimeout(updateRect, 120)
    window.addEventListener('resize', updateRect)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateRect)
    }
  }, [currentMode, isChargingActive, isNotificationActive, activeNotification])

  // Track global pointer movements for hit testing & click pass-through
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent): void => {
      // 1. While any notification is active, hit-test the active notification pill surface
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

      // 3. Normal visible island surface hit-testing using cached rect (avoids forced layout reflow)
      let rect = cachedSurfaceRectRef.current
      if (!rect) {
        const surface = document.getElementById('island-surface')
        if (surface) {
          const r = surface.getBoundingClientRect()
          rect = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
          cachedSurfaceRectRef.current = rect
        }
      }

      if (!rect) {
        updateMouseHitTest(false)
        return
      }

      const isInside =
        e.clientX >= rect.left - 20 &&
        e.clientX <= rect.right + 20 &&
        e.clientY >= -10 &&
        e.clientY <= rect.bottom + 14

      updateMouseHitTest(isInside)

      if (isInside !== wasInsidePointerRef.current) {
        wasInsidePointerRef.current = isInside
        if (isInside) {
          handlePointerEnter()
        } else if (machineState !== 'NORMAL_REVEALING') {
          handlePointerLeave()
        }
      }
    }

    const handleWindowMouseLeave = (): void => {
      wasInsidePointerRef.current = false
      updateMouseHitTest(false)
      if (!isNotificationActiveRef.current && !preferences?.isPinned && machineState !== 'NORMAL_REVEALING') {
        handlePointerLeave()
      }
    }

    const handleWindowBlur = (): void => {
      // If expanded and user clicked away into another app, collapse back to pill
      if (currentMode === 'expanded') {
        collapse()
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
