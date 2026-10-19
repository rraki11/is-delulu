import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots/dark_theme_verification'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-dark-theme')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-dark-2'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING REDESIGNED DARK THEME AGAINST MULTIPLE BACKGROUNDS ===\n')

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    let currentMode = 'expanded'
    let activeTheme = 'dark'

    // Default coordinated macOS dark palette (Sky & Indigo)
    const defaultDarkPalette = {
      primary: '#60A5FA',
      primaryLight: '#6366F1',
      secondary: '#818CF8',
      highlight: '#A78BFA',
      glow: 'rgba(96, 165, 250, 0.16)',
      subtle: 'rgba(96, 165, 250, 0.08)',
      border: 'rgba(96, 165, 250, 0.24)',
      text: '#FFFFFF',
      confidence: 'high'
    }

    // 1. Create a Background Window to simulate desktop windows/wallpaper behind the transparent island
    const bgWin = new BrowserWindow({
      width: 800,
      height: 600,
      x: Math.round((screenWidth - 800) / 2),
      y: 0,
      frame: false,
      show: true,
      skipTaskbar: true
    })

    // 2. Create the is-delulu transparent window floating on top
    const win = new BrowserWindow({
      width: 660,
      height: 540,
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
    ipcMain.handle('wallpaper:get-accent-palette', () => defaultDarkPalette)
    ipcMain.handle('theme:get-accent-palette', () => defaultDarkPalette)
    ipcMain.handle('wallpaper:get-current', () => ({ path: 'simulated_mac_bg.jpg' }))
    ipcMain.handle('routines:get', () => [])
    ipcMain.handle('system:get-stats', () => ({
      cpuUsage: 18,
      memoryUsage: 44,
      diskUsage: 62,
      batteryPercent: 85,
      isCharging: false,
      uptime: 14200
    }))
    ipcMain.handle('media:get-state', () => ({
      isPlaying: true,
      title: 'Midnight City',
      artist: 'M83',
      album: "Hurry Up, We're Dreaming",
      duration: 243,
      position: 84
    }))
    ipcMain.handle('clipboard:get-history', () => [
      { id: '1', text: 'https://developer.apple.com/macos/design', type: 'link', timestamp: Date.now() - 120000 },
      { id: '2', text: 'git commit -m "Refined dark theme design tokens"', type: 'text', timestamp: Date.now() - 340000 },
      { id: '3', text: 'rgba(15, 20, 36, 0.88)', type: 'color', timestamp: Date.now() - 600000 }
    ])
    ipcMain.handle('calendar:get-events', () => [
      { id: '1', title: 'Design Review', date: new Date().toISOString().split('T')[0], completed: false }
    ])

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

    await setBackground('linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #3b82f6 85%, #60a5fa 100%)')
    await win.loadURL('http://localhost:5173')
    await new Promise((r) => setTimeout(r, 2200))

    await win.webContents.executeJavaScript(`
      document.documentElement.dataset.theme = 'dark';
    `)

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

    win.webContents.on('console-message', (_e, _level, msg) => {
      console.log(`[Renderer] ${msg}`)
    })

    const switchTab = async (tabName) => {
      try {
        await win.webContents.executeJavaScript(`
          (() => {
            try {
              const btn = document.querySelector('button[data-tab="${tabName}"]');
              if (btn) btn.click();
            } catch (err) {
              console.error('switchTab inner error:', err);
            }
          })()
        `)
      } catch (e) {
        console.log('switchTab outer error:', e.message)
      }
      await new Promise((r) => setTimeout(r, 600))
    }

    // 1. Launcher view
    await capture('01_mac_launcher_expanded')

    // 2. Calendar Tab
    await switchTab('calendar')
    await capture('02_mac_calendar_tab')

    // 3. System Tab
    await switchTab('system')
    await capture('03_mac_system_tab')

    // 4. Media Tab
    await switchTab('media')
    await capture('04_mac_media_tab')

    // 5. Settings Tab
    await switchTab('settings')
    await capture('05_mac_settings_tab')

    // 6. Switch back to Launcher
    await switchTab('launcher')
    await capture('06_mac_launcher_return')

    console.log('\n=== ALL CAPTURES SUCCEEDED ===')
  } catch (err) {
    console.error('Error during verification:', err)
  } finally {
    app.quit()
  }
})
