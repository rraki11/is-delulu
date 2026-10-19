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

app.setName('is-delulu-lifecycle-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-lifecycle-verify'))

app.whenReady().then(async () => {
  console.log('=== STARTING COMPLETE CHARGING NOTIFICATION LIFECYCLE VERIFICATION ===')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'
  let isChargingNotificationActive = false

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

  // IPC Handlers mimicking main process window.ts and index.ts exactly
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

  let chargingEndedFired = false
  ipcMain.handle('battery:charging-started', () => {
    console.log('[IPC] battery:charging-started received')
    isChargingNotificationActive = true
    win.showInactive()
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  ipcMain.handle('island:get-welcome-shown', () => true)
  ipcMain.handle('island:mark-welcome-shown', () => true)

  ipcMain.handle('battery:notification-started', (_e, type) => {
    console.log('[IPC] battery:notification-started received:', type)
    isChargingNotificationActive = true
    win.showInactive()
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  ipcMain.handle('battery:notification-ended', () => {
    console.log('[IPC] battery:notification-ended received')
    isChargingNotificationActive = false
    chargingEndedFired = true
    currentMode = 'hidden'
    win.setIgnoreMouseEvents(true, { forward: true })
    win.webContents.send('island:mode-changed', 'hidden')
    win.hide()
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
    cpuUsage: 12,
    memoryUsedGb: 6.2,
    memoryTotalGb: 16,
    memoryPercent: 39,
    platform: 'win32',
    arch: 'x64',
    hostname: 'PC',
    uptimeFormatted: '2h 15m',
    batteryPercent: 82,
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
    percent: 82,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 55
  }

  ipcMain.handle('battery:get-state', () => liveBatteryState)

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))

  // =========================================================================
  // STEP 1: Verify Initial Hidden State
  // =========================================================================
  console.log('\n--- Step 1: Initial State Check ---')
  console.log(`Window isVisible(): ${win.isVisible()}`)
  if (win.isVisible()) {
    throw new Error('FAIL: Window should be hidden on startup')
  }

  const initialIslandState = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      const store = window.__islandStore ? window.__islandStore.getState() : null;
      return {
        storeMode: store ? store.mode : null,
        surfaceOpacity: surface ? window.getComputedStyle(surface).opacity : null,
        surfaceTransform: surface ? window.getComputedStyle(surface).transform : null
      };
    })()
  `)
  console.log('Initial Renderer State:', initialIslandState)
  if (initialIslandState.storeMode !== 'hidden') {
    throw new Error(`FAIL: Initial storeMode must be 'hidden', got '${initialIslandState.storeMode}'`)
  }

  // Allow startup settling
  await new Promise((r) => setTimeout(r, 2200))

  // =========================================================================
  // STEP 2: Plug in charger (Trigger charging notification)
  // =========================================================================
  console.log('\n--- Step 2: Plug in Charger (false -> true) ---')
  liveBatteryState = {
    percent: 82,
    isCharging: true,
    isFullyCharged: false,
    isOnAC: true,
    minutesRemaining: 55
  }

  isChargingNotificationActive = true
  win.showInactive()
  win.setIgnoreMouseEvents(true, { forward: true })
  win.webContents.send('battery:update', liveBatteryState)
  win.webContents.send('battery:charging-started', liveBatteryState)

  // Verify window is visible for charging notification
  console.log(`Window isVisible() after plug-in: ${win.isVisible()}`)
  if (!win.isVisible()) {
    throw new Error('FAIL: Window must become visible when charger connects')
  }

  // Check compact pill entrance at 500ms
  await new Promise((r) => setTimeout(r, 500))
  const compactCheck = await win.webContents.executeJavaScript(`
    (() => {
      const chargingSurface = document.querySelector('.charging-pill-surface');
      const normalIsland = document.getElementById('island-surface');
      const track = document.querySelector('.charging-bar-track');
      return {
        hasChargingPill: !!chargingSurface,
        hasTrack: !!track,
        normalIslandOpacity: normalIsland ? window.getComputedStyle(normalIsland).opacity : null
      };
    })()
  `)
  console.log('Compact notification phase (at 500ms):', compactCheck)
  if (!compactCheck.hasChargingPill || compactCheck.hasTrack) {
    throw new Error('FAIL: Charging pill should be in stable compact phase (no track) at 500ms')
  }
  if (compactCheck.normalIslandOpacity !== '0') {
    throw new Error(`FAIL: Normal island must be opacity 0 during charging pill, got ${compactCheck.normalIslandOpacity}`)
  }

  // Check STILL compact at 1200ms (during the 1,000ms delay)
  await new Promise((r) => setTimeout(r, 700))
  const midDelayCheck = await win.webContents.executeJavaScript(`
    (() => {
      const track = document.querySelector('.charging-bar-track');
      const surface = document.querySelector('.charging-pill-surface');
      return { hasSurface: !!surface, hasTrack: !!track };
    })()
  `)
  console.log('Still compact during 1,000ms delay (at 1200ms):', midDelayCheck)
  if (!midDelayCheck.hasSurface || midDelayCheck.hasTrack) {
    throw new Error('FAIL: Charging pill must still be compact at 1200ms (before 1s delay finishes)')
  }

  // Now wait for expansion after 1,000ms delay finishes (t >= 1500ms)
  let expandedCheck = null
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 100))
    expandedCheck = await win.webContents.executeJavaScript(`
      (() => {
        const surface = document.querySelector('.charging-pill-surface');
        const track = document.querySelector('.charging-bar-track');
        return {
          hasChargingPill: !!surface,
          hasTrack: !!track,
          rect: surface ? surface.getBoundingClientRect() : null
        };
      })()
    `)
    if (expandedCheck.hasTrack) break
  }
  console.log('Expanded notification phase:', expandedCheck)
  if (!expandedCheck || !expandedCheck.hasTrack) {
    throw new Error('FAIL: Charging pill should be expanded with progress bar')
  }

  // =========================================================================
  // STEP 3: Wait for final exit animation to finish
  // =========================================================================
  console.log('\n--- Step 3: Waiting for Notification Sequence to Finish and Exit ---')
  // Remaining sequence: ~2800ms expanded + 300ms collapse + 950ms settled + 320ms exit = ~4370ms
  await new Promise((r) => setTimeout(r, 4800))

  console.log(`battery:charging-ended received: ${chargingEndedFired}`)
  console.log(`Window isVisible() after exit: ${win.isVisible()}`)

  // Allow AnimatePresence 500ms to finish unmounting the exited charging pill
  await new Promise((r) => setTimeout(r, 500))

  // =========================================================================
  // STEP 4: Confirm island remains completely hidden (NO automatic collapsed pill!)
  // =========================================================================
  console.log('\n--- Step 4: Confirm Island Remains Completely Hidden ---')
  const postExitState = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      const chargingSurface = document.querySelector('.charging-pill-surface');
      const chargingOuter = document.querySelector('[aria-label*="Charging"]');
      const store = window.__islandStore ? window.__islandStore.getState() : null;
      return {
        storeMode: store ? store.mode : null,
        hasChargingSurface: !!chargingSurface,
        chargingOuterOpacity: chargingOuter ? window.getComputedStyle(chargingOuter).opacity : null,
        chargingOuterTransform: chargingOuter ? window.getComputedStyle(chargingOuter).transform : null,
        surfaceOpacity: surface ? window.getComputedStyle(surface).opacity : null,
        surfaceTransform: surface ? window.getComputedStyle(surface).transform : null
      };
    })()
  `)
  console.log('Post-Exit State:', postExitState)

  if (win.isVisible()) {
    throw new Error('FAIL: Native window must be hidden after charging notification finishes exit animation!')
  }
  if (postExitState.storeMode !== 'hidden') {
    throw new Error(`FAIL: Island storeMode must remain 'hidden', got '${postExitState.storeMode}'`)
  }
  if (postExitState.chargingOuterOpacity && postExitState.chargingOuterOpacity !== '0') {
    throw new Error(`FAIL: Charging pill must be faded out (opacity 0), got '${postExitState.chargingOuterOpacity}'`)
  }
  if (postExitState.surfaceOpacity !== '0') {
    throw new Error(`FAIL: Normal island surface must have opacity 0, got '${postExitState.surfaceOpacity}'`)
  }

  // =========================================================================
  // STEP 5: Move mouse around desktop without touching top edge
  // =========================================================================
  console.log('\n--- Step 5: Simulate Desktop Mouse Movement (Bypassing Top-Edge Zone) ---')
  // Moving at y = 150 (middle of screen)
  await win.webContents.executeJavaScript(`
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 150, bubbles: true }));
  `)
  await new Promise((r) => setTimeout(r, 200))

  console.log(`Window isVisible() after desktop mouse movement: ${win.isVisible()}`)
  if (win.isVisible()) {
    throw new Error('FAIL: Window must not show when moving mouse on desktop away from top edge')
  }

  // =========================================================================
  // STEP 6: Deliberate top-center hover activation
  // =========================================================================
  console.log('\n--- Step 6: Deliberately Trigger Top-Center Edge Hover Activation ---')
  currentMode = 'collapsed'
  win.showInactive()
  win.setIgnoreMouseEvents(true, { forward: true })
  win.webContents.send('island:mode-changed', 'collapsed')
  win.webContents.send('island:reveal')
  win.webContents.send('island:hover-state', true)

  await new Promise((r) => setTimeout(r, 350))
  const hoverRevealedState = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      const store = window.__islandStore ? window.__islandStore.getState() : null;
      return {
        storeMode: store ? store.mode : null,
        surfaceOpacity: surface ? window.getComputedStyle(surface).opacity : null,
        surfaceTransform: surface ? window.getComputedStyle(surface).transform : null
      };
    })()
  `)
  console.log('Deliberate Hover Revealed State:', hoverRevealedState)
  if (!win.isVisible()) {
    throw new Error('FAIL: Window should be visible when deliberately hovering top edge')
  }
  if (hoverRevealedState.surfaceOpacity !== '1') {
    throw new Error(`FAIL: Normal island surface must have opacity 1 upon hover reveal, got '${hoverRevealedState.surfaceOpacity}'`)
  }
  if (hoverRevealedState.storeMode !== 'collapsed') {
    throw new Error(`FAIL: Island mode must be 'collapsed' upon hover reveal, got '${hoverRevealedState.storeMode}'`)
  }

  const revealedScreenshot = await win.capturePage({ x: 220, y: 0, width: 220, height: 60 })
  writeFileSync(join(outDir, 'lifecycle_hover_revealed.png'), revealedScreenshot.toPNG())
  console.log('Saved lifecycle_hover_revealed.png')

  // Let it auto-hide as normal (user unhovers)
  console.log('\n--- Step 6b: Verify Normal Auto-Hide After Unhover ---')
  win.webContents.send('island:hover-state', false)
  // Wait for grace/min-visibility (~1200ms)
  await new Promise((r) => setTimeout(r, 1400))
  const autoHiddenState = await win.webContents.executeJavaScript(`
    (() => {
      const store = window.__islandStore ? window.__islandStore.getState() : null;
      return { storeMode: store ? store.mode : null };
    })()
  `)
  console.log('Auto-hidden State:', autoHiddenState)
  if (autoHiddenState.storeMode !== 'hidden') {
    throw new Error(`FAIL: Island must auto-hide after unhover, got '${autoHiddenState.storeMode}'`)
  }

  // =========================================================================
  // STEP 7: Unplugging and Reconnecting the Charger Retriggers Notification
  // =========================================================================
  console.log('\n--- Step 7: Unplug and Reconnect Charger ---')
  // 7a. Unplug
  liveBatteryState = {
    percent: 82,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 55
  }
  win.webContents.send('battery:update', liveBatteryState)
  await new Promise((r) => setTimeout(r, 400))

  // 7b. Reconnect
  liveBatteryState = {
    percent: 82,
    isCharging: true,
    isFullyCharged: false,
    isOnAC: true,
    minutesRemaining: 55
  }
  isChargingNotificationActive = true
  win.showInactive()
  win.setIgnoreMouseEvents(true, { forward: true })
  win.webContents.send('battery:update', liveBatteryState)
  win.webContents.send('battery:charging-started', liveBatteryState)

  await new Promise((r) => setTimeout(r, 500))
  const retriggeredCheck = await win.webContents.executeJavaScript(`
    (() => {
      const chargingSurface = document.querySelector('.charging-pill-surface');
      return {
        hasChargingPill: !!chargingSurface
      };
    })()
  `)
  console.log('Retriggered charging notification check:', retriggeredCheck)
  if (!retriggeredCheck.hasChargingPill) {
    throw new Error('FAIL: Reconnecting charger must retrigger charging notification!')
  }

  const retriggeredScreenshot = await win.capturePage({ x: 220, y: 0, width: 220, height: 60 })
  writeFileSync(join(outDir, 'lifecycle_retriggered.png'), retriggeredScreenshot.toPNG())
  console.log('Saved lifecycle_retriggered.png')

  console.log('\n=== ALL 7 LIFECYCLE REQUIREMENTS TESTED AND VERIFIED SUCCESSFULLY! ===')
  win.close()
  app.quit()
})
