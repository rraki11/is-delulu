import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots/dark_theme_charcoal'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-charcoal')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-charcoal'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING NEUTRAL CHARCOAL DARK THEME & NO TOP BORDER ===\n')

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    let currentMode = 'expanded'
    let activeTheme = 'dark'

    const charcoalPalette = {
      primary: '#A3E635',
      primaryLight: '#6366F1',
      secondary: '#8B5CF6',
      highlight: '#00F0FF',
      glow: 'rgba(163, 230, 53, 0.12)',
      subtle: 'rgba(163, 230, 53, 0.08)',
      border: 'rgba(163, 230, 53, 0.32)',
      text: '#A3E635',
      confidence: 'high'
    }

    // Background window simulating user's dark desktop / IDE
    const bgWin = new BrowserWindow({
      width: 800,
      height: 600,
      x: Math.round((screenWidth - 800) / 2),
      y: 0,
      frame: false,
      show: true,
      skipTaskbar: true
    })

    // Main island window
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
      accentMode: 'default',
      customAccentColor: null,
      enableWallpaperAdaptive: true,
      blurStrength: 36,
      reducedMotion: false,
      autoHideDelay: 999999,
      userName: 'Shubham',
      isPinned: true
    }))
    ipcMain.handle('preferences:update', (_e, p) => p)
    ipcMain.handle('wallpaper:get-accent-palette', () => charcoalPalette)
    ipcMain.handle('theme:get-accent-palette', () => charcoalPalette)
    ipcMain.handle('wallpaper:get-current', () => ({ path: 'simulated_dark_bg.jpg' }))
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

    // Set dark background matching user screenshot
    await setBackground('#1A1C1E')
    await win.loadURL('http://localhost:5173')
    await new Promise((r) => setTimeout(r, 2200))

    await win.webContents.executeJavaScript(`
      document.documentElement.dataset.theme = 'dark';
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

    // 1. Settings Tab (directly matching user's screenshot)
    await win.webContents.executeJavaScript(`
      const settingsBtn = document.querySelector('button[data-tab="settings"]');
      if (settingsBtn) settingsBtn.click();
    `)
    await new Promise((r) => setTimeout(r, 600))
    await capture('01_settings_panel_charcoal_dark')

    // 2. Launcher Tab
    await win.webContents.executeJavaScript(`
      const launcherBtn = document.querySelector('button[data-tab="launcher"]');
      if (launcherBtn) launcherBtn.click();
    `)
    await new Promise((r) => setTimeout(r, 600))
    await capture('02_launcher_panel_charcoal_dark')

    // 3. Collapsed Pill
    await win.webContents.executeJavaScript(`
      const minimizeBtn = document.querySelector('button[aria-label="Collapse Island"]');
      if (minimizeBtn) minimizeBtn.click();
    `)
    await new Promise((r) => setTimeout(r, 600))
    await capture('03_collapsed_pill_charcoal_dark')

    console.log('\n=== ALL CAPTURES SUCCEEDED ===')
  } catch (err) {
    console.error('Error during verification:', err)
  } finally {
    app.quit()
  }
})
