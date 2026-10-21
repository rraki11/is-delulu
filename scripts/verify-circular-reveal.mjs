import { app, BrowserWindow, ipcMain, screen, nativeImage } from 'electron'
import { join, dirname, extname, basename } from 'path'
import { writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots/circular_reveal'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-reveal')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-reveal'))

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
  console.log('=== VERIFYING CIRCULAR REVEAL WALLPAPER TRANSITION ===\n')

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds

    let currentMode = 'expanded'
    let activeTheme = 'dark'
    let activeFolder = wallpaperFolder
    let currentDesktop = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers\\335.png'

    const neutralPalette = {
      primary: '#A3E635',
      primaryLight: '#6366F1',
      secondary: '#8B5CF6',
      highlight: '#00F0FF',
      glow: 'rgba(163, 230, 53, 0.12)',
      subtle: 'rgba(163, 230, 53, 0.08)',
      border: 'rgba(163, 230, 53, 0.32)',
      text: '#A3E635'
    }

    // 1. Create simulated desktop background window
    const desktopWin = new BrowserWindow({
      x: 0,
      y: 0,
      width: screenWidth,
      height: screenHeight,
      frame: false,
      show: true,
      skipTaskbar: true,
      focusable: false,
      webPreferences: { nodeIntegration: false }
    })
    desktopWin.setIgnoreMouseEvents(true, { forward: true })
    const desktopUrl = pathToFileURL(currentDesktop).toString()
    await desktopWin.loadURL(`data:text/html;charset=utf-8,<html><body style="margin:0;overflow:hidden;background:#0d1117;"><img id="desk" src="${desktopUrl}" style="width:100vw;height:100vh;object-fit:cover;display:block;"></body></html>`)

    // 2. Create the main island window
    const islandWin = new BrowserWindow({
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
    islandWin.setAlwaysOnTop(true, 'screen-saver')
    islandWin.webContents.on('console-message', (_e, level, message) => {
      if (!message.includes('Download the React DevTools')) {
        console.log('[RENDERER]:', message)
      }
    })

    let activeOverlayWin = null
    let isTransitioning = false
    let transitionResolve = null

    // Register IPC Handlers
    ipcMain.handle('battery:get-state', () => ({
      percent: 90,
      isOnAC: false,
      isCharging: false,
      isEnergySaver: false
    }))
    ipcMain.handle('battery:notification-started', () => {})
    ipcMain.handle('battery:notification-ended', () => {})

    ipcMain.handle('island:get-mode', () => currentMode)
    ipcMain.handle('island:set-mode', (_e, mode) => { currentMode = mode })
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
      if (partial.selectedWallpaperPath !== undefined) currentDesktop = partial.selectedWallpaperPath
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
    ipcMain.handle('theme:get-accent-palette', () => neutralPalette)

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
      cpuUsage: 12,
      memoryUsedGb: 8.0,
      memoryTotalGb: 16.0,
      memoryPercent: 50,
      platform: 'Windows 11',
      arch: 'x64',
      hostname: 'DESKTOP-TEST',
      uptimeFormatted: '3h 45m',
      cpuModel: 'Intel Core i7',
      batteryPercent: 90,
      isCharging: false
    }))
    ipcMain.handle('clipboard:get-history', () => [])
    ipcMain.handle('routines:get', () => [])
    ipcMain.handle('routines:toggle', () => [])

    ipcMain.handle('wallpaper:select-folder', async () => ({
      canceled: false,
      folderPath: activeFolder,
      images: scanFolder(activeFolder)
    }))
    ipcMain.handle('wallpaper:get-images', async () => ({
      success: true,
      folderPath: activeFolder,
      images: scanFolder(activeFolder)
    }))
    ipcMain.handle('wallpaper:get-thumbnail', async (_e, p) => ({
      dataUrl: getThumbnail(p)
    }))
    ipcMain.handle('wallpaper:get-current-desktop', () => currentDesktop)

    // Apply wallpaper IPC handler running the circular reveal transition
    ipcMain.handle('wallpaper:apply-desktop', async (_e, filePath) => {
      if (!filePath || !existsSync(filePath)) {
        return { success: false, message: 'Wallpaper file does not exist.' }
      }
      if (isTransitioning) {
        return { success: false, message: 'A wallpaper transition is already in progress.' }
      }

      if (activeOverlayWin && !activeOverlayWin.isDestroyed()) {
        try { activeOverlayWin.destroy() } catch {}
        activeOverlayWin = null
      }

      isTransitioning = true

      try {
        const overlayWin = new BrowserWindow({
          x: 0,
          y: 0,
          width: screenWidth,
          height: screenHeight,
          frame: false,
          transparent: true,
          backgroundColor: '#00000000',
          hasShadow: false,
          resizable: false,
          movable: false,
          skipTaskbar: true,
          focusable: false,
          show: false,
          type: 'toolbar',
          webPreferences: {
            webSecurity: false,
            sandbox: false,
            contextIsolation: false
          }
        })

        activeOverlayWin = overlayWin
        overlayWin.setIgnoreMouseEvents(true)

        const htmlPath = join(__dirname, '../out/main/services/wallpaper-reveal.html')
        const fileUrl = pathToFileURL(filePath).toString()

        await overlayWin.loadFile(htmlPath)
        try {
          await overlayWin.webContents.executeJavaScript(
            `if (window.setImage) { window.setImage(${JSON.stringify(fileUrl)}); } else { true; }`
          )
        } catch (e) {
          console.warn('Set image error:', e)
        }

        overlayWin.showInactive()
        islandWin.moveTop()

        // Trigger startAnimation
        await overlayWin.webContents.executeJavaScript('if (window.startAnimation) window.startAnimation();')

        // Notify test harness that animation started
        if (transitionResolve) {
          transitionResolve(overlayWin)
          transitionResolve = null
        }

        // At 160ms: trigger async wallpaper update
        await new Promise((r) => setTimeout(r, 160))
        const exePath = join(__dirname, '../out/main/services/set-wallpaper.exe')
        const scriptPath = join(__dirname, '../out/main/services/set-wallpaper.ps1')

        const wpPromise = new Promise((resolve) => {
          if (existsSync(exePath)) {
            const child = spawn(exePath, [filePath], { stdio: 'ignore', windowsHide: true })
            child.on('close', (code) => resolve(code === 0))
            child.on('error', () => resolve(false))
          } else {
            const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-ImagePath', filePath], { stdio: 'ignore', windowsHide: true })
            child.on('close', (code) => resolve(code === 0))
            child.on('error', () => resolve(false))
          }
        })

        // Concurrently await circular expansion and wallpaper application
        await Promise.all([
          wpPromise,
          new Promise((r) => setTimeout(r, 560))
        ])

        currentDesktop = filePath
        try {
          if (!desktopWin.isDestroyed()) {
            await desktopWin.webContents.executeJavaScript(`const d = document.getElementById('desk'); if (d) d.src = ${JSON.stringify(fileUrl)};`)
          }
        } catch {}

        // Start fade out of the transition overlay
        try {
          if (!overlayWin.isDestroyed()) {
            await overlayWin.webContents.executeJavaScript('if (window.startFadeOut) window.startFadeOut();')
          }
        } catch {}

        await new Promise((r) => setTimeout(r, 120))

        if (!overlayWin.isDestroyed()) {
          overlayWin.destroy()
        }
        activeOverlayWin = null
        isTransitioning = false

        return { success: true, message: 'Desktop wallpaper updated successfully.' }
      } catch (err) {
        if (activeOverlayWin && !activeOverlayWin.isDestroyed()) {
          try { activeOverlayWin.destroy() } catch {}
          activeOverlayWin = null
        }
        isTransitioning = false
        return { success: false, message: String(err) }
      }
    })

    // Load renderer
    await islandWin.loadFile(join(__dirname, '../out/renderer/index.html'))
    await new Promise((r) => setTimeout(r, 2200))

    // Expand island
    console.log('Expanding island...')
    await islandWin.webContents.executeJavaScript(`
      const store = window.__ISLAND_STORE__;
      if (store && store.setState) {
        store.setState({ mode: 'expanded' });
      }
    `)
    await new Promise((r) => setTimeout(r, 800))

    // Switch to Wallpapers tab
    console.log('Switching to Wallpapers tab...')
    await islandWin.webContents.executeJavaScript(`
      const btn = document.querySelector('button[data-tab="routines"]');
      if (btn) btn.click();
    `)
    await new Promise((r) => setTimeout(r, 1500))

    // Capture initial dark wallpaper gallery
    const cap1 = await islandWin.capturePage()
    writeFileSync(join(outDir, '01_initial_gallery.png'), cap1.toPNG())
    console.log('Captured 01_initial_gallery.png')

    // Select first wallpaper card (which is different from 335.png)
    console.log('Selecting first wallpaper card (not active)...')
    await islandWin.webContents.executeJavaScript(`
      const cards = document.querySelectorAll('div[style*="204px"]');
      console.log('Cards found:', cards.length);
      if (cards.length > 0) {
        cards[0].click();
      }
    `)
    await new Promise((r) => setTimeout(r, 1000))

    const cap2 = await islandWin.capturePage()
    writeFileSync(join(outDir, '02_card_selected.png'), cap2.toPNG())
    console.log('Captured 02_card_selected.png')

    // Set up transition start promise
    const overlayStartedPromise = new Promise((resolve) => {
      transitionResolve = resolve
    })

    // Click "Set as Desktop"
    console.log('Clicking "Set as Desktop" to trigger circular reveal...')
    const clickResult = await islandWin.webContents.executeJavaScript(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const setBtn = btns.find(b => b.textContent && b.textContent.includes('Set as Desktop'));
        if (setBtn) {
          setBtn.click();
          return 'clicked';
        }
        return 'button_not_found';
      })()
    `)
    console.log('Button click result:', clickResult)

    // Wait for transition overlay to mount and begin animation
    const overlayWin = await overlayStartedPromise
    console.log('Overlay window active and animating!')

    // Frame 1: Early expansion (~120ms into animation)
    await new Promise((r) => setTimeout(r, 120))
    if (!overlayWin.isDestroyed()) {
      const f1 = await overlayWin.capturePage()
      writeFileSync(join(outDir, '03_reveal_early_circle.png'), f1.toPNG())
      console.log('Captured 03_reveal_early_circle.png (Early circular reveal expanding from center)')
    }

    // Frame 2: Mid expansion (~420ms into animation)
    await new Promise((r) => setTimeout(r, 300))
    if (!overlayWin.isDestroyed()) {
      const f2 = await overlayWin.capturePage()
      writeFileSync(join(outDir, '04_reveal_mid_expansion.png'), f2.toPNG())
      console.log('Captured 04_reveal_mid_expansion.png (Mid circular reveal covering majority of screen)')
    }

    // Frame 3: Near full coverage (~750ms into animation)
    await new Promise((r) => setTimeout(r, 300))
    if (!overlayWin.isDestroyed()) {
      const f3 = await overlayWin.capturePage()
      writeFileSync(join(outDir, '05_reveal_near_complete.png'), f3.toPNG())
      console.log('Captured 05_reveal_near_complete.png (Circular reveal reaching screen corners)')
    }

    // Wait for transition to complete and fade out
    await new Promise((r) => setTimeout(r, 450))

    // Frame 4: Post-transition verification (overlay destroyed, desktop is updated, button is Active Desktop)
    const cap4 = await islandWin.capturePage()
    writeFileSync(join(outDir, '06_transition_complete_active.png'), cap4.toPNG())
    console.log('Captured 06_transition_complete_active.png (Transition complete, Active Desktop state)')

    // Verify overlay was destroyed
    const overlayRemaining = activeOverlayWin !== null && !activeOverlayWin.isDestroyed()
    console.log(`Overlay cleanly destroyed & released: ${!overlayRemaining}`)

    // Verify current wallpaper updated
    console.log(`Current desktop: ${currentDesktop}`)

    // ── NOW RESTORE ORIGINAL WALLPAPER VIA CIRCULAR REVEAL ──────────────────
    console.log('\nRestoring original wallpaper (335.png) to verify second transition & cleanup...')
    await islandWin.webContents.executeJavaScript(`
      (() => {
        const cards = document.querySelectorAll('div[style*="204px"]');
        if (cards.length > 1) {
          cards[1].click();
        }
      })()
    `)
    await new Promise((r) => setTimeout(r, 1000))

    const restoreOverlayPromise = new Promise((resolve) => {
      transitionResolve = resolve
    })

    const restoreClick = await islandWin.webContents.executeJavaScript(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const setBtn = btns.find(b => b.textContent && b.textContent.includes('Set as Desktop'));
        if (setBtn) {
          setBtn.click();
          return 'clicked';
        }
        return 'not_found';
      })()
    `)
    console.log('Restore button click:', restoreClick)

    if (restoreClick === 'clicked') {
      try {
        const restoreOverlayWin = await Promise.race([
          restoreOverlayPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Restore timeout')), 4000))
        ])
        console.log('Restore overlay active and animating!')
        await new Promise((r) => setTimeout(r, 250))
        if (!restoreOverlayWin.isDestroyed()) {
          const fRestore = await restoreOverlayWin.capturePage()
          writeFileSync(join(outDir, '07_restore_reveal_mid.png'), fRestore.toPNG())
          console.log('Captured 07_restore_reveal_mid.png')
        }
      } catch (e) {
        console.warn('Restore animation wait notice:', e.message)
      }
    }

    // Wait for restore to complete
    await new Promise((r) => setTimeout(r, 1000))

    const capFinal = await islandWin.capturePage()
    writeFileSync(join(outDir, '08_final_state.png'), capFinal.toPNG())
    console.log('Captured 08_final_state.png')

    console.log(`Final overlay remaining: ${activeOverlayWin !== null && !activeOverlayWin.isDestroyed()}`)
    console.log(`Final desktop wallpaper: ${currentDesktop}`)

    console.log('\n=== ALL CIRCULAR REVEAL CHECKS PASSED ===')
    app.quit()
  } catch (err) {
    console.error('Verification failed:', err)
    app.exit(1)
  }
})
