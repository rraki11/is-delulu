import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.setName('is-delulu-verify-entrance')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-entrance-test-' + Date.now()))

const artifactsDir = 'C:\\Users\\rrake\\.gemini\\antigravity-ide\\brain\\10f883e6-ab71-429b-bd77-f0d438e60e3d'
const screenshotsDir = join(artifactsDir, 'entrance-verification')
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

app.whenReady().then(async () => {
  console.log('=== STARTING TOP-DOWN ISLAND ENTRANCE VERIFICATION ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workArea

  let currentBatteryState = {
    percent: 85,
    isCharging: false,
    isOnAC: false,
    isEnergySaver: false
  }

  let hasShownWelcome = false
  ipcMain.handle('island:get-welcome-shown', () => hasShownWelcome)
  ipcMain.handle('island:check-welcome', () => {
    return { shouldWelcome: !hasShownWelcome }
  })
  ipcMain.handle('island:mark-welcome-shown', () => {
    hasShownWelcome = true
  })

  let currentMode = 'collapsed'
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    return currentMode
  })
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)

  ipcMain.handle('battery:get-state', () => currentBatteryState)
  ipcMain.handle('battery:notification-started', () => {})
  ipcMain.handle('battery:notification-ended', () => {})
  ipcMain.handle('battery:charging-started', () => {})
  ipcMain.handle('battery:charging-ended', () => {})

  ipcMain.handle('preferences:get', () => ({
    userName: 'User',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }))
  ipcMain.handle('preferences:update', (_e, p) => p)
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('theme:get-accent-palette', () => ({
    primary: '#10B981',
    primaryLight: '#34D399',
    secondary: '#059669',
    highlight: '#6EE7B7',
    glow: 'rgba(16, 185, 129, 0.3)',
    subtle: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.25)',
    text: '#FFFFFF'
  }))
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 10,
    memoryUsedGb: 5,
    memoryTotalGb: 16,
    memoryPercent: 30,
    platform: 'win32',
    arch: 'x64',
    hostname: 'TEST-PC',
    uptimeFormatted: '1h',
    batteryPercent: currentBatteryState.percent,
    isCharging: currentBatteryState.isCharging
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => ({ isPlaying: false }))
  ipcMain.handle('routines:get', () => [])

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
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Sample function to read position, translateY, opacity, and writing state
  const sampleMetrics = async () => {
    return await win.webContents.executeJavaScript(`(() => {
      const surface = document.getElementById('island-surface');
      const greetingEl = document.querySelector('svg[aria-label]');
      const clockEl = document.querySelector('.tabular-nums');

      if (!surface) return null;
      const rect = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      
      // Parse transform translateY
      const transform = style.transform;
      let translateY = 0;
      if (transform && transform !== 'none') {
        const matrix = transform.match(/matrix.*\((.+)\)/);
        if (matrix) {
          const values = matrix[1].split(',').map(s => parseFloat(s.trim()));
          translateY = values[5] !== undefined ? values[5] : values[13] || 0;
        }
      }

      return {
        top: Math.round(rect.top),
        height: Math.round(rect.height),
        translateY: Math.round(translateY),
        opacity: parseFloat(style.opacity),
        hasGreetingSvg: !!greetingEl,
        greetingOpacity: greetingEl?.parentElement ? parseFloat(window.getComputedStyle(greetingEl.parentElement).opacity) : 0,
        hasClock: !!clockEl,
        clockOpacity: clockEl?.parentElement ? parseFloat(window.getComputedStyle(clockEl.parentElement).opacity) : 0
      };
    })()`)
  }

  win.loadFile(join(__dirname, '../out/renderer/index.html'))
  await new Promise(r => win.webContents.once('did-finish-load', r))

  console.log('[TEST] Tracking entrance timeline from renderer mount...')
  const samples = []
  const startTime = Date.now()

  // High-frequency polling during entrance (first 1000ms)
  while (Date.now() - startTime < 1200) {
    const elapsed = Date.now() - startTime
    const metrics = await sampleMetrics()
    if (metrics) {
      samples.push({ elapsed, ...metrics })
    }
    await new Promise((r) => setTimeout(r, 25))
  }

  console.log('\n--- Entrance Timeline Samples (First 1200ms) ---')
  for (const s of samples) {
    if (s.elapsed % 80 < 30 || s.elapsed < 100) {
      console.log(
        `[${String(s.elapsed).padStart(4, ' ')}ms] translateY=${String(s.translateY).padStart(3, ' ')}px, top=${String(s.top).padStart(3, ' ')}px, opacity=${s.opacity.toFixed(2)} | greetingVisible=${s.greetingOpacity > 0.1}`
      )
    }
  }

  // Verification 1: Begins above screen top edge
  const earlySample = samples.find(s => s.elapsed <= 100) || samples[0]
  const settledSample = samples.find(s => s.elapsed >= 520 && s.elapsed <= 800)

  console.log('\n--- Entrance Verification Results ---')
  const beganAboveScreen = earlySample && (earlySample.top <= -10 || earlySample.translateY <= -15)
  console.log(`1. Island begins above the visible top edge: ${beganAboveScreen ? 'PASS' : 'FAIL'} (early top=${earlySample?.top}px, translateY=${earlySample?.translateY}px)`)

  const settledAtTop = settledSample && settledSample.top === 0 && settledSample.translateY === 0
  console.log(`2. Island smoothly settles at normal collapsed-pill position (top=0, translateY=0): ${settledAtTop ? 'PASS' : 'FAIL'} (settled top=${settledSample?.top}px)`)

  const noGreetingDuringEntrance = samples.filter(s => s.elapsed < 400).every(s => s.greetingOpacity < 0.1)
  console.log(`3. Greeting does NOT write until pill has settled: ${noGreetingDuringEntrance ? 'PASS' : 'FAIL'}`)

  // Capture screenshot of settled greeting
  const settledImage = await win.capturePage({ x: Math.round((screenWidth - 240) / 2), y: 0, width: 240, height: 60 })
  fs.writeFileSync(join(screenshotsDir, 'startup-settled.png'), settledImage.toPNG())

  // Verification 4: Resume from sleep lifecycle trigger
  console.log('\n--- Testing Resume From Sleep Entrance ---')
  // Trigger resume lifecycle event
  await win.webContents.send('island:lifecycle-event', { type: 'resume' })

  const resumeStartTime = Date.now()
  const resumeSamples = []
  while (Date.now() - resumeStartTime < 900) {
    const elapsed = Date.now() - resumeStartTime
    const metrics = await sampleMetrics()
    if (metrics) {
      resumeSamples.push({ elapsed, ...metrics })
    }
    await new Promise((r) => setTimeout(r, 30))
  }

  const resumeEarly = resumeSamples.find(s => s.elapsed <= 150) || resumeSamples[0]
  const resumeSettled = resumeSamples.find(s => s.elapsed >= 550)

  const resumeBeganAbove = resumeEarly && (resumeEarly.top <= -10 || resumeEarly.translateY <= -15)
  console.log(`4. Resume entrance starts above top edge: ${resumeBeganAbove ? 'PASS' : 'FAIL'} (early top=${resumeEarly?.top}px)`)
  console.log(`5. Resume entrance settles at top=0: ${resumeSettled && resumeSettled.top === 0 ? 'PASS' : 'FAIL'} (settled top=${resumeSettled?.top}px)`)

  // Capture screenshot after resume
  const resumeImage = await win.capturePage({ x: Math.round((screenWidth - 240) / 2), y: 0, width: 240, height: 60 })
  fs.writeFileSync(join(screenshotsDir, 'resume-settled.png'), resumeImage.toPNG())

  // Verification 6: Hover does NOT replay entrance
  console.log('\n--- Testing Normal Hover Behavior ---')
  await win.webContents.executeJavaScript(`(() => {
    const s = document.getElementById('island-surface');
    s?.dispatchEvent(new MouseEvent('pointerenter'));
  })()`)
  await new Promise(r => setTimeout(r, 200))
  const hoverMetrics = await sampleMetrics()
  console.log(`6. Hover maintains stable settled position without entrance replay: ${hoverMetrics?.top === 0 ? 'PASS' : 'FAIL'}`)

  const allPassed = beganAboveScreen && settledAtTop && noGreetingDuringEntrance && resumeBeganAbove && resumeSettled && hoverMetrics?.top === 0
  console.log(`\n>>> OVERALL TOP-DOWN ENTRANCE SUITE: ${allPassed ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED'} <<<`)

  win.close()
  app.quit()
})
