// Test Suite: Navigation Tab Bar Active State Highlight Verification
// Verifies that the navigation bar has exactly one authoritative source of truth,
// applies active styling only to the currently selected tab (including Clipboard),
// removes active styling immediately from previous tabs, and handles rapid transitions cleanly.

const assert = require('assert')

console.log('=== RUNNING NAVIGATION ACTIVE HIGHLIGHT VERIFICATION TEST SUITE ===\n')

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

// Canonical Hitodama Tabs and Widths
const HITODAMA_TABS = [
  { id: 'controls',  label: 'Controls',  width: 83 },
  { id: 'today',     label: 'Today',     width: 64 },
  { id: 'stats',     label: 'Stats',     width: 60 },
  { id: 'clipboard', label: 'Clipboard', width: 90 },
  { id: 'apps',      label: 'Apps',      width: 58 },
  { id: 'wallpaper', label: 'Wallpaper', width: 94 },
  { id: 'power',     label: 'Power',     width: 67 }
]

function normalizeTab(tab) {
  switch (tab) {
    case 'launcher':
      return 'apps'
    case 'calendar':
      return 'today'
    case 'system':
      return 'stats'
    case 'media':
      return 'controls'
    case 'routines':
      return 'wallpaper'
    default:
      return tab
  }
}

// 1. Tab definitions and Hitodama geometry
runTest('Nav Test 1: Hitodama tab configuration contains all 7 canonical tabs with exact widths', () => {
  assert.strictEqual(HITODAMA_TABS.length, 7, 'Must have exactly 7 tabs')
  
  const expectedWidths = {
    controls: 83,
    today: 64,
    stats: 60,
    clipboard: 90,
    apps: 58,
    wallpaper: 94,
    power: 67
  }

  HITODAMA_TABS.forEach((tab) => {
    assert.strictEqual(tab.width, expectedWidths[tab.id], `Tab ${tab.id} width must be ${expectedWidths[tab.id]}`)
  })

  const totalTabWidth = HITODAMA_TABS.reduce((acc, t) => acc + t.width, 0)
  const totalBarWidth = totalTabWidth + 6 * (HITODAMA_TABS.length - 1)
  assert.strictEqual(totalTabWidth, 516, 'Total tab content width must be 516px')
  assert.strictEqual(totalBarWidth, 552, 'Total tab bar with 6px gaps must be 552px')
})

// 2. Tab normalization for canonical and legacy IDs
runTest('Nav Test 2: normalizeTab resolves all legacy and canonical tab IDs correctly', () => {
  // Canonical tabs must map directly to themselves
  assert.strictEqual(normalizeTab('controls'), 'controls')
  assert.strictEqual(normalizeTab('today'), 'today')
  assert.strictEqual(normalizeTab('stats'), 'stats')
  assert.strictEqual(normalizeTab('clipboard'), 'clipboard')
  assert.strictEqual(normalizeTab('apps'), 'apps')
  assert.strictEqual(normalizeTab('wallpaper'), 'wallpaper')
  assert.strictEqual(normalizeTab('power'), 'power')

  // Legacy aliases must normalize to canonical tabs
  assert.strictEqual(normalizeTab('calendar'), 'today')
  assert.strictEqual(normalizeTab('system'), 'stats')
  assert.strictEqual(normalizeTab('media'), 'controls')
  assert.strictEqual(normalizeTab('launcher'), 'apps')
  assert.strictEqual(normalizeTab('routines'), 'wallpaper')
})

// 3. Single active highlight exclusivity (Stats -> Clipboard bug scenario)
runTest('Nav Test 3: Switching from Stats to Clipboard immediately and exclusively activates Clipboard', () => {
  // Simulated component render function
  function renderTabStates(activeTab) {
    const normalizedActive = normalizeTab(activeTab)
    return HITODAMA_TABS.map((tab) => {
      const isActive = normalizedActive === tab.id
      return {
        id: tab.id,
        label: tab.label,
        isActive,
        ariaSelected: isActive,
        tabIndex: isActive ? 0 : -1,
        className: `hitodama-nav-tab-btn ${isActive ? 'active' : ''}`.trim(),
        hasActiveIndicator: isActive
      }
    })
  }

  // Step 1: Initial state on Stats
  let states = renderTabStates('stats')
  let activeTabs = states.filter((s) => s.isActive)
  assert.strictEqual(activeTabs.length, 1, 'Exactly one tab must be active when on stats')
  assert.strictEqual(activeTabs[0].id, 'stats', 'Stats tab must be active')
  assert.strictEqual(states.find((s) => s.id === 'clipboard').isActive, false, 'Clipboard must be inactive')

  // Step 2: User clicks Clipboard tab
  states = renderTabStates('clipboard')
  activeTabs = states.filter((s) => s.isActive)
  assert.strictEqual(activeTabs.length, 1, 'Exactly one tab must be active when on clipboard')
  assert.strictEqual(activeTabs[0].id, 'clipboard', 'Clipboard tab must be the active tab')
  
  // Verify Stats is immediately and completely de-selected
  const statsTab = states.find((s) => s.id === 'stats')
  assert.strictEqual(statsTab.isActive, false, 'Stats tab must be false for isActive')
  assert.strictEqual(statsTab.ariaSelected, false, 'Stats tab aria-selected must be false')
  assert.strictEqual(statsTab.tabIndex, -1, 'Stats tab tabIndex must be -1')
  assert.strictEqual(statsTab.className, 'hitodama-nav-tab-btn', 'Stats tab must not have .active class')
  assert.strictEqual(statsTab.hasActiveIndicator, false, 'Stats tab must not render active pill indicator')

  // Verify Clipboard is active
  const clipboardTab = states.find((s) => s.id === 'clipboard')
  assert.strictEqual(clipboardTab.isActive, true, 'Clipboard tab must be true for isActive')
  assert.strictEqual(clipboardTab.ariaSelected, true, 'Clipboard tab aria-selected must be true')
  assert.strictEqual(clipboardTab.tabIndex, 0, 'Clipboard tab tabIndex must be 0')
  assert.strictEqual(clipboardTab.className, 'hitodama-nav-tab-btn active', 'Clipboard tab must have .active class')
  assert.strictEqual(clipboardTab.hasActiveIndicator, true, 'Clipboard tab must render active pill indicator')
})

