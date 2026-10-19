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

app.setName('is-delulu-compact-delay-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-compact-delay-verify'))

app.whenReady().then(async () => {
  console.log('[Verification] Starting Compact Pill 1,000ms Delay Verification...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'

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
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)
  ipcMain.handle('battery:charging-started', () => {
    win.showInactive()
    win.setIgnoreMouseEvents(true, { forward: true })
  })
  ipcMain.handle('battery:charging-ended', () => {
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
    cpuUsage: 14,
    memoryUsedGb: 6.5,
    memoryTotalGb: 16,
    memoryPercent: 41,
    platform: 'win32',
    arch: 'x64',
    hostname: 'PC',
    uptimeFormatted: '3h 10m',
    cpuModel: 'Intel Core i9',
    batteryPercent: 74,
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
    percent: 74,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    minutesRemaining: 48
  }

  ipcMain.handle('battery:get-state', () => liveBatteryState)

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))

  // Allow startup settling period
  await new Promise((r) => setTimeout(r, 2200))

  // Trigger charger connection
  console.log('[Verification] 1. Triggering charger plug-in event (t = 0)...')
  const startTime = Date.now()
  liveBatteryState = {
    percent: 74,
    isCharging: true,
    isFullyCharged: false,
    isOnAC: true,
    minutesRemaining: 48
  }
  win.showInactive()
  win.setIgnoreMouseEvents(true, { forward: true })
  win.webContents.send('battery:update', liveBatteryState)
  win.webContents.send('battery:charging-started', liveBatteryState)

  // Helper to query DOM state
  const queryState = async () => {
    return await win.webContents.executeJavaScript(`
      (() => {
        const surface = document.querySelector('.charging-pill-surface');
        const track = document.querySelector('.charging-bar-track');
        const pct = document.querySelector('.charging-percent');
        const chargingLabel = Array.from(surface?.querySelectorAll('span') || [])
          .some(s => s.textContent.includes('Charging'));
        return {
          hasSurface: !!surface,
          isCompact: !!surface && !track && chargingLabel,
          isExpanded: !!surface && !!track,
          pctText: pct ? pct.textContent : null,
          width: surface ? surface.getBoundingClientRect().width : 0
        };
      })()
    `)
  }

  // Check at t = 400ms (just completed entrance slide, beginning of 1,000ms delay)
  await new Promise((r) => setTimeout(r, 400))
  const stateAt400 = await queryState()
  console.log(`[Verification] t = ${Date.now() - startTime}ms (entrance completed): isCompact=${stateAt400.isCompact}, isExpanded=${stateAt400.isExpanded}`)
  if (!stateAt400.isCompact || stateAt400.isExpanded) {
    throw new Error('Pill should be compact at t=400ms!')
  }

  // Simulate a live battery percentage update while waiting in compact state (t ~ 600ms)
  console.log('[Verification] Simulating live battery update during compact delay...')
  liveBatteryState = {
    percent: 75,
    isCharging: true,
    isFullyCharged: false,
    isOnAC: true,
    minutesRemaining: 46
  }
  win.webContents.send('battery:update', liveBatteryState)

  // Check at t = 900ms (520ms into 1,000ms delay): MUST STILL BE COMPACT
  await new Promise((r) => setTimeout(r, 500))
  const stateAt900 = await queryState()
  console.log(`[Verification] t = ${Date.now() - startTime}ms (mid-delay): isCompact=${stateAt900.isCompact}, isExpanded=${stateAt900.isExpanded}`)
  if (!stateAt900.isCompact || stateAt900.isExpanded) {
    throw new Error('Pill must STILL be compact at t=900ms (before 1,000ms delay finishes)!')
  }

  // Check at t = 1,300ms (920ms into 1,000ms delay): MUST STILL BE COMPACT
  await new Promise((r) => setTimeout(r, 400))
  const stateAt1300 = await queryState()
  console.log(`[Verification] t = ${Date.now() - startTime}ms (near end of delay): isCompact=${stateAt1300.isCompact}, isExpanded=${stateAt1300.isExpanded}`)
  if (!stateAt1300.isCompact || stateAt1300.isExpanded) {
    throw new Error('Pill must STILL be compact at t=1,300ms!')
  }

  // Check at t ~ 1,800ms (after 380ms entrance + 1,000ms delay + mode='wait' exit of compact content): MUST BE EXPANDED
  await new Promise((r) => setTimeout(r, 450))
  let stateExpanded = await queryState()
  if (!stateExpanded.isExpanded) {
    // Retry once after 200ms in case frame scheduling delayed mount
    await new Promise((r) => setTimeout(r, 200))
    stateExpanded = await queryState()
  }
  console.log(`[Verification] t = ${Date.now() - startTime}ms (after 1,000ms delay elapsed): isCompact=${stateExpanded.isCompact}, isExpanded=${stateExpanded.isExpanded}`)
  if (!stateExpanded.isExpanded) {
    throw new Error('Pill must be expanded after 1,000ms compact delay elapsed!')
  }

  console.log('[Verification] Capturing screenshot of expanded state...')
  const imgExpanded = await win.capturePage({ x: 120, y: 0, width: 420, height: 80 })
  writeFileSync(join(outDir, 'delayed_expansion_verified.png'), imgExpanded.toPNG())
  console.log('[Verification] Saved delayed_expansion_verified.png')

  console.log('[Verification] SUCCESS! Verified that the compact pill remains visible and stable for at least 1,000ms before expanding.')
  win.close()
  app.quit()
})
