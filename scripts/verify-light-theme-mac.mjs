import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots/light_theme_verification'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-light-theme')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-light'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING REDESIGNED LIGHT THEME AGAINST MULTIPLE BACKGROUNDS ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  let currentMode = 'expanded'
  let activeTheme = 'light'

  // Default coordinated macOS pastel palette
  const pastelPalette = {
    primary: '#BBFF00',
    primaryLight: '#6366F1',
    secondary: '#38BDF8',
    highlight: '#FB923C',
    glow: 'rgba(187, 255, 0, 0.25)',
    subtle: 'rgba(187, 255, 0, 0.08)',
    border: 'rgba(187, 255, 0, 0.32)',
    text: '#BBFF00',
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

  // Set island window above the desktop background window
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
    userName: 'Shubham',
    clockFormat: '12h',
    appearance: activeTheme,
    isPinned: false
  }))
  ipcMain.handle('preferences:update', (_e, p) => p)
  ipcMain.handle('theme:get-resolved', () => activeTheme)
  ipcMain.handle('wallpaper:get-accent-palette', () => pastelPalette)
  ipcMain.handle('theme:get-accent-palette', () => pastelPalette)

  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 14,
    cpuModel: 'Apple Silicon / Intel Core i7',
    memoryPercent: 42,
    memoryUsedGb: '6.7',
    memoryTotalGb: '16.0',
    platform: 'win32',
    arch: 'x64',
    hostname: 'DESKTOP-MAC',
    uptimeFormatted: '4d 12h 35m'
  }))
  ipcMain.handle('clipboard:get-history', () => [
    { id: '1', text: 'https://github.com/rraki11/is-delulu', timestamp: Date.now() - 60000, preview: 'https://github.com/rraki11/is-delulu' },
    { id: '2', text: 'npm run dev', timestamp: Date.now() - 120000, preview: 'npm run dev' }
  ])
  ipcMain.handle('media:get-state', () => null)
  ipcMain.handle('routines:get-list', () => [
    { id: '1', title: 'Focus Work Mode', description: 'Mute alerts and pin top tasks', isActive: false },
    { id: '2', title: 'Night Shift Reading', description: 'Warm tone and low volume', isActive: true }
  ])
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('action:execute', () => {})
  ipcMain.handle('shortcut:launch', () => {})

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))

  // Wait for initial load
  await new Promise((r) => setTimeout(r, 600))
  win.webContents.send('island:mode-changed', 'expanded')

  // Wait for expand animation to finish
  await new Promise((r) => setTimeout(r, 800))

  // ── Scenario A: Test over a Busy Web Page / Text Background ─────────
  console.log('Testing Scenario A: Busy text & window background behind island...')
  await bgWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 24px;
          background: #e2e8f0;
          font-family: sans-serif;
          color: #0f172a;
          line-height: 1.6;
        }
        h1 { color: #dc2626; font-size: 26px; margin-bottom: 12px; }
        p { font-size: 15px; margin-bottom: 10px; }
        .code-box {
          background: #1e293b;
          color: #38bdf8;
          padding: 16px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <h1>CONFIDENTIAL HIGH CONTRAST DOCUMENT</h1>
      <p>This text is sitting directly on the user's desktop behind the floating dynamic island panel.</p>
      <p>05489584096 CRITICAL WARNING: TEXT MUST NOT DISTRACT OR BE COGNITIVELY READABLE THROUGH THE ISLAND.</p>
      <div class="code-box">
        const verifyContrast = true;<br/>
        function testDesktopBleedThrough() { return "Background should be elegant frosted milky surface"; }
      </div>
      <p>More sample body text with <strong>bold labels</strong> and buttons: <button style="background:#2563eb;color:white;padding:8px 16px;border:none;border-radius:4px;">Action Button</button></p>
    </body>
    </html>
  `))

  await new Promise((r) => setTimeout(r, 600))

  // Inspect computed properties in Scenario A
  const metricsA = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      const cs = surface ? window.getComputedStyle(surface) : null;
      const cards = document.querySelectorAll('#island-surface [style*="gridTemplateColumns"] > div');
      const firstCardStyle = cards.length > 0 ? window.getComputedStyle(cards[0]) : null;
      const titleSpan = firstCardStyle ? cards[0].querySelector('span.font-text') : null;
      const titleColor = titleSpan ? window.getComputedStyle(titleSpan).color : null;
      const searchInput = document.querySelector('#island-surface input');
      const searchStyle = searchInput ? window.getComputedStyle(searchInput.parentElement) : null;

      return {
        surfaceBg: cs ? cs.backgroundColor : null,
        surfaceBackdropFilter: cs ? cs.backdropFilter : null,
        surfaceBoxShadow: cs ? cs.boxShadow : null,
        surfaceBorder: cs ? cs.border : null,
        cardCount: cards.length,
        cardBg: firstCardStyle ? firstCardStyle.backgroundColor : null,
        cardBorder: firstCardStyle ? firstCardStyle.border : null,
        cardBoxShadow: firstCardStyle ? firstCardStyle.boxShadow : null,
        cardTitleColor: titleColor,
        searchBorder: searchStyle ? searchStyle.border : null,
        searchBg: searchStyle ? searchStyle.backgroundColor : null,
        searchBoxShadow: searchStyle ? searchStyle.boxShadow : null
      };
    })()
  `)

  console.log('Metrics Scenario A:', JSON.stringify(metricsA, null, 2))

  const imgA = await win.capturePage()
  const pathA = join(outDir, '01_light_theme_busy_desktop_background.png')
  writeFileSync(pathA, imgA.toPNG())
  console.log(`Saved screenshot: ${pathA}`)

  // ── Scenario B: Test over a Colorful Gradient Wallpaper (Vibrant macOS wallpaper) ───
  console.log('\nTesting Scenario B: Vibrant macOS pastel/vibrant wallpaper background...')
  await bgWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          height: 100vh;
          background: linear-gradient(135deg, #3b82f6 0%, #ec4899 50%, #8b5cf6 100%);
        }
      </style>
    </head>
    <body></body>
    </html>
  `))

  await new Promise((r) => setTimeout(r, 600))
  const imgB = await win.capturePage()
  const pathB = join(outDir, '02_light_theme_vibrant_wallpaper.png')
  writeFileSync(pathB, imgB.toPNG())
  console.log(`Saved screenshot: ${pathB}`)

  // ── Scenario C: Verify Calendar Tab in Light Theme ─────────
  console.log('\nTesting Scenario C: Calendar tab in Light Theme...')
  await win.webContents.executeJavaScript(`
    const calBtn = document.querySelector('button[data-tab="calendar"]');
    if (calBtn) calBtn.click();
  `)
  await new Promise((r) => setTimeout(r, 400))
  const imgC = await win.capturePage()
  const pathC = join(outDir, '03_light_theme_calendar_tab.png')
  writeFileSync(pathC, imgC.toPNG())
  console.log(`Saved screenshot: ${pathC}`)

  // ── Scenario D: Verify System Telemetry Tab in Light Theme ─────────
  console.log('\nTesting Scenario D: System tab in Light Theme...')
  await win.webContents.executeJavaScript(`
    const sysBtn = document.querySelector('button[data-tab="system"]');
    if (sysBtn) sysBtn.click();
  `)
  await new Promise((r) => setTimeout(r, 400))
  const imgD = await win.capturePage()
  const pathD = join(outDir, '04_light_theme_system_tab.png')
  writeFileSync(pathD, imgD.toPNG())
  console.log(`Saved screenshot: ${pathD}`)

  // ── Scenario E: Verify Dark Theme Remains Completely Intact (Constraint Verification) ──
  console.log('\nTesting Scenario E: Verifying Dark Theme remains 100% intact...')
  await win.webContents.executeJavaScript(`
    document.documentElement.dataset.theme = 'dark';
    const launchBtn = document.querySelector('button[data-tab="launcher"]');
    if (launchBtn) launchBtn.click();
  `)
  await new Promise((r) => setTimeout(r, 400))
  const imgE = await win.capturePage()
  const pathE = join(outDir, '05_dark_theme_preserved_check.png')
  writeFileSync(pathE, imgE.toPNG())
  console.log(`Saved screenshot: ${pathE}`)

  setTimeout(() => {
    bgWin.destroy()
    win.destroy()
    app.quit()
  }, 600)
})
