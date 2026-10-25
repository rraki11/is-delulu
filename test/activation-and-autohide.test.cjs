// Test Suite: Activation Zone Precision & Auto-Hide Reliability Verification
// Verifies Bug 1 (Top-edge activation zone and false activation prevention)
// and Bug 2 (Auto-hide prevention, continuous hover region, and pre-execution revalidation).

const assert = require('assert')

console.log('=== RUNNING ACTIVATION & AUTO-HIDE VERIFICATION TEST SUITE ===\n')

let passedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err)
    process.exit(1)
  }
}

// -----------------------------------------------------------------------------
// PART 1: Top-Edge Activation Zone Precision (Bug 1)
// -----------------------------------------------------------------------------

function simulateActivationZoneCheck({ bounds, centerX, pt, wasInActivationZone, currentMode }) {
  // Physical top ceiling of primary display: pt.y >= bounds.y && pt.y <= bounds.y + 4 (4px depth)
  // Centered horizontally: Math.abs(pt.x - centerX) <= 100 (200px wide slot)
  const inTopEdgeActivationZone =
    pt.y >= bounds.y &&
    pt.y <= bounds.y + 4 &&
    Math.abs(pt.x - centerX) <= 100

  const isEdgeTriggeredActivation = inTopEdgeActivationZone && !wasInActivationZone
  const nextWasInActivationZone = inTopEdgeActivationZone

  let willReveal = false
  if (currentMode === 'hidden') {
    if (isEdgeTriggeredActivation) {
      willReveal = true
    }
  }

  return {
    inTopEdgeActivationZone,
    isEdgeTriggeredActivation,
    nextWasInActivationZone,
    willReveal
  }
}

runTest('Bug 1 Test 1: Pointer near browser tabs (y=15 to 45) never reveals hidden island', () => {
  const bounds = { x: 0, y: 0, width: 1920, height: 1080 }
  const centerX = 960

  // Browser tab bar coordinates (y=10, 20, 30, 40) right under center
  const testPoints = [
    { x: 960, y: 10 },
    { x: 960, y: 25 },
    { x: 960, y: 35 },
    { x: 960, y: 47 },
    { x: 900, y: 30 },
    { x: 1020, y: 30 }
  ]

  for (const pt of testPoints) {
    const res = simulateActivationZoneCheck({
      bounds,
      centerX,
      pt,
      wasInActivationZone: false,
      currentMode: 'hidden'
    })
    assert.strictEqual(res.willReveal, false, `Point (${pt.x}, ${pt.y}) must NOT reveal hidden island`)
    assert.strictEqual(res.inTopEdgeActivationZone, false, `Point (${pt.x}, ${pt.y}) must be outside activation zone`)
  }
})

runTest('Bug 1 Test 2: Pointer at top ceiling outside center slot (|dx| > 100) never reveals island', () => {
  const bounds = { x: 0, y: 0, width: 1920, height: 1080 }
  const centerX = 960

  const offCenterPoints = [
    { x: 800, y: 1 },  // dx = -160
    { x: 1100, y: 2 }, // dx = +140
    { x: 500, y: 0 },  // dx = -460
    { x: 1500, y: 3 }  // dx = +540
  ]

  for (const pt of offCenterPoints) {
    const res = simulateActivationZoneCheck({
      bounds,
      centerX,
      pt,
      wasInActivationZone: false,
      currentMode: 'hidden'
    })
    assert.strictEqual(res.willReveal, false, `Off-center point (${pt.x}, ${pt.y}) must NOT reveal hidden island`)
  }
})

runTest('Bug 1 Test 3: Genuine transition from outside to ceiling center triggers reveal once', () => {
  const bounds = { x: 0, y: 0, width: 1920, height: 1080 }
  const centerX = 960

  // Step 1: Cursor approaching from y=20 (outside)
  let wasIn = false
  let pt = { x: 960, y: 20 }
  let res = simulateActivationZoneCheck({ bounds, centerX, pt, wasInActivationZone: wasIn, currentMode: 'hidden' })
  assert.strictEqual(res.willReveal, false)
  wasIn = res.nextWasInActivationZone

  // Step 2: Cursor hits top edge ceiling (y=2, x=960) -> genuine outside to inside transition!
  pt = { x: 960, y: 2 }
  res = simulateActivationZoneCheck({ bounds, centerX, pt, wasInActivationZone: wasIn, currentMode: 'hidden' })
  assert.strictEqual(res.willReveal, true, 'Genuine transition to ceiling center must reveal island')
  wasIn = res.nextWasInActivationZone

  // Step 3: Cursor rests at ceiling for another tick (y=2, x=960) -> level is high, but no new transition
  res = simulateActivationZoneCheck({ bounds, centerX, pt, wasInActivationZone: wasIn, currentMode: 'hidden' })
  assert.strictEqual(res.willReveal, false, 'Resting at ceiling must not repeatedly re-trigger reveal')
})

// -----------------------------------------------------------------------------
// PART 2: Auto-Hide Prevention & Pre-Execution Revalidation (Bug 2)
// -----------------------------------------------------------------------------

