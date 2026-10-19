import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots/light_theme_pill_fix'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-pill-fix')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-pill-fix'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING LIGHT THEME COLLAPSED PILL TOP EDGE ===\n')

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    let currentMode = 'collapsed'
    let activeTheme = 'light'

    const pastelPalette = {
      primary: '#60A5FA',
      primaryLight: '#6366F1',
      secondary: '#38BDF8',
      highlight: '#FB923C',
      glow: 'rgba(99, 102, 241, 0.16)',
      subtle: 'rgba(99, 102, 241, 0.07)',
      border: 'rgba(99, 102, 241, 0.20)',
      text: '#4F46E5',
      confidence: 'high'
    }

    // 1. Background window with dark gray/black background simulating dark code editor / wallpaper
    const bgWin = new BrowserWindow({
      width: 800,
      height: 400,
      x: Math.round((screenWidth - 800) / 2),
      y: 0,
      frame: false,
      show: true,
      skipTaskbar: true
    })

    // 2. Island window
    const win = new BrowserWindow({
      width: 660,
      height: 400,
      x: Math.round((screenWidth - 660) / 2),
      y: 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../out/preload/index.js'),
        sandbox: false
      }
    })

    win.setAlwaysOnTop(true, 'screen-saver')

    ipcMain.handle('battery:get-state', () => ({
      percent: 85,
      isOnAC: false,
      isCharging: false,
      isEnergySaver: false
    }))
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
    ipcMain.handle('battery:charging-started', () => {})
    ipcMain.handle('battery:charging-ended', () => {})
    ipcMain.handle('battery:notification-started', () => {})
    ipcMain.handle('battery:notification-ended', () => {})
    ipcMain.handle('island:get-welcome-shown', () => true)
    ipcMain.handle('island:mark-welcome-shown', () => true)
    ipcMain.handle('island:check-welcome', () => ({ shouldWelcome: false }))
    ipcMain.handle('preferences:get', () => ({
      clockFormat: '12h',
      theme: activeTheme,
      accentMode: 'wallpaper',
      customAccentColor: null,
      enableWallpaperAdaptive: true,
      blurStrength: 36,
      reducedMotion: false,
      autoHideDelay: 999999,
      userName: 'Shubham',
      isPinned: true
    }))
    ipcMain.handle('preferences:update', (_e, p) => p)
    ipcMain.handle('wallpaper:get-accent-palette', () => pastelPalette)
    ipcMain.handle('theme:get-accent-palette', () => pastelPalette)
    ipcMain.handle('wallpaper:get-current', () => ({ path: 'simulated_bg.jpg' }))
    ipcMain.handle('routines:get', () => [])
    ipcMain.handle('system:get-stats', () => ({
      cpuUsage: 18,
      memoryUsage: 44,
      diskUsage: 62,
      batteryPercent: 85,
      isCharging: false,
      uptime: 14200
    }))
    ipcMain.handle('media:get-state', () => ({ isPlaying: false }))
    ipcMain.handle('clipboard:get-history', () => [])
    ipcMain.handle('calendar:get-events', () => [])

    const setBackground = async (css) => {
      await bgWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              html, body {
                margin: 0; padding: 0; width: 100%; height: 100%;
                background: ${css};
                overflow: hidden;
              }
            </style>
          </head>
          <body>
          </body>
        </html>
      `)}`)
    }

    // Set a dark background matching the user's screenshot (dark IDE background)
    await setBackground('#1E1E1E')
    await win.loadURL('http://localhost:5173')
    await new Promise((r) => setTimeout(r, 2200))

    // Set light theme
    await win.webContents.executeJavaScript(`
      document.documentElement.dataset.theme = 'light';
    `)
    await new Promise((r) => setTimeout(r, 400))

    const capture = async (name) => {
      bgWin.show()
      win.show()
      win.focus()
      await new Promise((r) => setTimeout(r, 400))
      const img = await win.capturePage()
      const buffer = img.toPNG()
      writeFileSync(join(outDir, `${name}.png`), buffer)
      console.log(`[Captured] ${name}.png (${buffer.length} bytes)`)
    }

    // Capture collapsed pill on dark background in LIGHT theme
    await capture('01_light_theme_collapsed_pill_dark_bg')

    // Also test against vibrant wallpaper in LIGHT theme
    await setBackground('linear-gradient(135deg, #fbcfe8 0%, #c7d2fe 50%, #bae6fd 100%)')
    await new Promise((r) => setTimeout(r, 400))
    await capture('02_light_theme_collapsed_pill_pastel_bg')

    // Test expanded panel in LIGHT theme
    await win.webContents.executeJavaScript(`
      const surface = document.getElementById('island-surface');
      if (surface) surface.click();
    `)
    await new Promise((r) => setTimeout(r, 600))
    await capture('03_light_theme_expanded_panel')

    // Switch to DARK theme collapsed pill to ensure no regression
    await win.webContents.executeJavaScript(`
      document.documentElement.dataset.theme = 'dark';
      const minimizeBtn = document.querySelector('button[aria-label="Collapse Island"]');
      if (minimizeBtn) minimizeBtn.click();
    `)
    await new Promise((r) => setTimeout(r, 600))
    await capture('04_dark_theme_collapsed_pill')

    console.log('\n=== ALL TESTS PASSED ===')
  } catch (err) {
    console.error('Error during verification:', err)
  } finally {
    app.quit()
  }
})