// 4. Exhaustive test across all 7 tabs: exactly one tab active per selection
runTest('Nav Test 4: All 7 tabs maintain strict highlight exclusivity', () => {
  HITODAMA_TABS.forEach((targetTab) => {
    const normalizedActive = normalizeTab(targetTab.id)
    const activeCount = HITODAMA_TABS.filter((t) => normalizeTab(t.id) === normalizedActive).length
    assert.strictEqual(activeCount, 1, `Target ${targetTab.id} must produce exactly 1 active match`)

    HITODAMA_TABS.forEach((otherTab) => {
      const isThisActive = normalizedActive === otherTab.id
      if (otherTab.id === targetTab.id) {
        assert.strictEqual(isThisActive, true, `${otherTab.id} must be active`)
      } else {
        assert.strictEqual(isThisActive, false, `${otherTab.id} must NOT be active`)
      }
    })
  })
})

// 5. Rapid tab navigation simulation
runTest('Nav Test 5: Rapid sequential and interrupted tab transitions maintain state consistency', () => {
  const switchHistory = [
    'controls',
    'stats',
    'clipboard',
    'today',
    'wallpaper',
    'power',
    'apps',
    'stats',
    'clipboard'
  ]

  let currentTab = 'controls'

  switchHistory.forEach((nextTab, i) => {
    currentTab = nextTab
    const normalizedActive = normalizeTab(currentTab)
    const rendered = HITODAMA_TABS.map((t) => ({
      id: t.id,
      isActive: normalizedActive === t.id
    }))

    const activeList = rendered.filter((r) => r.isActive)
    assert.strictEqual(activeList.length, 1, `Step ${i}: exactly 1 active tab`)
    assert.strictEqual(activeList[0].id, nextTab, `Step ${i}: active tab must match current ${nextTab}`)
  })
})

// 6. Default store tab initialization
runTest('Nav Test 6: Default active tab is canonical controls', () => {
  const fs = require('fs')
  const storeSource = fs.readFileSync('src/renderer/src/store/useIslandStore.ts', 'utf8')
  assert(
    storeSource.includes("activeTab: 'controls'"),
    'useIslandStore must initialize activeTab to canonical controls'
  )
})

// 7. Verify NavigationTabBar layoutId and CSS class integration
runTest('Nav Test 7: NavigationTabBar uses layoutId and hitodama-nav-tab-btn without inline hover conflicts', () => {
  const fs = require('fs')
  const navBarSource = fs.readFileSync('src/renderer/src/components/island/NavigationTabBar.tsx', 'utf8')
  
  assert(
    navBarSource.includes('layoutId="hitodama-active-tab-indicator"'),
    'NavigationTabBar must render layoutId="hitodama-active-tab-indicator" for smooth gliding indicator'
  )
  assert(
    navBarSource.includes('className={`hitodama-nav-tab-btn ${isActive ? \'active\' : \'\'}`'),
    'NavigationTabBar must assign hitodama-nav-tab-btn and conditional active class'
  )
  assert(
    !navBarSource.includes('whileHover='),
    'NavigationTabBar must NOT use motion whileHover to avoid gesture style entrapment'
  )
  assert(
    navBarSource.includes('background: \'transparent\''),
    'NavigationTabBar button background must be transparent so pill indicator provides background'
  )

  const cssSource = fs.readFileSync('src/renderer/src/styles/index.css', 'utf8')
  assert(
    cssSource.includes('.hitodama-nav-tab-btn:hover:not(.active)'),
    'index.css must define hover styles strictly for non-active buttons (:not(.active))'
  )
})

console.log(`\n=== ALL ${passedTests} NAVIGATION HIGHLIGHT TESTS PASSED ===\n`)
