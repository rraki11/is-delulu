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
import { IslandMode, WINDOW_CONFIG } from '../../shared'
import {
  HandwrittenGreeting,
  getWritingDuration,
  HANDWRITING_DURATION_MS
} from './HandwrittenGreeting'

interface MorphingIslandProps {
  mode: IslandMode
  onExpand: () => void
  onCollapse: () => void
  onPointerEnter?: () => void
  onPointerLeave?: () => void
  isChargingActive?: boolean
  isNotificationActive?: boolean
  welcomeActive?: boolean
  welcomeKey?: number
  onWelcomeComplete?: () => void
}

export const WELCOME_GREETINGS = ['hi', 'hello'] as const
export type WelcomeGreeting = (typeof WELCOME_GREETINGS)[number]

const LAST_GREETING_STORAGE_KEY = 'is-delulu:last-welcome-greeting'
let inMemoryLastGreeting: string | null = null

export function pickGreeting(): string {
  try {
    let lastGreeting: string | null = inMemoryLastGreeting

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(LAST_GREETING_STORAGE_KEY)
        if (stored && (stored === 'hi' || stored === 'hello')) {
          lastGreeting = stored
        }
      } catch {
        // localStorage might be unavailable or throw in restricted environments
      }
    }

    let nextGreeting: string
    if (lastGreeting === 'hi') {
      nextGreeting = 'hello'
    } else if (lastGreeting === 'hello') {
      nextGreeting = 'hi'
    } else {
      // First startup or no recorded history: fair random coin-toss between 'hi' and 'hello'
      nextGreeting = Math.random() < 0.5 ? 'hi' : 'hello'
    }

    // Persist selected greeting for subsequent sequence alternation
    inMemoryLastGreeting = nextGreeting
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(LAST_GREETING_STORAGE_KEY, nextGreeting)
      } catch {}
    }

    return nextGreeting
  } catch {
    return 'hello'
  }
}

