import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots/clock_fade_flow'

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-clock-fade-flow')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-clock-fade-flow'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING CLOCK FADE AND SEAMLESS CHARGING ANIMATION FLOW ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'collapsed'
  let isNotificationActive = false
  let hideCount = 0

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

  win.hide = () => {
    hideCount++
    console.log(`[WINDOW EVENT] win.hide() called (total: ${hideCount})`)
  }

  const currentBatteryState = {
    percent: 85,
    isOnAC: true,
    isCharging: true,
    isEnergySaver: false
  }

  ipcMain.handle('battery:get-state', () => currentBatteryState)
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
  ipcMain.handle('battery:charging-started', () => { isNotificationActive = true })
  ipcMain.handle('battery:charging-ended', () => { isNotificationActive = false })
  ipcMain.handle('battery:notification-started', () => { isNotificationActive = true })
  ipcMain.handle('battery:notification-ended', () => {
    isNotificationActive = false
    currentMode = 'hidden'
  })
  ipcMain.handle('island:get-welcome-shown', () => false)
  ipcMain.handle('island:mark-welcome-shown', () => true)
  ipcMain.handle('island:check-welcome', () => ({ shouldWelcome: true }))

  ipcMain.handle('preferences:get', () => ({
    userName: 'User',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }))
  ipcMain.handle('preferences:update', (_e, p) => p)
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('wallpaper:get-accent-palette', () => ({
    primary: '#6366f1',
    primaryLight: '#818cf8',
    secondary: '#a855f7',
    highlight: '#38bdf8',
    glow: 'rgba(99, 102, 241, 0.35)',
    subtle: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.28)',
    text: '#ffffff',
    confidence: 'high'
  }))
  ipcMain.handle('system:get-stats', () => ({ cpu: 12, memory: 45 }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => null)
  ipcMain.handle('routines:get-list', () => [])
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('theme:get-accent-palette', () => ({
    primary: '#6366f1',
    primaryLight: '#818cf8',
    secondary: '#a855f7',
    highlight: '#38bdf8',
    glow: 'rgba(99, 102, 241, 0.35)',
    subtle: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.28)',
    text: '#ffffff',
    confidence: 'high'
  }))

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  win.showInactive()
  win.webContents.send('island:start-welcome')

  const queryDOM = async () => {
    return await win.webContents.executeJavaScript(`
      (() => {
        const surface = document.getElementById('island-surface')
        const clock = document.querySelector('.island-clock-container')
        const charging = document.querySelector('.charging-pill-surface')
        const text = document.querySelector('.handwriting-reveal-text-container')
        const allSurfaces = document.querySelectorAll('#island-surface, [id*="charging"]')

        const rect = surface ? surface.getBoundingClientRect() : null

        return {
          surfaceCount: allSurfaces.length,
          surfaceInDOM: Boolean(surface),
          surfaceTop: rect ? rect.top : null,
          surfaceWidth: rect ? Math.round(rect.width) : null,
          surfaceHeight: rect ? Math.round(rect.height) : null,
          clockOpacity: clock ? parseFloat(window.getComputedStyle(clock).opacity) : null,
          textOpacity: text ? parseFloat(window.getComputedStyle(text).opacity) : null,
          chargingOpacity: charging ? parseFloat(window.getComputedStyle(charging).opacity) : null,
          chargingInsideSurface: surface && charging ? surface.contains(charging) : false,
          hasChargingPill: Boolean(charging)
        }
      })()
    `)
  }

  // 1. Wait for greeting to be writing
  console.log('[STAGE 1] Waiting for handwriting greeting to start...')
  let snap = null
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 50))
    snap = await queryDOM()
    if (snap.textOpacity > 0.8 && snap.surfaceTop === 0) {
      console.log(`[STAGE 1 - Greeting Writing]: textOpacity=${snap.textOpacity}, surfaceTop=${snap.surfaceTop}`)
      const img = await win.capturePage()
      writeFileSync(join(outDir, '01_greeting_writing.png'), img.toPNG())
      break
    }
  }

  // 2. Wait for greeting to fade
  console.log('[STAGE 2] Waiting for greeting to fade out...')
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 50))
    snap = await queryDOM()
    if (snap.textOpacity < 0.6 && snap.textOpacity > 0.05) {
      console.log(`[STAGE 2 - Greeting Fading]: textOpacity=${snap.textOpacity}`)
      const img = await win.capturePage()
      writeFileSync(join(outDir, '02_greeting_fade.png'), img.toPNG())
      break
    }
  }

  // 3. Wait for empty pause
  console.log('[STAGE 3] Waiting for empty pause (greeting opacity 0, clock opacity 0)...')
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 50))
    snap = await queryDOM()
    if (snap.textOpacity === 0 && snap.clockOpacity === 0) {
      console.log(`[STAGE 3 - Empty Pause]: textOpacity=${snap.textOpacity}, clockOpacity=${snap.clockOpacity}`)
      const img = await win.capturePage()
      writeFileSync(join(outDir, '03_empty_pause.png'), img.toPNG())
      break
    }
  }

  // 4. Wait for clock to reveal & dwell
  console.log('[STAGE 4] Waiting for clock reveal & dwell (clockOpacity > 0.8)...')
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 50))
    snap = await queryDOM()
    if (snap.clockOpacity > 0.8) {
      console.log(`[STAGE 4 - Clock Dwell]: clockOpacity=${snap.clockOpacity}`)
      const img = await win.capturePage()
      writeFileSync(join(outDir, '04_clock_revealed.png'), img.toPNG())
      break
    }
  }

  // 5. Wait for clock to visibly fade before charging
  console.log('[STAGE 5] Waiting for clock to visibly fade out (clockOpacity between 0.1 and 0.7)...')
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 50))
    snap = await queryDOM()
    if (snap.clockOpacity > 0.05 && snap.clockOpacity < 0.7) {
      console.log(`[STAGE 5 - Clock Fading]: clockOpacity=${snap.clockOpacity}`)
      const img = await win.capturePage()
      writeFileSync(join(outDir, '05_clock_fading.png'), img.toPNG())
      break
    }
  }

  // 6. Wait for charging compact animation inside the same surface
  console.log('[STAGE 6] Waiting for charging compact animation...')
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 50))
    snap = await queryDOM()
    if (snap.hasChargingPill && snap.chargingOpacity > 0.5) {
      console.log(`[STAGE 6 - Charging Compact]: chargingInsideSurface=${snap.chargingInsideSurface}, chargingOpacity=${snap.chargingOpacity}, width=${snap.surfaceWidth}, height=${snap.surfaceHeight}`)
      const img = await win.capturePage()
      writeFileSync(join(outDir, '06_charging_compact.png'), img.toPNG())
      break
    }
  }

  // 7. Wait for charging expanded animation (springs to width >= 300)
  console.log('[STAGE 7] Waiting for charging expanded animation...')
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 50))
    snap = await queryDOM()
    if (snap.surfaceWidth >= 300) {
      console.log(`[STAGE 7 - Charging Expanded]: width=${snap.surfaceWidth}, height=${snap.surfaceHeight}, chargingInsideSurface=${snap.chargingInsideSurface}`)
      const img = await win.capturePage()
      writeFileSync(join(outDir, '07_charging_expanded.png'), img.toPNG())
      break
    }
  }

  const finalCheck = await queryDOM()
  console.log(`\nAll stages captured! Single surface confirmed: ${finalCheck.surfaceCount === 1 && finalCheck.chargingInsideSurface}`)
  console.log(`Window hide count during entire flow: ${hideCount} (must be 0 until full exit)`)
  
  app.quit()
})
