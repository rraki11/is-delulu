// Test Suite: MacBook Notch Geometry, Zero-Border Silhouette, and Tooltip Elimination Verification
const assert = require('assert')
const fs = require('fs')

console.log('=== RUNNING MACBOOK NOTCH & ZERO-BORDER VERIFICATION TEST SUITE ===\n')

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

// 1. Collapsed notch dimensions in constants.ts
runTest('Notch Test 1: WINDOW_CONFIG.pill defines compact wide notch dimensions (204x32)', () => {
  const constantsSrc = fs.readFileSync('src/shared/constants.ts', 'utf8')
  assert(constantsSrc.includes('width: 204'), 'Pill width must be 204px')
  assert(constantsSrc.includes('height: 32'), 'Pill height must be 32px')
  assert(constantsSrc.includes('topOffset: 0'), 'Top offset must be 0 for flush top-edge placement')
})

// 2. Window positioning alignment with physical monitor bounds and webcam
runTest('Notch Test 2: Native window positioning binds to physical monitor bounds and webcam center', () => {
  const windowSrc = fs.readFileSync('src/main/window.ts', 'utf8')
  assert(
    windowSrc.includes('cachedPrimaryBounds.y + WINDOW_CONFIG.topOffset'),
    'Window Y must strictly bind to cachedPrimaryBounds.y (physical screen ceiling)'
  )
  assert(
    windowSrc.includes('cachedPrimaryBounds.x + (cachedPrimaryBounds.width - targetWidth) / 2') ||
    windowSrc.includes('cachedPrimaryBounds.x + (cachedPrimaryBounds.width - initialWidth) / 2'),
    'Window X must center relative to cachedPrimaryBounds.width (physical webcam center)'
  )
})

// 3. MorphingIsland renders top concave ear fillets
runTest('Notch Test 3: MorphingIsland renders top-edge concave fillet ears with circular arc geometry', () => {
  const islandSrc = fs.readFileSync('src/renderer/src/components/island/MorphingIsland.tsx', 'utf8')
  assert(islandSrc.includes('notch-ear-left'), 'Must include left notch ear')
  assert(islandSrc.includes('notch-ear-right'), 'Must include right notch ear')
  assert(islandSrc.includes('d="M 0 0 A 11 11 0 0 1 11 11 L 11 0 Z"'), 'Left ear must declare concave arc')
  assert(islandSrc.includes('d="M 0 0 L 0 11 A 11 11 0 0 1 11 0 Z"'), 'Right ear must declare concave arc')
  assert(islandSrc.includes('fill="#000000"'), 'Ears must be filled with pure black #000000')
})

// 4. Solid black background and hidden gradient stage when collapsed
runTest('Notch Test 4: Collapsed notch uses solid #000000 background and hides interior gradient stage', () => {
  const islandSrc = fs.readFileSync('src/renderer/src/components/island/MorphingIsland.tsx', 'utf8')
  assert(
    islandSrc.includes("backgroundColor: isExpanded ? 'var(--bg-panel)' : '#000000'"),
    'Collapsed island background must be pure solid black #000000'
  )
  assert(
    islandSrc.includes("visibility: isHidden || !isExpanded ? 'hidden' : 'visible'"),
    'Gradient stage must be hidden when collapsed to prevent colored illumination inside notch'
  )
})

// 5. Lower corners rounded rectangular radius (0 0 12px 12px)
runTest('Notch Test 5: Lower corners use smooth rounded rectangle radius matching reference notch', () => {
  const islandSrc = fs.readFileSync('src/renderer/src/components/island/MorphingIsland.tsx', 'utf8')
  assert(
    islandSrc.includes("'0px 0px 12px 12px'"),
    'Collapsed notch must use 0px 0px 12px 12px border-radius'
  )
  assert(
    islandSrc.includes("'0px 0px 24px 24px'"),
    'Expanded dashboard must use 0px 0px 24px 24px border-radius'
  )
})

// 6. Zero borders or outlines on outer island silhouette
runTest('Notch Test 6: Outer island container has zero border and zero outline in both states', () => {
  const islandSrc = fs.readFileSync('src/renderer/src/components/island/MorphingIsland.tsx', 'utf8')
  assert(islandSrc.includes("border: 'none'"), 'Outer surface must declare border: none')
  assert(islandSrc.includes("outline: 'none'"), 'Outer surface must declare outline: none')
  assert(!islandSrc.includes("border: isExpanded ? '1px solid"), 'Must NOT have 1px solid border when expanded')
})

// 7. Elimination of inset outline shadows across design tokens
runTest('Notch Test 7: design-tokens.css eliminates all inset outline shadows (--shadow-pill: none)', () => {
  const tokensSrc = fs.readFileSync('src/renderer/src/styles/design-tokens.css', 'utf8')
  assert(tokensSrc.includes('--shadow-pill: none;'), '--shadow-pill must be none in tokens')
  assert(
    !tokensSrc.includes('inset 0 1px 0 rgba(255, 255, 255, 0.12)'),
    'Must remove dark theme inset outline line'
  )
  assert(
    !tokensSrc.includes('inset 0 1px 0 rgba(255, 255, 255, 0.90)'),
    'Must remove light theme inset outline line'
  )
})

// 8. Elimination of desktop tooltips
runTest('Notch Test 8: All desktop tooltips on collapsed pill, charging pill, and island are removed', () => {
  const islandSrc = fs.readFileSync('src/renderer/src/components/island/MorphingIsland.tsx', 'utf8')
  const pillSrc = fs.readFileSync('src/renderer/src/components/island/IslandPill.tsx', 'utf8')
  const chargingSrc = fs.readFileSync('src/renderer/src/components/island/ChargingPill.tsx', 'utf8')

  assert(!islandSrc.includes('title='), 'MorphingIsland must not have title attribute')
  assert(!pillSrc.includes('title='), 'IslandPill must not have title attribute')
  assert(!chargingSrc.includes('title='), 'ChargingPill must not have title attribute')
})

// 9. Notification pills have borderless silhouettes
runTest('Notch Test 9: EnergySaverPill and LowBatteryPill have borderless silhouettes', () => {
  const energySrc = fs.readFileSync('src/renderer/src/components/island/EnergySaverPill.tsx', 'utf8')
  const lowBatSrc = fs.readFileSync('src/renderer/src/components/island/LowBatteryPill.tsx', 'utf8')

  assert(energySrc.includes("border: 'none'"), 'EnergySaverPill must have border: none')
  assert(lowBatSrc.includes("border: 'none'"), 'LowBatteryPill must have border: none')
})

console.log(`\n=== ALL ${passedTests} MACBOOK NOTCH & ZERO-BORDER VERIFICATION TESTS PASSED ===\n`)
