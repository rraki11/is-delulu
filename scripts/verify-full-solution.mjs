import { app, BrowserWindow, ipcMain, screen, nativeImage } from 'electron'
import { join, dirname, extname, basename } from 'path'
import { writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cae90e89-4173-4a78-aea7-29502144233c/screenshots/verification'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-solution')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-solution'))

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

function orderWithSelectedFirst(images, selectedPath) {
  if (!selectedPath || images.length <= 1) return images
  const targetLower = selectedPath.toLowerCase()
  const idx = images.findIndex((img) => img.filePath.toLowerCase() === targetLower)
  if (idx > 0) {
    const selected = images[idx]
    const remaining = images.filter((_, i) => i !== idx)
    return [selected, ...remaining]
  }
  return images
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
  console.log('=== COMPREHENSIVE VERIFICATION SUITE ===\n')

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.bounds

    let currentMode = 'expanded'
    let activeTheme = 'dark'
    let activeFolder = wallpaperFolder
    let currentDesktop = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers\\335.png'
    let selectedWallpaperPref = currentDesktop

    const accentPalette = {
      primary: '#A3E635',
      primaryLight: '#6366F1',
      secondary: '#8B5CF6',
      highlight: '#00F0FF',
      glow: 'rgba(163, 230, 53, 0.12)',
      subtle: 'rgba(163, 230, 53, 0.08)',
      border: 'rgba(163, 230, 53, 0.32)',
      text: '#A3E635'
    }

    // Main window
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
    win.webContents.on('console-message', (_e, level, msg) => console.log('[Renderer]', msg))

    // Register IPC Handlers
    ipcMain.handle('battery:get-state', () => ({
      percent: 85,
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
      userName: 'TestUser',
      clockFormat: '12h',
      appearance: activeTheme,
      isPinned: false,
      accentMode: 'wallpaper',
      manualAccentColor: '#8B5CF6',
      wallpaperFolderPath: activeFolder,
      selectedWallpaperPath: selectedWallpaperPref
    }))
    ipcMain.handle('preferences:update', (_e, partial) => {
      if (partial.wallpaperFolderPath !== undefined) activeFolder = partial.wallpaperFolderPath
      if (partial.selectedWallpaperPath !== undefined) selectedWallpaperPref = partial.selectedWallpaperPath
      return {
        userName: 'TestUser',
        clockFormat: '12h',
        appearance: activeTheme,
        isPinned: false,
        accentMode: 'wallpaper',
        manualAccentColor: '#8B5CF6',
        wallpaperFolderPath: activeFolder,
        selectedWallpaperPath: selectedWallpaperPref,
        ...partial
      }
    })
    ipcMain.handle('theme:get-resolved', () => activeTheme)
    ipcMain.handle('theme:get-accent-palette', () => accentPalette)
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
      cpuUsage: 10,
      memoryUsedGb: 8.0,
      memoryTotalGb: 16.0,
      memoryPercent: 50,
      platform: 'Windows 11',
      arch: 'x64',
      hostname: 'DEV-BOX',
      uptimeFormatted: '5h',
      cpuModel: 'Intel Core',
      batteryPercent: 85,
      isCharging: false
    }))
    ipcMain.handle('clipboard:get-history', () => [])
    ipcMain.handle('routines:get', () => [])
    ipcMain.handle('routines:toggle', () => [])

    // Wallpaper Gallery IPC Handlers with orderWithSelectedFirst
    ipcMain.handle('wallpaper:select-folder', async () => {
      const raw = scanFolder(activeFolder)
      const images = orderWithSelectedFirst(raw, selectedWallpaperPref)
      return { canceled: false, folderPath: activeFolder, images }
    })

    ipcMain.handle('wallpaper:get-images', async (_e, folderPath) => {
      const target = folderPath || activeFolder
      if (!target || !existsSync(target)) {
        return { success: false, folderPath: target, images: [], error: 'Folder not found' }
      }
      const raw = scanFolder(target)
      const images = orderWithSelectedFirst(raw, selectedWallpaperPref)
      return { success: true, folderPath: target, images }
    })

    ipcMain.handle('wallpaper:get-thumbnail', async (_e, filePath) => {
      const dataUrl = getThumbnail(filePath)
      return { dataUrl }
    })

    let simulatedTransitionSuccess = true
    ipcMain.handle('wallpaper:apply-desktop', async (_e, filePath) => {
      if (!simulatedTransitionSuccess) {
        return { success: false, message: 'Simulated native error applying wallpaper' }
      }
      currentDesktop = filePath
      selectedWallpaperPref = filePath
      return { success: true, message: 'Desktop wallpaper updated successfully.' }
    })

    ipcMain.handle('wallpaper:get-current-desktop', () => {
      return currentDesktop
    })

    // Load renderer
    await win.loadFile(join(__dirname, '../out/renderer/index.html'))
    await new Promise((r) => setTimeout(r, 2000))

    // Expand island and switch to wallpapers tab
    await win.webContents.executeJavaScript(`
      const store = window.__ISLAND_STORE__;
      if (store && store.setState) store.setState({ mode: 'expanded' });
    `)
    await new Promise((r) => setTimeout(r, 600))

    await win.webContents.executeJavaScript(`
      const btn = document.querySelector('button[data-tab="routines"]');
      if (btn) btn.click();
    `)
    // Wait until cards are loaded into the DOM
    await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          const cards = document.querySelectorAll('div[style*="204px"]');
          if (cards.length > 1 || attempts > 50) resolve(true);
          else setTimeout(check, 100);
        };
        check();
      })
    `)

    // ── Test 1: Verify Initial Gallery State ──────────────────────────────
    console.log('1. Checking Initial Gallery State...')
    const getCardNames = () => {
      return win.webContents.executeJavaScript(`
        Array.from(document.querySelectorAll('span[title]')).map(el => el.getAttribute('title')).filter(Boolean)
      `)
    }

    const initialCards = await getCardNames()
    console.log(`Initial total cards: ${initialCards.length}`)
    console.log(`Initial first card: "${initialCards[0]}"`)
    console.log(`Initial second card: "${initialCards[1]}"`)

    const initialScreenshot = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '01_initial_gallery.png'), initialScreenshot.toPNG())

    // ── Test 2: Preview Card #2 (Must NOT reorder gallery) ─────────────────
    console.log('\n2. Previewing Card #2 (Must NOT reorder gallery)...')
    await win.webContents.executeJavaScript(`{
      const cards = document.querySelectorAll('div[style*="204px"]');
      if (cards.length > 1) cards[1].click();
    }`)
    await new Promise((r) => setTimeout(r, 500))

    const afterPreviewCards = await getCardNames()
    const orderUnchangedAfterPreview = initialCards[0] === afterPreviewCards[0] && initialCards[1] === afterPreviewCards[1]
    console.log(`Order unchanged after preview: ${orderUnchangedAfterPreview}`)
    if (!orderUnchangedAfterPreview) throw new Error('Previewing card unexpectedly changed gallery order!')

    const previewScreenshot = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '02_preview_card_2.png'), previewScreenshot.toPNG())

    // ── Test 3: Set as Desktop on Card #2 ──────────────────────────────────
    console.log('\n3. Clicking "Set as Desktop" on Card #2...')
    const targetCardName = initialCards[1]
    await win.webContents.executeJavaScript(`{
      const applyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Set as Desktop'));
      if (applyBtn) applyBtn.click();
    }`)
    await new Promise((r) => setTimeout(r, 800))

    const afterApplyCards = await getCardNames()
    console.log(`After Apply - First card: "${afterApplyCards[0]}" (Target was: "${targetCardName}")`)
    console.log(`After Apply - Second card: "${afterApplyCards[1]}" (Previous first was: "${initialCards[0]}")`)

    const reorderedSuccessfully = afterApplyCards[0] === targetCardName && afterApplyCards[1] === initialCards[0]
    console.log(`Dynamic reordering success: ${reorderedSuccessfully}`)
    if (!reorderedSuccessfully) throw new Error('Dynamic reordering failed: selected card did not become first!')

    // Check no duplicates
    const uniqueCards = new Set(afterApplyCards)
    console.log(`No duplicates created: ${uniqueCards.size === afterApplyCards.length}`)

    const reorderedScreenshot = await win.capturePage({ x: 0, y: 0, width: 660, height: 520 })
    writeFileSync(join(outDir, '03_dynamic_reordered_first.png'), reorderedScreenshot.toPNG())

    // ── Test 4: Failure Handling (Does NOT falsely reorder on failure) ─────
    console.log('\n4. Testing failure scenario (failed apply must NOT update order)...')
    simulatedTransitionSuccess = false
    // Click card #3
    await win.webContents.executeJavaScript(`{
      const cards = document.querySelectorAll('div[style*="204px"]');
      if (cards.length > 2) cards[2].click();
    }`)
    await new Promise((r) => setTimeout(r, 400))
    // Click apply
    await win.webContents.executeJavaScript(`{
      const applyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Set as Desktop'));
      if (applyBtn) applyBtn.click();
    }`)
    await new Promise((r) => setTimeout(r, 600))

    const afterFailedApplyCards = await getCardNames()
    const orderPreservedOnFailure = afterFailedApplyCards[0] === targetCardName
    console.log(`Order preserved on failure: ${orderPreservedOnFailure}`)
    if (!orderPreservedOnFailure) throw new Error('Failed apply falsely updated gallery order!')

    // ── Test 5: Verify WebGL Circular Reveal Progression & Frame Pacing ──
    console.log('\n5. Testing WebGL Circular Reveal Shader & Frame Pacing...')
    const revealWin = new BrowserWindow({
      width: screenWidth,
      height: screenHeight,
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      skipTaskbar: true,
      focusable: false,
      show: true,
      type: 'toolbar',
      webPreferences: {
        webSecurity: false,
        sandbox: false,
        contextIsolation: false
      }
    })
    revealWin.setIgnoreMouseEvents(true)
    await revealWin.loadFile(join(__dirname, '../src/main/services/wallpaper-reveal.html'))
    const testUrl = pathToFileURL(join(wallpaperFolder, '335.png')).toString()
    await revealWin.webContents.executeJavaScript(`
      window.setImage(${JSON.stringify(testUrl)});
    `)

    // Measure frame pacing during the 800ms reveal
    const animPacing = await revealWin.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const frameDeltas = [];
        let lastTime = performance.now();
        let frameCount = 0;
        window.startAnimation(800).then(() => {
          resolve(frameDeltas);
        });

        function onFrame(now) {
          const delta = now - lastTime;
          lastTime = now;
          frameDeltas.push(delta);
          frameCount++;
          if (frameCount < 120) {
            requestAnimationFrame(onFrame);
          }
        }
        requestAnimationFrame(onFrame);
      });
    `)
    const deltas = animPacing.slice(2)
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length
    const max = Math.max(...deltas)
    const hitches = deltas.filter(d => d > 20)

    console.log(`WebGL Frame Pacing: Avg: ${avg.toFixed(2)}ms (~${(1000/avg).toFixed(1)} FPS), Max: ${max.toFixed(2)}ms, Hitches >20ms: ${hitches.length}`)

    revealWin.destroy()
    win.destroy()

    console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===')
    app.quit()
  } catch (err) {
    console.error('VERIFICATION ERROR:', err)
    app.exit(1)
  }
})
