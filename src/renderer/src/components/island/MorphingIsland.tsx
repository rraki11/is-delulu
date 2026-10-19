import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, type Transition } from 'motion/react'
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
import { IslandMode, WINDOW_CONFIG, BatteryState } from '../../shared'
import { ChargingPhase } from '../../hooks/useChargingNotification'
import { ChargingContent, PILL_SPRING } from './ChargingPill'
import {
  HandwrittenGreeting,
  getWritingDuration
} from './HandwrittenGreeting'

export interface MorphingIslandProps {
  mode: IslandMode
  onExpand: () => void
  onCollapse: () => void
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  isChargingActive?: boolean
  chargingPhase?: ChargingPhase
  batteryState?: BatteryState | null
  hasPendingCharging?: boolean
  isNotificationActive?: boolean
  welcomeActive?: boolean
  welcomeKey?: number
  onWelcomeComplete?: () => void
}

export const WELCOME_GREETINGS = ['hi', 'hello'] as const
export type WelcomeGreeting = (typeof WELCOME_GREETINGS)[number]

export function pickRandomGreeting(): WelcomeGreeting {
  try {
    const chosen: WelcomeGreeting = Math.random() < 0.5 ? 'hi' : 'hello'
    console.log(
      `[ISLAND ${Date.now()}] [is-delulu:greeting] Fair 50/50 selection picked: "${chosen}"`
    )
    return chosen
  } catch (err) {
    console.warn(`[ISLAND] Greeting selection failed with error, falling back to 'hello':`, err)
    return 'hello'
  }
}

// Backwards compatibility alias
export const pickGreeting = pickRandomGreeting

