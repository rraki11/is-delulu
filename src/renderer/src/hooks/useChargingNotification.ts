import { useEffect, useRef, useCallback, useState } from 'react'
import { BatteryState } from '../shared'

/**
 * Authoritative notification lifecycle phases:
 *   IDLE       → No notification visible; window can be hidden
 *   ENTERING   → Animating downward from above the top edge (380ms)
 *   COMPACT    → Resting visible & stable in compact form for at least 1,000ms
 *   EXPANDED   → Expanded horizontal progress bar visible (2,800ms)
 *   COLLAPSING → Shrinking smoothly back to compact pill (300ms)
 *   SETTLED    → Compact pill resting at top-center for final reading (950ms)
 *   EXITING    → Animating upward beyond the top edge into hidden (320ms)
 */
export type ChargingPhase =
  | 'idle'
  | 'entering'
  | 'compact'
  | 'expanded'
  | 'collapsing'
  | 'settled'
  | 'exiting'

interface UseChargingNotificationOptions {
  onShow?: () => void
  onHide?: () => void
}

/**
 * Centralized, authoritative charging notification hook.
 *
 * Invariants enforced:
 *  - Triggers automatically from genuine Windows charger connection events.
 *  - Operates completely independently of mouse cursor position or hover state.
 *  - Entrance animation plays first (~380ms).
 *  - Once fully visible, the compact pill remains stable for at least 1,000ms before expanding.
 *  - Expanded-state duration (2.8s), collapse (300ms), settled (950ms), and exit (320ms) are preserved.
 *  - Battery percentage updates while charging do NOT reset timers or retrigger expansions.
 *  - Ignores application startup so already-charging laptops do not trigger spurious alerts.
 *  - Only triggers again after a real disconnect followed by a new connection.
 *  - Coordinates with native Electron window via notifyChargingStarted / notifyChargingEnded.
 */
export function useChargingNotification(opts?: UseChargingNotificationOptions) {
  const [phase, setPhase] = useState<ChargingPhase>('idle')
  const phaseRef = useRef<ChargingPhase>('idle')
  phaseRef.current = phase

  const optsRef = useRef(opts)
  optsRef.current = opts

  const [batteryState, setBatteryState] = useState<BatteryState | null>(null)

  // Edge-detection & session state
  const prevChargingRef = useRef<boolean | null>(null)
  const sessionIdRef = useRef(0)
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isStartupRef = useRef(true)

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current)
      phaseTimerRef.current = null
    }
  }, [])

  /**
   * Authoritative charging notification sequence:
   *   idle
   *     → entering   (380ms: spring slide down from above top edge into view)
   *     → compact    (1,000ms: stable compact pill visible for reading)
   *     → expanded   (2,800ms: horizontal progress bar pill)
   *     → collapsing (300ms: shrink back to compact pill)
   *     → settled    (950ms: compact pill resting at top-center)
   *     → exiting    (320ms: spring slide up into top edge)
   *     → idle       (notifies native window to hide if unpinned)
   */
  const runSequence = useCallback(
    (newState?: BatteryState) => {
      if (newState) {
        setBatteryState(newState)
      }

      // If notification is already running, ignore duplicate calls so timer is never reset
      if (phaseRef.current !== 'idle') {
        return
      }

      clearPhaseTimer()
      const sid = ++sessionIdRef.current

      // Notify main process to ensure native window is visible and click-through
      window.isDelulu?.notifyChargingStarted?.()
      optsRef.current?.onShow?.()

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reducedMotion) {
        setPhase('expanded')
        phaseTimerRef.current = setTimeout(() => {
          if (sessionIdRef.current !== sid) return
          setPhase('idle')
          optsRef.current?.onHide?.()
          window.isDelulu?.notifyChargingEnded?.()
        }, 2800)
        return
      }

      // 1. Entering: slide down from above top edge into view (380ms)
      setPhase('entering')

      // 2. Entrance completes after 380ms: compact pill has fully appeared.
      // Keep it visible and stable for at least 1,000ms (1 full second)
      phaseTimerRef.current = setTimeout(() => {
        if (sessionIdRef.current !== sid) return
        setPhase('compact')

        // 3. Start 1,000ms stable compact timer after entrance completes
        phaseTimerRef.current = setTimeout(() => {
          if (sessionIdRef.current !== sid) return
          // 4. Smoothly expand into detailed charging indicator
          setPhase('expanded')

          // 5. Keep expanded for reading (~2.8s)
          phaseTimerRef.current = setTimeout(() => {
            if (sessionIdRef.current !== sid) return
            setPhase('collapsing')

            // 6. Collapse smoothly into compact pill (~300ms)
            phaseTimerRef.current = setTimeout(() => {
              if (sessionIdRef.current !== sid) return
              setPhase('settled')

              // 7. Rest in settled compact state (~950ms)
              phaseTimerRef.current = setTimeout(() => {
                if (sessionIdRef.current !== sid) return
                setPhase('exiting')

                // 8. Animate upward beyond top edge (~320ms)
                phaseTimerRef.current = setTimeout(() => {
                  if (sessionIdRef.current !== sid) return
                  setPhase('idle')
                  optsRef.current?.onHide?.()
                  window.isDelulu?.notifyChargingEnded?.()
                }, 320)
              }, 950)
            }, 300)
          }, 2800)
        }, 1000)
      }, 380)
    },
    [clearPhaseTimer]
  )

  const dismiss = useCallback(() => {
    clearPhaseTimer()
    ++sessionIdRef.current
    setPhase('idle')
    optsRef.current?.onHide?.()
    window.isDelulu?.notifyChargingEnded?.()
  }, [clearPhaseTimer])

  useEffect(() => {
    if (!window.isDelulu) return

    // 1. Initial battery read — treat as startup, never trigger notification
    window.isDelulu.getBatteryState().then((initial) => {
      setBatteryState(initial)
      prevChargingRef.current = initial.isOnAC === true || initial.isCharging === true
      setTimeout(() => {
        isStartupRef.current = false
      }, 2000)
    })

    // 2. Direct charging event from main process
    const unsubCharging = window.isDelulu.onChargingTriggered
      ? window.isDelulu.onChargingTriggered((state) => {
          if (phaseRef.current === 'idle') {
            runSequence(state)
          }
        })
      : () => {}

    // 3. Regular battery state update stream with fallback edge detection
    const unsubBattery = window.isDelulu.onBatteryStateUpdate((state) => {
      setBatteryState(state)

      const isConnected = state.isOnAC === true || state.isCharging === true
      const prevConnected = prevChargingRef.current

      // Fallback edge-detection: strictly false -> true transition when startup settled
      if (!isStartupRef.current && isConnected && prevConnected === false) {
        if (phaseRef.current === 'idle') {
          runSequence(state)
        }
      }

      // If unplugged while notification is active, abort gracefully (never abort when reaching 100%)
      if (prevConnected === true && !isConnected) {
        dismiss()
      }

      prevChargingRef.current = isConnected
    })

    return () => {
      unsubCharging()
      unsubBattery()
      clearPhaseTimer()
    }
  }, [runSequence, dismiss, clearPhaseTimer])

  return {
    phase,
    batteryState,
    dismiss,
    triggerManual: runSequence
  }
}
