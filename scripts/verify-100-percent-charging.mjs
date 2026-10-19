import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/f9167426-91c7-44ea-843d-c1836cb02b5a/screenshots'

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-100pct-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-100pct-verify'))

app.whenReady().then(async () => {
  console.log('=== STARTING 100% BATTERY CHARGING NOTIFICATION ACCEPTANCE TESTS ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'
  let isChargingNotificationActive = false
  let chargingEndedCount = 0

  let currentBatteryState = {
    percent: 100,
    isCharging: true,
    isFullyCharged: true,
    isOnAC: true,
    minutesRemaining: null
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

  // IPC Handlers matching main window.ts & index.ts
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    if (mode === 'hidden' && !isChargingNotificationActive) {
      win.hide()
    } else if (mode !== 'hidden') {
      win.showInactive()
    }
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)

  ipcMain.handle('battery:charging-started', () => {
    isChargingNotificationActive = true
    win.showInactive()
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  ipcMain.handle('battery:charging-ended', () => {
    isChargingNotificationActive = false
    chargingEndedCount++
    currentMode = 'hidden'
    win.hide()
    win.webContents.send('island:mode-changed', 'hidden')
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
    glow: 'rgba(16, 185, 129, 0.35)',
    subtle: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.28)',
    text: '#A7F3D0',
    source: 'fallback'
  }))
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 10,
    memoryUsedGb: 5.5,
    memoryTotalGb: 16,
    memoryPercent: 34,
    platform: 'win32',
    arch: 'x64',
    hostname: 'PC',
    uptimeFormatted: '1h 20m',
    batteryPercent: currentBatteryState.percent,
    isCharging: currentBatteryState.isCharging
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => null)
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('routines:get-all', () => [])
  ipcMain.handle('battery:get-state', () => currentBatteryState)
  ipcMain.handle('wallpaper:get-accent-palette', () => ({
    primary: '#10B981',
    primaryLight: '#34D399',
    secondary: '#059669',
    highlight: '#6EE7B7',
    glow: 'rgba(16, 185, 129, 0.35)',
    subtle: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.28)',
    text: '#A7F3D0',
    source: 'fallback'
  }))

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // Main battery state tracker mirroring src/main/index.ts
  let previousPowerConnected = null
  let isInitialBatteryCheck = true

  function emitBatteryUpdate(batteryState) {
    currentBatteryState = batteryState
    const isNowConnected = batteryState.isOnAC === true || batteryState.isCharging === true
    const wasConnected = previousPowerConnected

    if (isInitialBatteryCheck) {
      isInitialBatteryCheck = false
      previousPowerConnected = isNowConnected
      win.webContents.send('battery:update', batteryState)
      return { isNewPlugIn: false }
    }

    const isNewPlugIn = wasConnected === false && isNowConnected === true
    previousPowerConnected = isNowConnected

    if (isNewPlugIn) {
      isChargingNotificationActive = true
      win.showInactive()
      win.webContents.send('island:charging-priority', true)
      win.webContents.send('battery:charging-started', batteryState)
    }

    win.webContents.send('battery:update', batteryState)
    return { isNewPlugIn }
  }

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  console.log('[Test Setup] Renderer loaded, waiting for initial load settle...')
  await sleep(1000)

  // Query DOM state helper
  async function getDOMState() {
    return await win.webContents.executeJavaScript(`
      (() => {
        const chargingOuter = document.querySelector('[aria-label^="Charging"]');
        const chargingSurface = document.querySelector('.charging-pill-surface');
        const normalIsland = document.getElementById('island-surface');
        const normalIslandVisible = !!normalIsland && window.getComputedStyle(normalIsland).opacity !== '0' && window.getComputedStyle(normalIsland).visibility !== 'hidden';
        const chargingPercent = document.querySelector('.charging-percent')?.textContent?.trim() || null;
        const headPercent = document.querySelector('.charging-bar-head .tabular-nums')?.textContent?.trim() || null;
        const outerOpacity = chargingOuter ? parseFloat(window.getComputedStyle(chargingOuter).opacity) : 0;
        const isChargingPillPresent = !!chargingOuter && outerOpacity > 0;
        const outerTransform = chargingOuter ? window.getComputedStyle(chargingOuter).transform : null;
        const surfaceWidth = chargingSurface ? parseInt(window.getComputedStyle(chargingSurface).width) : 0;

        return {
          isChargingPillPresent,
          chargingPercent,
          headPercent,
          outerOpacity,
          surfaceWidth,
          normalIslandVisible
        };
      })()
    `)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Initial startup with charger already connected does not trigger
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: Startup check (no spurious animation on start) ---')
  emitBatteryUpdate({
    percent: 100,
    isCharging: true,
    isFullyCharged: true,
    isOnAC: true,
    minutesRemaining: null
  })
  await sleep(500)
  const t1 = await getDOMState()
  console.log(`[TEST 1] Initial startup at 100%: Charging pill present: ${t1.isChargingPillPresent}`)
  if (t1.isChargingPillPresent) {
    throw new Error('FAIL: Charging animation triggered on application startup!')
  }
  console.log('PASS: TEST 1 passed (startup did not trigger spurious notification).')

  // Unplug to set up clean disconnected state
  console.log('\n[Setup] Unplugging charger...')
  emitBatteryUpdate({
    percent: 100,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 180
  })
  await sleep(500)

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Plug in charger at 100% battery (with AC power)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Plug in charger at 100% battery ---')
  const { isNewPlugIn: t2NewPlugIn } = emitBatteryUpdate({
    percent: 100,
    isCharging: true,
    isFullyCharged: true,
    isOnAC: true,
    minutesRemaining: null
  })
  console.log(`[TEST 2] isNewPlugIn: ${t2NewPlugIn}`)
  if (!t2NewPlugIn) {
    throw new Error('FAIL: isNewPlugIn was not detected at 100% battery!')
  }

  // Check entrance animation and compact "Charging" state
  await sleep(400)
  const t2Compact = await getDOMState()
  console.log(`[TEST 2] Compact charging pill present: ${t2Compact.isChargingPillPresent}, opacity: ${t2Compact.outerOpacity}, width: ${t2Compact.surfaceWidth}px, percent: ${t2Compact.chargingPercent}`)
  if (!t2Compact.isChargingPillPresent || t2Compact.outerOpacity < 0.5) {
    throw new Error('FAIL: Compact charging pill did not appear at 100% battery!')
  }

  // Capture screenshot of compact 100% charging pill
  const imgCompact100 = await win.capturePage()
  writeFileSync(join(outDir, 'charging_100pct_compact.png'), imgCompact100.toPNG())
  console.log('[TEST 2] Screenshot saved: charging_100pct_compact.png')

  // Verify compact pill holds for at least 1,000ms before expanding
  console.log('[TEST 2] Verifying 1s hold before expansion...')
  await sleep(600) // ~1000ms elapsed since trigger
  const t2Hold = await getDOMState()
  console.log(`[TEST 2 at 1000ms] Surface width: ${t2Hold.surfaceWidth}px (should still be compact ~190px)`)
  if (t2Hold.surfaceWidth > 250) {
    throw new Error(`FAIL: Expanded too early (${t2Hold.surfaceWidth}px)! Must hold compact for 1s.`)
  }

  // Wait for expansion to occur (~1400ms - 2000ms)
  await sleep(900)
  const t2Expanded = await getDOMState()
  console.log(`[TEST 2 expanded] Surface width: ${t2Expanded.surfaceWidth}px, headPercent: ${t2Expanded.headPercent}`)
  if (t2Expanded.surfaceWidth < 280) {
    throw new Error(`FAIL: Did not expand into detailed view at 100% (width: ${t2Expanded.surfaceWidth}px)!`)
  }

  const imgExpanded100 = await win.capturePage()
  writeFileSync(join(outDir, 'charging_100pct_expanded.png'), imgExpanded100.toPNG())
  console.log('[TEST 2] Screenshot saved: charging_100pct_expanded.png')

  // Verify cursor near activation zone does NOT reveal normal island during charging
  console.log('[TEST 2] Testing hover suppression during charging...')
  win.webContents.send('island:hover-state', true)
  await sleep(300)
  const t2HoverCheck = await getDOMState()
  console.log(`[TEST 2] Normal island visible during charging: ${t2HoverCheck.normalIslandVisible}`)
  if (t2HoverCheck.normalIslandVisible) {
    throw new Error('FAIL: Normal island appeared during charging animation!')
  }
  // Reset hover state
  win.webContents.send('island:hover-state', false)

  // Wait for complete sequence to finish (collapsing -> exiting -> hidden)
  console.log('[TEST 2] Waiting for lifecycle completion...')
  await sleep(5500)
  const t2Finished = await getDOMState()
  console.log(`[TEST 2 finished] win.isVisible(): ${win.isVisible()}, pillPresent: ${t2Finished.isChargingPillPresent}, outerOpacity: ${t2Finished.outerOpacity}`)
  if (win.isVisible() && t2Finished.outerOpacity > 0) {
    throw new Error('FAIL: Charging pill did not exit and hide at conclusion!')
  }
  console.log('PASS: TEST 2 passed (100% plug-in ran complete entrance -> hold -> expand -> collapse -> exit lifecycle).')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Battery stays at 100% with charger connected - NO repeated animation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Battery stays at 100% on AC (no spurious retrigger) ---')
  const prevEnded = chargingEndedCount
  emitBatteryUpdate({
    percent: 100,
    isCharging: true,
    isFullyCharged: true,
    isOnAC: true,
    minutesRemaining: null
  })
  await sleep(1000)
  const t3 = await getDOMState()
  console.log(`[TEST 3] Charging pill present: ${t3.isChargingPillPresent}, chargingEndedCount changed: ${chargingEndedCount !== prevEnded}`)
  if (t3.isChargingPillPresent) {
    throw new Error('FAIL: Charging animation retriggered while remaining at 100% on AC!')
  }
  console.log('PASS: TEST 3 passed (no spurious retriggers while connected at 100%).')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Battery reaches 100% DURING an animation - MUST NOT interrupt
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Battery reaches 100% during active animation ---')
  // Unplug first
  emitBatteryUpdate({
    percent: 99,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 15
  })
  await sleep(500)

  // Plug in at 99%
  console.log('[TEST 4] Plug in at 99%...')
  emitBatteryUpdate({
    percent: 99,
    isCharging: true,
    isFullyCharged: false,
    isOnAC: true,
    minutesRemaining: 2
  })
  await sleep(500)

  // Verify compact charging pill is active
  const t4Start = await getDOMState()
  console.log(`[TEST 4] Started at 99%: pill present: ${t4Start.isChargingPillPresent}`)
  if (!t4Start.isChargingPillPresent) {
    throw new Error('FAIL: Charging pill did not appear at 99%!')
  }

  // Now, battery transitions to 100% full charge MID-ANIMATION!
  console.log('[TEST 4] Battery reaches 100% mid-animation!')
  emitBatteryUpdate({
    percent: 100,
    isCharging: true,
    isFullyCharged: true,
    isOnAC: true,
    minutesRemaining: null
  })

  // Check 500ms later: it must still be active and expanding/holding, NOT dismissed!
  await sleep(1000)
  const t4Mid = await getDOMState()
  console.log(`[TEST 4 mid-animation] Pill present: ${t4Mid.isChargingPillPresent}, width: ${t4Mid.surfaceWidth}px, headPercent: ${t4Mid.headPercent}`)
  if (!t4Mid.isChargingPillPresent) {
    throw new Error('FAIL: Reaching 100% interrupted/dismissed the ongoing charging animation!')
  }

  // Let it finish naturally
  await sleep(5500)
  const t4End = await getDOMState()
  console.log(`[TEST 4 complete] Pill present: ${t4End.isChargingPillPresent}`)
  if (t4End.isChargingPillPresent) {
    throw new Error('FAIL: Animation did not conclude cleanly!')
  }
  console.log('PASS: TEST 4 passed (hitting 100% mid-animation did not interrupt the sequence).')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Plug in at 45% (mid-range sanity check)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Plug in at 45% (mid-range test) ---')
  // Unplug
  emitBatteryUpdate({
    percent: 45,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 90
  })
  await sleep(500)

  // Plug in at 45%
  emitBatteryUpdate({
    percent: 45,
    isCharging: true,
    isFullyCharged: false,
    isOnAC: true,
    minutesRemaining: 60
  })
  await sleep(500)
  const t5 = await getDOMState()
  console.log(`[TEST 5] Plug in at 45%: pill present: ${t5.isChargingPillPresent}, percent: ${t5.chargingPercent}`)
  if (!t5.isChargingPillPresent || t5.chargingPercent !== '45%') {
    throw new Error(`FAIL: Did not show charging pill at 45%! Found percent: ${t5.chargingPercent}`)
  }
  await sleep(5500) // Let finish
  console.log('PASS: TEST 5 passed (plug in at 45% worked normally).')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Unplug and Re-plug at 100%
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Unplug and Re-plug at 100% ---')
  // Unplug at 100%
  emitBatteryUpdate({
    percent: 100,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 180
  })
  await sleep(500)

  // Re-plug at 100%
  console.log('[TEST 6] Re-plugging charger at 100%...')
  const { isNewPlugIn: t6NewPlugIn } = emitBatteryUpdate({
    percent: 100,
    isCharging: true,
    isFullyCharged: true,
    isOnAC: true,
    minutesRemaining: null
  })
  console.log(`[TEST 6] isNewPlugIn: ${t6NewPlugIn}`)
  if (!t6NewPlugIn) {
    throw new Error('FAIL: Re-plugging at 100% failed to trigger isNewPlugIn!')
  }

  await sleep(500)
  const t6 = await getDOMState()
  console.log(`[TEST 6] Pill present: ${t6.isChargingPillPresent}, percent: ${t6.chargingPercent}`)
  if (!t6.isChargingPillPresent) {
    throw new Error('FAIL: Re-plugging at 100% did not trigger charging animation!')
  }
  await sleep(5500)
  console.log('PASS: TEST 6 passed (unplug and replug at 100% triggered single new animation).')

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Normal hover activation resumes after charging ends
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 7: Normal hover activation resumes after charging ends ---')
  win.webContents.send('island:reveal')
  win.webContents.send('island:hover-state', true)
  await sleep(600)
  const t7 = await getDOMState()
  console.log(`[TEST 7] Normal island revealed on hover: ${t7.normalIslandVisible}`)
  if (!t7.normalIslandVisible) {
    throw new Error('FAIL: Normal hover activation did not resume after charging ended!')
  }
  win.webContents.send('island:hover-state', false)
  await sleep(1500)
  console.log('PASS: TEST 7 passed (normal hover resumes cleanly).')

  console.log('\n===============================================================')
  console.log('ALL ACCEPTANCE TESTS COMPLETED SUCCESSFULLY!')
  console.log('===============================================================\n')

  await sleep(500)
  win.destroy()
  app.quit()
})
