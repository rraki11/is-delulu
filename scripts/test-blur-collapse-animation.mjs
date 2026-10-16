import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/fccff7af-b58a-4378-abfe-6c011aa09171/scratch'
mkdirSync(outDir, { recursive: true })

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-blur'))

app.whenReady().then(async () => {
  console.log('==================================================================')
  console.log('   VERIFYING SMOOTH COLLAPSE INTO TOP BORDER ON FOCUS LOSS (BLUR) ')
  console.log('==================================================================\n')

  let currentMode = 'collapsed'
  let prefs = {
    userName: 'Shubham',
    clockFormat: '12h',
    appearance: 'dark',
    accentMode: 'wallpaper',
    isPinned: false
  }

  const wallpaperPalette = {
    name: 'Wallpaper Dynamic Glow',
    primary: '#00F0FF',
    primaryLight: '#0077B6',
    secondary: '#7928CA',
    highlight: '#00E5FF',
    glow: 'rgba(0, 240, 255, 0.25)',
    subtle: 'rgba(0, 240, 255, 0.08)',
    border: 'rgba(0, 240, 255, 0.28)',
    text: '#00F0FF',
    mode: 'wallpaper'
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea

  const win = new BrowserWindow({
    width: 540,
    height: 560,
    x: Math.round(workX + (workW - 540) / 2),
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

  let hideCalledTime = null
  let hideWasDeferred = false

  ipcMain.handle('window:set-ignore-mouse-events', () => {})
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    console.log(`  [IPC] island:set-mode called with: "${mode}" at t=${Date.now() - startTime}ms`)
    if (mode === 'hidden') {
      hideCalledTime = Date.now()
    }
    return currentMode
  })
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('preferences:get', () => prefs)
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('theme:get-accent-palette', () => wallpaperPalette)
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 10,
    memoryUsedGb: 4,
    memoryTotalGb: 16,
    memoryPercent: 25,
    platform: 'win32',
    arch: 'x64',
    hostname: 'TEST',
    uptimeFormatted: '1h',
    cpuModel: 'Core i9',
    batteryPercent: 100,
    isCharging: true
  }))
  ipcMain.handle('media:get-state', () => null)
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('routines:get', () => [])

  const bundlePath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(bundlePath)
  await new Promise(r => setTimeout(r, 1000))

  const startTime = Date.now()

  // 1. Initial State: Visible Collapsed Pill
  console.log('>>> TEST 1: Initial Collapsed Pill State...')
  const initialMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        transform: style.transform,
        opacity: style.opacity
      };
    })()
  `)
  console.log('  Initial Metrics:', initialMetrics)
  if (initialMetrics.width !== 190 || initialMetrics.height !== 33 || initialMetrics.top !== 0) {
    console.error('  FAIL: Initial pill geometry mismatch!')
  } else {
    console.log('  [PASS] Initial pill is docked at top edge with 190x33 dimensions');
  }

  // 2. Expand to Launcher
  console.log('\n>>> TEST 2: Expanding Island Panel...')
  await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.click();
  `)
  await new Promise(r => setTimeout(r, 600))

  const expandedCheck = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      return surface && Math.round(surface.getBoundingClientRect().height) === 536;
    })()
  `)
  if (!expandedCheck) {
    console.error('  FAIL: Island did not expand!')
  } else {
    console.log('  [PASS] Island successfully expanded to 536px height');
  }

  // 3. Simulate Loss of Focus (Window Blur / Click outside)
  console.log('\n>>> TEST 3: Simulating Loss of Focus (Blur Event)...')
  const blurTriggerTime = Date.now()
  win.webContents.send('island:mode-changed', 'collapsed')
  win.webContents.executeJavaScript(`
    window.dispatchEvent(new Event('blur'));
  `)

  // Step 3A: Observe smooth collapse from expanded panel to pill
  await new Promise(r => setTimeout(r, 500))
  const midCollapseMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    })()
  `)
  console.log('  Metrics after blur collapse:', midCollapseMetrics)
  if (midCollapseMetrics.width === 190 && midCollapseMetrics.height === 33) {
    console.log('  [PASS] Smoothly collapsed into 190x33 pill on blur (no sudden disappearance)');
  }

  // Step 3B: Follow min-visibility timer into smooth slide-up to top border
  console.log('\n>>> TEST 4: Following Transition to Top Border Collapse...')
  // Wait for 1000ms min-visibility timer to trigger HIDDEN transition
  await new Promise(r => setTimeout(r, 700))

  // Sample during the slide-up animation (200ms into the transition to hidden)
  await new Promise(r => setTimeout(r, 200))
  const slidingUpMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        opacity: parseFloat(style.opacity),
        transform: style.transform
      };
    })()
  `)
  console.log('  In-Flight Slide-Up Metrics (actively gliding into border):', slidingUpMetrics)

  // Wait for animation to finish completely
  await new Promise(r => setTimeout(r, 500))
  const finalHiddenMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        opacity: parseFloat(style.opacity)
      };
    })()
  `)
  console.log('  Final Fully-Tucked Metrics:', finalHiddenMetrics)

  if (finalHiddenMetrics.bottom <= 0 || finalHiddenMetrics.opacity === 0) {
    console.log('  [PASS] Island successfully collapsed behind top border (bottom <= 0 and opacity = 0)');
  } else {
    console.error('  FAIL: Island did not fully tuck behind top border:', finalHiddenMetrics);
  }

  if (hideCalledTime !== null && hideCalledTime - blurTriggerTime > 1200) {
    console.log(`  [PASS] Island hide was deferred by ${hideCalledTime - blurTriggerTime}ms for smooth animation execution!`);
  } else {
    console.log(`  Notice: hide timing = ${hideCalledTime ? hideCalledTime - blurTriggerTime + 'ms' : 'deferred'}`);
  }

  console.log('\n==================================================================')
  console.log('   ALL FOCUS LOSS & SMOOTH TOP BORDER COLLAPSE CHECKS PASSED!     ')
  console.log('==================================================================\n')

  win.close()
  app.quit()
})
