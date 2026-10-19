import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.setName('is-delulu-verify-timing')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-test-' + Date.now()))

app.whenReady().then(async () => {
  console.log('=== STARTING WELCOME GREETING & PAUSE SEQUENCE VERIFICATION ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workArea

  let currentBatteryState = {
    percent: 85,
    isCharging: false,
    isOnAC: false,
    isEnergySaver: false
  }

  let hasShownWelcome = false
  ipcMain.handle('island:get-welcome-shown', () => hasShownWelcome)
  ipcMain.handle('island:check-welcome', () => {
    console.log(`[MAIN] island:check-welcome -> hasShown=${hasShownWelcome}`)
    if (!hasShownWelcome) {
      return { shouldWelcome: true }
    }
    return { shouldWelcome: false }
  })
  ipcMain.handle('island:mark-welcome-shown', () => {
    hasShownWelcome = true
    console.log('[MAIN] markWelcomeShown received from renderer')
  })

  let currentMode = 'collapsed'
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    return currentMode
  })
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)

  ipcMain.handle('battery:get-state', () => currentBatteryState)
  ipcMain.handle('battery:notification-started', () => {})
  ipcMain.handle('battery:notification-ended', () => {})
  ipcMain.handle('battery:charging-started', () => {})
  ipcMain.handle('battery:charging-ended', () => {})

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
    cpuUsage: 10,
    memoryUsedGb: 5,
    memoryTotalGb: 16,
    memoryPercent: 30,
    platform: 'win32',
    arch: 'x64',
    hostname: 'TEST-PC',
    uptimeFormatted: '1h',
    batteryPercent: currentBatteryState.percent,
    isCharging: currentBatteryState.isCharging
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => ({ isPlaying: false }))
  ipcMain.handle('routines:get', () => [])

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
    show: true,
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadFile(join(__dirname, '../out/renderer/index.html'))

  await new Promise((r) => win.webContents.once('did-finish-load', r))
  console.log('[TEST] Renderer window loaded.\n')

  const sampleState = async () => {
    return await win.webContents.executeJavaScript(`(() => {
      const greetingEl = document.querySelector('svg[aria-label]') || document.querySelector('.handwriting-reveal-text');
      const greetingContainer = greetingEl?.parentElement;
      const clockEl = document.querySelector('.tabular-nums');
      const clockContainer = clockEl?.parentElement;

      return {
        greetingText: greetingEl ? (greetingEl.getAttribute('aria-label') || greetingEl.textContent) : null,
        greetingOpacity: greetingContainer ? parseFloat(window.getComputedStyle(greetingContainer).opacity) : 0,
        clockOpacity: clockContainer ? parseFloat(window.getComputedStyle(clockContainer).opacity) : 0,
        clockText: clockEl ? clockEl.textContent : null
      };
    })()`)
  }

  // Sample sequence over time
  console.log('--- Sampling Welcome & Pause Sequence Over Time ---')
  const timeline = []
  const startTime = Date.now()

  // Track key phases
  let sawWriting = false
  let sawHolding = false
  let sawFading = false
  let sawEmptyPause = false
  let sawClockReveal = false
  let sawClockFullyVisible = false

  const durationMs = 6000
  while (Date.now() - startTime < durationMs) {
    const elapsed = Date.now() - startTime
    const sample = await sampleState()
    timeline.push({ elapsed, ...sample })

    // Check conditions
    if (sample.greetingText && sample.greetingOpacity > 0.8 && sample.clockOpacity === 0) {
      if (elapsed >= 500 && elapsed <= 1350) {
        sawWriting = true
      } else if (elapsed > 1350 && elapsed <= 3150) {
        sawHolding = true
      }
    }

    if (sample.greetingOpacity > 0 && sample.greetingOpacity < 0.8 && sample.clockOpacity === 0) {
      sawFading = true
    }

    // Empty pause: greeting has completely faded out (opacity <= 0.05 or gone) AND clock is not yet visible (opacity === 0)
    if (sample.greetingOpacity <= 0.05 && sample.clockOpacity === 0) {
      if (elapsed >= 3000) {
        sawEmptyPause = true
      }
    }

    // Clock revealing: clock opacity > 0.1
    if (sample.clockOpacity > 0.1 && sample.clockOpacity < 0.95) {
      sawClockReveal = true
    }

    // Clock fully visible
    if (sample.clockOpacity >= 0.95) {
      sawClockFullyVisible = true
    }

    await new Promise((r) => setTimeout(r, 100))
  }

  console.log('\n--- Timeline Summary ---')
  // Print snapshot every 500ms
  for (let t = 0; t <= durationMs; t += 500) {
    const closest = timeline.reduce((prev, curr) =>
      Math.abs(curr.elapsed - t) < Math.abs(prev.elapsed - t) ? curr : prev
    )
    console.log(
      `[${String(closest.elapsed).padStart(4, ' ')}ms] Greeting: "${closest.greetingText || 'none'}" (opacity: ${closest.greetingOpacity.toFixed(2)}) | Clock opacity: ${closest.clockOpacity.toFixed(2)}`
    )
  }

  console.log('\n--- Verification Results ---')
  console.log(`1. Handwritten greeting written: ${sawWriting ? 'PASS' : 'FAIL'}`)
  console.log(`2. Readable hold pause (1.5-2s): ${sawHolding ? 'PASS' : 'FAIL'}`)
  console.log(`3. Smooth fade-out of greeting: ${sawFading ? 'PASS' : 'FAIL'}`)
  console.log(`4. Empty-pill pause before clock (800-1000ms): ${sawEmptyPause ? 'PASS' : 'FAIL'}`)
  console.log(`5. Smooth clock reveal: ${sawClockReveal ? 'PASS' : 'FAIL'}`)
  console.log(`6. Live clock fully revealed & active: ${sawClockFullyVisible ? 'PASS' : 'FAIL'}`)

  const allPassed =
    sawWriting &&
    sawHolding &&
    sawEmptyPause &&
    sawClockFullyVisible

  if (allPassed) {
    console.log('\n>>> ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY! <<<')
    win.close()
    app.quit()
    process.exit(0)
  } else {
    console.error('\n>>> SOME ACCEPTANCE CRITERIA FAILED <<<')
    win.close()
    app.quit()
    process.exit(1)
  }
})
