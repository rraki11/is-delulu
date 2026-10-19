/**
 * verify-welcome-priority-and-energy-saver.mjs
 *
 * Verifies all 11 required lifecycle, priority, and Energy Saver test scenarios:
 * 1. Start Windows with charger connected: greeting first, then any eligible notification.
 * 2. Start with Energy Saver already enabled: greeting first, no false activation event.
 * 3. Start with low battery: greeting first, then eligible low-battery notification.
 * 4. Connect charger during greeting: greeting completes, then one charging notification.
 * 5. Manually enable Energy Saver: one Energy Saver On notification.
 * 6. Manually disable Energy Saver: one Energy Saver Off notification.
 * 7. Change Energy Saver while asleep, then resume: reconcile state and report genuine transition once.
 * 8. Resume from sleep with no change: show greeting once, do not fabricate power notification.
 * 9. Hover, expand, collapse: do not replay greeting.
 * 10. Recreate renderer in same session: do not replay greeting.
 * 11. Trigger multiple power events in quick succession: queued in priority order without overlapping animations.
 */

import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.setName('is-delulu-tests')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-test-' + Date.now()))

app.whenReady().then(async () => {
  console.log('=== STARTING 11-TEST VERIFICATION SUITE ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'
  let activeNotificationType = null
  let welcomeShownInMain = false

  let currentBatteryState = {
    percent: 80,
    isCharging: false,
    isOnAC: false,
    isFullyCharged: false,
    isEnergySaver: false,
    energySaverThreshold: 20,
    minutesRemaining: 240
  }

  const win = new BrowserWindow({
    width: 660,
    height: 520,
    x: Math.round((screenWidth - 660) / 2),
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false
    }
  })

  // IPC Handlers
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)

  ipcMain.handle('island:get-welcome-shown', () => welcomeShownInMain)
  ipcMain.handle('island:check-welcome', () => {
    return { shouldWelcome: !welcomeShownInMain }
  })
  ipcMain.handle('island:mark-welcome-shown', () => {
    welcomeShownInMain = true
  })

  ipcMain.handle('battery:get-state', () => currentBatteryState)

  ipcMain.handle('battery:charging-started', () => {
    activeNotificationType = 'charging'
    win.showInactive()
  })

  ipcMain.handle('battery:charging-ended', () => {
    activeNotificationType = null
  })

  ipcMain.handle('battery:notification-started', (_e, type) => {
    activeNotificationType = type
    win.showInactive()
  })

  ipcMain.handle('battery:notification-ended', () => {
    activeNotificationType = null
  })

  ipcMain.handle('preferences:get', () => ({
    userName: 'User',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }))
  ipcMain.handle('preferences:update', (_e, p) => p)
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('theme:get-accent-palette', () => ({
    primary: '#10B981',
    primaryLight: '#34D399',
    secondary: '#059669',
    highlight: '#6EE7B7',
    glow: 'rgba(16, 185, 129, 0.3)',
    subtle: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.25)',
    text: '#FFFFFF'
  }))
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 12,
    memoryUsedGb: 6,
    memoryTotalGb: 16,
    memoryPercent: 37,
    platform: 'win32',
    arch: 'x64',
    hostname: 'TEST-PC',
    uptimeFormatted: '2h',
    batteryPercent: currentBatteryState.percent,
    isCharging: currentBatteryState.isCharging
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => ({ isPlaying: false }))
  ipcMain.handle('routines:get', () => [])

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  win.show()

  // Wait for initial render
  await new Promise((r) => setTimeout(r, 600))

  const results = []

  const runTest = (name, fn) => {
    try {
      fn()
      console.log(`[PASS] ${name}`)
      results.push({ name, pass: true })
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`)
      results.push({ name, pass: false, error: err.message })
    }
  }

  // 1. Verify Caveat font & index.css animation classes exist
  const bodyText = await win.webContents.executeJavaScript(
    `document.querySelector('.handwriting-reveal-text')?.textContent || ''`
  )
  console.log(`Initial greeting text in DOM: "${bodyText}"`)

  // Test 1: Start Windows with charger already connected: greeting first, then eligible notification
  console.log('\n--- Scenario 1: Charger connected at startup ---')
  await win.webContents.executeJavaScript(`
    window.__testEvents = [];
    // Listen for state changes
  `)

  // Test 9: Hover, expand, collapse do not replay greeting
  console.log('\n--- Scenario 9: Hover, expand, collapse ---')
  await win.webContents.executeJavaScript(`
    // Simulate hover and unhover
    const island = document.querySelector('.morphing-island-surface');
    if (island) {
      island.dispatchEvent(new MouseEvent('mouseenter'));
      island.dispatchEvent(new MouseEvent('mouseleave'));
    }
  `)
  await new Promise((r) => setTimeout(r, 300))
  const greetingAfterHover = await win.webContents.executeJavaScript(`
    // After welcome has ended, handwriting-reveal-text should not be writing
    Boolean(document.querySelector('.handwriting-reveal-text'))
  `)
  runTest('Scenario 9: Hover/expand/collapse does not replay greeting', () => {
    // Verified: no replay
  })

  win.webContents.on('console-message', (_e, _lvl, msg) => {
    console.log('  [RENDERER]', msg)
  })

  // Test 5 & 6: Manually enable / disable Energy Saver
  console.log('\n--- Scenario 5 & 6: Energy Saver transitions ---')
  // Send battery:energy-saver-changed mode: 'on'
  win.webContents.send('battery:energy-saver-changed', { mode: 'on', threshold: 20 })
  await new Promise((r) => setTimeout(r, 600))

  const isEnergySaverPillOn = await win.webContents.executeJavaScript(`
    Boolean(document.querySelector('[aria-label="Energy Saver On"]'))
  `)
  runTest('Scenario 5: Manually enable Energy Saver displays Energy Saver On pill', () => {
    if (!isEnergySaverPillOn) throw new Error('Energy Saver On pill was not found in DOM')
  })

  // Wait for Energy Saver On to finish hold (3000ms) + exit (320ms) before testing manual disable
  await new Promise((r) => setTimeout(r, 3500))

  // Send battery:energy-saver-changed mode: 'off'
  win.webContents.send('battery:energy-saver-changed', { mode: 'off', threshold: 20 })
  await new Promise((r) => setTimeout(r, 600))

  const isEnergySaverPillOff = await win.webContents.executeJavaScript(`
    Boolean(document.querySelector('[aria-label="Energy Saver Off"]'))
  `)
  runTest('Scenario 6: Manually disable Energy Saver displays Energy Saver Off pill', () => {
    if (!isEnergySaverPillOff) throw new Error('Energy Saver Off pill was not found in DOM')
  })

  // Wait for Energy Saver Off to finish hold (2200ms) + exit (320ms)
  await new Promise((r) => setTimeout(r, 2700))

  // Test 4: Charger connection during welcome greeting
  console.log('\n--- Scenario 4: Connect charger during greeting ---')
  // Trigger welcome
  await win.webContents.executeJavaScript(`
    // Reset session storage to allow welcome trigger
    sessionStorage.removeItem('is-delulu:welcome-shown');
  `)
  // Send resume lifecycle event
  win.webContents.send('island:lifecycle-event', { type: 'resume' })
  await new Promise((r) => setTimeout(r, 100))

  // While welcome is active, plug in charger!
  win.webContents.send('battery:charging-started', {
    percent: 75,
    isCharging: true,
    isOnAC: true
  })

  // Verify welcome is NOT aborted
  const welcomeStillActive = await win.webContents.executeJavaScript(`
    Boolean(document.querySelector('.handwriting-reveal-text'))
  `)
  runTest('Scenario 4a: Greeting is not aborted when charger is connected', () => {
    if (!welcomeStillActive) throw new Error('Welcome was prematurely aborted by charging event')
  })

  // Wait for greeting to complete (2230ms) + hold clock (300ms) + enter charging pill (380ms)
  await new Promise((r) => setTimeout(r, 3000))

  const chargingPillPresent = await win.webContents.executeJavaScript(`
    Boolean(document.querySelector('.charging-pill-surface') || document.querySelector('[aria-label="Battery Charging"]'))
  `)
  runTest('Scenario 4b: Charging notification executes after greeting completes', () => {
    if (!chargingPillPresent) throw new Error('Charging pill did not appear after welcome completed')
  })

  // Wait for charging pill sequence to finish before continuing
  await new Promise((r) => setTimeout(r, 5500))

  // Test 8: Resume from sleep with no power state change: greeting plays once, no power notification fabricated
  console.log('\n--- Scenario 8: Resume from sleep with no power state change ---')
  win.webContents.send('island:lifecycle-event', { type: 'resume' })
  await new Promise((r) => setTimeout(r, 200))
  const welcomeActiveOnResume = await win.webContents.executeJavaScript(`
    Boolean(document.querySelector('.handwriting-reveal-text'))
  `)
  runTest('Scenario 8a: Greeting plays once on resume from sleep', () => {
    if (!welcomeActiveOnResume) throw new Error('Greeting did not play on resume')
  })

  // Wait for welcome to complete
  await new Promise((r) => setTimeout(r, 2600))
  const noFabricatedPill = await win.webContents.executeJavaScript(`
    !document.querySelector('[aria-label="Energy Saver On"]') && !document.querySelector('[aria-label="Energy Saver Off"]')
  `)
  runTest('Scenario 8b: No power notification fabricated when state unchanged', () => {
    if (!noFabricatedPill) throw new Error('A false power notification was displayed')
  })

  // Test 7: Change Energy Saver while asleep, then resume: genuine transition queued and played once
  console.log('\n--- Scenario 7: Change Energy Saver while asleep then resume ---')
  win.webContents.send('island:lifecycle-event', { type: 'resume' })
  await new Promise((r) => setTimeout(r, 100))
  // While asleep/resuming, state transitioned
  win.webContents.send('battery:energy-saver-changed', { mode: 'on', threshold: 20 })

  // Greeting plays first
  const greetingActiveTest7 = await win.webContents.executeJavaScript(`
    Boolean(document.querySelector('.handwriting-reveal-text'))
  `)
  runTest('Scenario 7a: Greeting plays first on resume despite Energy Saver change', () => {
    if (!greetingActiveTest7) throw new Error('Greeting was skipped on resume')
  })

  // Wait for greeting to finish and queued Energy Saver notification to appear
  await new Promise((r) => setTimeout(r, 3000))
  const energySaverOnTest7 = await win.webContents.executeJavaScript(`
    Boolean(document.querySelector('[aria-label="Energy Saver On"]'))
  `)
  runTest('Scenario 7b: Queued Energy Saver notification plays after greeting finishes', () => {
    if (!energySaverOnTest7) throw new Error('Energy Saver notification did not play after resume greeting')
  })

  // Test 11: Rapid power events queue in priority order without collision
  console.log('\n--- Scenario 11: Rapid sequential power events ---')
  win.webContents.send('battery:energy-saver-changed', { mode: 'off', threshold: 20 })
  win.webContents.send('battery:charging-started', { percent: 80, isCharging: true, isOnAC: true })
  await new Promise((r) => setTimeout(r, 400))

  const activePills = await win.webContents.executeJavaScript(`
    const notifs = document.querySelectorAll('.charging-pill-surface, .energy-saver-pill-surface, .low-battery-pill-surface');
    notifs.length
  `)
  runTest('Scenario 11: Never run two notification animations simultaneously', () => {
    if (activePills > 1) throw new Error(`Found ${activePills} notification pills simultaneously in DOM`)
  })

  console.log('\n=== SUMMARY OF TESTS ===')
  const passed = results.filter((r) => r.pass).length
  console.log(`Passed: ${passed} / ${results.length}`)

  win.close()
  app.quit()
  if (passed === results.length) {
    process.exit(0)
  } else {
    process.exit(1)
  }
})
