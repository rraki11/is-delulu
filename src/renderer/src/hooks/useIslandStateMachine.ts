import { useState, useRef, useCallback, useEffect } from 'react'
import { IslandMode, UserPreferences, BatteryState } from '../../../shared/types'

export type IslandState =
  | 'HIDDEN'
  | 'NORMAL_REVEALING'
  | 'COLLAPSED'
  | 'EXPANDED'
  | 'CHARGING_ENTERING'
  | 'CHARGING_COMPACT_HOLD'
  | 'CHARGING_EXPANDED'
  | 'CHARGING_COLLAPSING'
  | 'CHARGING_EXITING'
  | 'ENERGY_SAVER_ENTERING'
  | 'ENERGY_SAVER_ACTIVE'
  | 'ENERGY_SAVER_EXITING'
  | 'LOW_BATTERY_ENTERING'
  | 'LOW_BATTERY_ACTIVE'
  | 'LOW_BATTERY_EXITING'
  | 'WELCOME_ACTIVE'
  | 'PINNED'

export type ChargingPhase =
  | 'idle'
  | 'entering'
  | 'compact'
  | 'expanded'
  | 'collapsing'
  | 'settled'
  | 'exiting'

export type NotificationType = 'charging' | 'energy_saver' | 'low_battery' | null

export const getActiveNotificationType = (state: IslandState): NotificationType => {
  if (
    state === 'CHARGING_ENTERING' ||
    state === 'CHARGING_COMPACT_HOLD' ||
    state === 'CHARGING_EXPANDED' ||
    state === 'CHARGING_COLLAPSING' ||
    state === 'CHARGING_EXITING'
  ) {
    return 'charging'
  }
  if (
    state === 'ENERGY_SAVER_ENTERING' ||
    state === 'ENERGY_SAVER_ACTIVE' ||
    state === 'ENERGY_SAVER_EXITING'
  ) {
    return 'energy_saver'
  }
  if (
    state === 'LOW_BATTERY_ENTERING' ||
    state === 'LOW_BATTERY_ACTIVE' ||
    state === 'LOW_BATTERY_EXITING'
  ) {
    return 'low_battery'
  }
  return null
}

export const getNotificationPriority = (type: NotificationType): number => {
  switch (type) {
    case 'charging':
      return 3
    case 'energy_saver':
      return 2
    case 'low_battery':
      return 1
    default:
      return 0
  }
}

export const isNotificationActiveState = (state: IslandState): boolean => {
  return getActiveNotificationType(state) !== null
}

export const isSpecialLifecycleActive = (state: IslandState): boolean => {
  return state === 'WELCOME_ACTIVE' || isNotificationActiveState(state)
}

export const isChargingState = (state: IslandState): boolean => {
  return getActiveNotificationType(state) === 'charging'
}

export const getIslandMode = (state: IslandState): IslandMode => {
  switch (state) {
    case 'PINNED':
    case 'EXPANDED':
      return 'expanded'
    case 'NORMAL_REVEALING':
    case 'COLLAPSED':
    case 'CHARGING_ENTERING':
    case 'CHARGING_COMPACT_HOLD':
    case 'CHARGING_EXPANDED':
    case 'CHARGING_COLLAPSING':
    case 'CHARGING_EXITING':
    case 'ENERGY_SAVER_ENTERING':
    case 'ENERGY_SAVER_ACTIVE':
    case 'ENERGY_SAVER_EXITING':
    case 'LOW_BATTERY_ENTERING':
    case 'LOW_BATTERY_ACTIVE':
    case 'LOW_BATTERY_EXITING':
    case 'WELCOME_ACTIVE':
      return 'collapsed'
    case 'HIDDEN':
    default:
      return 'hidden'
  }
}

export const getWelcomePhase = (
  state: IslandState
): 'idle' | 'active' => {
  return state === 'WELCOME_ACTIVE' ? 'active' : 'idle'
}

