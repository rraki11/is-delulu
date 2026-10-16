import pkg from 'electron'
const { app, BrowserWindow, ipcMain, screen } = pkg
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
    show: true,
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

  // Open expanded panel
  await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.click();
  `)
  await new Promise((r) => setTimeout(r, 1600))

  console.log('=== TEST 1: Initial Navigation Alignment & Metrics ===')
  const initialMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const tabBar = document.querySelector('[data-testid="tab-bar"]');
      const containerRect = tabBar.getBoundingClientRect();
      const parentSurface = document.getElementById('island-surface').getBoundingClientRect();
      const tabs = Array.from(document.querySelectorAll('button[data-tab]')).map(btn => {
        const r = btn.getBoundingClientRect();
        return {
          id: btn.getAttribute('data-tab'),
          text: btn.textContent.trim(),
          rect: { left: r.left, right: r.right, width: r.width },
          // Check if right edge of tab is within container right edge
          isClippedByContainer: r.right > containerRect.right + 1,
          isClippedBySurface: r.right > parentSurface.right + 1
        };
      });

      return {
        parentSurface: { left: parentSurface.left, right: parentSurface.right, width: parentSurface.width },
        container: { left: containerRect.left, right: containerRect.right, width: containerRect.width, scrollWidth: tabBar.scrollWidth, clientWidth: tabBar.clientWidth, scrollLeft: tabBar.scrollLeft },
        tabs
      };
    })()
  `)
  console.log('Initial Container:', initialMetrics.container)
  console.log('Initial Tabs (sample):', initialMetrics.tabs.map(t => `${t.id}: [${t.rect.left.toFixed(1)} -> ${t.rect.right.toFixed(1)}] width=${t.rect.width.toFixed(1)} clipped=${t.isClippedByContainer}`))

  // Capture initial screenshot (Launcher active)
  const img1 = await win.capturePage()
  writeFileSync(join(outDir, 'nav_1_initial_launcher.png'), img1.toPNG())
  console.log('Saved screenshot: nav_1_initial_launcher.png')

  console.log('\n=== TEST 2: Two-Finger Trackpad Horizontal Scrolling (deltaX) ===')
  const trackpadScrollResult = await win.webContents.executeJavaScript(`
    (() => {
      const tabBar = document.querySelector('[data-testid="tab-bar"]');
      const initialScroll = tabBar.scrollLeft;

      // Dispatch realistic synthetic trackpad wheel event with deltaX
      const wheelEvt = new WheelEvent('wheel', {
        deltaX: 60,
        deltaY: 0,
        deltaMode: 0,
        bubbles: true,
        cancelable: true
      });
      tabBar.dispatchEvent(wheelEvt);

      // On elements with overflow-x: auto, native browser scrolling or listener updates scrollLeft
      // In synthetic tests, update scrollLeft if not natively dispatched by synthetic event
      if (tabBar.scrollLeft === initialScroll) {
        tabBar.scrollLeft += 60;
        tabBar.dispatchEvent(new Event('scroll'));
      }

      return {
        before: initialScroll,
        after: tabBar.scrollLeft,
        canScrollLeft: !!document.querySelector('[data-testid="nav-fade-left"]')
      };
    })()
  `)
  console.log('Trackpad DeltaX result:', trackpadScrollResult)

  console.log('\n=== TEST 3: Mouse Wheel Vertical to Horizontal Translation (deltaY) ===')
  const wheelTranslateResult = await win.webContents.executeJavaScript(`
    (() => {
      const tabBar = document.querySelector('[data-testid="tab-bar"]');
      const before = tabBar.scrollLeft;

      // Dispatch vertical wheel event (deltaY=40, deltaX=0) over tab bar
      const wheelEvt = new WheelEvent('wheel', {
        deltaX: 0,
        deltaY: 50,
        deltaMode: 0,
        bubbles: true,
        cancelable: true
      });
      const canceled = !tabBar.dispatchEvent(wheelEvt);

      return {
        before,
        after: tabBar.scrollLeft,
        eventPreventDefaulted: canceled,
        scrolled: tabBar.scrollLeft > before
      };
    })()
  `)
  console.log('Wheel DeltaY Translation result:', wheelTranslateResult)

  console.log('\n=== TEST 4: Activate Settings Tab (Scroll Into View & Alignment) ===')
  await win.webContents.executeJavaScript(`
    (() => {
      const settingsBtn = document.querySelector('button[data-tab="settings"]');
      if (settingsBtn) settingsBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 900))

  const settingsActiveMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const tabBar = document.querySelector('[data-testid="tab-bar"]');
      const containerRect = tabBar.getBoundingClientRect();
      const parentSurface = document.getElementById('island-surface').getBoundingClientRect();
      const settingsBtn = document.querySelector('button[data-tab="settings"]');
      const r = settingsBtn.getBoundingClientRect();
      const cs = window.getComputedStyle(settingsBtn);

      return {
        container: { left: containerRect.left, right: containerRect.right, scrollLeft: tabBar.scrollLeft, scrollWidth: tabBar.scrollWidth },
        settingsBtn: {
          text: settingsBtn.textContent.trim(),
          left: r.left,
          right: r.right,
          width: r.width,
          border: cs.border,
          color: cs.color,
          isFullyInsideContainer: r.left >= containerRect.left && r.right <= containerRect.right,
          isFullyInsideSurface: r.left >= parentSurface.left && r.right <= parentSurface.right,
          marginFromRightEdge: containerRect.right - r.right
        }
      };
    })()
  `)
  console.log('Settings Active Metrics:', settingsActiveMetrics)

  // Capture screenshot with Settings active
  const img2 = await win.capturePage()
  writeFileSync(join(outDir, 'nav_2_settings_active.png'), img2.toPNG())
  console.log('Saved screenshot: nav_2_settings_active.png')

  console.log('\n=== TEST 5: Activate Launcher Tab Back (Scroll Into View) ===')
  await win.webContents.executeJavaScript(`
    (() => {
      const launcherBtn = document.querySelector('button[data-tab="launcher"]');
      if (launcherBtn) launcherBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 800))

  const launcherActiveMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const tabBar = document.querySelector('[data-testid="tab-bar"]');
      const containerRect = tabBar.getBoundingClientRect();
      const launcherBtn = document.querySelector('button[data-tab="launcher"]');
      const r = launcherBtn.getBoundingClientRect();
      const cs = window.getComputedStyle(launcherBtn);

      return {
        scrollLeft: tabBar.scrollLeft,
        ariaSelected: launcherBtn.getAttribute('aria-selected'),
        border: cs.border,
        color: cs.color,
        launcherBtn: {
          left: r.left,
          right: r.right,
          width: r.width,
          isFullyInsideContainer: r.left >= containerRect.left && r.right <= containerRect.right,
          marginFromLeftEdge: r.left - containerRect.left
        }
      };
    })()
  `)
  console.log('Launcher Active Metrics:', launcherActiveMetrics)

  // Capture screenshot with Launcher active
  const img3 = await win.capturePage()
  writeFileSync(join(outDir, 'nav_3_launcher_back.png'), img3.toPNG())
  console.log('Saved screenshot: nav_3_launcher_back.png')

  console.log('\n=== TEST 6: Content Scrolling Non-Interference ===')
  const contentScrollTest = await win.webContents.executeJavaScript(`
    (() => {
      // Check content area below tab bar
      const contentDiv = document.querySelector('[data-testid="tab-bar"]').parentElement.nextElementSibling;
      const cs = window.getComputedStyle(contentDiv);
      return {
        hasVerticalScroll: cs.overflowY === 'auto' || cs.overflowY === 'scroll',
        overflowX: cs.overflowX
      };
    })()
  `)
  console.log('Content Area Scrollability:', contentScrollTest)

  console.log('\n=== TEST 7: Wide Window Layout Responsiveness ===')
  // Expand window to wide display (e.g. 720px)
  win.setSize(720, 560)
  await new Promise((r) => setTimeout(r, 600))

  const wideLayoutMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const tabBar = document.querySelector('[data-testid="tab-bar"]');
      const containerRect = tabBar.getBoundingClientRect();
      const tabs = Array.from(document.querySelectorAll('button[data-tab]')).map(btn => {
        const r = btn.getBoundingClientRect();
        return {
          id: btn.getAttribute('data-tab'),
          width: r.width,
          left: r.left,
          right: r.right,
          isInside: r.left >= containerRect.left - 1 && r.right <= containerRect.right + 1
        };
      });

      return {
        containerWidth: containerRect.width,
        scrollWidth: tabBar.scrollWidth,
        tabsCount: tabs.length,
        allTabsInside: tabs.every(t => t.isInside),
        tabs: tabs.map(t => ({ id: t.id, isInside: t.isInside, width: Math.round(t.width) }))
      };
    })()
  `)
  console.log('Wide Layout Metrics:', wideLayoutMetrics)

  const img4 = await win.capturePage()
  writeFileSync(join(outDir, 'nav_4_wide_window.png'), img4.toPNG())
  console.log('Saved screenshot: nav_4_wide_window.png')

  app.quit()
})
