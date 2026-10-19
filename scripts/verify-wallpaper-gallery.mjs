import { app, BrowserWindow, ipcMain, screen, nativeImage } from 'electron'
import { join, dirname, extname, basename } from 'path'
import { writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots/wallpaper_gallery'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-wallpapers')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-wallpapers'))

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.avif'])
const wallpaperFolder = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers'
const thumbCache = new Map()

function scanFolder(folder) {
  if (!folder || !existsSync(folder)) return []
  try {
    const entries = readdirSync(folder, { withFileTypes: true })
    const items = []
    for (const e of entries) {
      if (!e.isFile()) continue
      const ext = extname(e.name).toLowerCase()
      if (!SUPPORTED_EXTS.has(ext)) continue
      const p = join(folder, e.name)
      try {
        const st = statSync(p)
        if (st.size <= 0) continue
        items.push({
          id: `${p}:${st.mtimeMs}`,
          name: basename(e.name, ext),
          fileName: e.name,
          filePath: p,
          fileSize: st.size,
          modifiedTime: st.mtimeMs
        })
      } catch {}
    }
    items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    return items
  } catch (err) {
    return []
  }
}

function getThumbnail(filePath) {
  if (!filePath || !existsSync(filePath)) return null
  try {
    const ext = extname(filePath).toLowerCase()
    if (!SUPPORTED_EXTS.has(ext)) return null
    const st = statSync(filePath)
    const key = `${filePath}:${st.mtimeMs}`
    if (thumbCache.has(key)) return thumbCache.get(key)

    const img = nativeImage.createFromPath(filePath)
    if (img.isEmpty()) return null
    const sz = img.getSize()
    if (!sz.width || !sz.height) return null

    const scale = Math.min(360 / sz.width, 225 / sz.height, 1)
    const w = Math.max(1, Math.round(sz.width * scale))
    const h = Math.max(1, Math.round(sz.height * scale))
    const thumb = img.resize({ width: w, height: h, quality: 'good' })
    const dataUrl = thumb.toDataURL()
    thumbCache.set(key, dataUrl)
    return dataUrl
  } catch (err) {
    return null
  }
}