export const getChargingPhase = (state: IslandState): ChargingPhase => {
  switch (state) {
    case 'CHARGING_ENTERING':
      return 'entering'
    case 'CHARGING_COMPACT_HOLD':
      return 'compact'
    case 'CHARGING_EXPANDED':
      return 'expanded'
    case 'CHARGING_COLLAPSING':
      return 'collapsing'
    case 'CHARGING_EXITING':
      return 'exiting'
    default:
      return 'idle'
  }
}

export const getEnergySaverPhase = (
  state: IslandState
): 'idle' | 'entering' | 'active' | 'exiting' => {
  switch (state) {
    case 'ENERGY_SAVER_ENTERING':
      return 'entering'
    case 'ENERGY_SAVER_ACTIVE':
      return 'active'
    case 'ENERGY_SAVER_EXITING':
      return 'exiting'
    default:
      return 'idle'
  }
}

export const getLowBatteryPhase = (
  state: IslandState
): 'idle' | 'entering' | 'active' | 'exiting' => {
  switch (state) {
    case 'LOW_BATTERY_ENTERING':
      return 'entering'
    case 'LOW_BATTERY_ACTIVE':
      return 'active'
    case 'LOW_BATTERY_EXITING':
      return 'exiting'
    default:
      return 'idle'
  }
}

interface UseIslandStateMachineProps {
  initialMode?: IslandMode
  preferences: UserPreferences | null
  onModeChange?: (mode: IslandMode) => void
  updateMouseHitTest?: (isInside: boolean) => void
}

