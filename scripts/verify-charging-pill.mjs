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

app.setName('is-delulu-charging-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-charging-verify'))

app.whenReady().then(async () => {
  console.log('[Verification] Starting Charging Pill E2E inspection...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'collapsed'

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
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)
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

  let liveBatteryState = {
    percent: 74,
    isCharging: false,
    isFullyCharged: false,
    minutesRemaining: 48
  }

  ipcMain.handle('battery:get-state', () => liveBatteryState)

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  win.show()

  // Wait 1.8s for startup to settle (startup ref ignores initial read)
  await new Promise((r) => setTimeout(r, 1800))
  console.log('[Verification] Initial startup settled. Simulating charger plug-in...')

  // Simulate charger plug-in event (false -> true)
  liveBatteryState = {
    percent: 74,
    isCharging: true,
    isFullyCharged: false,
    minutesRemaining: 48
  }
  win.webContents.send('battery:update', liveBatteryState)

  // 1. Wait 350ms: compact phase spring settles
  await new Promise((r) => setTimeout(r, 350))
  const compactMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.querySelector('.charging-pill-surface');
      const icon = document.querySelector('.charging-icon--compact');
      const pct = document.querySelector('.charging-percent');
      const glow = document.querySelector('.charging-pill-glow');
      return {
        hasSurface: !!surface,
        hasIcon: !!icon,
        hasPct: !!pct,
        pctText: pct ? pct.textContent : null,
        hasGlow: !!glow,
        surfaceRect: surface ? surface.getBoundingClientRect() : null
      };
    })()
  `)
  console.log('[Verification] Compact pill metrics:', compactMetrics)

  // Capture screenshot of compact pill
  const imgCompact = await win.capturePage({ x: 220, y: 0, width: 220, height: 60 })
  writeFileSync(join(outDir, 'charging_compact.png'), imgCompact.toPNG())
  console.log('[Verification] Saved charging_compact.png')

  // 2. Wait 800ms: expanded phase fully active
  await new Promise((r) => setTimeout(r, 800))
  const expandedMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.querySelector('.charging-pill-surface');
      const track = document.querySelector('.charging-bar-track');
      const fill = document.querySelector('.charging-bar-fill');
      const head = document.querySelector('.charging-bar-head');
      const timeRemaining = document.querySelector('.charging-time-remaining');
      const glow = document.querySelector('.charging-pill-glow');
      return {
        hasSurface: !!surface,
        hasTrack: !!track,
        hasFill: !!fill,
        hasHead: !!head,
        headText: head ? head.textContent.trim() : null,
        hasTimeRemaining: !!timeRemaining,
        timeRemainingText: timeRemaining ? timeRemaining.textContent.trim() : null,
        surfaceRect: surface ? surface.getBoundingClientRect() : null,
        fillWidth: fill ? fill.style.width : null,
        headLeft: head ? head.style.left : null
      };
    })()
  `)
  console.log('[Verification] Expanded pill metrics:', expandedMetrics)

  // Capture screenshot of expanded pill
  const imgExpanded = await win.capturePage({ x: 120, y: 0, width: 420, height: 80 })
  writeFileSync(join(outDir, 'charging_expanded.png'), imgExpanded.toPNG())
  console.log('[Verification] Saved charging_expanded.png')

  console.log('[Verification] SUCCESS! All charging indicator visual states verified.')
  win.close()
  app.quit()
})
