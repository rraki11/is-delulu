import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.whenReady().then(async () => {
  console.log('[Diagnose] Starting diagnostics on Electron window...')

  const primaryDisplay = screen.getPrimaryDisplay()
  console.log('[Diagnose] Primary Display:', {
    bounds: primaryDisplay.bounds,
    workArea: primaryDisplay.workArea,
    scaleFactor: primaryDisplay.scaleFactor
  })

  const win = new BrowserWindow({
    width: 280,
    height: 56,
    x: Math.round((primaryDisplay.workArea.width - 280) / 2),
    y: 12,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    console.log(`[Renderer Log ${level}] ${message} (${sourceId}:${line})`)
  })

  // Mock necessary handlers
  ipcMain.handle('island:set-mode', () => {})
  ipcMain.handle('island:get-mode', () => 'collapsed')
  ipcMain.handle('island:reset-position', () => {})
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 20, memoryUsedGb: 8, memoryTotalGb: 16, memoryPercent: 50,
    platform: 'win32', arch: 'x64', hostname: 'PC', uptimeFormatted: '1h',
    cpuModel: 'CPU', batteryPercent: null, isCharging: null
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => ({
    isPlaying: false, title: '', artist: '', durationSec: 0, positionSec: 0, volume: 50, isMuted: false
  }))
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('preferences:get', () => ({
    userName: '', clockFormat: '12h', appearance: 'dark', isPinned: true
  }))
  ipcMain.handle('preferences:update', () => ({
    userName: '', clockFormat: '12h', appearance: 'dark', isPinned: true
  }))
  ipcMain.handle('theme:get-resolved', () => 'dark')

  // Load from Vite dev server
  const devUrl = 'http://localhost:5173'
  console.log('[Diagnose] Loading from Vite dev server:', devUrl)
  await win.loadURL(devUrl)

  // Wait 1 second for React to mount
  await new Promise(r => setTimeout(r, 1200))

  const domInfo = await win.webContents.executeJavaScript(`
    (() => {
      const root = document.getElementById('root');
      const html = document.documentElement;
      const body = document.body;
      const pill = document.querySelector('[role="button"]') || document.querySelector('.island-container');
      
      const getBg = (el) => el ? window.getComputedStyle(el).backgroundColor : 'none';
      const getBox = (el) => el ? el.getBoundingClientRect().toJSON() : null;

      return {
        htmlBg: getBg(html),
        bodyBg: getBg(body),
        rootBg: getBg(root),
        rootChildren: root ? root.children.length : 0,
        rootHtmlSnippet: root ? root.innerHTML.slice(0, 300) : null,
        pillFound: Boolean(pill),
        pillBox: getBox(pill),
        errors: window.__errors || []
      };
    })()
  `)

  console.log('[Diagnose] DOM State:', JSON.stringify(domInfo, null, 2))

  const capture = await win.capturePage()
  const outPath = 'C:/Users/rrake/.gemini/antigravity-ide/brain/d52299be-500b-46de-ab7c-11a2d598f089/.tempmediaStorage/diagnose_capture.png'
  writeFileSync(outPath, capture.toPNG())
  console.log('[Diagnose] Capture saved to:', outPath)

  app.quit()
})
