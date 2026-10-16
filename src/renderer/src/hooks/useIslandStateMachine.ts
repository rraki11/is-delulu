import { useState, useRef, useCallback, useEffect } from 'react'
import { IslandMode, UserPreferences } from '../../../shared/types'

export type IslandState = 'HIDDEN' | 'COLLAPSED' | 'EXPANDED' | 'PINNED'

interface UseIslandStateMachineProps {
  initialMode?: IslandMode
  preferences: UserPreferences | null
  onModeChange?: (mode: IslandMode) => void
  updateMouseHitTest?: (isInside: boolean) => void
}

export function useIslandStateMachine({
  initialMode = 'collapsed',
  preferences,
  onModeChange,
  updateMouseHitTest
}: UseIslandStateMachineProps) {
  const isPinned = Boolean(preferences?.isPinned)
  const isPinnedRef = useRef(isPinned)
  isPinnedRef.current = isPinned

  // Primary state: HIDDEN | COLLAPSED | EXPANDED | PINNED
  const [state, setState] = useState<IslandState>(() => {
    if (isPinned) return 'PINNED'
    if (initialMode === 'hidden') return 'HIDDEN'
    if (initialMode === 'expanded') return 'EXPANDED'
    return 'COLLAPSED'
  })

  const stateRef = useRef<IslandState>(state)
  stateRef.current = state

  const isHoveredRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timerTypeRef = useRef<'grace' | 'min_visibility' | null>(null)

  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange

  const updateMouseHitTestRef = useRef(updateMouseHitTest)
  updateMouseHitTestRef.current = updateMouseHitTest

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      timerTypeRef.current = null
    }
  }, [])

  // Transition to a state and notify parent and native window
  const transitionTo = useCallback(
    (nextState: IslandState) => {
      clearTimer()
      stateRef.current = nextState
      setState(nextState)

      const mode: IslandMode =
        nextState === 'PINNED' || nextState === 'EXPANDED'
          ? 'expanded'
          : nextState === 'COLLAPSED'
          ? 'collapsed'
          : 'hidden'

      if (onModeChangeRef.current) {
        onModeChangeRef.current(mode)
      }

      if (window.isDelulu) {
        // When transitioning to HIDDEN, allow MorphingIsland to execute its smooth
        // slide-up collapse animation into the top border. MorphingIsland calls
        // setIslandMode('hidden') on animation complete.
        if (mode !== 'hidden') {
          window.isDelulu.setIslandMode(mode)
        }
      }

      if (updateMouseHitTestRef.current) {
        updateMouseHitTestRef.current(nextState !== 'HIDDEN')
      }
    },
    [clearTimer]
  )

  // Sync pinned preference changes only when isPinned actually changes
  const prevPinnedRef = useRef(isPinned)
  useEffect(() => {
    if (prevPinnedRef.current !== isPinned) {
      prevPinnedRef.current = isPinned
      if (isPinned) {
        clearTimer()
        transitionTo('PINNED')
      } else if (stateRef.current === 'PINNED') {
        transitionTo('EXPANDED')
      }
    }
  }, [isPinned, clearTimer, transitionTo])

  // Step 2 of auto-hide: Keep the collapsed pill visible for at least 1,000ms before hiding
  const startMinVisibilityTimer = useCallback(() => {
    clearTimer()
    timerTypeRef.current = 'min_visibility'

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      timerTypeRef.current = null

      // Pinned or pointer is inside the pill: stay visible!
      if (isPinnedRef.current || isHoveredRef.current) return

      if (stateRef.current === 'COLLAPSED') {
        // Blur any lingering active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        transitionTo('HIDDEN')
      }
    }, 1000) // Minimum 1,000 milliseconds visible
  }, [clearTimer, transitionTo])

  // Step 1 of auto-collapse: After pointer leaves EXPANDED, start short grace period (700ms)
  const startGraceCollapseTimer = useCallback(() => {
    clearTimer()
    timerTypeRef.current = 'grace'

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      timerTypeRef.current = null

      // Pinned or pointer returned to expanded panel: stay open!
      if (isPinnedRef.current || isHoveredRef.current) return

      if (stateRef.current === 'EXPANDED') {
        // Blur any focused input (e.g. search bar) so keyboard focus does not linger
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }

        // Step 1: Smoothly collapse into the minimal pill
        transitionTo('COLLAPSED')

        // Step 2: Keep the collapsed pill visible for at least 1,000 milliseconds before hiding
        startMinVisibilityTimer()
      } else if (stateRef.current === 'COLLAPSED') {
        startMinVisibilityTimer()
      }
    }, 700) // 700ms grace period
  }, [clearTimer, transitionTo, startMinVisibilityTimer])

  // Pointer enters the island surface
  const handlePointerEnter = useCallback(() => {
    isHoveredRef.current = true
    clearTimer()

    if (updateMouseHitTestRef.current) {
      updateMouseHitTestRef.current(true)
    }

    // If pointer enters while hidden (e.g. via ceiling zone), reveal pill
    if (stateRef.current === 'HIDDEN') {
      transitionTo('COLLAPSED')
    }
  }, [clearTimer, transitionTo])

  // Pointer leaves the interactive island bounds
  const handlePointerLeave = useCallback(() => {
    // If already marked unhovered and a collapse/hide timer is actively ticking, don't restart it
    if (!isHoveredRef.current && timerRef.current) {
      return
    }

    isHoveredRef.current = false

    // If pinned, preserve pinned behavior
    if (isPinnedRef.current || stateRef.current === 'PINNED') {
      return
    }

    if (stateRef.current === 'EXPANDED') {
      startGraceCollapseTimer()
    } else if (stateRef.current === 'COLLAPSED') {
      startMinVisibilityTimer()
    }
  }, [startGraceCollapseTimer, startMinVisibilityTimer])

  // Explicit user actions
  const expand = useCallback(() => {
    clearTimer()
    isHoveredRef.current = true
    transitionTo(isPinnedRef.current ? 'PINNED' : 'EXPANDED')
  }, [clearTimer, transitionTo])

  const collapse = useCallback(() => {
    clearTimer()
    // Blur any focused input
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    transitionTo('COLLAPSED')
    if (!isHoveredRef.current && !isPinnedRef.current) {
      startMinVisibilityTimer()
    }
  }, [clearTimer, transitionTo, startMinVisibilityTimer])

  const reveal = useCallback(() => {
    clearTimer()
    if (stateRef.current === 'HIDDEN') {
      transitionTo('COLLAPSED')
      // If revealed without mouse inside, keep visible for at least 1,000ms
      if (!isHoveredRef.current && !isPinnedRef.current) {
        startMinVisibilityTimer()
      }
    }
  }, [clearTimer, transitionTo, startMinVisibilityTimer])

  const hide = useCallback(() => {
    clearTimer()
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    transitionTo('HIDDEN')
  }, [clearTimer, transitionTo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  const currentMode: IslandMode =
    state === 'PINNED' || state === 'EXPANDED'
      ? 'expanded'
      : state === 'COLLAPSED'
      ? 'collapsed'
      : 'hidden'

  return {
    state,
    currentMode,
    isHovered: isHoveredRef.current,
    handlePointerEnter,
    handlePointerLeave,
    expand,
    collapse,
    reveal,
    hide,
    clearTimer
  }
}

