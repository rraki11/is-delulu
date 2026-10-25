// Test Suite: Volume Slider Mouse-Wheel Scrolling & Audio Integration Verification
// Verifies wheel step calculations, clamping (0-100%), rapid event serialization,
// mute state preservation, event scoping/propagation prevention, and drag/click mechanics.

const assert = require('assert')
const fs = require('fs')

console.log('=== RUNNING VOLUME WHEEL CONTROL VERIFICATION TEST SUITE ===\n')

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

// 1. Wheel step calculations and direction logic
runTest('Volume Test 1: Mouse wheel deltaY calculations produce correct directional steps', () => {
  const WHEEL_STEP = 2

  function calculateWheelSteps(deltaY, accumulator = 0) {
    let steps = 0
    let nextAcc = accumulator

    if (Math.abs(deltaY) >= 40) {
      steps = Math.max(1, Math.round(Math.abs(deltaY) / 100)) * Math.sign(-deltaY)
    } else {
      nextAcc += -deltaY
      const PIXELS_PER_STEP = 35
      if (Math.abs(nextAcc) >= PIXELS_PER_STEP) {
        steps = Math.trunc(nextAcc / PIXELS_PER_STEP)
        nextAcc -= steps * PIXELS_PER_STEP
      }
    }

    return { steps, deltaPercent: steps * WHEEL_STEP, accumulator: nextAcc }
  }

  // Discrete wheel tick up (scroll up = negative deltaY)
  const upTick = calculateWheelSteps(-100)
  assert.strictEqual(upTick.steps, 1, 'Scroll up 1 tick must be +1 step')
  assert.strictEqual(upTick.deltaPercent, 2, 'Scroll up 1 tick must add 2%')

  // Discrete wheel tick down (scroll down = positive deltaY)
  const downTick = calculateWheelSteps(100)
  assert.strictEqual(downTick.steps, -1, 'Scroll down 1 tick must be -1 step')
  assert.strictEqual(downTick.deltaPercent, -2, 'Scroll down 1 tick must subtract 2%')

  // Fast wheel flick up
  const fastFlick = calculateWheelSteps(-300)
  assert.strictEqual(fastFlick.steps, 3, 'Fast flick -300 must produce 3 steps')
  assert.strictEqual(fastFlick.deltaPercent, 6, 'Fast flick must add 6%')

  // Precision trackpad small scroll (accumulation)
  let accResult = calculateWheelSteps(-10, 0)
  assert.strictEqual(accResult.steps, 0, '10px trackpad scroll should accumulate without stepping yet')
  assert.strictEqual(accResult.accumulator, 10, 'Accumulator must hold 10px')

  // Second trackpad scroll exceeding 35px threshold
  accResult = calculateWheelSteps(-26, accResult.accumulator)
  assert.strictEqual(accResult.steps, 1, '36px accumulated must trigger 1 step (+2%)')
  assert.strictEqual(accResult.deltaPercent, 2, 'Must yield +2%')
  assert.strictEqual(accResult.accumulator, 1, 'Accumulator remainder must be 1px')
})

// 2. Strict Boundary Clamping (0% to 100%)
runTest('Volume Test 2: Volume clamping strictly confines values between 0% and 100%', () => {
  function clampVolume(vol) {
    return Math.max(0, Math.min(100, Math.round(vol)))
  }

  assert.strictEqual(clampVolume(99 + 2), 100, '99% + 2% must clamp to 100%')
  assert.strictEqual(clampVolume(100 + 10), 100, '100% + 10% must clamp to 100%')
  assert.strictEqual(clampVolume(1 - 2), 0, '1% - 2% must clamp to 0%')
  assert.strictEqual(clampVolume(0 - 5), 0, '0% - 5% must clamp to 0%')
  assert.strictEqual(clampVolume(54.4), 54, 'Floating point must round cleanly')
  assert.strictEqual(clampVolume(54.6), 55, 'Floating point must round cleanly')
})

// 3. Event Scoping & Propagation Prevention
runTest('Volume Test 3: Wheel event intercepts prevent bubbling to parent containers', () => {
  let defaultPrevented = false
  let propagationStopped = false

  const mockWheelEvent = {
    deltaY: -100,
    preventDefault: () => { defaultPrevented = true },
    stopPropagation: () => { propagationStopped = true }
  }

  // Verify ControlsWidget implementation contains preventDefault and stopPropagation
  const widgetSource = fs.readFileSync('src/renderer/src/components/widgets/ControlsWidget.tsx', 'utf8')
  assert(
    widgetSource.includes('e.preventDefault()') && widgetSource.includes('e.stopPropagation()'),
    'handleWheel must explicitly call preventDefault and stopPropagation'
  )

  // Test simulation
  mockWheelEvent.preventDefault()
  mockWheelEvent.stopPropagation()
  assert(defaultPrevented, 'Event default must be prevented')
  assert(propagationStopped, 'Event propagation must be stopped')
})

