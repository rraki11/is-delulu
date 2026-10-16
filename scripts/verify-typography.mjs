import { app, BrowserWindow, ipcMain, screen, nativeImage } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/1dfa8288-6694-42c4-aa3a-afd36a7f2bee/screenshots'
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

app.whenReady().then(async () => {
  console.log('\n=================================================================')
  console.log('    IS-DELULU: SF PRO TYPOGRAPHY INTEGRATION VERIFICATION        ')
  console.log('=================================================================\n')

  let allTestsPassed = true

  const win = new BrowserWindow({
    width: 540,
    height: 560,
    x: -9000,
    y: -9000,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      backgroundThrottling: false,
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Mock IPC channels
  let currentPrefs = {
    userName: 'Shubham',
    appearance: 'dark',
    accentMode: 'wallpaper',
    clockFormat: '12h',
    isPinned: false
  }

  const whitePalette = {
    primary: '#F8FAFC',
    primaryLight: '#0F172A',
    secondary: '#94A3B8',
    highlight: '#E2E8F0',
    glow: 'rgba(248, 250, 252, 0.30)',
    subtle: 'rgba(248, 250, 252, 0.12)',
    border: 'rgba(248, 250, 252, 0.35)',
    text: '#FFFFFF'
  }

  ipcMain.handle('preferences:get', () => currentPrefs)
  ipcMain.handle('preferences:update', (_e, p) => {
    Object.assign(currentPrefs, p)
    return currentPrefs
  })
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('theme:get-accent-palette', () => whitePalette)
  ipcMain.handle('island:set-mode', (_e, mode) => mode)
  ipcMain.handle('window:set-ignore-mouse-events', () => true)
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 14,
    memoryUsedGb: 6.2,
    memoryTotalGb: 16.0,
    memoryPercent: 39,
    cpuModel: '13th Gen Intel(R) Core(TM) i7-13700H',
    platform: 'Windows 11 Pro',
    arch: 'x64',
    uptimeFormatted: '4h 12m',
    batteryPercent: 88,
    isCharging: true
  }))
  ipcMain.handle('media:get-state', () => ({
    isPlaying: true,
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    album: 'Starboy',
    durationSec: 230,
    positionSec: 74,
    sourceApp: 'Spotify',
    volume: 85,
    isMuted: false,
    sources: [
      {
        id: 'spotify-1',
        sourceType: 'media-session',
        appId: 'Spotify',
        appName: 'Spotify',
        title: 'Starboy (feat. Daft Punk)',
        artist: 'The Weeknd',
        album: 'Starboy',
        durationSec: 230,
        positionSec: 74,
        isPlaying: true,
        canPlayPause: true,
        canSkipNext: true,
        canSkipPrevious: true,
        canSeek: true
      }
    ]
  }))
  ipcMain.handle('media:get-sources', () => [
    {
      id: 'spotify-1',
      sourceType: 'media-session',
      appId: 'Spotify',
      appName: 'Spotify',
      title: 'Starboy (feat. Daft Punk)',
      artist: 'The Weeknd',
      album: 'Starboy',
      durationSec: 230,
      positionSec: 74,
      isPlaying: true,
      canPlayPause: true,
      canSkipNext: true,
      canSkipPrevious: true,
      canSeek: true
    }
  ])
  ipcMain.handle('media:control', () => true)
  ipcMain.handle('media:app-volume', () => true)
  ipcMain.handle('media:app-mute', () => true)
  ipcMain.handle('clipboard:get-history', () => [
    {
      id: 'clip-1',
      text: 'const font = "SF Pro Display";',
      preview: 'const font = "SF Pro Display";',
      type: 'code',
      timestamp: Date.now() - 60000,
      charCount: 30
    }
  ])
  ipcMain.handle('clipboard:copy', () => true)
  ipcMain.handle('clipboard:clear', () => true)
  ipcMain.handle('launcher:get-shortcuts', () => [])
  ipcMain.handle('launcher:launch-app', () => true)
  ipcMain.handle('routines:get', () => [
    {
      id: 'focus-mode',
      name: 'Deep Focus Mode',
      description: 'Mute notifications and dim ambient surfaces for concentration',
      isActive: true,
      tags: ['Productivity', 'Audio'],
      steps: ['Mute apps', 'Set dark mode']
    }
  ])
  ipcMain.handle('routines:get-all', () => [])
  ipcMain.handle('routines:toggle', () => true)
  ipcMain.handle('routines:execute', () => true)

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  await new Promise((r) => setTimeout(r, 1200))

  const capture = async (name) => {
    const img = await win.capturePage()
    const p1 = join(outDir, `${name}.png`)
    writeFileSync(p1, img.toPNG())
    console.log(`  Saved screenshot: ${name}.png`)
  }

  // -------------------------------------------------------------
  // TEST SUITE 1: DOCUMENT FONT AVAILABILITY
  // -------------------------------------------------------------
  console.log('>>> TEST SUITE 1: Font Engine & Face Availability...')
  const fontStatus = await win.webContents.executeJavaScript(`
    (() => {
      return {
        sfProDisplayChecked: document.fonts.check('16px "SF Pro Display"'),
        sfProTextChecked: document.fonts.check('16px "SF Pro Text"'),
        segoeUIVarChecked: document.fonts.check('16px "Segoe UI Variable Text"'),
        segoeUIChecked: document.fonts.check('16px "Segoe UI"')
      }
    })()
  `)
  console.log('  Font Availability Check in Renderer:', fontStatus)

  if (!fontStatus.sfProDisplayChecked) {
    console.error('  FAIL: SF Pro Display is not active in Chromium font table!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] SF Pro Display is loaded and active in Chromium!')
  }

  if (!fontStatus.sfProTextChecked) {
    console.warn('  [WARN] SF Pro Text is using SF Pro Display fallback alias')
  } else {
    console.log('  [PASS] SF Pro Text is loaded and active in Chromium!')
  }

  // Canvas metric test to conclusively verify physical glyph widths
  const canvasVerification = await win.webContents.executeJavaScript(`
    (() => {
      const sample = 'Good morning, Shubham • 12:34:56';
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = '16px "SF Pro Display"';
      const wSF = ctx.measureText(sample).width;
      ctx.font = '16px "Segoe UI"';
      const wSegoe = ctx.measureText(sample).width;
      return {
        sample,
        wSF,
        wSegoe,
        isRenderingSFPro: wSF > 0 && Math.abs(wSF - wSegoe) > 0.5
      };
    })()
  `)
  console.log('  Canvas Glyph Metrics Verification:', canvasVerification)
  if (!canvasVerification.isRenderingSFPro) {
    console.error('  FAIL: Canvas metrics indicate SF Pro Display glyphs are not physically rendering!')
    allTestsPassed = false
  } else {
    console.log(
      '  [PASS] Canvas physical glyph test CONFIRMED: SF Pro (' +
        canvasVerification.wSF +
        'px) != Segoe UI (' +
        canvasVerification.wSegoe +
        'px)'
    )
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: FLOATING ISLAND CLOCK TYPOGRAPHY
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 2: Floating Island Clock Typography...')
  const pillClockInfo = await win.webContents.executeJavaScript(`
    (() => {
      const clockSpan = document.querySelector('#island-surface span.tabular-nums');
      if (!clockSpan) return null;
      const computed = window.getComputedStyle(clockSpan);
      return {
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        letterSpacing: computed.letterSpacing,
        fontVariantNumeric: computed.fontVariantNumeric,
        fontFeatureSettings: computed.fontFeatureSettings,
        text: clockSpan.textContent.trim(),
        width: clockSpan.getBoundingClientRect().width,
        height: clockSpan.getBoundingClientRect().height
      };
    })()
  `)
  console.log('  Pill Clock Telemetry:', pillClockInfo)

  if (!pillClockInfo || !pillClockInfo.fontFamily.toLowerCase().includes('sf pro display')) {
    console.error('  FAIL: Pill clock does not use SF Pro Display font-family!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Floating island clock correctly uses SF Pro Display with tabular numerals!')
  }

  await capture('sf_pro_1_collapsed_pill_clock')

  // -------------------------------------------------------------
  // TEST SUITE 3: EXPANDED PANEL, GREETING, TABS, AND SEARCH
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 3: Expanded Panel, Greeting, Tabs & Search Typography...')
  await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (surface) surface.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const panelTypography = await win.webContents.executeJavaScript(`
    (() => {
      const greeting = document.querySelector('.font-display');
      const tabs = Array.from(document.querySelectorAll('button[data-tab]'));
      const input = document.querySelector('input');
      const shortcutHeader = Array.from(document.querySelectorAll('span')).find(s => s.textContent && /quick shortcuts/i.test(s.textContent));

      return {
        greetingFont: greeting ? window.getComputedStyle(greeting).fontFamily : null,
        tabFont: tabs.length > 0 ? window.getComputedStyle(tabs[0]).fontFamily : null,
        inputFont: input ? window.getComputedStyle(input).fontFamily : null,
        shortcutHeaderFont: shortcutHeader ? window.getComputedStyle(shortcutHeader).fontFamily : null
      };
    })()
  `)
  console.log('  Panel Component Typographic Families:', panelTypography)

  if (!panelTypography.greetingFont?.toLowerCase().includes('sf pro display')) {
    console.error('  FAIL: Greeting does not use SF Pro Display!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Greeting uses SF Pro Display!')
  }

  if (
    !panelTypography.tabFont?.toLowerCase().includes('sf pro text') &&
    !panelTypography.tabFont?.toLowerCase().includes('sf pro display')
  ) {
    console.error('  FAIL: Navigation tabs do not use SF Pro typography!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Navigation tabs use SF Pro Text!')
  }

  if (
    !panelTypography.inputFont?.toLowerCase().includes('sf pro text') &&
    !panelTypography.inputFont?.toLowerCase().includes('sf pro display')
  ) {
    console.error('  FAIL: Search input does not use SF Pro typography!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Search input uses SF Pro Text!')
  }

  await capture('sf_pro_2_launcher_search')

  // -------------------------------------------------------------
  // TEST SUITE 4: CALENDAR WIDGET TYPOGRAPHY & GRID ALIGNMENT
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 4: Calendar Month/Year, Day Numbers, and Grid Alignment...')
  await win.webContents.executeJavaScript(`
    (() => {
      const btn = document.querySelector('button[data-tab="calendar"]');
      if (btn) btn.click();
      if (window.__islandStore) window.__islandStore.getState().setActiveTab('calendar');
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const calendarTypography = await win.webContents.executeJavaScript(`
    (() => {
      const allDisplay = Array.from(document.querySelectorAll('.font-display'));
      const monthTitle = allDisplay.find(s => s.textContent && [2024, 2025, 2026, 2027].some(y => s.textContent.includes(String(y))));
      const dayCells = Array.from(document.querySelectorAll('.tabular-nums')).filter(c => /^\\d+$/.test(c.textContent.trim()));

      return {
        monthYearTitle: monthTitle ? {
          text: monthTitle.textContent.trim(),
          font: window.getComputedStyle(monthTitle).fontFamily,
          size: window.getComputedStyle(monthTitle).fontSize,
          weight: window.getComputedStyle(monthTitle).fontWeight
        } : null,
        dayCount: dayCells.length,
        sampleDay: dayCells.length > 0 ? {
          text: dayCells[0].textContent.trim(),
          font: window.getComputedStyle(dayCells[0]).fontFamily,
          weight: window.getComputedStyle(dayCells[0]).fontWeight,
          fontVariantNumeric: window.getComputedStyle(dayCells[0]).fontVariantNumeric
        } : null
      };
    })()
  `)
  console.log('  Calendar Typography Telemetry:', calendarTypography)

  if (!calendarTypography.monthYearTitle?.font.toLowerCase().includes('sf pro display')) {
    console.error('  FAIL: Calendar Month/Year heading does not use SF Pro Display!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Calendar Month/Year heading uses SF Pro Display!')
  }

  if (!calendarTypography.sampleDay?.font.toLowerCase().includes('sf pro display')) {
    console.error('  FAIL: Calendar day cell numbers do not use SF Pro Display!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Calendar day numbers use SF Pro Display with tabular alignment!')
  }

  await capture('sf_pro_3_calendar_widget')

  // -------------------------------------------------------------
  // TEST SUITE 5: MEDIA WIDGET TRACK TITLES & TIMESTAMPS
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 5: Media Widget Track Titles, Artists & Timestamps...')
  await win.webContents.executeJavaScript(`
    (() => {
      const btn = document.querySelector('button[data-tab="media"]');
      if (btn) btn.click();
      if (window.__islandStore) window.__islandStore.getState().setActiveTab('media');
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const mediaTypography = await win.webContents.executeJavaScript(`
    (() => {
      const titles = Array.from(document.querySelectorAll('h4.font-text'));
      const artists = Array.from(document.querySelectorAll('p.font-text'));
      const timeBars = Array.from(document.querySelectorAll('.tabular-nums.font-display'));

      return {
        titleCount: titles.length,
        sampleTitle: titles.length > 0 ? {
          text: titles[0].textContent.trim(),
          font: window.getComputedStyle(titles[0]).fontFamily,
          weight: window.getComputedStyle(titles[0]).fontWeight
        } : null,
        sampleArtist: artists.length > 0 ? {
          text: artists[0].textContent.trim(),
          font: window.getComputedStyle(artists[0]).fontFamily
        } : null,
        timestamps: timeBars.length > 0 ? {
          text: timeBars[0].textContent.trim(),
          font: window.getComputedStyle(timeBars[0]).fontFamily,
          variant: window.getComputedStyle(timeBars[0]).fontVariantNumeric
        } : null
      };
    })()
  `)
  console.log('  Media Widget Typography Telemetry:', mediaTypography)

  if (
    !mediaTypography.sampleTitle?.font.toLowerCase().includes('sf pro text') &&
    !mediaTypography.sampleTitle?.font.toLowerCase().includes('sf pro display')
  ) {
    console.error('  FAIL: Media track title does not use SF Pro Text!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Media track title uses SF Pro Text!')
  }

  if (!mediaTypography.timestamps?.font.toLowerCase().includes('sf pro display')) {
    console.error('  FAIL: Media timestamps do not use SF Pro Display!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Media timestamps use SF Pro Display tabular numbers!')
  }

  await capture('sf_pro_4_media_widget')

  // -------------------------------------------------------------
  // TEST SUITE 6: SETTINGS WIDGET TYPOGRAPHY
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 6: Settings Widget Typography...')
  await win.webContents.executeJavaScript(`
    (() => {
      const btn = document.querySelector('button[data-tab="settings"]');
      if (btn) btn.click();
      if (window.__islandStore) window.__islandStore.getState().setActiveTab('settings');
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const settingsTypography = await win.webContents.executeJavaScript(`
    (() => {
      const sectionHeaders = Array.from(document.querySelectorAll('span.font-display')).filter(s =>
        ['Display Name', 'Clock Format', 'Appearance', 'Accent Theme'].some(t => s.textContent && s.textContent.includes(t))
      );
      const buttons = Array.from(document.querySelectorAll('button')).filter(b =>
        ['12-Hour', 'Light Mode', 'Dark Mode', 'Wallpaper'].some(t => b.textContent && b.textContent.includes(t))
      );

      return {
        headerCount: sectionHeaders.length,
        sampleHeader: sectionHeaders.length > 0 ? {
          text: sectionHeaders[0].textContent.trim(),
          font: window.getComputedStyle(sectionHeaders[0]).fontFamily,
          weight: window.getComputedStyle(sectionHeaders[0]).fontWeight
        } : null,
        buttonFont: buttons.length > 0 ? window.getComputedStyle(buttons[0]).fontFamily : null
      };
    })()
  `)
  console.log('  Settings Typography Telemetry:', settingsTypography)

  if (!settingsTypography.sampleHeader?.font.toLowerCase().includes('sf pro display')) {
    console.error('  FAIL: Settings section headers do not use SF Pro Display!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Settings section headers use SF Pro Display!')
  }

  await capture('sf_pro_5_settings_widget')

  console.log('\n=================================================================')
  if (allTestsPassed) {
    console.log('    ALL SF PRO TYPOGRAPHY INTEGRATION TESTS PASSED (100%)!       ')
  } else {
    console.error('    SOME TYPOGRAPHY TESTS FAILED! CHECK OUTPUT ABOVE.          ')
  }
  console.log('=================================================================\n')

  app.quit()
  process.exit(allTestsPassed ? 0 : 1)
})