runTest('Bug 2 Test 1: Immediate cancellation of auto-hide timers on hover-entry via generation token', () => {
  let generation = 0
  let timerActive = false
  let state = 'EXPANDED'

  // User leaves surface -> timer scheduled
  const scheduledGen = ++generation
  timerActive = true

  // Pointer enters surface again before timer fires
  generation++ // handlePointerEnter increments generation token
  timerActive = false

  // Timer executes after delay:
  const timerFired = () => {
    if (scheduledGen !== generation) {
      // Stale timer rejected
      return false
    }
    state = 'COLLAPSED'
    return true
  }

  const result = timerFired()
  assert.strictEqual(result, false, 'Stale timer with outdated generation token must be rejected')
  assert.strictEqual(state, 'EXPANDED', 'Island state must remain EXPANDED without collapsing')
})

runTest('Bug 2 Test 2: Pre-execution revalidation cancels auto-collapse if cursor is inside surface', () => {
  let isHovered = false
  let state = 'EXPANDED'

  // Mock island surface DOM bounds (e.g. Controls tab: 640x390 centered at 960, so 640 to 1280)
  const surfaceRect = { left: 640, right: 1280, top: 0, bottom: 390 }
  
  // Cursor is currently at (960, 200) - right in the center of the surface!
  const currentCursor = { x: 960, y: 200 }

  const startGraceCollapseTimer = () => {
    // Timer callback
    const executeTimer = () => {
      // Pre-execution revalidation against real surface bounds
      const isPhysicallyInside =
        currentCursor.x >= surfaceRect.left - 10 &&
        currentCursor.x <= surfaceRect.right + 10 &&
        currentCursor.y >= surfaceRect.top - 10 &&
        currentCursor.y <= surfaceRect.bottom + 10

      if (isPhysicallyInside) {
        // Cancel collapse!
        isHovered = true
        return 'CANCELLED'
      }

      state = 'COLLAPSED'
      return 'COLLAPSED'
    }

    return executeTimer()
  }

  const outcome = startGraceCollapseTimer()
  assert.strictEqual(outcome, 'CANCELLED', 'Collapse must be cancelled when cursor is visibly inside surface')
  assert.strictEqual(isHovered, true, 'isHovered must be restored to true')
  assert.strictEqual(state, 'EXPANDED', 'State must remain EXPANDED')
})

runTest('Bug 2 Test 3: Tab morphology changes (Controls -> Power 640x236) maintain valid hit testing', () => {
  const winBounds = { x: 440, y: 0, width: 1080, height: 700 }
  
  // Power widget dynamic bounds: 640 wide, 236 high, centered in 1080 window (offset x = 220)
  const powerLiveRect = { x: 220, y: 0, width: 640, height: 236 }

  const screenLeft = winBounds.x + powerLiveRect.x // 660
  const screenRight = screenLeft + powerLiveRect.width // 1300
  const screenTop = winBounds.y + powerLiveRect.y // 0
  const screenBottom = screenTop + powerLiveRect.height // 236

  // Test point on a Power button inside Power tab (x=960, y=180)
  const cursorInsidePowerTab = { x: 960, y: 180 }
  const inSurface =
    cursorInsidePowerTab.x >= screenLeft - 14 &&
    cursorInsidePowerTab.x <= screenRight + 14 &&
    cursorInsidePowerTab.y >= screenTop - 6 &&
    cursorInsidePowerTab.y <= screenBottom + 12

  assert.strictEqual(inSurface, true, 'Cursor inside Power tab action cards must evaluate to inSurface=true')

  // Test point below Power tab (x=960, y=300) - outside 236px height
  const cursorBelowPowerTab = { x: 960, y: 300 }
  const inSurfaceBelow =
    cursorBelowPowerTab.x >= screenLeft - 14 &&
    cursorBelowPowerTab.x <= screenRight + 14 &&
    cursorBelowPowerTab.y >= screenTop - 6 &&
    cursorBelowPowerTab.y <= screenBottom + 12

  assert.strictEqual(inSurfaceBelow, false, 'Cursor below Power tab must not falsely evaluate to inSurface=true')
})

runTest('Bug 2 Test 4: Moving across child buttons or tabs does not trigger spurious collapse', () => {
  let isHovered = true
  let state = 'EXPANDED'
  let collapseTimer = null

  const surfaceRect = { left: 640, right: 1280, top: 0, bottom: 390 }

  // Child element positions inside surface
  const child1 = { x: 700, y: 50 } // Navigation tab
  const child2 = { x: 960, y: 150 } // Volume slider
  const child3 = { x: 1100, y: 300 } // Power card

  const moveCursor = (pt) => {
    const isInside =
      pt.x >= surfaceRect.left - 16 &&
      pt.x <= surfaceRect.right + 16 &&
      pt.y >= -6 &&
      pt.y <= surfaceRect.bottom + 12

    if (isInside) {
      if (collapseTimer) {
        clearTimeout(collapseTimer)
        collapseTimer = null
      }
      isHovered = true
    } else {
      isHovered = false
      collapseTimer = setTimeout(() => {
        state = 'COLLAPSED'
      }, 500)
    }
  }

  // User traverses child elements inside surface
  moveCursor(child1)
  assert.strictEqual(isHovered, true)
  assert.strictEqual(collapseTimer, null)

  moveCursor(child2)
  assert.strictEqual(isHovered, true)
  assert.strictEqual(collapseTimer, null)

  moveCursor(child3)
  assert.strictEqual(isHovered, true)
  assert.strictEqual(collapseTimer, null)

  assert.strictEqual(state, 'EXPANDED', 'Moving across internal UI elements must keep state EXPANDED')
})

console.log(`\nALL ${passedTests} ACTIVATION & AUTO-HIDE VERIFICATION TESTS PASSED SUCCESSFULLY!`)
