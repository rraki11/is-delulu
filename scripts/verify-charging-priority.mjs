import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { performance } from 'perf_hooks'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/f9167426-91c7-44ea-843d-c1836cb02b5a/screenshots'

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-priority-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-priority-verify'))

app.whenReady().then(async () => {
  console.log('=== STARTING CHARGING NOTIFICATION PRIORITY & LATENCY VERIFICATION ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'
  let isChargingNotificationActive = false
  let chargingEndedFired = false

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

  // IPC Handlers matching main window.ts
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    if (mode === 'hidden' && !isChargingNotificationActive) {
      win.hide()
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
    chargingEndedFired = true
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
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 10,
    memoryUsedGb: 5.5,
    memoryTotalGb: 16,
    memoryPercent: 34,
    platform: 'win32',
    arch: 'x64',
    hostname: 'PC',
    uptimeFormatted: '1h 20m',
    batteryPercent: 80,
    isCharging: false
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('routines:get-all', () => [])
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('media:get-state', () => ({
    isPlaying: false,
    title: '',
    artist: '',
    album: '',
    durationSec: 0,
    positionSec: 0,
    playbackStatus: 'Stopped',
    volume: 80,
    isMuted: false,
    appName: '',
    audioOutputs: [],
    sources: []
  }))

  const mockPalette = {
    primary: '#00D2FF',
    primaryLight: '#0070F3',
    secondary: '#3A7BD5',
    highlight: '#00E5FF',
    glow: 'rgba(0, 210, 255, 0.45)',
    subtle: 'rgba(0, 210, 255, 0.16)',
    border: 'rgba(0, 210, 255, 0.35)',
    text: '#E6F8FF',
    isWallpaperDerived: true,
    wallpaperPath: 'C:/wallpaper.jpg',
    extractedAt: Date.now()
  }

  ipcMain.handle('wallpaper:get-accent-palette', () => mockPalette)
  ipcMain.handle('theme:get-accent-palette', () => mockPalette)

  let liveBatteryState = {
    percent: 80,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 55
  }
  ipcMain.handle('battery:get-state', () => liveBatteryState)

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  await new Promise((r) => setTimeout(r, 600))

  const queryDOM = async () => {
    return win.webContents.executeJavaScript(`
      (() => {
        const normalSurface = document.getElementById('island-surface');
        const chargingSurface = document.querySelector('.charging-pill-surface');
        const chargingOuter = document.querySelector('[aria-label*="Charging"]');
        const track = document.querySelector('.charging-bar-track');
        return {
          hasNormalSurface: !!normalSurface,
          normalOpacity: normalSurface ? window.getComputedStyle(normalSurface).opacity : null,
          normalTransform: normalSurface ? window.getComputedStyle(normalSurface).transform : null,
          hasChargingSurface: !!chargingSurface,
          chargingOpacity: chargingOuter ? window.getComputedStyle(chargingOuter).opacity : null,
          hasTrack: !!track,
          chargingOuterBounding: chargingOuter ? chargingOuter.getBoundingClientRect() : null
        };
      })()
    `)
  }

  // =========================================================================
  // TEST 1: Measure trigger latency from plug-in to entrance animation
  // =========================================================================
  console.log('--- Test 1: Measuring Trigger Latency ---')
  liveBatteryState = { percent: 80, isCharging: true, isFullyCharged: false, isOnAC: true, minutesRemaining: 55 }
  const t0 = performance.now()
  isChargingNotificationActive = true
  win.showInactive()
  win.setIgnoreMouseEvents(true, { forward: true })
  win.webContents.send('island:charging-priority', true)
  win.webContents.send('battery:charging-started', liveBatteryState)

  // Poll DOM until charging surface is mounted
  let entranceMountedTime = 0
  for (let i = 0; i < 40; i++) {
    const dom = await queryDOM()
    if (dom.hasChargingSurface) {
      entranceMountedTime = performance.now() - t0
      break
    }
    await new Promise((r) => setTimeout(r, 10))
  }
  console.log(`  Measured Trigger Latency (event dispatch -> DOM mount): ${entranceMountedTime.toFixed(2)}ms`)
  if (entranceMountedTime > 150) {
    throw new Error(`Trigger latency too high: ${entranceMountedTime.toFixed(2)}ms`)
  }

  // =========================================================================
  // TEST 2: Confirm 1,000ms compact hold before expanding
  // =========================================================================
  console.log('\n--- Test 2: Confirming 1,000ms Compact Pill Hold ---')
  // Entrance is 380ms. At t = 500ms (120ms into hold), must be compact
  await new Promise((r) => setTimeout(r, 500))
  let dom500 = await queryDOM()
  console.log('  State at t=500ms:', { hasCharging: dom500.hasChargingSurface, hasTrack: dom500.hasTrack })
  if (!dom500.hasChargingSurface || dom500.hasTrack) {
    throw new Error('FAIL: Pill should be compact at t=500ms')
  }

  // At t = 1,100ms (720ms into hold), must STILL be compact
  await new Promise((r) => setTimeout(r, 600))
  let dom1100 = await queryDOM()
  console.log('  State at t=1,100ms (mid-hold):', { hasCharging: dom1100.hasChargingSurface, hasTrack: dom1100.hasTrack })
  if (!dom1100.hasChargingSurface || dom1100.hasTrack) {
    throw new Error('FAIL: Pill must STILL be compact at t=1,100ms before 1,000ms delay finishes!')
  }

  // At t = 1,800ms (after 380ms entrance + 1,000ms hold + expansion transition), must be expanded
  await new Promise((r) => setTimeout(r, 700))
  let dom1800 = await queryDOM()
  console.log('  State at t=1,800ms (after hold):', { hasCharging: dom1800.hasChargingSurface, hasTrack: dom1800.hasTrack })
  if (!dom1800.hasTrack) {
    throw new Error('FAIL: Pill must be expanded after 1,000ms hold finishes!')
  }

  // Wait for complete sequence exit
  console.log('\n--- Waiting for full sequence to exit ---')
  await new Promise((r) => setTimeout(r, 4500))
  let domExit = await queryDOM()
  console.log('  Post-exit state:', { windowVisible: win.isVisible(), normalOpacity: domExit.normalOpacity })
  if (win.isVisible() || domExit.normalOpacity !== '0') {
    throw new Error('FAIL: Window and normal island must be hidden after sequence completion!')
  }

  // =========================================================================
  // TEST 3: Plug in charger with cursor ALREADY inside activation zone
  // =========================================================================
  console.log('\n--- Test 3: Plug in charger with cursor inside activation zone ---')
  // Simulate pointer in activation zone (which would normally reveal collapsed pill)
  win.webContents.send('island:hover-state', true)
  win.webContents.send('island:reveal')

  // Immediately plug in charger (simultaneous / race condition)
  liveBatteryState = { percent: 81, isCharging: true, isFullyCharged: false, isOnAC: true, minutesRemaining: 50 }
  isChargingNotificationActive = true
  win.showInactive()
  win.setIgnoreMouseEvents(true, { forward: true })
  win.webContents.send('island:charging-priority', true)
  win.webContents.send('battery:charging-started', liveBatteryState)

  // Verify within 100ms: Normal island MUST NOT BE VISIBLE (opacity: 0). Only charging pill enters!
  await new Promise((r) => setTimeout(r, 100))
  const domRace = await queryDOM()
  console.log('  Race check (t=100ms):', {
    normalOpacity: domRace.normalOpacity,
    hasChargingSurface: domRace.hasChargingSurface
  })
  if (domRace.normalOpacity === '1') {
    throw new Error('FAIL: Normal island must NOT be shown as intermediate state when charging starts!')
  }
  if (!domRace.hasChargingSurface) {
    throw new Error('FAIL: Charging surface must mount immediately with priority!')
  }

  // =========================================================================
  // TEST 4: Plug in while normal island is already EXPANDED
  // =========================================================================
  console.log('\n--- Test 4: Plug in while normal island is already EXPANDED ---')
  // Dismiss current charging and force-expand normal island
  win.webContents.send('island:mode-changed', 'expanded')
  await new Promise((r) => setTimeout(r, 400))
  let domExpanded = await queryDOM()
  console.log('  Expanded normal island before plug-in:', { normalOpacity: domExpanded.normalOpacity })

  // Now plug in charger: charging notification must supersede expanded island!
  isChargingNotificationActive = true
  win.showInactive()
  win.setIgnoreMouseEvents(true, { forward: true })
  win.webContents.send('island:charging-priority', true)
  win.webContents.send('battery:charging-started', liveBatteryState)

  await new Promise((r) => setTimeout(r, 120))
  let domSupersede = await queryDOM()
  console.log('  After plug-in while expanded:', {
    hasChargingSurface: domSupersede.hasChargingSurface,
    normalOpacity: domSupersede.normalOpacity
  })
  if (!domSupersede.hasChargingSurface) {
    throw new Error('FAIL: Charging notification must supersede expanded island!')
  }
  if (domSupersede.normalOpacity === '1') {
    throw new Error('FAIL: Normal island surface must be suppressed (opacity: 0) when charging notification takes priority!')
  }

  // Wait for exit
  await new Promise((r) => setTimeout(r, 5200))

  // =========================================================================
  // TEST 5: Confirm normal hover works cleanly after charging finishes
  // =========================================================================
  console.log('\n--- Test 5: Confirm Normal Hover Works After Charging Finishes ---')
  isChargingNotificationActive = false
  currentMode = 'collapsed'
  win.showInactive()
  win.webContents.send('island:mode-changed', 'collapsed')
  win.webContents.send('island:reveal')
  win.webContents.send('island:hover-state', true)

  await new Promise((r) => setTimeout(r, 350))
  let domHover = await queryDOM()
  console.log('  Normal hover reveal:', {
    hasNormalSurface: domHover.hasNormalSurface,
    normalOpacity: domHover.normalOpacity
  })
  if (domHover.normalOpacity !== '1') {
    throw new Error('FAIL: Normal hover activation must work cleanly after charging finishes!')
  }

  console.log('\n>>> SUCCESS! All priority, hover conflict, and latency tests PASSED! <<<')
  process.exit(0)
})