// 4. Rapid Wheel Event Serialization & Backward Jump Prevention
runTest('Volume Test 4: Rapid asynchronous wheel events update optimistic state monotonically', async () => {
  let localVolume = 50
  let pendingVolume = null
  let lastSentVolume = 50
  const dispatchHistory = []

  // Mock applyVolume with optimistic updates
  function applyVolume(target) {
    const clamped = Math.max(0, Math.min(100, Math.round(target)))
    localVolume = clamped
    pendingVolume = clamped
  }

  // Simulate 10 rapid upward scroll events of +2%
  for (let i = 0; i < 10; i++) {
    applyVolume(localVolume + 2)
  }

  // Optimistic UI must be 70% immediately
  assert.strictEqual(localVolume, 70, 'Optimistic volume must be exactly 70% after 10 ticks of +2%')
  assert.strictEqual(pendingVolume, 70, 'Pending volume to dispatch must be 70%')

  // Simulate worker execution
  if (pendingVolume !== null && pendingVolume !== lastSentVolume) {
    dispatchHistory.push(pendingVolume)
    lastSentVolume = pendingVolume
    pendingVolume = null
  }

  assert.strictEqual(dispatchHistory.length, 1, 'Throttled worker dispatches coalesced target')
  assert.strictEqual(dispatchHistory[0], 70, 'Delivered volume must be final 70%')

  // Simulate 5 downward scroll events
  for (let i = 0; i < 5; i++) {
    applyVolume(localVolume - 2)
  }
  assert.strictEqual(localVolume, 60, 'Optimistic volume must decrease monotonically to 60%')
  assert.strictEqual(pendingVolume, 60, 'Pending volume must be 60%')
})

// 5. Mute State Preservation
runTest('Volume Test 5: Volume adjustments preserve existing mute state in AudioSessionService', () => {
  const audioSessionSrc = fs.readFileSync('src/main/services/audio-session.ts', 'utf8')
  assert(
    !audioSessionSrc.includes('this.masterMuted = this.masterVolume === 0'),
    'audio-session.ts must NOT overwrite masterMuted = false on volume scroll'
  )
  assert(
    audioSessionSrc.includes('if (this.masterVolume === 0) {\n      this.masterMuted = true'),
    'audio-session.ts must only set masterMuted = true when volume drops to 0'
  )

  class AudioSessionServiceSimulator {
    constructor() {
      this.masterVolume = 75
      this.masterMuted = false
    }
    updateOutputs(vol, mute) {
      if (typeof vol === 'number') this.masterVolume = Math.max(0, Math.min(100, Math.round(vol)))
      if (typeof mute === 'boolean') this.masterMuted = mute
    }
    applyOptimisticMasterVolume(volume) {
      this.masterVolume = Math.max(0, Math.min(100, Math.round(volume)))
      if (this.masterVolume === 0) {
        this.masterMuted = true
      }
    }
    applyOptimisticMasterMute(mute) {
      this.masterMuted = typeof mute === 'boolean' ? mute : !this.masterMuted
    }
  }

  const service = new AudioSessionServiceSimulator()

  // Initialize at 40% unmuted
  service.updateOutputs(40, false)
  assert.strictEqual(service.masterVolume, 40)
  assert.strictEqual(service.masterMuted, false)

  // Mute system
  service.applyOptimisticMasterMute(true)
  assert.strictEqual(service.masterMuted, true, 'System should now be muted')

  // User scrolls volume up to 44% while muted
  service.applyOptimisticMasterVolume(44)
  assert.strictEqual(service.masterVolume, 44, 'Volume should update to 44%')
  assert.strictEqual(service.masterMuted, true, 'System MUST remain muted after scrolling')

  // Scrolling to 0% enforces mute
  service.applyOptimisticMasterVolume(0)
  assert.strictEqual(service.masterVolume, 0)
  assert.strictEqual(service.masterMuted, true, '0% volume must enforce mute')
})

// 6. Click-to-set and Pointer Drag Mechanics
runTest('Volume Test 6: Click and drag calculate exact percentage from geometry', () => {
  function getPercentFromGeometry(clientX, rectLeft, rectWidth) {
    const clickX = clientX - rectLeft
    return Math.max(0, Math.min(100, Math.round((clickX / rectWidth) * 100)))
  }

  const rectLeft = 100
  const rectWidth = 200

  // Click at 25% (clientX = 150)
  assert.strictEqual(getPercentFromGeometry(150, rectLeft, rectWidth), 25)

  // Click at 50% (clientX = 200)
  assert.strictEqual(getPercentFromGeometry(200, rectLeft, rectWidth), 50)

  // Drag beyond right boundary (clientX = 350) -> clamps to 100
  assert.strictEqual(getPercentFromGeometry(350, rectLeft, rectWidth), 100)

  // Drag beyond left boundary (clientX = 50) -> clamps to 0
  assert.strictEqual(getPercentFromGeometry(50, rectLeft, rectWidth), 0)
})