app.whenReady().then(async () => {
  console.log('=== VERIFYING WALLPAPER GALLERY SECTION & INTERACTIONS ===\n')

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize

    let currentMode = 'expanded'
    let activeTheme = 'dark'
    let activeFolder = wallpaperFolder
    let currentDesktop = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers\\zenitsu-agatsuma-3840x2160-24356.jpg'

    const neutralCharcoalPalette = {
      primary: '#A3E635',
      primaryLight: '#6366F1',
      secondary: '#8B5CF6',
      highlight: '#00F0FF',
      glow: 'rgba(163, 230, 53, 0.12)',
      subtle: 'rgba(163, 230, 53, 0.08)',
      border: 'rgba(163, 230, 53, 0.32)',
      text: '#A3E635'
    }

    // Background window simulating desktop
    const bgWin = new BrowserWindow({
      width: 760,
      height: 580,
      x: Math.round((screenWidth - 760) / 2),
      y: 0,
      frame: false,
      show: true,
      skipTaskbar: true
    })

    const setBgTheme = (theme) => {
      const bg = theme === 'dark' ? '#121314' : '#E2E8F0'
      bgWin.loadURL(`data:text/html,<html><body style="margin:0;background:${bg};"></body></html>`)
    }
    setBgTheme('dark')

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

    // Register IPC Handlers
    ipcMain.handle('battery:get-state', () => ({
      percent: 90,
      isOnAC: false,
      isCharging: false,
      isEnergySaver: false
    }))
    ipcMain.handle('island:get-mode', () => currentMode)
    ipcMain.handle('island:set-mode', (_e, mode) => {
      currentMode = mode
    })
    ipcMain.handle('island:get-welcome-shown', () => true)
    ipcMain.handle('island:check-welcome', () => ({ shouldWelcome: false }))
    ipcMain.handle('island:mark-welcome-shown', () => {})
    ipcMain.handle('island:reset-position', () => {})
    ipcMain.handle('window:set-ignore-mouse-events', () => {})

    ipcMain.handle('preferences:get', () => ({
      userName: 'Shubham',
      clockFormat: '12h',
      appearance: activeTheme,
      isPinned: false,
      accentMode: 'wallpaper',
      manualAccentColor: '#8B5CF6',
      wallpaperFolderPath: activeFolder,
      selectedWallpaperPath: currentDesktop
    }))
    ipcMain.handle('preferences:update', (_e, partial) => {
      if (partial.wallpaperFolderPath !== undefined) activeFolder = partial.wallpaperFolderPath
      return {
        userName: 'Shubham',
        clockFormat: '12h',
        appearance: activeTheme,
        isPinned: false,
        accentMode: 'wallpaper',
        manualAccentColor: '#8B5CF6',
        wallpaperFolderPath: activeFolder,
        selectedWallpaperPath: currentDesktop,
        ...partial
      }
    })
    ipcMain.handle('theme:get-resolved', () => activeTheme)
    ipcMain.handle('theme:get-accent-palette', () => neutralCharcoalPalette)

    ipcMain.handle('media:get-state', () => ({
      sessions: [],
      currentSession: null,
      primarySession: null,
      activeSessions: [],
      activeCount: 0,
      isPlaying: false,
      title: '',
      artist: '',
      volume: 50,
      isMuted: false
    }))
    ipcMain.handle('system:get-stats', () => ({
      cpuUsage: 14,
      memoryUsedGb: 8.2,
      memoryTotalGb: 16.0,
      memoryPercent: 51,
      platform: 'Windows 11 Pro',
      arch: 'x64',
      hostname: 'DESKTOP-TEST',
      uptimeFormatted: '4h 12m',
      cpuModel: 'Intel Core i7-13700H',
      batteryPercent: 90,
      isCharging: false
    }))
    ipcMain.handle('clipboard:get-history', () => [])
    ipcMain.handle('routines:get', () => [])
    ipcMain.handle('routines:toggle', () => [])

    // Wallpaper Gallery Handlers
    ipcMain.handle('wallpaper:select-folder', async () => {
      const images = scanFolder(activeFolder)
      return {
        canceled: false,
        folderPath: activeFolder,
        images
      }
    })

    ipcMain.handle('wallpaper:get-images', async (_e, folderPath) => {
      const target = folderPath || activeFolder
      if (!target || !existsSync(target)) {
        return { success: false, folderPath: target, images: [], error: 'Folder not found' }
      }
      const images = scanFolder(target)
      return { success: true, folderPath: target, images }
    })

    ipcMain.handle('wallpaper:get-thumbnail', async (_e, filePath) => {
      const dataUrl = getThumbnail(filePath)
      return { dataUrl }
    })

    ipcMain.handle('wallpaper:apply-desktop', async (_e, filePath) => {
      currentDesktop = filePath
      return { success: true, message: 'Wallpaper applied successfully' }
    })

    ipcMain.handle('wallpaper:get-current-desktop', () => {
      return currentDesktop
    })

    // Load built renderer
    await win.loadFile(join(__dirname, '../out/renderer/index.html'))

    // Wait for initial render
    await new Promise((r) => setTimeout(r, 2200))

    // Expand island
    console.log('Expanding island...')
    await win.webContents.executeJavaScript(`
      const store = window.__ISLAND_STORE__;
      if (store && store.setState) {
        store.setState({ mode: 'expanded' });
      }
    `)
    await new Promise((r) => setTimeout(r, 800))

    // ── 1. Switch to Wallpapers Tab (tab id: 'routines') ──────────────────────
    console.log('1. Switching to Wallpapers tab...')
    await win.webContents.executeJavaScript(`
      const btn = document.querySelector('button[data-tab="routines"]');
      if (btn) btn.click();
    `)
    await new Promise((r) => setTimeout(r, 1600))

    // Capture initial dark wallpaper gallery
    const img1 = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '01_wallpaper_gallery_dark.png'), img1.toPNG())
    console.log('Saved 01_wallpaper_gallery_dark.png')

    // ── 2. Select the second wallpaper card ──────────────────────────────────
    console.log('2. Selecting second wallpaper card...')
    await win.webContents.executeJavaScript(`
      const cards = document.querySelectorAll('div[style*="204px"]');
      console.log('Found cards:', cards.length);
      if (cards.length > 1) {
        cards[1].click();
      }
    `)
    await new Promise((r) => setTimeout(r, 800))

    const img2 = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '02_wallpaper_selected_card.png'), img2.toPNG())
    console.log('Saved 02_wallpaper_selected_card.png')

    // ── 3. Test horizontal scroll ───────────────────────────────────────────
    console.log('3. Scrolling horizontal wallpaper cards...')
    await win.webContents.executeJavaScript(`
      const scrollTrack = document.querySelector('div[style*="scroll-snap-type"], div[style*="scrollSnapType"]');
      if (scrollTrack) {
        scrollTrack.scrollLeft = 380;
      }
    `)
    await new Promise((r) => setTimeout(r, 800))

    const img3 = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '03_wallpaper_scrolled_cards.png'), img3.toPNG())
    console.log('Saved 03_wallpaper_scrolled_cards.png')

    // ── 4. Test Light Mode ──────────────────────────────────────────────────
    console.log('4. Testing Light Mode presentation...')
    activeTheme = 'light'
    setBgTheme('light')
    win.webContents.send('theme:changed', 'light')
    await win.webContents.executeJavaScript(`
      try {
        document.documentElement.setAttribute('data-theme', 'light');
      } catch (e) {
        console.error('Light theme toggle error:', e);
      }
    `)
    await new Promise((r) => setTimeout(r, 1200))

    const img4 = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '04_wallpaper_gallery_light.png'), img4.toPNG())
    console.log('Saved 04_wallpaper_gallery_light.png')

    // ── 5. Test Empty State (no folder selected) ────────────────────────────
    console.log('5. Testing Empty State...')
    activeTheme = 'dark'
    setBgTheme('dark')
    win.webContents.send('theme:changed', 'dark')
    await win.webContents.executeJavaScript(`
      document.documentElement.setAttribute('data-theme', 'dark');
    `)
    // Send preference with empty wallpaperFolderPath
    win.webContents.send('preferences:changed', {
      userName: 'Shubham',
      clockFormat: '12h',
      appearance: 'dark',
      isPinned: false,
      accentMode: 'wallpaper',
      manualAccentColor: '#8B5CF6',
      wallpaperFolderPath: '',
      selectedWallpaperPath: ''
    })
    await new Promise((r) => setTimeout(r, 1200))

    const img5 = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '05_wallpaper_empty_state.png'), img5.toPNG())
    console.log('Saved 05_wallpaper_empty_state.png')

    // Close windows
    win.destroy()
    bgWin.destroy()

    console.log('\n=== VERIFICATION COMPLETE: ALL SCREENSHOTS CAPTURED ===')
    app.quit()
  } catch (err) {
    console.error('Verification failed with error:', err)
    app.exit(1)
  }
})
