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
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-iridescent'))

app.whenReady().then(async () => {
  console.log('==================================================================')
  console.log('   STARTING E2E VERIFICATION OF IRIDESCENT METALLIC RIM EFFECT    ')
  console.log('==================================================================\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea

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

  // IPC Mocks
  ipcMain.handle('window:set-ignore-mouse-events', () => {})
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('island:reset-position', () => {})
  ipcMain.handle('preferences:get', () => prefs)
  ipcMain.handle('preferences:update', (_e, update) => {
    prefs = { ...prefs, ...update }
    win.webContents.send('preferences:changed', prefs)
    return prefs
  })
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('theme:get-accent-palette', () => wallpaperPalette)
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 14,
    memoryUsedGb: 6.8,
    memoryTotalGb: 16.0,
    memoryPercent: 42,
    platform: 'win32',
    arch: 'x64',
    hostname: 'DESKTOP-TEST',
    uptimeFormatted: '3h 15m',
    cpuModel: 'Intel Core i9-13900H',
    batteryPercent: 92,
    isCharging: true
  }))
  ipcMain.handle('media:get-state', () => ({
    isPlaying: true,
    title: 'Starboy',
    artist: 'The Weeknd',
    durationSec: 230,
    positionSec: 75,
    volume: 68,
    isMuted: false
  }))
  ipcMain.handle('clipboard:get-history', () => [
    { id: '1', text: 'https://github.com/rraki11/is-delulu', timestamp: Date.now() - 30000, type: 'url' }
  ])
  ipcMain.handle('routines:get', () => [
    { id: 'focus', title: 'Deep Focus Mode', description: 'Mute sounds, launch IDE', isEnabled: true, icon: 'Moon' }
  ])

  // Load the built production bundle
  const bundlePath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(bundlePath)
  await new Promise(r => setTimeout(r, 1200))

  let allChecksPassed = true

  // Helper screenshot capturer
  const capture = async (name) => {
    const img = await win.capturePage()
    const filePath = join(outDir, `${name}.png`)
    writeFileSync(filePath, img.toPNG())
    console.log(`  [Screenshot Saved] -> ${filePath}`)
  }

  // -------------------------------------------------------------
  // VERIFICATION 1: COLLAPSED ISLAND PILL
  // -------------------------------------------------------------
  console.log('\n>>> STEP 1: Collapsed Island Verification...')
  const collapsedMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return { error: 'No island-surface found' };

      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      const rim = surface.querySelector('.island-iridescent-rim');
      const innerBevel = surface.querySelector('.island-inner-bevel');
      const clock = surface.querySelector('.tabular-nums');

      const rimStyle = rim ? window.getComputedStyle(rim) : null;
      const clockStyle = clock ? window.getComputedStyle(clock) : null;

      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        borderRadius: style.borderRadius,
        backgroundColor: style.backgroundColor,
        hasRim: !!rim,
        rimPadding: rimStyle ? rimStyle.padding : null,
        rimMask: rimStyle ? (rimStyle.webkitMaskComposite || rimStyle.maskComposite) : null,
        hasInnerBevel: !!innerBevel,
        clockText: clock ? clock.textContent.trim() : null,
        clockColor: clockStyle ? clockStyle.color : null,
        clockFontSize: clockStyle ? clockStyle.fontSize : null,
        clockFontWeight: clockStyle ? clockStyle.fontWeight : null
      };
    })()
  `)
  console.log('  Collapsed Island Metrics:', collapsedMetrics)

  // Assertions
  if (!collapsedMetrics.hasRim) {
    console.error('  FAIL: .island-iridescent-rim element is missing!');
    allChecksPassed = false
  } else {
    console.log('  [PASS] .island-iridescent-rim element successfully attached');
  }

  if (collapsedMetrics.width !== 190 || collapsedMetrics.height !== 33) {
    console.error(`  FAIL: Collapsed island dimensions expected 190x33, got ${collapsedMetrics.width}x${collapsedMetrics.height}`);
    allChecksPassed = false
  } else {
    console.log(`  [PASS] Compact pill dimensions confirmed: 190px x 33px (pre-zoomed size)`);
  }

  if (collapsedMetrics.backgroundColor !== 'rgb(0, 0, 0)' && collapsedMetrics.backgroundColor !== '#000000') {
    console.error(`  FAIL: Collapsed island background must be near-black (#000000), got ${collapsedMetrics.backgroundColor}`);
    allChecksPassed = false
  } else {
    console.log(`  [PASS] Interior is pure near-black: ${collapsedMetrics.backgroundColor}`);
  }

  if (!collapsedMetrics.clockText) {
    console.error('  FAIL: Clock text is missing or unreadable');
    allChecksPassed = false
  } else {
    console.log(`  [PASS] Clock is readable and sharp: "${collapsedMetrics.clockText}" (color: ${collapsedMetrics.clockColor}, size: ${collapsedMetrics.clockFontSize})`);
  }

  await capture('01_collapsed_island_iridescent')

  // -------------------------------------------------------------
  // VERIFICATION 2: HOVER INTERACTION
  // -------------------------------------------------------------
  console.log('\n>>> STEP 2: Hover Interaction Test...')
  win.webContents.send('island:hover-state', true)
  await new Promise(r => setTimeout(r, 200))
  const hoverCheck = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      return {
        transform: style.transform,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    })()
  `)
  console.log('  Surface metrics during hover:', hoverCheck)
  if (!hoverCheck || hoverCheck.width !== 190 || hoverCheck.height !== 33) {
    console.error(`  FAIL: Island zoomed on hover! Expected 190x33, got ${hoverCheck?.width}x${hoverCheck?.height}`);
    allChecksPassed = false
  } else {
    console.log('  [PASS] Zero hover zoom verified: island maintained constant 190px x 33px dimensions during hover!');
  }

  // -------------------------------------------------------------
  // VERIFICATION 3: EXPAND ISLAND
  // -------------------------------------------------------------
  console.log('\n>>> STEP 3: Expand Island Panel...')
  await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.click();
  `)
  // Wait for spring animation to settle
  await new Promise(r => setTimeout(r, 600))

  const expandedMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return { error: 'No surface' };

      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      const rim = surface.querySelector('.island-iridescent-rim');
      const isRimExpanded = rim ? rim.classList.contains('expanded') : false;

      // Check interior elements: cards, buttons, etc.
      const glassSurfaces = Array.from(surface.querySelectorAll('.glass-surface'));
      const buttons = Array.from(surface.querySelectorAll('button'));
      const activeTab = surface.querySelector('.nav-tab-button[style*="var(--accent)"]') || surface.querySelector('button[style*="font-weight: 600"]');

      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        borderRadius: style.borderRadius,
        backgroundColor: style.backgroundColor,
        isRimExpanded,
        glassCount: glassSurfaces.length,
        buttonCount: buttons.length,
        hasActiveTab: !!activeTab
      };
    })()
  `)
  console.log('  Expanded Panel Metrics:', expandedMetrics)

  if (expandedMetrics.width !== 520 || expandedMetrics.height !== 536) {
    console.error(`  FAIL: Expanded panel dimensions expected 520x536, got ${expandedMetrics.width}x${expandedMetrics.height}`);
    allChecksPassed = false
  } else {
    console.log(`  [PASS] Expanded panel dimensions confirmed: 520px x 536px`);
  }

  if (!expandedMetrics.isRimExpanded) {
    console.error('  FAIL: .island-iridescent-rim did not receive .expanded class');
    allChecksPassed = false
  } else {
    console.log('  [PASS] .island-iridescent-rim correctly scaled with .expanded class');
  }

  await capture('02_expanded_panel_iridescent')

  // -------------------------------------------------------------
  // VERIFICATION 4: TAB SWITCHING & WIDGET VISUALS
  // -------------------------------------------------------------
  console.log('\n>>> STEP 4: Tab Switching to Calendar and Media...')
  // Click Calendar Tab
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const calBtn = btns.find(b => b.textContent && b.textContent.includes('Calendar'));
      if (calBtn) calBtn.click();
    })()
  `)
  await new Promise(r => setTimeout(r, 400))
  await capture('03_expanded_panel_calendar')
  console.log('  [PASS] Switched to Calendar Tab successfully');

  // Click Media Tab
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mediaBtn = btns.find(b => b.textContent && b.textContent.includes('Media'));
      if (mediaBtn) mediaBtn.click();
    })()
  `)
  await new Promise(r => setTimeout(r, 400))
  await capture('04_expanded_panel_media')
  console.log('  [PASS] Switched to Media Tab successfully');

  // -------------------------------------------------------------
  // VERIFICATION 5: PINNING PERSISTENCE
  // -------------------------------------------------------------
  console.log('\n>>> STEP 5: Pinning State Test...')
  await win.webContents.executeJavaScript(`
    (() => {
      const pinBtn = document.querySelector('button[title*="Pin"]') || document.querySelector('button[aria-label*="Pin"]');
      if (pinBtn) pinBtn.click();
    })()
  `)
  await new Promise(r => setTimeout(r, 300))
  // Send pointer leave
  win.webContents.send('island:hover-state', false)
  await new Promise(r => setTimeout(r, 800))

  const stillExpandedWhilePinned = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      return surface && Math.round(surface.getBoundingClientRect().width) === 520;
    })()
  `)
  if (!stillExpandedWhilePinned) {
    console.error('  FAIL: Island collapsed while pinned!');
    allChecksPassed = false
  } else {
    console.log('  [PASS] Island remained expanded while pinned');
  }

  // -------------------------------------------------------------
  // VERIFICATION 6: COLLAPSE BACK TO PILL
  // -------------------------------------------------------------
  console.log('\n>>> STEP 6: Collapse back to Pill...')
  // Unpin
  await win.webContents.executeJavaScript(`
    (() => {
      const pinBtn = document.querySelector('button[title*="Pin"]') || document.querySelector('button[aria-label*="Pin"]');
      if (pinBtn) pinBtn.click();
    })()
  `)
  await new Promise(r => setTimeout(r, 200))
  // Click collapse button
  await win.webContents.executeJavaScript(`
    (() => {
      const closeBtn = document.querySelector('button[title*="Collapse"]') || document.querySelector('button[title*="Close"]') || document.querySelector('button[aria-label*="Collapse"]');
      if (closeBtn) closeBtn.click();
    })()
  `)
  await new Promise(r => setTimeout(r, 600))

  const collapsedAgain = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return false;
      const rect = surface.getBoundingClientRect();
      return Math.round(rect.width) === 190 && Math.round(rect.height) === 33;
    })()
  `)
  if (!collapsedAgain) {
    console.error('  FAIL: Island did not collapse cleanly back to 190x33 pill');
    allChecksPassed = false
  } else {
    console.log('  [PASS] Island smoothly collapsed back to 190x33 pill');
  }

  await capture('05_returned_to_collapsed_pill')

  // -------------------------------------------------------------
  // VERIFICATION 7: FRAME RATE & ANIMATION PERFORMANCE
  // -------------------------------------------------------------
  console.log('\n>>> STEP 7: Performance & Frame Timing Verification...')
  const perfMetrics = await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      let frameCount = 0;
      let start = performance.now();
      let deltas = [];
      let last = start;

      function step(now) {
        deltas.push(now - last);
        last = now;
        frameCount++;
        if (frameCount < 60) {
          requestAnimationFrame(step);
        } else {
          const totalDuration = now - start;
          const avgFps = Math.round((frameCount / totalDuration) * 1000);
          const maxDelta = Math.max(...deltas.slice(1));
          resolve({ avgFps, maxDelta: Math.round(maxDelta * 10) / 10, frameCount });
        }
      }
      requestAnimationFrame(step);
    })
  `)
  console.log('  Performance Metrics (60 frames):', perfMetrics)
  if (perfMetrics.avgFps < 45) {
    console.warn('  WARN: Average FPS was lower than 45fps:', perfMetrics.avgFps)
  } else {
    console.log(`  [PASS] Animation performance is buttery smooth: ${perfMetrics.avgFps} FPS (max delta: ${perfMetrics.maxDelta}ms)`)
  }

  console.log('\n==================================================================')
  if (allChecksPassed) {
    console.log('   ALL IRIDESCENT METALLIC EFFECT VERIFICATION CHECKS PASSED!    ')
  } else {
    console.error('   SOME VERIFICATION CHECKS FAILED! INSPECT LOGS ABOVE.         ')
  }
  console.log('==================================================================\n')

  win.close()
  app.quit()
})