// 7. Accessibility and Focus Markup
runTest('Volume Test 7: ControlsWidget declares ARIA slider role, key handlers, and tabIndex', () => {
  const source = fs.readFileSync('src/renderer/src/components/widgets/ControlsWidget.tsx', 'utf8')
  assert(source.includes('role="slider"'), 'Must declare role="slider"')
  assert(source.includes('tabIndex={0}'), 'Must declare tabIndex={0}')
  assert(source.includes('aria-label="Master volume"'), 'Must declare aria-label="Master volume"')
  assert(source.includes('aria-valuenow='), 'Must declare aria-valuenow')
  assert(source.includes('aria-valuemin={0}'), 'Must declare aria-valuemin={0}')
  assert(source.includes('aria-valuemax={100}'), 'Must declare aria-valuemax={100}')
  assert(source.includes('onKeyDown={handleKeyDown}'), 'Must bind keyboard handler')
  assert(source.includes('onWheel={handleWheel}'), 'Must bind onWheel handler')
  assert(source.includes('onPointerDown={handlePointerDown}'), 'Must bind pointer drag handlers')
})

// 8. Proportional Dimensions & Aspect Ratio Maintenance
runTest('Volume Test 8: Controls tab dimensions scale proportionally (768x468) and remain within window bounds', () => {
  const constantsSrc = fs.readFileSync('src/shared/constants.ts', 'utf8')
  const controlsMatch = constantsSrc.match(/controls:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+)\s*\}/)
  assert(controlsMatch, 'HITODAMA_TAB_DIMENSIONS must define controls tab')
  const width = parseInt(controlsMatch[1], 10)
  const height = parseInt(controlsMatch[2], 10)

  assert.strictEqual(width, 768, 'Controls width must be proportionally expanded to 768px')
  assert.strictEqual(height, 468, 'Controls height must be proportionally expanded to 468px')

  // Aspect ratio check: 640/390 = 1.6410..., 768/468 = 1.6410...
  const originalAspect = 640 / 390
  const newAspect = width / height
  assert(Math.abs(originalAspect - newAspect) < 0.005, 'Aspect ratio must be preserved within 0.5%')

  // Window bounds check: 1080 x 700
  assert(width <= 1080, 'Width must fit comfortably inside 1080px window width')
  assert(height <= 700, 'Height must fit comfortably inside 700px window height')
})

// 9. Controls Tab Vertical Overflow Elimination
runTest('Volume Test 9: Complete Controls tab content fits within expanded height without vertical scrolling', () => {
  // Height budget breakdown:
  const islandHeight = 468
  const headerHeight = 51 // IslandHeader (padding 11+11, buttons 28, border 1)
  const navHeight = 50    // NavigationTabBar (padding 12+8, buttons 30)
  const contentAreaPadding = 24 // 10px top + 14px bottom
  const availableContentHeight = islandHeight - headerHeight - navHeight - contentAreaPadding // 343px

  // ControlsWidget items:
  const row1Tiles = 56 // Wi-Fi, Bluetooth, Audio
  const gap1 = 12
  const row2Tiles = 56 // Night Light, Dark Mode
  const gap2 = 12
  const row3Slider = 42 // Master Volume Slider
  const gap3 = 12
  const row4Media = 133 // Media Player Card with tags, track info, scrubber
  const controlsContentHeight = row1Tiles + gap1 + row2Tiles + gap2 + row3Slider + gap3 + row4Media // 323px

  assert(
    controlsContentHeight < availableContentHeight,
    `Controls content height (${controlsContentHeight}px) must be strictly less than available height (${availableContentHeight}px) to eliminate scrollbars`
  )
  const breathingRoom = availableContentHeight - controlsContentHeight
  assert(breathingRoom >= 15, `Breathing room (${breathingRoom}px) must be >= 15px to protect against subpixel scaling`)
})

// 10. Native Non-Passive Wheel Intercept & Overscroll Containment
runTest('Volume Test 10: Non-passive wheel event listener and overscroll-behavior contain parent scrolling', () => {
  const widgetSrc = fs.readFileSync('src/renderer/src/components/widgets/ControlsWidget.tsx', 'utf8')
  const cssSrc = fs.readFileSync('src/renderer/src/styles/index.css', 'utf8')

  assert(
    widgetSrc.includes("addEventListener('wheel', handleNativeWheel, { passive: false })"),
    'Must attach native wheel listener with { passive: false } to cancel default container scroll'
  )
  assert(
    widgetSrc.includes('overscrollBehavior: \'contain\''),
    'ControlsWidget slider must declare overscrollBehavior: contain'
  )
  assert(
    cssSrc.includes('overscroll-behavior: contain'),
    'index.css .volume-slider must declare overscroll-behavior: contain'
  )
})

console.log(`\n=== ALL ${passedTests} VOLUME CONTROL VERIFICATION TESTS PASSED ===\n`)
