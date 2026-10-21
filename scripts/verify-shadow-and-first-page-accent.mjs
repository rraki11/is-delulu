import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cae90e89-4173-4a78-aea7-29502144233c/screenshots/verification'
mkdirSync(outDir, { recursive: true })

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-shadow-test-2'))

app.whenReady().then(async () => {
  console.log('[Test] Starting Verification of Shadow Removal and First-Page Wallpaper Accent...')

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

  let currentMode = 'expanded'
  let currentTheme = 'dark'
  let prefs = {
    userName: 'Shubham',
    clockFormat: '12h',
    appearance: 'dark',
    accentMode: 'wallpaper',
    isPinned: false
  }

  let activePalette = {
    primary: '#EC4899', // Pink cherry blossom accent
    primaryLight: '#DB2777',
    secondary: '#8B5CF6',
    highlight: '#F43F5E',
    glow: 'rgba(236, 72, 153, 0.16)',
    subtle: 'rgba(236, 72, 153, 0.10)',
    border: 'rgba(236, 72, 153, 0.32)',
    text: '#F472B6',
    sourceWallpaper: 'cherry-blossom.png'
  }

  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return mode
  })
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('island:check-welcome', () => ({ shouldWelcome: false }))
  ipcMain.handle('island:mark-welcome-complete', () => true)
  ipcMain.handle('island:reset-position', () => {})
  ipcMain.handle('window:set-ignore-mouse-events', () => {})
  ipcMain.handle('battery:notification-started', () => {})
  ipcMain.handle('battery:notification-ended', () => {})

  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 12,
    memoryUsedGb: 6.2,
    memoryTotalGb: 16.0,
    memoryPercent: 39,
    platform: 'Windows 11',
    arch: 'x64',
    hostname: 'TEST-RIG',
    uptimeFormatted: '3h 12m',
    cpuModel: 'Intel Core i9-13900H',
    batteryPercent: 80,
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
  ipcMain.handle('theme:get-resolved', () => currentTheme)
  ipcMain.handle('theme:get-accent-palette', () => activePalette)
  ipcMain.handle('battery:is-charging-active', () => false)
  ipcMain.handle('battery:get-state', () => ({
    percent: 80,
    isCharging: false,
    isOnAC: false,
    isEnergySaver: false,
    estimatedMinutesRemaining: 240
  }))

  const htmlPath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(htmlPath)

  // Allow initial render to mount
  await new Promise((r) => setTimeout(r, 1000))

  // Trigger expansion
  win.webContents.send('island:mode-changed', 'expanded')
  await new Promise((r) => setTimeout(r, 800))

  const results = {
    testResults: [],
    passedCount: 0,
    totalCount: 0
  }

  function recordTest(name, passed, details) {
    results.totalCount++
    if (passed) results.passedCount++
    results.testResults.push({ name, passed, details })
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${details}`)
  }

  // ---------------------------------------------------------------------------
  // 1. Audit Shadows on the Main Window
  // ---------------------------------------------------------------------------
  const shadowAudit = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return { found: false };
      const comp = window.getComputedStyle(surface);
      const rootComp = window.getComputedStyle(document.documentElement);
      return {
        found: true,
        boxShadow: comp.boxShadow,
        shadowPanelToken: rootComp.getPropertyValue('--shadow-panel').trim(),
        shadowPillToken: rootComp.getPropertyValue('--shadow-pill').trim(),
        border: comp.border,
        borderRadius: comp.borderRadius,
        backdropFilter: comp.backdropFilter || comp.webkitBackdropFilter,
        backgroundColor: comp.backgroundColor
      };
    })()
  `)

  const isBoxShadowInsetOrNone =
    shadowAudit.boxShadow === 'none' ||
    shadowAudit.boxShadow.includes('inset') ||
    shadowAudit.shadowPanelToken.startsWith('inset') ||
    shadowAudit.shadowPanelToken === 'none'

  const hasUnwantedOuterHalo =
    shadowAudit.boxShadow.includes('48px') ||
    shadowAudit.shadowPanelToken.includes('48px') ||
    shadowAudit.shadowPanelToken.includes('24px')

  recordTest(
    'Main Window Outer Drop-Shadow Removed',
    isBoxShadowInsetOrNone && !hasUnwantedOuterHalo,
    `surface boxShadow: "${shadowAudit.boxShadow}", --shadow-panel: "${shadowAudit.shadowPanelToken}"`
  )

  recordTest(
    'Panel Glassmorphism & Translucency Preserved',
    shadowAudit.backdropFilter.includes('blur') && shadowAudit.backgroundColor.includes('rgba'),
    `backdropFilter: "${shadowAudit.backdropFilter}", backgroundColor: "${shadowAudit.backgroundColor}"`
  )

  const shot1 = await win.capturePage()
  writeFileSync(join(outDir, '01_main_window_no_outer_shadow.png'), shot1.toPNG())

  // ---------------------------------------------------------------------------
  // 2. Audit First Page Adapting to Pink Cherry Blossom Accent
  // ---------------------------------------------------------------------------
  const firstPagePinkAudit = await win.webContents.executeJavaScript(`
    (() => {
      const rootComp = window.getComputedStyle(document.documentElement);
      const accent = rootComp.getPropertyValue('--accent').trim();
      const badgeBg = rootComp.getPropertyValue('--badge-bg').trim();
      const badgeText = rootComp.getPropertyValue('--badge-text').trim();
      const searchIconColor = rootComp.getPropertyValue('--search-icon-color').trim();
      const searchSelectedBg = rootComp.getPropertyValue('--search-item-selected-bg').trim();
      const navItemActiveColor = rootComp.getPropertyValue('--nav-item-active-color').trim();
      const cardHoverBorder = rootComp.getPropertyValue('--border-card-hover').trim();

      const navActiveItem = document.querySelector('.nav-seg-item--active');
      const navActivePill = document.querySelector('.nav-seg-pill');
      const nativeBadges = Array.from(document.querySelectorAll('span')).filter(s => s.textContent.trim() === 'Native');
      const firstNativeBadge = nativeBadges[0];
      const nativeBadgeComp = firstNativeBadge ? window.getComputedStyle(firstNativeBadge) : null;

      const searchInput = document.querySelector('input[type="text"]');
      let searchBarFocusedBorder = null;
      let searchBarFocusedShadow = null;
      if (searchInput) {
        searchInput.focus();
        const inputParentComp = window.getComputedStyle(searchInput.parentElement);
        searchBarFocusedBorder = inputParentComp.borderColor;
        searchBarFocusedShadow = inputParentComp.boxShadow;
      }

      return {
        accent,
        badgeBg,
        badgeText,
        searchIconColor,
        searchSelectedBg,
        navItemActiveColor,
        cardHoverBorder,
        badgeTextColor: nativeBadgeComp ? nativeBadgeComp.color : null,
        badgeBgColor: nativeBadgeComp ? nativeBadgeComp.backgroundColor : null,
        badgeBorderColor: nativeBadgeComp ? nativeBadgeComp.borderColor : null,
        navActivePillBorder: navActivePill ? window.getComputedStyle(navActivePill).borderColor : null,
        navActivePillShadow: navActivePill ? window.getComputedStyle(navActivePill).boxShadow : null,
        navActiveColor: navActiveItem ? window.getComputedStyle(navActiveItem).color : null,
        searchBarFocusedBorder,
        searchBarFocusedShadow
      };
    })()
  `)

  recordTest(
    'First Page Pink Accent Applied to Active Nav Tab',
    firstPagePinkAudit.accent.toLowerCase() === '#ec4899',
    `--accent is "${firstPagePinkAudit.accent}", navActiveColor is "${firstPagePinkAudit.navActiveColor}"`
  )

  recordTest(
    'Native Badge Uses Wallpaper Accent (Not Hardcoded Green)',
    firstPagePinkAudit.badgeText.toLowerCase().includes('f472b6') ||
      firstPagePinkAudit.badgeText.toLowerCase().includes('ec4899') ||
      (firstPagePinkAudit.badgeTextColor && firstPagePinkAudit.badgeTextColor.includes('244, 114, 182')),
    `--badge-text is "${firstPagePinkAudit.badgeText}", badge element color: "${firstPagePinkAudit.badgeTextColor}"`
  )

  recordTest(
    'Search Bar Focus Ring & Highlights Adapt to Accent',
    firstPagePinkAudit.searchBarFocusedBorder &&
      (firstPagePinkAudit.searchBarFocusedBorder.includes('236, 72, 153') ||
       firstPagePinkAudit.searchBarFocusedShadow.includes('236, 72, 153')),
    `searchBarFocusedBorder: "${firstPagePinkAudit.searchBarFocusedBorder}", shadow: "${firstPagePinkAudit.searchBarFocusedShadow}"`
  )

  const shot2 = await win.capturePage()
  writeFileSync(join(outDir, '02_first_page_pink_accent.png'), shot2.toPNG())

  // ---------------------------------------------------------------------------
  // 3. Dynamic Switch to Blue Wallpaper Palette
  // ---------------------------------------------------------------------------
  console.log('[Test] Switching to Blue Wallpaper Palette...')
  const bluePalette = {
    primary: '#0284C7',
    primaryLight: '#0369A1',
    secondary: '#38BDF8',
    highlight: '#06B6D4',
    glow: 'rgba(2, 132, 199, 0.16)',
    subtle: 'rgba(2, 132, 199, 0.10)',
    border: 'rgba(2, 132, 199, 0.32)',
    text: '#38BDF8',
    sourceWallpaper: 'ocean-blue.jpg'
  }
  activePalette = bluePalette
  win.webContents.send('theme:accent-updated', bluePalette)
  await new Promise((r) => setTimeout(r, 400))

  const blueAudit = await win.webContents.executeJavaScript(`
    (() => {
      const rootComp = window.getComputedStyle(document.documentElement);
      const accent = rootComp.getPropertyValue('--accent').trim();
      const badgeText = rootComp.getPropertyValue('--badge-text').trim();
      const navItemActive = document.querySelector('.nav-seg-item--active');
      const nativeBadge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.trim() === 'Native');
      return {
        accent,
        badgeText,
        navItemActiveColor: navItemActive ? window.getComputedStyle(navItemActive).color : null,
        badgeTextColor: nativeBadge ? window.getComputedStyle(nativeBadge).color : null
      };
    })()
  `)

  recordTest(
    'First Page Dynamically Updates to Blue Accent Without Restart',
    blueAudit.accent.toLowerCase() === '#0284c7' &&
      blueAudit.badgeTextColor &&
      (blueAudit.badgeTextColor.includes('56, 189, 248') ||
       blueAudit.badgeTextColor.includes('2, 132, 199') ||
       blueAudit.badgeTextColor.includes('117, 209, 250')),
    `--accent is "${blueAudit.accent}", element badgeTextColor: "${blueAudit.badgeTextColor}"`
  )

  const shot3 = await win.capturePage()
  writeFileSync(join(outDir, '03_first_page_blue_accent.png'), shot3.toPNG())

  // ---------------------------------------------------------------------------
  // 4. Dynamic Switch to Purple Wallpaper Palette
  // ---------------------------------------------------------------------------
  console.log('[Test] Switching to Purple Wallpaper Palette...')
  const purplePalette = {
    primary: '#8B5CF6',
    primaryLight: '#7C3AED',
    secondary: '#EC4899',
    highlight: '#A855F7',
    glow: 'rgba(139, 92, 246, 0.16)',
    subtle: 'rgba(139, 92, 246, 0.10)',
    border: 'rgba(139, 92, 246, 0.32)',
    text: '#C084FC',
    sourceWallpaper: 'violet-night.jpg'
  }
  activePalette = purplePalette
  win.webContents.send('theme:accent-updated', purplePalette)
  await new Promise((r) => setTimeout(r, 400))

  const purpleAudit = await win.webContents.executeJavaScript(`
    (() => {
      const rootComp = window.getComputedStyle(document.documentElement);
      const nativeBadge = Array.from(document.querySelectorAll('span')).find(s => s.textContent.trim() === 'Native');
      return {
        accent: rootComp.getPropertyValue('--accent').trim(),
        badgeText: rootComp.getPropertyValue('--badge-text').trim(),
        searchIconColor: rootComp.getPropertyValue('--search-icon-color').trim(),
        cardHoverBorder: rootComp.getPropertyValue('--border-card-hover').trim(),
        badgeTextColor: nativeBadge ? window.getComputedStyle(nativeBadge).color : null
      };
    })()
  `)

  recordTest(
    'First Page Dynamically Updates to Purple Accent Without Restart',
    purpleAudit.accent.toLowerCase() === '#8b5cf6' &&
      purpleAudit.badgeTextColor &&
      (purpleAudit.badgeTextColor.includes('192, 132, 252') || purpleAudit.badgeTextColor.includes('139, 92, 246')),
    `--accent is "${purpleAudit.accent}", badgeTextColor: "${purpleAudit.badgeTextColor}"`
  )

  const shot4 = await win.capturePage()
  writeFileSync(join(outDir, '04_first_page_purple_accent.png'), shot4.toPNG())

  // ---------------------------------------------------------------------------
  // 5. Dynamic Switch to White / Light-Gray Monochromatic Wallpaper Palette
  // ---------------------------------------------------------------------------
  console.log('[Test] Switching to White Monochromatic Wallpaper Palette...')
  const whitePalette = {
    primary: '#F8FAFC',
    primaryLight: '#0F172A',
    secondary: '#94A3B8',
    highlight: '#E2E8F0',
    glow: 'rgba(248, 250, 252, 0.28)',
    subtle: 'rgba(248, 250, 252, 0.10)',
    border: 'rgba(248, 250, 252, 0.35)',
    text: '#FFFFFF',
    sourceWallpaper: 'white-flowers.png'
  }
  activePalette = whitePalette
  win.webContents.send('theme:accent-updated', whitePalette)
  await new Promise((r) => setTimeout(r, 400))

  const whiteAudit = await win.webContents.executeJavaScript(`
    (() => {
      const rootComp = window.getComputedStyle(document.documentElement);
      const textOnAccent = rootComp.getPropertyValue('--text-on-accent').trim();
      return {
        accent: rootComp.getPropertyValue('--accent').trim(),
        badgeText: rootComp.getPropertyValue('--badge-text').trim(),
        textOnAccent
      };
    })()
  `)

  recordTest(
    'White Wallpaper Palette Contrast & Accessibility',
    whiteAudit.accent.toLowerCase() === '#f8fafc' && whiteAudit.textOnAccent === '#0A0D0E',
    `--accent: "${whiteAudit.accent}", --text-on-accent correctly uses dark text: "${whiteAudit.textOnAccent}"`
  )

  const shot5 = await win.capturePage()
  writeFileSync(join(outDir, '05_first_page_white_accent.png'), shot5.toPNG())

  // ---------------------------------------------------------------------------
  // 6. Test Light Theme Mode
  // ---------------------------------------------------------------------------
  console.log('[Test] Testing Light Theme Mode...')
  currentTheme = 'light'
  prefs.appearance = 'light'
  win.webContents.send('preferences:changed', prefs)
  win.webContents.send('theme:changed', 'light')
  win.webContents.send('theme:accent-updated', bluePalette)
  await new Promise((r) => setTimeout(r, 500))

  const lightAudit = await win.webContents.executeJavaScript(`
    (() => {
      const rootComp = window.getComputedStyle(document.documentElement);
      const theme = document.documentElement.dataset.theme;
      const surface = document.getElementById('island-surface');
      const surfaceComp = window.getComputedStyle(surface);
      return {
        theme,
        accent: rootComp.getPropertyValue('--accent').trim(),
        badgeText: rootComp.getPropertyValue('--badge-text').trim(),
        boxShadow: surfaceComp.boxShadow,
        hasNoOuterHalo: !surfaceComp.boxShadow.includes('48px') && (surfaceComp.boxShadow.includes('inset') || surfaceComp.boxShadow === 'none')
      };
    })()
  `)

  recordTest(
    'Light Theme Mode Applied and Retains Zero Outer Halo',
    lightAudit.theme === 'light' && lightAudit.hasNoOuterHalo,
    `theme="${lightAudit.theme}", surface boxShadow="${lightAudit.boxShadow}"`
  )

  const shot6 = await win.capturePage()
  writeFileSync(join(outDir, '06_first_page_light_theme_accent.png'), shot6.toPNG())

  // ---------------------------------------------------------------------------
  // Write Final Summary Log
  // ---------------------------------------------------------------------------
  const summaryReport = `
=== HITODAMA UI VALIDATION: SHADOW REMOVAL & WALLPAPER ACCENT ADAPTATION ===
Date: ${new Date().toISOString()}
Total Checks: ${results.totalCount}
Passed: ${results.passedCount}
Failed: ${results.totalCount - results.passedCount}

Details:
${results.testResults.map((t) => `[${t.passed ? 'PASS' : 'FAIL'}] ${t.name}\n  -> ${t.details}`).join('\n')}

Screenshots Captured:
1. 01_main_window_no_outer_shadow.png (Dark theme, zero outer halo, sharp edges)
2. 02_first_page_pink_accent.png (Cherry blossom pink wallpaper accent on first page)
3. 03_first_page_blue_accent.png (Dynamic live shift to ocean blue accent)
4. 04_first_page_purple_accent.png (Dynamic live shift to purple accent)
5. 05_first_page_white_accent.png (White wallpaper palette with contrast calibrated text)
6. 06_first_page_light_theme_accent.png (Light theme mode with zero outer shadow)
`.trim()

  writeFileSync(join(outDir, 'validation_report.txt'), summaryReport, 'utf-8')
  console.log('\n' + summaryReport)

  await new Promise((r) => setTimeout(r, 600))
  win.close()
  app.quit()
})