export const MorphingIsland: React.FC<MorphingIslandProps> = ({
  mode,
  onExpand,
  onCollapse,
  onPointerEnter,
  onPointerLeave,
  isChargingActive = false,
  chargingPhase = 'idle',
  batteryState = null,
  hasPendingCharging = false,
  isNotificationActive = false,
  welcomeActive = false,
  welcomeKey = 0,
  onWelcomeComplete
}) => {
  const isAnyNotificationActive = isNotificationActive || isChargingActive
  const preferences = useIslandStore((s) => s.preferences)
  const activeTab = useIslandStore((s) => s.activeTab)
  const setActiveTab = useIslandStore((s) => s.setActiveTab)
  const setStatusMessage = useIslandStore((s) => s.setStatusMessage)
  const isExpanded = mode === 'expanded'
  const isHidden = mode === 'hidden'
  const [time, setTime] = useState<string>('')

  // ── Welcome greeting animation lifecycle ────────────────────────────────
  // Sequence: entering (520ms) -> settling (180ms) -> writing (dynamic) -> holding (1000ms) -> fading (450ms) -> pausing (600ms) -> revealing (450ms) -> [clock_dwell (1000ms) -> clock_fading (380ms) -> clock_pause (220ms)] -> done
  type WelcomeStage =
    | 'idle'
    | 'entering'
    | 'settling'
    | 'writing'
    | 'holding'
    | 'fading'
    | 'pausing'
    | 'revealing'
    | 'clock_dwell'
    | 'clock_fading'
    | 'clock_pause'
    | 'done'

  const [welcomeStage, setWelcomeStage] = useState<WelcomeStage>(() => {
    return welcomeActive ? 'entering' : 'idle'
  })

  const [greeting, setGreeting] = useState<WelcomeGreeting>(() => pickRandomGreeting())

  // Synchronize welcomeStage & greeting on welcomeKey / welcomeActive prop updates during render
  const [prevWelcomeKey, setPrevWelcomeKey] = useState(welcomeKey)
  const [prevWelcomeActive, setPrevWelcomeActive] = useState(welcomeActive)
  if (welcomeKey !== prevWelcomeKey || welcomeActive !== prevWelcomeActive) {
    setPrevWelcomeKey(welcomeKey)
    setPrevWelcomeActive(welcomeActive)
    if (welcomeActive) {
      setWelcomeStage('entering')
      const chosen = pickRandomGreeting()
      setGreeting(chosen)
    } else {
      setWelcomeStage('done')
    }
  }

  const welcomeTimersRef = React.useRef<NodeJS.Timeout[]>([])
  const welcomeSessionIdRef = React.useRef(0)
  const onWelcomeCompleteRef = React.useRef(onWelcomeComplete)
  onWelcomeCompleteRef.current = onWelcomeComplete

  const hasPendingChargingRef = React.useRef(hasPendingCharging)
  hasPendingChargingRef.current = hasPendingCharging

  const welcomeStageRef = React.useRef<WelcomeStage>(welcomeStage)
  welcomeStageRef.current = welcomeStage
  const welcomeActiveRef = React.useRef(welcomeActive)
  welcomeActiveRef.current = welcomeActive
  const greetingRef = React.useRef(greeting)
  greetingRef.current = greeting
  const entranceCompletedRef = React.useRef(false)

  const clearWelcomeTimers = React.useCallback(() => {
    welcomeTimersRef.current.forEach((t) => clearTimeout(t))
    welcomeTimersRef.current = []
  }, [])

  // 1. Kick off entrance slide whenever welcome becomes active
  React.useEffect(() => {
    if (!welcomeActive) {
      welcomeSessionIdRef.current++
      clearWelcomeTimers()
      setWelcomeStage('done')
      return
    }

    const sid = ++welcomeSessionIdRef.current
    clearWelcomeTimers()
    entranceCompletedRef.current = false

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      console.log(`[ISLAND ${Date.now()}] [is-delulu:entrance] Reduced motion active, skipping entrance slide.`)
      entranceCompletedRef.current = true
      setWelcomeStage('writing')
      return
    }

    setWelcomeStage('entering')
    console.log(
      `[ISLAND ${Date.now()}] [is-delulu:entrance] Top-down entrance animation starts (y: -50 -> 0, opacity: 0 -> 1).`
    )

    // Safety fallback timer (580ms) if onAnimationComplete does not fire in headless or test environments
    const safetyTimer = setTimeout(() => {
      if (welcomeSessionIdRef.current !== sid) return
      if (!entranceCompletedRef.current && welcomeStageRef.current === 'entering') {
        entranceCompletedRef.current = true
        console.log(`[ISLAND ${Date.now()}] [is-delulu:entrance] Fallback entrance settle trigger.`)
        setWelcomeStage('settling')
        const tSettle = setTimeout(() => {
          if (welcomeSessionIdRef.current !== sid) return
          console.log(
            `[ISLAND ${Date.now()}] [is-delulu:entrance] Pill settled via fallback. Starting handwriting greeting "${greetingRef.current}".`
          )
          setWelcomeStage('writing')
        }, 180)
        welcomeTimersRef.current.push(tSettle)
      }
    }, 580)
    welcomeTimersRef.current.push(safetyTimer)

    return () => {
      welcomeSessionIdRef.current++
      clearWelcomeTimers()
    }
  }, [welcomeActive, welcomeKey, clearWelcomeTimers])

  // 2. Sequenced lifecycle: triggered once the pill has settled and welcomeStage becomes 'writing'
  React.useEffect(() => {
    if (welcomeStage !== 'writing') return

    const sid = welcomeSessionIdRef.current
    const chosenGreeting = greeting
    const writingDuration = getWritingDuration(chosenGreeting)
    console.log(
      `[ISLAND ${Date.now()}] [is-delulu:greeting] Handwriting animation started for "${chosenGreeting}" (${writingDuration}ms).`
    )

    // 1. Handwriting animation completes
    const tWrite = setTimeout(() => {
      if (welcomeSessionIdRef.current !== sid) return
      console.log(
        `[ISLAND ${Date.now()}] [is-delulu:greeting] Greeting handwriting complete. Holding for user reading (1000ms).`
      )
      setWelcomeStage('holding')

      // 2. Readable hold pause: 1,000ms
      const tHold = setTimeout(() => {
        if (welcomeSessionIdRef.current !== sid) return
        console.log(`[ISLAND ${Date.now()}] [is-delulu:greeting] Greeting fading starts (450ms).`)
        setWelcomeStage('fading')

        // 3. Smooth greeting fade-out: 450ms
        const tFade = setTimeout(() => {
          if (welcomeSessionIdRef.current !== sid) return
          console.log(`[ISLAND ${Date.now()}] [is-delulu:greeting] Empty pill pause starts (600ms).`)
          setWelcomeStage('pausing')

          // 4. Empty-pill pause after greeting completely faded: 600ms
          const tPause = setTimeout(() => {
            if (welcomeSessionIdRef.current !== sid) return
            console.log(`[ISLAND ${Date.now()}] [is-delulu:clock] Clock reveal starts (450ms).`)
            setWelcomeStage('revealing')

            // 5. Smooth clock fade-in: 450ms
            const tReveal = setTimeout(() => {
              if (welcomeSessionIdRef.current !== sid) return

              if (hasPendingChargingRef.current) {
                // Laptop is on charging:
                console.log(
                  `[ISLAND ${Date.now()}] [is-delulu:clock] Clock revealed with charging pending. Holding clock (1000ms).`
                )
                setWelcomeStage('clock_dwell')

                // 6. Clock dwell pause: 1,000ms
                const tDwell = setTimeout(() => {
                  if (welcomeSessionIdRef.current !== sid) return
                  console.log(`[ISLAND ${Date.now()}] [is-delulu:clock] Clock fading out starts (380ms).`)
                  setWelcomeStage('clock_fading')

                  // 7. Smooth clock fade-out: 380ms
                  const tClockFade = setTimeout(() => {
                    if (welcomeSessionIdRef.current !== sid) return
                    console.log(
                      `[ISLAND ${Date.now()}] [is-delulu:clock] Empty pill pause before charging animation (220ms).`
                    )
                    setWelcomeStage('clock_pause')

                    // 8. Empty-pill pause before charging animation: 220ms
                    const tClockPause = setTimeout(() => {
                      if (welcomeSessionIdRef.current !== sid) return
                      console.log(
                        `[ISLAND ${Date.now()}] [is-delulu:charging] Clock fade complete. Seamless charging handoff begins.`
                      )
                      setWelcomeStage('done')
                      onWelcomeCompleteRef.current?.()
                    }, 220)
                    welcomeTimersRef.current.push(tClockPause)
                  }, 380)
                  welcomeTimersRef.current.push(tClockFade)
                }, 1000)
                welcomeTimersRef.current.push(tDwell)
              } else {
                // Not charging: clock is revealed, welcome complete!
                console.log(
                  `[ISLAND ${Date.now()}] [is-delulu:welcome] Sequence complete. Calling onWelcomeComplete().`
                )
                setWelcomeStage('done')
                onWelcomeCompleteRef.current?.()
              }
            }, 450)
            welcomeTimersRef.current.push(tReveal)
          }, 600)
          welcomeTimersRef.current.push(tPause)
        }, 450)
        welcomeTimersRef.current.push(tFade)
      }, 1000)
      welcomeTimersRef.current.push(tHold)
    }, writingDuration)
    welcomeTimersRef.current.push(tWrite)
  }, [welcomeStage, greeting])

  useEffect(() => {
    if (isHidden) return
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
  }, [preferences?.clockFormat, isHidden])

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

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : WINDOW_CONFIG.width
  )

  useEffect(() => {
    const handleResize = (): void => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Unified Morphology & Geometry ──────────────────────────────────────────
  const isChargingExpanded = isChargingActive && chargingPhase === 'expanded'
  const isChargingExiting = isChargingActive && chargingPhase === 'exiting'

  const targetWidth = isExpanded
    ? WINDOW_CONFIG.panel.width
    : isChargingExpanded
    ? 320
    : WINDOW_CONFIG.pill.width

  const targetHeight = isExpanded
    ? WINDOW_CONFIG.panel.height
    : isChargingExpanded
    ? 42
    : WINDOW_CONFIG.pill.height

  const integerLeft = Math.floor((windowWidth - targetWidth) / 2)

  const isEntering = welcomeActive && welcomeStage === 'entering'
  const isHiding = isHidden || isChargingExiting

  const islandY = isHiding ? -48 : 0
  const islandOpacity = isHidden || isChargingExiting ? 0 : 1

  const islandTransition: Transition = isEntering
    ? {
        y: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.52, ease: [0.22, 1, 0.36, 1] }
      }
    : isHiding
    ? {
        y: { duration: 0.42, ease: [0.32, 0.72, 0, 1] },
        opacity: { duration: 0.36, ease: 'easeOut' }
      }
    : isChargingActive
    ? PILL_SPRING
    : {
        duration: isExpanded ? 0.38 : 0.32,
        ease: [0.22, 1, 0.36, 1]
      }

  return (
    <>
      {/* Wallpaper-adaptive gradient halo — sits OUTSIDE overflow:hidden so it bleeds */}
      <motion.div
        key={`island-glow-${welcomeKey}`}
        aria-hidden="true"
        className="island-accent-glow"
        initial={isEntering ? { y: -50, opacity: 0 } : false}
        animate={{
          left: integerLeft - 18,
          width: targetWidth + 36,
          height: (isExpanded ? WINDOW_CONFIG.panel.height : isChargingExpanded ? 42 : WINDOW_CONFIG.pill.height) + 16,
          borderRadius: isExpanded ? '0px 0px 30px 30px' : isChargingExpanded ? '0px 0px 28px 28px' : '0px 0px 24px 24px',
          y: islandY,
          opacity: isHidden || isExpanded || isChargingExiting ? 0 : islandOpacity
        }}
        transition={islandTransition}
        style={{
          position: 'absolute',
          top: 0,
          transformOrigin: 'top center',
          originX: 0.5,
          originY: 0,
          pointerEvents: 'none',
          zIndex: 99,
          visibility: isHidden || isExpanded ? 'hidden' : 'visible',
          animationPlayState: isHidden || isExpanded ? 'paused' : 'running'
        }}
      />

      <motion.div
        key={`island-surface-${welcomeKey}`}
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
        initial={isEntering ? { y: -50, opacity: 0 } : false}
        animate={{
          left: integerLeft,
          width: targetWidth,
          height: targetHeight,
          borderRadius: isExpanded
            ? '0px 0px 22px 22px'
            : isChargingExpanded
            ? '0px 0px 20px 20px'
            : '0px 0px 17px 17px',
          backgroundColor: isExpanded ? 'var(--bg-panel)' : 'var(--bg-pill)',
          y: islandY,
          opacity: islandOpacity
        }}
        transition={islandTransition}
        onAnimationComplete={() => {
          if (welcomeActiveRef.current && welcomeStageRef.current === 'entering') {
            if (!entranceCompletedRef.current) {
              entranceCompletedRef.current = true
              console.log(
                `[ISLAND ${Date.now()}] [is-delulu:entrance] Top-down entrance animation completed (onAnimationComplete). Pill settled in position.`
              )
              setWelcomeStage('settling')
              const sid = welcomeSessionIdRef.current
              const tSettle = setTimeout(() => {
                if (welcomeSessionIdRef.current !== sid) return
                console.log(
                  `[ISLAND ${Date.now()}] [is-delulu:entrance] Settling pause finished. Beginning handwriting greeting "${greetingRef.current}".`
                )
                setWelcomeStage('writing')
              }, 180)
              welcomeTimersRef.current.push(tSettle)
            }
          }

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
          zIndex: 100,
          boxShadow: isHidden
            ? 'none'
            : isExpanded
            ? 'var(--shadow-panel)'
            : 'var(--shadow-pill)',
          transition: 'box-shadow 380ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {/* Wallpaper-adaptive animated gradient — three color orbs drift independently */}
        <div
          className={`island-gradient-stage${isExpanded ? ' expanded' : ''}`}
          aria-hidden="true"
          style={{
            visibility: isHidden ? 'hidden' : 'visible',
            animationPlayState: isHidden ? 'paused' : 'running'
          }}
        >
          <div className="island-grad-orb island-grad-orb--primary" />
          <div className="island-grad-orb island-grad-orb--secondary" />
          <div className="island-grad-orb island-grad-orb--highlight" />
        </div>

      <AnimatePresence initial={false} mode="sync">
        {/* Collapsed Pill Content (Digital Clock, Welcome Greeting, or Charging Animation) */}
        {!isExpanded && (
          <motion.div
            key="collapsed-pill-content"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.18, delay: 0.10, ease: [0.22, 1, 0.36, 1] }
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.10, ease: 'easeOut' }
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${isChargingExpanded ? 42 : WINDOW_CONFIG.pill.height}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
              boxSizing: 'border-box',
              pointerEvents: 'auto'
            }}
          >
            {/* 1. Animated Handwriting Greeting */}
            {(welcomeStage === 'writing' || welcomeStage === 'holding' || welcomeStage === 'fading') &&
              !isChargingActive && (
                <div
                  key="welcome-greeting-container"
                  className="handwriting-reveal-text-container"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 16px',
                    boxSizing: 'border-box',
                    opacity:
                      welcomeStage === 'writing' || welcomeStage === 'holding' ? 1 : 0,
                    transition:
                      welcomeStage === 'fading' ? 'opacity 450ms ease-out' : 'none',
                    pointerEvents: 'none'
                  }}
                >
                  <HandwrittenGreeting
                    greeting={greeting}
                    isWriting={welcomeStage === 'writing'}
                    isHolding={welcomeStage === 'holding' || welcomeStage === 'fading'}
                  />
                </div>
              )}

            {/* 2. Clock: reveals smoothly only after empty-pill pause, fades out before charging */}
            <div
              key="pill-clock-container"
              className="island-clock-container"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity:
                  !isChargingActive &&
                  (welcomeStage === 'revealing' ||
                    welcomeStage === 'clock_dwell' ||
                    (welcomeStage === 'done' && !isChargingActive))
                    ? 1
                    : 0,
                transition: 'opacity 380ms ease-in-out',
                pointerEvents: 'none'
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
            </div>

            {/* 3. Charging animation content: seamlessly flows inside the island surface */}
            {isChargingActive && (
              <ChargingContent
                phase={chargingPhase ?? 'compact'}
                batteryState={batteryState ?? null}
                onClick={onExpand}
              />
            )}
          </motion.div>
        )}

        {/* Expanded Panel Dashboard Content */}
        {isExpanded && (
          <motion.div
            key="expanded-panel-content"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0.25, delay: 0.12, ease: [0.22, 1, 0.36, 1] }
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.12, ease: 'easeOut' }
            }}
            style={{
              width: `${WINDOW_CONFIG.panel.width}px`,
              height: `${WINDOW_CONFIG.panel.height}px`,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            <IslandHeader onCollapse={onCollapse} />

            <div
              className="island-content-area"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '12px 16px 16px 16px'
              }}
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
            </div>

            <NavigationTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  </>
  )
}

export default MorphingIsland