export function useIslandStateMachine({
  initialMode = 'hidden',
  preferences,
  onModeChange,
  updateMouseHitTest
}: UseIslandStateMachineProps) {
  const isPinned = Boolean(preferences?.isPinned)
  const isPinnedRef = useRef(isPinned)
  isPinnedRef.current = isPinned

  // Authoritative State Machine:
  // HIDDEN | NORMAL_REVEALING | COLLAPSED | EXPANDED | CHARGING_* | ENERGY_SAVER_* | LOW_BATTERY_* | PINNED
  const [state, setState] = useState<IslandState>(() => {
    if (isPinned) return 'PINNED'
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const shown = window.sessionStorage.getItem('is-delulu:welcome-shown')
      if (!shown) return 'WELCOME_ACTIVE'
    }
    if (initialMode === 'expanded') return 'EXPANDED'
    if (initialMode === 'collapsed') return 'COLLAPSED'
    return 'HIDDEN'
  })

  const stateRef = useRef<IslandState>(state)
  stateRef.current = state

  const isHoveredRef = useRef(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Notification session and timer tracking
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const notificationSessionIdRef = useRef(0)

  // Centralized Notification Coordinator queue for priority handling
  type QueuedNotificationItem =
    | { type: 'charging'; state: BatteryState }
    | { type: 'energy_saver'; mode: 'on' | 'off'; threshold: number | null }
    | { type: 'low_battery'; target: number | BatteryState }

  const notificationQueueRef = useRef<QueuedNotificationItem[]>([])
  const triggerChargingRef = useRef<(stateData: BatteryState) => void>(() => {})
  const triggerEnergySaverRef = useRef<(mode: 'on' | 'off', threshold?: number | null) => void>(() => {})
  const triggerLowBatteryRef = useRef<(target: number | BatteryState) => void>(() => {})

  // Energy saver state
  const [energySaverMode, setEnergySaverMode] = useState<'on' | 'off'>('on')
  const [energySaverThreshold, setEnergySaverThreshold] = useState<number | null>(null)

  const [batteryState, setBatteryState] = useState<BatteryState | null>(null)

  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange

  const updateMouseHitTestRef = useRef(updateMouseHitTest)
  updateMouseHitTestRef.current = updateMouseHitTest

  const clearHoverTimers = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current)
      revealTimerRef.current = null
    }
  }, [])

  const clearNotificationTimers = useCallback(() => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current)
      notificationTimerRef.current = null
    }
  }, [])

  // Transition to a state and notify parent and native window
  const transitionTo = useCallback(
    (nextState: IslandState) => {
      stateRef.current = nextState
      setState(nextState)

      const mode = getIslandMode(nextState)

      if (onModeChangeRef.current) {
        onModeChangeRef.current(mode)
      }

      if (window.isDelulu) {
        if (mode !== 'hidden' && !isSpecialLifecycleActive(nextState)) {
          window.isDelulu.setIslandMode(mode)
        }
      }

      if (updateMouseHitTestRef.current) {
        updateMouseHitTestRef.current(nextState !== 'HIDDEN')
      }
    },
    []
  )

  // Step 2 of auto-hide: Keep the collapsed pill visible before hiding (default: 1,000ms, or custom duration)
  const startMinVisibilityTimer = useCallback(
    (customDuration?: number) => {
      clearHoverTimers()

      const duration = typeof customDuration === 'number' ? customDuration : 1000

      hoverTimerRef.current = setTimeout(() => {
        if (
          isPinnedRef.current ||
          isHoveredRef.current ||
          isSpecialLifecycleActive(stateRef.current)
        )
          return

        // Blur any active element before hiding
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }

        transitionTo('HIDDEN')
        if (window.isDelulu) {
          window.isDelulu.setIslandMode('hidden')
        }
      }, duration)
    },
    [clearHoverTimers, transitionTo]
  )

  // Step 1 of auto-hide: On mouse leave while expanded, collapse to compact pill after 500ms grace
  const startGraceCollapseTimer = useCallback(() => {
    clearHoverTimers()

    hoverTimerRef.current = setTimeout(() => {
      if (isPinnedRef.current || isHoveredRef.current || isSpecialLifecycleActive(stateRef.current)) return

      transitionTo('COLLAPSED')
      startMinVisibilityTimer()
    }, 500)
  }, [clearHoverTimers, transitionTo, startMinVisibilityTimer])

  // Top-edge hover reveal
  const reveal = useCallback(() => {
    if (isPinnedRef.current || stateRef.current === 'PINNED') return
    if (isSpecialLifecycleActive(stateRef.current)) return

    clearHoverTimers()

    if (stateRef.current === 'HIDDEN') {
      transitionTo('NORMAL_REVEALING')
      revealTimerRef.current = setTimeout(() => {
        if (stateRef.current === 'NORMAL_REVEALING') {
          transitionTo('COLLAPSED')
          if (!isHoveredRef.current) {
            startMinVisibilityTimer()
          }
        }
      }, 180)
    } else if (stateRef.current === 'NORMAL_REVEALING') {
      transitionTo('COLLAPSED')
      if (!isHoveredRef.current) {
        startMinVisibilityTimer()
      }
    }
  }, [clearHoverTimers, transitionTo, startMinVisibilityTimer])

  // Pointer events on the island surface
  const handlePointerEnter = useCallback(() => {
    if (isSpecialLifecycleActive(stateRef.current)) return
    isHoveredRef.current = true
    clearHoverTimers()

    if (isPinnedRef.current || stateRef.current === 'PINNED') return

    if (stateRef.current === 'HIDDEN') {
      reveal()
    } else if (stateRef.current === 'NORMAL_REVEALING') {
      transitionTo('COLLAPSED')
    }
  }, [clearHoverTimers, reveal, transitionTo])

  const handlePointerLeave = useCallback(() => {
    isHoveredRef.current = false
    if (isSpecialLifecycleActive(stateRef.current)) return
    if (isPinnedRef.current || stateRef.current === 'PINNED') return

    if (stateRef.current === 'EXPANDED') {
      startGraceCollapseTimer()
    } else if (stateRef.current === 'COLLAPSED' || stateRef.current === 'NORMAL_REVEALING') {
      startMinVisibilityTimer()
    }
  }, [startGraceCollapseTimer, startMinVisibilityTimer])

  // Explicit user actions
  const expand = useCallback(() => {
    if (isSpecialLifecycleActive(stateRef.current)) return
    clearHoverTimers()
    if (welcomeTimerRef.current) {
      clearTimeout(welcomeTimerRef.current)
      welcomeTimerRef.current = null
    }
    isHoveredRef.current = true
    transitionTo(isPinnedRef.current ? 'PINNED' : 'EXPANDED')
  }, [clearHoverTimers, transitionTo])

  const collapse = useCallback(() => {
    if (isSpecialLifecycleActive(stateRef.current)) return
    clearHoverTimers()
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    transitionTo('COLLAPSED')
    if (!isHoveredRef.current && !isPinnedRef.current) {
      startMinVisibilityTimer()
    }
  }, [clearHoverTimers, transitionTo, startMinVisibilityTimer])

  const hide = useCallback(() => {
    if (isSpecialLifecycleActive(stateRef.current)) return
    clearHoverTimers()
    clearNotificationTimers()
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    transitionTo('HIDDEN')
  }, [clearHoverTimers, clearNotificationTimers, transitionTo])

  // ── Centralized Notification Coordinator ────────────────────────────────────
  const enqueueNotification = useCallback((item: QueuedNotificationItem, reason: string) => {
    const priority = getNotificationPriority(item.type)
    const existingIndex = notificationQueueRef.current.findIndex((q) => q.type === item.type)

    if (existingIndex >= 0) {
      notificationQueueRef.current[existingIndex] = item
      console.log(
        `[is-delulu:coordinator] Updated existing queued ${item.type} notification (priority ${priority}, reason: ${reason}). Queue size: ${notificationQueueRef.current.length}`
      )
    } else {
      notificationQueueRef.current.push(item)
      console.log(
        `[is-delulu:coordinator] Added ${item.type} notification to queue (priority ${priority}, reason: ${reason}). Queue size: ${notificationQueueRef.current.length}`
      )
    }
  }, [])

  const dequeueNextNotification = useCallback((): QueuedNotificationItem | null => {
    if (notificationQueueRef.current.length === 0) return null
    // Sort descending by priority: charging (3) > energy_saver (2) > low_battery (1)
    notificationQueueRef.current.sort(
      (a, b) => getNotificationPriority(b.type) - getNotificationPriority(a.type)
    )
    const item = notificationQueueRef.current.shift() ?? null
    if (item) {
      console.log(
        `[is-delulu:coordinator] Dequeued ${item.type} notification (priority ${getNotificationPriority(item.type)}, remaining in queue: ${notificationQueueRef.current.length})`
      )
    }
    return item
  }, [])

  const processNextQueuedNotification = useCallback(() => {
    const next = dequeueNextNotification()
    if (!next) {
      console.log(
        '[is-delulu:coordinator] Notification queue empty. Notifying native window notification ended.'
      )
      window.isDelulu?.notifyNotificationEnded?.() ??
        window.isDelulu?.notifyChargingEnded?.()
      return
    }

    console.log(`[is-delulu:coordinator] Executing queued notification: ${next.type}`)
    // Micro-gap between notifications to prevent instantaneous snapping
    setTimeout(() => {
      if (next.type === 'charging') {
        triggerChargingRef.current(next.state)
      } else if (next.type === 'energy_saver') {
        triggerEnergySaverRef.current(next.mode, next.threshold)
      } else if (next.type === 'low_battery') {
        triggerLowBatteryRef.current(next.target)
      }
    }, 100)
  }, [dequeueNextNotification])

  // ── 1. Priority 3: Authoritative Charging Notification Lifecycle ────────────
  const triggerCharging = useCallback(
    (stateData: BatteryState) => {
      setBatteryState(stateData)

      // If welcome animation is currently active, defer and queue!
      if (stateRef.current === 'WELCOME_ACTIVE') {
        console.log(
          '[is-delulu:coordinator] Charging notification deferred: Welcome greeting is active. Enqueued at Priority 3.'
        )
        enqueueNotification({ type: 'charging', state: stateData }, 'welcome_active')
        return
      }

      // If another notification is active:
      if (isNotificationActiveState(stateRef.current)) {
        if (isChargingState(stateRef.current)) {
          // Already running charging sequence, do not duplicate
          return
        }
        console.log(
          `[is-delulu:coordinator] Charging notification deferred: another notification is active (${stateRef.current}). Enqueued at Priority 3.`
        )
        enqueueNotification({ type: 'charging', state: stateData }, 'notification_active')
        return
      }

      console.log('[is-delulu:notification] Executing charging notification lifecycle.')
      clearHoverTimers()
      clearNotificationTimers()

      const sid = ++notificationSessionIdRef.current

      // Notify native window that charging notification has started
      window.isDelulu?.notifyNotificationStarted?.('charging') ??
        window.isDelulu?.notifyChargingStarted?.()

      transitionTo('CHARGING_ENTERING')

      // Entrance animation duration (380ms) -> CHARGING_COMPACT_HOLD
      notificationTimerRef.current = setTimeout(() => {
        if (notificationSessionIdRef.current !== sid) return
        transitionTo('CHARGING_COMPACT_HOLD')

        // Compact hold: exactly 1,000ms delay before expanding
        notificationTimerRef.current = setTimeout(() => {
          if (notificationSessionIdRef.current !== sid) return
          transitionTo('CHARGING_EXPANDED')

          // Expanded display duration (2,800ms)
          notificationTimerRef.current = setTimeout(() => {
            if (notificationSessionIdRef.current !== sid) return
            transitionTo('CHARGING_COLLAPSING')

            // Collapse animation (300ms) + compact settled visibility (950ms)
            notificationTimerRef.current = setTimeout(() => {
              if (notificationSessionIdRef.current !== sid) return
              transitionTo('CHARGING_EXITING')

              // Exit slide up into top bezel (320ms)
              notificationTimerRef.current = setTimeout(() => {
                if (notificationSessionIdRef.current !== sid) return
                transitionTo('HIDDEN')
                // Process next queued notification in priority order
                processNextQueuedNotification()
              }, 320)
            }, 1250)
          }, 2800)
        }, 1000)
      }, 380)
    },
    [
      clearHoverTimers,
      clearNotificationTimers,
      transitionTo,
      enqueueNotification,
      processNextQueuedNotification
    ]
  )
  triggerChargingRef.current = triggerCharging

  // ── 2. Priority 2: Energy Saver Notification Lifecycle ──────────────────────
  const triggerEnergySaver = useCallback(
    (mode: 'on' | 'off', threshold?: number | null) => {
      // If welcome animation is currently active, defer and queue!
      if (stateRef.current === 'WELCOME_ACTIVE') {
        console.log(
          `[is-delulu:coordinator] Energy Saver (${mode}) notification deferred: Welcome greeting is active. Enqueued at Priority 2.`
        )
        enqueueNotification(
          { type: 'energy_saver', mode, threshold: threshold ?? null },
          'welcome_active'
        )
        return
      }

      // If another notification is active, defer and queue!
      if (isNotificationActiveState(stateRef.current)) {
        console.log(
          `[is-delulu:coordinator] Energy Saver (${mode}) notification deferred: another notification is active (${stateRef.current}). Enqueued at Priority 2.`
        )
        enqueueNotification(
          { type: 'energy_saver', mode, threshold: threshold ?? null },
          'notification_active'
        )
        return
      }

      console.log(
        `[is-delulu:notification] Executing Energy Saver notification (mode=${mode}, threshold=${threshold})`
      )
      clearHoverTimers()
      clearNotificationTimers()

      setEnergySaverMode(mode)
      setEnergySaverThreshold(threshold ?? null)

      const sid = ++notificationSessionIdRef.current

      // Notify native window
      window.isDelulu?.notifyNotificationStarted?.('energy_saver')

      transitionTo('ENERGY_SAVER_ENTERING')

      const holdDuration = mode === 'on' ? 3000 : 2200

      // Entrance animation (380ms) -> ACTIVE
      notificationTimerRef.current = setTimeout(() => {
        if (notificationSessionIdRef.current !== sid) return
        transitionTo('ENERGY_SAVER_ACTIVE')

        // Active hold duration -> EXITING
        notificationTimerRef.current = setTimeout(() => {
          if (notificationSessionIdRef.current !== sid) return
          transitionTo('ENERGY_SAVER_EXITING')

          // Exit slide up into top bezel (320ms) -> HIDDEN
          notificationTimerRef.current = setTimeout(() => {
            if (notificationSessionIdRef.current !== sid) return
            transitionTo('HIDDEN')
            // Process next queued notification in priority order
            processNextQueuedNotification()
          }, 320)
        }, holdDuration)
      }, 380)
    },
    [
      clearHoverTimers,
      clearNotificationTimers,
      transitionTo,
      enqueueNotification,
      processNextQueuedNotification
    ]
  )
  triggerEnergySaverRef.current = triggerEnergySaver

  // ── 3. Priority 1: Low Battery Notification Lifecycle ───────────────────────
  const triggerLowBattery = useCallback(
    (target: number | BatteryState) => {
      // If welcome animation is currently active, defer and queue!
      if (stateRef.current === 'WELCOME_ACTIVE') {
        console.log(
          '[is-delulu:coordinator] Low Battery notification deferred: Welcome greeting is active. Enqueued at Priority 1.'
        )
        enqueueNotification({ type: 'low_battery', target }, 'welcome_active')
        return
      }

      // If another notification is active, defer and queue!
      if (isNotificationActiveState(stateRef.current)) {
        console.log(
          `[is-delulu:coordinator] Low Battery notification deferred: another notification is active (${stateRef.current}). Enqueued at Priority 1.`
        )
        enqueueNotification({ type: 'low_battery', target }, 'notification_active')
        return
      }

      console.log('[is-delulu:notification] Executing Low Battery notification lifecycle.')
      clearHoverTimers()
      clearNotificationTimers()

      const percent = typeof target === 'number' ? target : (target.percent ?? 30)
      if (typeof target === 'object') {
        setBatteryState(target)
      } else {
        setBatteryState((prev) => (prev ? { ...prev, percent } : ({ percent } as BatteryState)))
      }

      const sid = ++notificationSessionIdRef.current

      // Notify native window
      window.isDelulu?.notifyNotificationStarted?.('low_battery')

      transitionTo('LOW_BATTERY_ENTERING')

      // Entrance animation (380ms) -> ACTIVE
      notificationTimerRef.current = setTimeout(() => {
        if (notificationSessionIdRef.current !== sid) return
        transitionTo('LOW_BATTERY_ACTIVE')

        // Active hold duration (3,200ms) -> EXITING
        notificationTimerRef.current = setTimeout(() => {
          if (notificationSessionIdRef.current !== sid) return
          transitionTo('LOW_BATTERY_EXITING')

          // Exit slide up into top bezel (320ms) -> HIDDEN
          notificationTimerRef.current = setTimeout(() => {
            if (notificationSessionIdRef.current !== sid) return
            transitionTo('HIDDEN')
            // Process next queued notification in priority order
            processNextQueuedNotification()
          }, 320)
        }, 3200)
      }, 380)
    },
    [
      clearHoverTimers,
      clearNotificationTimers,
      transitionTo,
      enqueueNotification,
      processNextQueuedNotification
    ]
  )
  triggerLowBatteryRef.current = triggerLowBattery

  const dismissNotification = useCallback(() => {
    if (!isNotificationActiveState(stateRef.current)) return
    console.log('[is-delulu:coordinator] Notification dismissed manually.')
    clearNotificationTimers()
    notificationQueueRef.current = []
    ++notificationSessionIdRef.current
    transitionTo('HIDDEN')
    window.isDelulu?.notifyNotificationEnded?.() ??
      window.isDelulu?.notifyChargingEnded?.()
  }, [clearNotificationTimers, transitionTo])

  const dismissCharging = useCallback(() => {
    if (!isChargingState(stateRef.current)) return
    notificationQueueRef.current = notificationQueueRef.current.filter((i) => i.type !== 'charging')
    dismissNotification()
  }, [dismissNotification])

  // ── 0. Priority 0: Welcome Animation Lifecycle ──────────────────────────────
  const [welcomeSessionId, setWelcomeSessionId] = useState(1)
  const welcomeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const welcomeSessionIdRef = useRef(1)

  const triggerWelcome = useCallback(
    (force = false) => {
      // If welcome is already active, ignore duplicate trigger unless forced (e.g. system resume)
      if (stateRef.current === 'WELCOME_ACTIVE' && !force) {
        return
      }

      console.log('[is-delulu:coordinator] triggerWelcome: Starting welcome greeting sequence.')
      const sid = ++welcomeSessionIdRef.current
      setWelcomeSessionId(sid)

      if (welcomeTimerRef.current) {
        clearTimeout(welcomeTimerRef.current)
        welcomeTimerRef.current = null
      }
      clearHoverTimers()
      clearNotificationTimers()

      transitionTo('WELCOME_ACTIVE')

      // Safety timeout fallback (8000ms) in case component animation fails to complete
      welcomeTimerRef.current = setTimeout(() => {
        if (welcomeSessionIdRef.current !== sid) return
        welcomeTimerRef.current = null
        if (stateRef.current === 'WELCOME_ACTIVE') {
          console.warn('[is-delulu:coordinator] Welcome greeting fallback timeout fired.')
          completeWelcome()
        }
      }, 8000)
    },
    [clearHoverTimers, clearNotificationTimers, transitionTo]
  )

  const completeWelcome = useCallback(() => {
    if (stateRef.current !== 'WELCOME_ACTIVE') return
    console.log(
      '[is-delulu:coordinator] completeWelcome: Welcome greeting completed. Revealing normal live clock.'
    )
    ++welcomeSessionIdRef.current
    if (welcomeTimerRef.current) {
      clearTimeout(welcomeTimerRef.current)
      welcomeTimerRef.current = null
    }

    window.isDelulu?.markWelcomeShown?.()
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('is-delulu:welcome-shown', 'true')
    }

    if (isPinnedRef.current) {
      transitionTo('PINNED')
    } else {
      transitionTo('COLLAPSED')
    }

    // Now inspect coordinator queue for pending power notifications
    if (notificationQueueRef.current.length > 0) {
      console.log(
        `[is-delulu:coordinator] Welcome completed with ${notificationQueueRef.current.length} queued notification(s). Scheduling execution after clock pause.`
      )
      // Hold clock visible briefly (350ms) before smoothly entering the highest priority notification
      setTimeout(() => {
        processNextQueuedNotification()
      }, 350)
    } else {
      if (!isHoveredRef.current && !isPinnedRef.current) {
        // Keep clock visible for a relaxed 2,600ms dwell after welcome greeting before smoothly sliding back up
        startMinVisibilityTimer(2600)
      }
    }
  }, [transitionTo, startMinVisibilityTimer, processNextQueuedNotification])

  const dismissWelcome = useCallback(() => {
    if (stateRef.current !== 'WELCOME_ACTIVE') return
    console.log('[is-delulu:coordinator] dismissWelcome executed.')
    ++welcomeSessionIdRef.current
    if (welcomeTimerRef.current) {
      clearTimeout(welcomeTimerRef.current)
      welcomeTimerRef.current = null
    }
    transitionTo('HIDDEN')
  }, [transitionTo])

  // Sync pinned preference changes
  const prevPinnedRef = useRef(isPinned)
  useEffect(() => {
    if (prevPinnedRef.current !== isPinned) {
      prevPinnedRef.current = isPinned
      if (isPinned) {
        clearHoverTimers()
        transitionTo('PINNED')
      } else if (stateRef.current === 'PINNED') {
        transitionTo('EXPANDED')
      }
    }
  }, [isPinned, clearHoverTimers, transitionTo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHoverTimers()
      clearNotificationTimers()
      if (welcomeTimerRef.current) {
        clearTimeout(welcomeTimerRef.current)
      }
    }
  }, [clearHoverTimers, clearNotificationTimers])

  const currentMode = getIslandMode(state)
  const chargingPhase = getChargingPhase(state)
  const energySaverPhase = getEnergySaverPhase(state)
  const lowBatteryPhase = getLowBatteryPhase(state)
  const welcomePhase = getWelcomePhase(state)
  const isNotificationActive = isNotificationActiveState(state)
  const isChargingActive = isChargingState(state)
  const activeNotification = getActiveNotificationType(state)

  return {
    state,
    currentMode,
    chargingPhase,
    energySaverPhase,
    lowBatteryPhase,
    welcomePhase,
    welcomeSessionId,
    energySaverMode,
    energySaverThreshold,
    isChargingActive,
    isNotificationActive,
    activeNotification,
    batteryState,
    setBatteryState,
    isHovered: isHoveredRef.current,
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
    clearTimer: clearHoverTimers
  }
}