export const MorphingIsland: React.FC<MorphingIslandProps> = ({
  mode,
  onExpand,
  onCollapse,
  onPointerEnter,
  onPointerLeave,
  isChargingActive = false,
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
  // Sequence: entering (520ms) -> writing (dynamic) -> holding (1000ms >= 700ms) -> fading (450ms) -> pausing (600ms) -> revealing (450ms) -> done
  type WelcomeStage = 'entering' | 'writing' | 'holding' | 'fading' | 'pausing' | 'revealing' | 'done'
  const [welcomeStage, setWelcomeStage] = useState<WelcomeStage>(() => {
    if (welcomeActive) return 'entering'
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const shown = window.sessionStorage.getItem('is-delulu:welcome-shown')
      if (!shown) return 'entering'
    }
    return 'done'
  })

  // Synchronize welcomeStage on welcomeKey / welcomeActive prop updates during render
  const [prevWelcomeKey, setPrevWelcomeKey] = useState(welcomeKey)
  if (welcomeKey !== prevWelcomeKey) {
    setPrevWelcomeKey(welcomeKey)
    if (welcomeActive) {
      setWelcomeStage('entering')
    }
  }

  const [greeting, setGreeting] = useState<string>('hello')
  const welcomeTimersRef = React.useRef<NodeJS.Timeout[]>([])
  const welcomeSessionIdRef = React.useRef(0)
  const onWelcomeCompleteRef = React.useRef(onWelcomeComplete)
  onWelcomeCompleteRef.current = onWelcomeComplete

  const clearWelcomeTimers = React.useCallback(() => {
    welcomeTimersRef.current.forEach((t) => clearTimeout(t))
    welcomeTimersRef.current = []
  }, [])

  // Sequenced lifecycle with relaxed pauses and smooth transitions
  React.useEffect(() => {
    if (!welcomeActive) {
      welcomeSessionIdRef.current++
      clearWelcomeTimers()
      setWelcomeStage('done')
      return
    }

    const sid = ++welcomeSessionIdRef.current
    clearWelcomeTimers()
    const chosenGreeting = pickGreeting()
    setGreeting(chosenGreeting)
    const writingDuration = getWritingDuration(chosenGreeting)

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setWelcomeStage('writing')
    } else {
      setWelcomeStage('entering')
    }

    // Top-down entrance slide duration: 520ms
    const entranceDuration = prefersReducedMotion ? 0 : 520

    // 0. Smooth Top-Down Island Entrance: 520ms
    const t0 = setTimeout(() => {
      if (welcomeSessionIdRef.current !== sid) return
      setWelcomeStage('writing')

      // 1. Handwriting animation: dynamic per greeting (2200ms for "hello" with slow finish)
      const t1 = setTimeout(() => {
        if (welcomeSessionIdRef.current !== sid) return
        setWelcomeStage('holding')

        // 2. Readable hold pause for user to read greeting: 1,000ms (at least 700ms)
        const t2 = setTimeout(() => {
          if (welcomeSessionIdRef.current !== sid) return
          setWelcomeStage('fading')

          // 3. Smooth greeting fade-out: 450ms (~400–500ms)
          const t3 = setTimeout(() => {
            if (welcomeSessionIdRef.current !== sid) return
            setWelcomeStage('pausing')

            // 4. Empty-pill pause after greeting completely faded: 600ms
            const t4 = setTimeout(() => {
              if (welcomeSessionIdRef.current !== sid) return
              setWelcomeStage('revealing')

              // 5. Smooth clock fade-in: 450ms
              const t5 = setTimeout(() => {
                if (welcomeSessionIdRef.current !== sid) return
                setWelcomeStage('done')
                onWelcomeCompleteRef.current?.()
              }, 450)
              welcomeTimersRef.current.push(t5)
            }, 600)
            welcomeTimersRef.current.push(t4)
          }, 450)
          welcomeTimersRef.current.push(t3)
        }, 1000)
        welcomeTimersRef.current.push(t2)
      }, writingDuration)
      welcomeTimersRef.current.push(t1)
    }, entranceDuration)
    welcomeTimersRef.current.push(t0)

    return () => {
      welcomeSessionIdRef.current++
      clearWelcomeTimers()
    }
  }, [welcomeActive, welcomeKey, clearWelcomeTimers])

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

  const targetWidth = isExpanded ? WINDOW_CONFIG.panel.width : WINDOW_CONFIG.pill.width
  const integerLeft = Math.floor((windowWidth - targetWidth) / 2)

  const isEntering = welcomeActive && welcomeStage === 'entering'
  const isHiding = isHidden

  const islandY = isHidden ? -48 : 0

  const islandOpacity = isHidden || (isAnyNotificationActive && !isExpanded) ? 0 : 1

  const islandTransition: Transition = isEntering
    ? {
        y: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.52, ease: [0.22, 1, 0.36, 1] }
      }
    : isHiding
    ? {
        y: { duration: 0.52, ease: [0.32, 0.72, 0, 1] },
        opacity: { duration: 0.46, ease: 'easeOut' }
      }
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
          height: (isExpanded ? WINDOW_CONFIG.panel.height : WINDOW_CONFIG.pill.height) + 16,
          borderRadius: isExpanded ? '0px 0px 30px 30px' : '0px 0px 24px 24px',
          y: islandY,
          opacity: isHidden || isExpanded || (isChargingActive && !isExpanded) ? 0 : islandOpacity
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
          visibility: isHidden || isExpanded || (isAnyNotificationActive && !isExpanded) ? 'hidden' : 'visible',
          animationPlayState: isHidden || isExpanded || (isAnyNotificationActive && !isExpanded) ? 'paused' : 'running'
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
          height: isExpanded ? WINDOW_CONFIG.panel.height : WINDOW_CONFIG.pill.height,
          borderRadius: isExpanded ? '0px 0px 22px 22px' : '0px 0px 17px 17px',
          backgroundColor: isExpanded ? 'var(--bg-panel)' : 'var(--bg-pill)',
          y: islandY,
          opacity: islandOpacity
        }}
        transition={islandTransition}
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
        {/* Collapsed Pill Content (Digital Clock or Welcome Greeting) */}
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
              height: `${WINDOW_CONFIG.pill.height}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
              boxSizing: 'border-box',
              pointerEvents: 'auto'
            }}
          >
            {/* Animated Handwriting Greeting */}
            {welcomeStage !== 'done' && (
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

            {/* Clock: reveals smoothly only after empty-pill pause */}
            <div
              key="pill-clock-container"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity:
                  welcomeStage === 'revealing' || welcomeStage === 'done' ? 1 : 0,
                transition: 'opacity 450ms ease-in-out',
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
          </motion.div>
        )}

        {/* Expanded Panel Dashboard Content */}
        {isExpanded && (
          <motion.div
            key="expanded-dashboard"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: {
                duration: 0.22,
                delay: 0.14,
                ease: [0.22, 1, 0.36, 1]
              }
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.10, ease: 'easeOut' }
            }}
            style={{
              width: `${WINDOW_CONFIG.panel.width}px`,
              height: `${WINDOW_CONFIG.panel.height}px`,
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
                padding: '12px 14px',
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
      </AnimatePresence>
      </motion.div>
    </>
  )
}

export default MorphingIsland
