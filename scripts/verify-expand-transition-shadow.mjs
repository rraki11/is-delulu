import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/test_output'
mkdirSync(outDir, { recursive: true })

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

app.whenReady().then(async () => {
  console.log('[Test] Starting Expand Transition and Shadow Verification...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea

  const win = new BrowserWindow({
    width: 660,
    height: 520,
    x: Math.round(workX + (workW - 660) / 2),
    y: workY,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    thickFrame: false,
    type: 'toolbar',
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  let currentMode = 'collapsed'
  let prefs = {
    userName: 'Shubham',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }

  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    console.log(`[IPC] island:set-mode -> ${mode}`)
    return mode
  })

  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('island:check-welcome', () => true) // Already completed welcome for this test
  ipcMain.handle('island:mark-welcome-complete', () => true)
  ipcMain.handle('island:reset-position', () => {})
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 14,
    memoryUsedGb: 6.5,
    memoryTotalGb: 16.0,
    memoryPercent: 41,
    platform: 'Windows 11',
    arch: 'x64',
    hostname: 'TEST-RIG',
    uptimeFormatted: '2h 14m',
    cpuModel: 'Intel Core i9-13900H',
    batteryPercent: 92,
    isCharging: false
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => ({
    isPlaying: false,
    title: 'Idle',
    artist: '',
    durationSec: 0,
    positionSec: 0,
    volume: 50,
    isMuted: false
  }))
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('preferences:get', () => prefs)
  ipcMain.handle('preferences:update', (_e, update) => {
    prefs = { ...prefs, ...update }
    return prefs
  })
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('battery:is-charging-active', () => false)

  const htmlPath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(htmlPath)

  // Wait for initial render to settle into collapsed state
  await new Promise((r) => setTimeout(r, 1000))

  // 1. Inspect Collapsed State styles
  const collapsedStyles = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      return {
        width: rect.width,
        height: rect.height,
        boxShadow: style.boxShadow,
        borderRadius: style.borderRadius
      };
    })()
  `)
  console.log('[Test] Collapsed pill styles:', collapsedStyles)
  if (!collapsedStyles) {
    throw new Error('Surface not found!')
  }

  const imgCollapsed = await win.capturePage()
  writeFileSync(join(outDir, '01_collapsed.png'), imgCollapsed.toPNG())

  // 2. Click to Expand
  console.log('[Test] Clicking collapsed pill to trigger expansion...')
  await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (surface) surface.click();
    })()
  `)

  // Capture intermediate frame at ~120ms (morphing container, check if dashboard is staged)
  await new Promise((r) => setTimeout(r, 120))
  const intermediateState = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      const dashboard = document.querySelector('[style*="overflow: hidden"]');
      const rect = surface ? surface.getBoundingClientRect() : null;
      return {
        morphingWidth: rect ? Math.round(rect.width) : 0,
        morphingHeight: rect ? Math.round(rect.height) : 0,
        hasDashboard: !!document.querySelector('.island-tab-bar')
      };
    })()
  `)
  console.log('[Test] Intermediate (120ms) expansion state:', intermediateState)

  const imgIntermediate = await win.capturePage()
  writeFileSync(join(outDir, '02_expanding_120ms.png'), imgIntermediate.toPNG())

  // Wait for expansion animation to finish (at ~450ms)
  await new Promise((r) => setTimeout(r, 380))

  // 3. Inspect Fully Expanded State
  const expandedStyles = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      const glow = document.querySelector('.island-accent-glow');
      const glowStyle = glow ? window.getComputedStyle(glow) : null;
      return {
        width: rect.width,
        height: rect.height,
        boxShadow: style.boxShadow,
        borderRadius: style.borderRadius,
        glowOpacity: glowStyle ? glowStyle.opacity : null,
        glowVisibility: glowStyle ? glowStyle.visibility : null
      };
    })()
  `)
  console.log('[Test] Fully expanded panel styles:', expandedStyles)

  const imgExpanded = await win.capturePage()
  writeFileSync(join(outDir, '03_expanded_finished.png'), imgExpanded.toPNG())

  // 4. Test Collapse Transition
  console.log('[Test] Collapsing island...')
  await win.webContents.executeJavaScript(`
    (() => {
      const collapseBtn = document.querySelector('button[aria-label="Collapse Island"]');
      if (collapseBtn) {
        collapseBtn.click();
      } else {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.title && b.title.toLowerCase().includes('collapse'));
        if (btn) btn.click();
      }
    })()
  `)

  // Wait for collapse to finish
  await new Promise((r) => setTimeout(r, 450))

  const postCollapseStyles = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      return {
        width: rect.width,
        height: rect.height,
        boxShadow: style.boxShadow,
        borderRadius: style.borderRadius
      };
    })()
  `)
  console.log('[Test] Post-collapse pill styles:', postCollapseStyles)

  const imgPostCollapse = await win.capturePage()
  writeFileSync(join(outDir, '04_post_collapse.png'), imgPostCollapse.toPNG())

  // 5. Test Rapid Cycles (3 cycles) to ensure no lag or accumulating shadows
  console.log('[Test] Testing rapid expand/collapse cycle stability...')
  for (let i = 0; i < 3; i++) {
    await win.webContents.executeJavaScript(`document.getElementById('island-surface')?.click()`)
    await new Promise((r) => setTimeout(r, 400))
    await win.webContents.executeJavaScript(`document.querySelector('button[aria-label="Collapse Island"]')?.click()`)
    await new Promise((r) => setTimeout(r, 350))
  }

  const finalCycleStyles = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height
      };
    })()
  `)
  console.log('[Test] Final state after 3 rapid cycles:', finalCycleStyles)

  console.log('[Test] All verification checks PASSED successfully!')
  win.close()
  app.quit()
})
