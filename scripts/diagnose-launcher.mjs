import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/1dfa8288-6694-42c4-aa3a-afd36a7f2bee/screenshots'
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

app.whenReady().then(async () => {
  const primaryDisplay = screen.getPrimaryDisplay()

  const win = new BrowserWindow({
    width: 540,
    height: 560,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Mock IPC
  ipcMain.handle('preferences:get', () => ({
    userName: 'Shubham',
    appearance: 'dark',
    accentMode: 'wallpaper',
    clockFormat: '12h',
    isPinned: true
  }))
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('theme:get-accent-palette', () => ({
    primary: '#BBFF00',
    primaryLight: '#5E8E04',
    secondary: '#8B5CF6',
    highlight: '#00F0FF',
    glow: 'rgba(187, 255, 0, 0.25)',
    subtle: 'rgba(187, 255, 0, 0.12)',
    border: 'rgba(187, 255, 0, 0.35)',
    text: '#BBFF00'
  }))
  ipcMain.handle('island:set-mode', (_e, m) => m)
  ipcMain.handle('window:set-ignore-mouse-events', () => true)
  ipcMain.handle('system:get-stats', () => ({}))
  ipcMain.handle('media:get-state', () => ({ isPlaying: false, sources: [] }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('launcher:get-shortcuts', () => [])

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  await new Promise((r) => setTimeout(r, 1200))

  // Open the expanded panel
  await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.click();
  `)
  await new Promise((r) => setTimeout(r, 1600))

  const launcherDiag = await win.webContents.executeJavaScript(`
    (() => {
      // Tab bar container
      const tabBar = document.querySelector('[data-testid="tab-bar"]');
      const tabBarRect = tabBar ? tabBar.getBoundingClientRect() : null;
      const tabBarScroll = tabBar ? {
        scrollWidth: tabBar.scrollWidth,
        clientWidth: tabBar.clientWidth,
        scrollLeft: tabBar.scrollLeft,
        overflowX: window.getComputedStyle(tabBar).overflowX
      } : null;

      // 1. Navigation tabs
      const tabs = Array.from(document.querySelectorAll('button[data-tab]')).map(btn => {
        const cs = window.getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        return {
          id: btn.getAttribute('data-tab'),
          text: btn.textContent.trim(),
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right }
        };
      });

      // 2. Search input
      const input = document.querySelector('input');
      const inputCs = input ? window.getComputedStyle(input) : null;
      const inputRect = input ? input.getBoundingClientRect() : null;

      // 3. Command items
      const commandRows = Array.from(document.querySelectorAll('.no-drag > div')).filter(el => el.querySelector('span') && el.querySelector('p')).slice(0, 3).map(row => {
        const titleSpan = row.querySelector('span');
        const descP = row.querySelector('p');
        const badgeSpan = Array.from(row.querySelectorAll('span')).find(s => ['Native', 'Mock'].includes(s.textContent.trim()));
        const titleCs = titleSpan ? window.getComputedStyle(titleSpan) : null;
        const descCs = descP ? window.getComputedStyle(descP) : null;
        const badgeCs = badgeSpan ? window.getComputedStyle(badgeSpan) : null;
        const rowRect = row.getBoundingClientRect();

        return {
          title: titleSpan?.textContent.trim(),
          titleStyle: {
            fontFamily: titleCs?.fontFamily,
            fontSize: titleCs?.fontSize,
            fontWeight: titleCs?.fontWeight,
            lineHeight: titleCs?.lineHeight,
            letterSpacing: titleCs?.letterSpacing
          },
          desc: descP?.textContent.trim(),
          descStyle: {
            fontFamily: descCs?.fontFamily,
            fontSize: descCs?.fontSize,
            fontWeight: descCs?.fontWeight,
            lineHeight: descCs?.lineHeight,
            color: descCs?.color
          },
          badge: badgeSpan?.textContent.trim(),
          badgeStyle: {
            fontFamily: badgeCs?.fontFamily,
            fontSize: badgeCs?.fontSize,
            fontWeight: badgeCs?.fontWeight,
            padding: badgeCs?.padding
          },
          rowRect: { x: rowRect.x, y: rowRect.y, width: rowRect.width, height: rowRect.height }
        };
      });

      // 4. Quick shortcuts
      const shortcutHeader = Array.from(document.querySelectorAll('span')).find(s => s.textContent && s.textContent.includes('QUICK SHORTCUTS'));
      const shortcutHeaderCs = shortcutHeader ? window.getComputedStyle(shortcutHeader) : null;

      const shortcutCards = Array.from(document.querySelectorAll('.no-drag > div')).filter(el => !el.querySelector('p') && el.querySelector('span')).slice(0, 4).map(card => {
        const spans = Array.from(card.querySelectorAll('span'));
        const titleSpan = spans[0];
        const badgeSpan = spans[1];
        const titleCs = titleSpan ? window.getComputedStyle(titleSpan) : null;
        const badgeCs = badgeSpan ? window.getComputedStyle(badgeSpan) : null;
        const cardRect = card.getBoundingClientRect();

        return {
          title: titleSpan?.textContent.trim(),
          titleStyle: {
            fontFamily: titleCs?.fontFamily,
            fontSize: titleCs?.fontSize,
            fontWeight: titleCs?.fontWeight,
            lineHeight: titleCs?.lineHeight
          },
          badge: badgeSpan?.textContent.trim(),
          badgeStyle: {
            fontFamily: badgeCs?.fontFamily,
            fontSize: badgeCs?.fontSize,
            fontWeight: badgeCs?.fontWeight
          },
          cardRect: { x: cardRect.x, y: cardRect.y, width: cardRect.width, height: cardRect.height }
        };
      });

      return {
        dpr: window.devicePixelRatio,
        zoom: window.outerWidth / window.innerWidth,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        tabBarRect,
        tabBarScroll,
        tabs,
        input: {
          placeholder: input?.placeholder,
          fontFamily: inputCs?.fontFamily,
          fontSize: inputCs?.fontSize,
          fontWeight: inputCs?.fontWeight,
          lineHeight: inputCs?.lineHeight,
          letterSpacing: inputCs?.letterSpacing,
          rect: inputRect ? { x: inputRect.x, y: inputRect.y, width: inputRect.width, height: inputRect.height } : null
        },
        shortcutHeader: {
          text: shortcutHeader?.textContent.trim(),
          fontFamily: shortcutHeaderCs?.fontFamily,
          fontSize: shortcutHeaderCs?.fontSize,
          fontWeight: shortcutHeaderCs?.fontWeight,
          letterSpacing: shortcutHeaderCs?.letterSpacing
        },
        commandRows,
        shortcutCards
      };
    })()
  `)

  console.log('=== LAUNCHER DIAGNOSTIC REPORT ===')
  console.log('Display & Window Metrics:', {
    displayBounds: primaryDisplay.bounds,
    scaleFactor: primaryDisplay.scaleFactor,
    dpr: launcherDiag.dpr,
    innerWidth: launcherDiag.innerWidth,
    innerHeight: launcherDiag.innerHeight
  })
  console.log('\n--- 0. TAB BAR CONTAINER ---')
  console.log('TabBar Rect:', launcherDiag.tabBarRect)
  console.log('TabBar Scroll:', launcherDiag.tabBarScroll)
  console.log('\n--- 1. NAVIGATION TABS (all 7) ---')
  console.log(launcherDiag.tabs)
  console.log('\n--- 2. SEARCH INPUT ---')
  console.log(launcherDiag.input)
  console.log('\n--- 3. SHORTCUT HEADER ---')
  console.log(launcherDiag.shortcutHeader)
  console.log('\n--- 4. COMMAND ROWS (sample) ---')
  console.log(JSON.stringify(launcherDiag.commandRows, null, 2))
  console.log('\n--- 5. SHORTCUT CARDS (sample) ---')
  console.log(JSON.stringify(launcherDiag.shortcutCards, null, 2))

  const img = await win.capturePage()
  writeFileSync(join(outDir, 'launcher_polished.png'), img.toPNG())
  console.log('\nCaptured screenshot: launcher_polished.png')

  app.quit()
})
