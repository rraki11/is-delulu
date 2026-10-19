import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-nav-position')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-nav-pos'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING NAVIGATION TAB BAR POSITION IN EXPANDED ISLAND ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'expanded'

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

  // Wait for initial load, then ensure expanded mode
  await new Promise(r => setTimeout(r, 600))
  await win.webContents.executeJavaScript(`
    window.__islandSetMode && window.__islandSetMode('expanded')
  `).catch(() => {})
  win.webContents.send('island:mode-changed', 'expanded')

  // Wait for expand animation to finish
  await new Promise(r => setTimeout(r, 800))

  const layout = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface')
      const header = document.querySelector('.island-header') || surface?.children?.[0]
      const navWrap = document.querySelector('.nav-seg-wrap')
      const contentArea = document.querySelector('.island-content-area')
      const shortcuts = document.querySelector('.shortcut-grid') || document.querySelector('.launcher-shortcuts')

      const surfaceRect = surface ? surface.getBoundingClientRect() : null
      const headerRect = header ? header.getBoundingClientRect() : null
      const navRect = navWrap ? navWrap.getBoundingClientRect() : null
      const contentRect = contentArea ? contentArea.getBoundingClientRect() : null

      return {
        surface: surfaceRect ? { top: surfaceRect.top, bottom: surfaceRect.bottom, height: surfaceRect.height } : null,
        header: headerRect ? { top: headerRect.top, bottom: headerRect.bottom, height: headerRect.height } : null,
        nav: navRect ? { top: navRect.top, bottom: navRect.bottom, height: navRect.height } : null,
        content: contentRect ? { top: contentRect.top, bottom: contentRect.bottom, height: contentRect.height } : null
      }
    })()
  `)

  console.log('Layout measurements:', JSON.stringify(layout, null, 2))

  // Assertions:
  // 1. Navigation is present
  const hasNav = Boolean(layout.nav)
  // 2. Navigation sits below header
  const isBelowHeader = layout.nav && layout.header ? layout.nav.top >= layout.header.bottom - 2 : false
  // 3. Navigation sits above content area
  const isAboveContent = layout.nav && layout.content ? layout.nav.bottom <= layout.content.top + 2 : false
  // 4. Navigation is near the top of the surface, not at the bottom
  const isNearTop = layout.nav && layout.surface ? (layout.nav.top - layout.surface.top) < 100 : false

  console.log('\n--- VERIFICATION CHECKS ---')
  console.log(`1. Navigation bar exists: ${hasNav ? 'PASSED' : 'FAILED'}`)
  console.log(`2. Navigation bar is below header: ${isBelowHeader ? 'PASSED' : 'FAILED'} (Header bottom: ${layout.header?.bottom}, Nav top: ${layout.nav?.top})`)
  console.log(`3. Navigation bar is above content area: ${isAboveContent ? 'PASSED' : 'FAILED'} (Nav bottom: ${layout.nav?.bottom}, Content top: ${layout.content?.top})`)
  console.log(`4. Navigation bar is in top section of panel: ${isNearTop ? 'PASSED' : 'FAILED'} (Offset from surface top: ${layout.nav ? layout.nav.top - layout.surface.top : 'N/A'}px)`)

  // Test scrolling content to ensure Nav bar stays fixed at the top
  const scrollTest = await win.webContents.executeJavaScript(`
    (() => {
      const contentArea = document.querySelector('.island-content-area')
      const navWrap = document.querySelector('.nav-seg-wrap')
      if (!contentArea || !navWrap) return { scrolled: false }

      const navTopBefore = navWrap.getBoundingClientRect().top
      contentArea.scrollTop = 100
      const navTopAfter = navWrap.getBoundingClientRect().top

      return {
        scrolled: contentArea.scrollTop > 0,
        navStayedFixed: Math.abs(navTopBefore - navTopAfter) < 1,
        scrollTop: contentArea.scrollTop
      }
    })()
  `)
  console.log(`5. Content scrolls independently while Nav stays fixed: ${scrollTest.navStayedFixed ? 'PASSED' : 'FAILED'}`)

  // Capture screenshot of expanded island with navigation in restored position
  const image = await win.capturePage()
  const screenshotPath = join(outDir, '01_restored_navigation_position.png')
  writeFileSync(screenshotPath, image.toPNG())
  console.log(`\nScreenshot saved to: ${screenshotPath}`)

  const allPassed = hasNav && isBelowHeader && isAboveContent && isNearTop && scrollTest.navStayedFixed
  console.log(`\nOVERALL VERIFICATION: ${allPassed ? 'ALL CHECKS PASSED!' : 'FAILED'}`)

  win.close()
  app.quit()
})
