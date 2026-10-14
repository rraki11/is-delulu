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

  // Check if DOM state permits auto-hiding
  const checkCanHide = useCallback((): boolean => {
    if (isPinnedRef.current) return false
    if (isHoveredRef.current) return false

    // Active input or contenteditable
    const active = document.activeElement
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.getAttribute('contenteditable') === 'true')
    ) {
      return false
    }

    // Active text selection
    const selection = window.getSelection()?.toString() || ''
    if (selection.trim().length > 0) return false

    return true
  }, [])

  // Sync mode with parent/window
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
        window.isDelulu.setIslandMode(mode)
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

  // Start 1,000ms minimum visibility timer in COLLAPSED mode before hiding
  const startMinVisibilityTimer = useCallback(() => {
    clearTimer()
    timerTypeRef.current = 'min_visibility'

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      timerTypeRef.current = null

      if (!checkCanHide()) return
      if (stateRef.current === 'COLLAPSED') {
        transitionTo('HIDDEN')
      }
    }, 1000) // Minimum 1,000 milliseconds visible
  }, [clearTimer, checkCanHide, transitionTo])

  // Start initial grace period when pointer leaves EXPANDED
  const startGraceCollapseTimer = useCallback(() => {
    clearTimer()
    timerTypeRef.current = 'grace'

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      timerTypeRef.current = null

      if (!checkCanHide()) return

      if (stateRef.current === 'EXPANDED') {
        // Step 1: Smoothly collapse into the minimal pill
        transitionTo('COLLAPSED')
        // Step 2: Keep the collapsed pill visible for at least 1,000ms
        startMinVisibilityTimer()
      } else if (stateRef.current === 'COLLAPSED') {
        startMinVisibilityTimer()
      }
    }, 700) // 700ms initial grace period
  }, [clearTimer, checkCanHide, transitionTo, startMinVisibilityTimer])

  // Pointer interactions
  const handlePointerEnter = useCallback(() => {
    isHoveredRef.current = true
    clearTimer()

    if (updateMouseHitTest) {
      updateMouseHitTest(true)
    }

    // If pointer enters during minimum visibility timer or grace period, stay visible!
    if (stateRef.current === 'HIDDEN') {
      transitionTo('COLLAPSED')
    }
  }, [clearTimer, updateMouseHitTest, transitionTo])

  const handlePointerLeave = useCallback(() => {
    isHoveredRef.current = false

    if (isPinnedRef.current || stateRef.current === 'PINNED') {
      return
    }

    if (updateMouseHitTest) {
      updateMouseHitTest(false)
    }

    if (stateRef.current === 'EXPANDED') {
      startGraceCollapseTimer()
    } else if (stateRef.current === 'COLLAPSED') {
      startMinVisibilityTimer()
    }
  }, [startGraceCollapseTimer, startMinVisibilityTimer, updateMouseHitTest])

  // Explicit user actions
  const expand = useCallback(() => {
    clearTimer()
    isHoveredRef.current = true
    transitionTo(isPinnedRef.current ? 'PINNED' : 'EXPANDED')
  }, [clearTimer, transitionTo])

  const collapse = useCallback(() => {
    clearTimer()
    transitionTo('COLLAPSED')
    if (!isHoveredRef.current && !isPinnedRef.current) {
      startMinVisibilityTimer()
    }
  }, [clearTimer, transitionTo, startMinVisibilityTimer])

  const reveal = useCallback(() => {
    clearTimer()
    if (stateRef.current === 'HIDDEN') {
      transitionTo('COLLAPSED')
      // If revealed by ceiling hit without mouse inside pill, give it the 1s visibility
      if (!isHoveredRef.current && !isPinnedRef.current) {
        startMinVisibilityTimer()
      }
    }
  }, [clearTimer, transitionTo, startMinVisibilityTimer])

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
    clearTimer
  }
}
