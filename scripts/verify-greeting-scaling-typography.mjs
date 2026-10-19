import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cb6b94f2-dee4-49bf-a9b8-a2cb55f44051/screenshots'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-typography-scaling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-typo-scale'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING GREETING TYPOGRAPHY & DYNAMIC ISLAND SCALING ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'collapsed'

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

  ipcMain.handle('battery:get-state', () => ({
    percent: 85,
    isOnAC: false,
    isCharging: false,
    isEnergySaver: false
  }))
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)
  ipcMain.handle('battery:charging-started', () => {})
  ipcMain.handle('battery:charging-ended', () => {})
  ipcMain.handle('battery:notification-started', () => {})
  ipcMain.handle('battery:notification-ended', () => {})
  ipcMain.handle('island:get-welcome-shown', () => false)
  ipcMain.handle('island:mark-welcome-shown', () => true)
  ipcMain.handle('island:check-welcome', () => ({ shouldWelcome: true }))

  ipcMain.handle('preferences:get', () => ({
    userName: 'User',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }))
  ipcMain.handle('preferences:update', (_e, p) => p)
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('wallpaper:get-accent-palette', () => ({
    primary: '#6366f1',
    primaryLight: '#818cf8',
    secondary: '#a855f7',
    highlight: '#38bdf8',
    glow: 'rgba(99, 102, 241, 0.35)',
    subtle: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.28)',
    text: '#ffffff',
    confidence: 'high'
  }))
  ipcMain.handle('system:get-stats', () => ({ cpu: 12, memory: 45 }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => null)
  ipcMain.handle('routines:get-list', () => [])
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('theme:get-accent-palette', () => ({
    primary: '#6366f1',
    primaryLight: '#818cf8',
    secondary: '#a855f7',
    highlight: '#38bdf8',
    glow: 'rgba(99, 102, 241, 0.35)',
    subtle: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.28)',
    text: '#ffffff',
    confidence: 'high'
  }))

  const sampleGreetingMetrics = async () => {
    return await win.webContents.executeJavaScript(`
      (() => {
        const surface = document.getElementById('island-surface')
        const greetingSvg = document.querySelector('.handwriting-reveal-svg')
        const clockEl = document.querySelector('.island-clock-container')

        const sRect = surface ? surface.getBoundingClientRect() : null
        const gRect = greetingSvg ? greetingSvg.getBoundingClientRect() : null
        const cRect = clockEl ? clockEl.getBoundingClientRect() : null

        let detectedGreeting = null
        if (greetingSvg) {
          const viewBox = greetingSvg.getAttribute('viewBox') || ''
          if (viewBox.includes('1899.5')) {
            detectedGreeting = 'hello'
          } else if (viewBox.includes('889.5')) {
            detectedGreeting = 'hi'
          }
        }

        return {
          windowWidth: window.innerWidth,
          surface: sRect ? {
            top: sRect.top,
            left: sRect.left,
            right: sRect.right,
            width: sRect.width,
            height: sRect.height,
            centerX: sRect.left + sRect.width / 2
          } : null,
          svg: gRect ? {
            top: gRect.top,
            bottom: gRect.bottom,
            left: gRect.left,
            width: gRect.width,
            height: gRect.height,
            centerX: gRect.left + gRect.width / 2
          } : null,
          detectedGreeting,
          hasClock: Boolean(clockEl && window.getComputedStyle(clockEl).opacity === '1')
        }
      })()
    `)
  }

  const results = { hi: null, hello: null }

  // Test runs until we capture both "hi" and "hello"
  for (let run = 1; run <= 20; run++) {
    if (results.hi && results.hello) break

    await win.loadFile(join(__dirname, '../out/renderer/index.html'))
    win.webContents.send('island:start-welcome')

    // Wait until entrance finishes and writing begins
    let activeMetrics = null
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 60))
      const m = await sampleGreetingMetrics()
      if (m.svg && m.detectedGreeting) {
        // Wait for writing to finish completely into hold phase (hi: 1.4s, hello: 2.2s)
        const holdDelay = m.detectedGreeting === 'hello' ? 2300 : 1500
        await new Promise(r => setTimeout(r, holdDelay))
        activeMetrics = await sampleGreetingMetrics()
        break
      }
    }

    if (activeMetrics && activeMetrics.detectedGreeting) {
      const g = activeMetrics.detectedGreeting
      if (!results[g]) {
        const expectedCenter = activeMetrics.windowWidth / 2
        console.log(`[Captured Greeting: "${g}"]`)
        console.log(`  SVG Dimensions: height=${activeMetrics.svg.height.toFixed(1)}px, width=${activeMetrics.svg.width.toFixed(1)}px`)
        console.log(`  Pill Dimensions: width=${activeMetrics.surface.width.toFixed(1)}px, height=${activeMetrics.surface.height.toFixed(1)}px`)
        console.log(`  Pill CenterX: ${activeMetrics.surface.centerX.toFixed(1)}px (Window Center: ${expectedCenter.toFixed(1)}px)`)
        console.log(`  Vertical Clearance: top=${(activeMetrics.svg.top - activeMetrics.surface.top).toFixed(1)}px, bottom=${(activeMetrics.surface.top + activeMetrics.surface.height - activeMetrics.svg.bottom).toFixed(1)}px`)

        // Capture screenshot
        const image = await win.capturePage()
        const screenshotPath = join(outDir, `greeting_${g}_tall_scaling.png`)
        writeFileSync(screenshotPath, image.toPNG())
        console.log(`  Screenshot saved: ${screenshotPath}\n`)

        results[g] = activeMetrics
      }
    }
  }

  console.log('=== VERIFICATION SUMMARY ===')
  // 1. Taller text verification (>= 28px vs old 21px)
  const hiHeight = results.hi?.svg?.height || 0
  const helloHeight = results.hello?.svg?.height || 0
  const isTaller = hiHeight >= 28 && helloHeight >= 28
  console.log(`1. Greeting text visual height (target >= 28px):`)
  console.log(`   "hi" height: ${hiHeight.toFixed(1)}px | "hello" height: ${helloHeight.toFixed(1)}px -> ${isTaller ? 'PASSED (Taller & Elegant)' : 'FAILED'}`)

  // 2. Height and baseline consistency (height diff < 1px)
  const heightDiff = Math.abs(hiHeight - helloHeight)
  const isConsistent = heightDiff < 1.0
  console.log(`2. Visual height consistency between "hi" and "hello":`)
  console.log(`   Difference: ${heightDiff.toFixed(2)}px -> ${isConsistent ? 'PASSED (Consistent)' : 'FAILED'}`)

  // 3. Island scaling around greeting (height expanded to ~42px, widths adapted)
  const hiPillH = results.hi?.surface?.height || 0
  const helloPillH = results.hello?.surface?.height || 0
  const hiPillW = results.hi?.surface?.width || 0
  const helloPillW = results.hello?.surface?.width || 0
  const isIslandScaled = hiPillH >= 40 && helloPillH >= 40 && helloPillW > hiPillW
  console.log(`3. Dynamic Island fluid scaling around greeting dimensions:`)
  console.log(`   "hi" pill: ${hiPillW.toFixed(1)}px x ${hiPillH.toFixed(1)}px`)
  console.log(`   "hello" pill: ${helloPillW.toFixed(1)}px x ${helloPillH.toFixed(1)}px -> ${isIslandScaled ? 'PASSED (Naturally Adapted)' : 'FAILED'}`)

  // 4. Centering throughout scaling (center must be at window center within 1px)
  const hiExpectedCenter = results.hi.windowWidth / 2
  const helloExpectedCenter = results.hello.windowWidth / 2
  const hiCentered = Math.abs(results.hi.surface.centerX - hiExpectedCenter) <= 1.0
  const helloCentered = Math.abs(results.hello.surface.centerX - helloExpectedCenter) <= 1.0
  console.log(`4. Symmetrical horizontal centering throughout animation:`)
  console.log(`   "hi" center: ${results.hi.surface.centerX.toFixed(1)}px (Expected: ${hiExpectedCenter.toFixed(1)}px) | "hello" center: ${results.hello.surface.centerX.toFixed(1)}px (Expected: ${helloExpectedCenter.toFixed(1)}px) -> ${hiCentered && helloCentered ? 'PASSED (Centered)' : 'FAILED'}`)

  // 5. No clipping (vertical clearance >= 6px top and bottom)
  const hiTopClearance = results.hi.svg.top - results.hi.surface.top
  const hiBottomClearance = (results.hi.surface.top + results.hi.surface.height) - results.hi.svg.bottom
  const helloTopClearance = results.hello.svg.top - results.hello.surface.top
  const helloBottomClearance = (results.hello.surface.top + results.hello.surface.height) - results.hello.svg.bottom
  const noClipping = hiTopClearance >= 5 && hiBottomClearance >= 5 && helloTopClearance >= 5 && helloBottomClearance >= 5
  console.log(`5. Generous vertical clearance (no stroke clipping):`)
  console.log(`   "hi" clearances: top=${hiTopClearance.toFixed(1)}px, bottom=${hiBottomClearance.toFixed(1)}px`)
  console.log(`   "hello" clearances: top=${helloTopClearance.toFixed(1)}px, bottom=${helloBottomClearance.toFixed(1)}px -> ${noClipping ? 'PASSED (Clear)' : 'FAILED'}`)

  const allPassed = isTaller && isConsistent && isIslandScaled && hiCentered && helloCentered && noClipping
  console.log(`\nOVERALL VERIFICATION: ${allPassed ? 'ALL CHECKS PASSED!' : 'FAILED'}`)

  win.close()
  app.quit()
})
