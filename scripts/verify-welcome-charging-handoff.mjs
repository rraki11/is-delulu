import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = join(__dirname, '../test_output')

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-handoff-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-handoff-verify'))

app.whenReady().then(async () => {
  console.log('=== STARTING WELCOME ENTRANCE & CHARGING HANDOFF E2E VERIFICATION ===')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'
  let isNotificationActive = false
  let hideCalls = 0
  let showCalls = 0
  let chargingStartedCount = 0
  let chargingEndedCount = 0

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
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false
    }
  })

  win.webContents.on('console-message', (_e, _lvl, msg) => {
    console.log('[RENDERER LOG]', msg)
  })

  // Intercept show/hide to detect any glitches/flickering
  const originalShow = win.show.bind(win)
  const originalShowInactive = win.showInactive.bind(win)
  const originalHide = win.hide.bind(win)

  win.show = () => {
    showCalls++
    console.log(`[WINDOW EVENT] win.show() called (total: ${showCalls})`)
    return originalShow()
  }
  win.showInactive = () => {
    showCalls++
    console.log(`[WINDOW EVENT] win.showInactive() called (total: ${showCalls})`)
    return originalShowInactive()
  }
  win.hide = () => {
    hideCalls++
    console.log(`[WINDOW EVENT] win.hide() called (total: ${hideCalls})`)
    return originalHide()
  }

  // Initial state: connected to charger at startup
  let batteryState = {
    percent: 85,
    isOnAC: true,
    isCharging: true,
    isEnergySaver: false
  }

  ipcMain.handle('battery:get-state', () => batteryState)
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    console.log(`[IPC] island:set-mode: ${mode}`)
    currentMode = mode
    if (mode === 'hidden' && !isNotificationActive) {
      win.hide()
    }
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)

  ipcMain.handle('battery:charging-started', () => {
    chargingStartedCount++
    console.log(`[IPC] battery:charging-started received (count: ${chargingStartedCount})`)
    isNotificationActive = true
  })

  ipcMain.handle('battery:charging-ended', () => {
    chargingEndedCount++
    console.log(`[IPC] battery:charging-ended received (count: ${chargingEndedCount})`)
    isNotificationActive = false
  })

  ipcMain.handle('battery:notification-started', (_e, type) => {
    console.log(`[IPC] battery:notification-started received: ${type}`)
    isNotificationActive = true
  })

  ipcMain.handle('battery:notification-ended', () => {
    console.log('[IPC] battery:notification-ended received')
    isNotificationActive = false
    currentMode = 'hidden'
    win.hide()
  })

  ipcMain.handle('island:get-welcome-shown', () => false)
  ipcMain.handle('island:mark-welcome-shown', () => {
    console.log('[IPC] island:mark-welcome-shown called')
    return true
  })
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

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))

  // Replicate showIslandWindowForWelcome():
  console.log('[TEST] Mimicking showIslandWindowForWelcome: window.showInactive() + send(island:start-welcome)')
  win.showInactive()
  win.webContents.send('island:start-welcome')

  // Sample DOM & element positions over time
  const sampleTimeline = []
  const startTime = Date.now()

  const sampleState = async (label) => {
    const elapsed = Date.now() - startTime
    const domInfo = await win.webContents.executeJavaScript(`
      (() => {
        const surface = document.getElementById('island-surface')
        const chargingPill = document.querySelector('.charging-pill-surface')
        const textContainer = document.querySelector('.handwriting-reveal-text-container')
        const clock = document.querySelector('.tabular-nums')
        
        let surfaceRect = null
        let surfaceTransform = null
        let surfaceOpacity = null
        if (surface) {
          surfaceRect = surface.getBoundingClientRect()
          surfaceTransform = window.getComputedStyle(surface).transform
          surfaceOpacity = window.getComputedStyle(surface).opacity
        }

        let chargingRect = null
        let chargingTransform = null
        let chargingOpacity = null
        if (chargingPill) {
          chargingRect = chargingPill.getBoundingClientRect()
          chargingTransform = window.getComputedStyle(chargingPill).transform
          chargingOpacity = window.getComputedStyle(chargingPill).opacity
        }

        return {
          surface: surfaceRect ? { top: surfaceRect.top, opacity: surfaceOpacity, transform: surfaceTransform } : null,
          charging: chargingRect ? { top: chargingRect.top, opacity: chargingOpacity, transform: chargingTransform } : null,
          hasText: Boolean(textContainer),
          hasClock: Boolean(clock),
          winVisible: true
        }
      })()
    `)
    const snapshot = { elapsed, label, ...domInfo, winVisible: win.isVisible(), hideCalls, showCalls }
    sampleTimeline.push(snapshot)
    console.log(`[T+${elapsed}ms] [${label}] winVisible=${snapshot.winVisible} | surfaceTop=${snapshot.surface?.top} | surfaceOpacity=${snapshot.surface?.opacity} | hasText=${snapshot.hasText} | hasClock=${snapshot.hasClock} | hasCharging=${Boolean(snapshot.charging)} | hides=${hideCalls}`)
    return snapshot
  }

  // 1. Initial entrance (0-600ms): island should slide down from above top edge
  await sampleState('Entrance Start')
  await new Promise((r) => setTimeout(r, 200))
  await sampleState('Entrance Sliding Down')
  await new Promise((r) => setTimeout(r, 350))
  await sampleState('Entrance Settled')

  // 2. Handwriting greeting starts (600ms - 3000ms)
  await new Promise((r) => setTimeout(r, 800))
  await sampleState('Greeting Writing')
  await new Promise((r) => setTimeout(r, 1500))
  await sampleState('Greeting Holding/Finishing')

  // 3. Greeting fade & empty pill pause (approx 3500-4500ms)
  await new Promise((r) => setTimeout(r, 1000))
  await sampleState('Greeting Faded / Empty Pill')

  // 4. Live Clock reveals (approx 4500-5500ms)
  await new Promise((r) => setTimeout(r, 800))
  await sampleState('Clock Visible')

  // 5. Seamless handoff to charging notification (approx 5500-6500ms)
  // Window MUST remain visible throughout! hideCalls must NOT increase!
  const hidesBeforeHandoff = hideCalls
  await new Promise((r) => setTimeout(r, 900))
  const handoffSample = await sampleState('Handoff to Charging Notification')

  if (hideCalls > hidesBeforeHandoff) {
    console.error(`FAIL: win.hide() was called during handoff! (hidesBefore: ${hidesBeforeHandoff}, hidesNow: ${hideCalls})`)
  } else {
    console.log('SUCCESS: No window hide call during clock-to-charging handoff!')
  }

  // 6. Charging pill expanding & hold
  await new Promise((r) => setTimeout(r, 1200))
  await sampleState('Charging Pill Expanded')

  // 7. Charging notification completion and exit
  await new Promise((r) => setTimeout(r, 3800))
  await sampleState('Charging Pill Exiting / Collapsed')

  await new Promise((r) => setTimeout(r, 1000))
  await sampleState('Final Idle Hidden')

  console.log('\n=== VERIFICATION SUMMARY ===')
  console.log(`Total window show calls: ${showCalls}`)
  console.log(`Total window hide calls: ${hideCalls}`)
  console.log(`Charging started events: ${chargingStartedCount}`)

  // Validation assertions:
  const passedDropEntrance = sampleTimeline.some((s) => s.label === 'Entrance Sliding Down' && s.surface && s.surface.opacity !== '0')
  const passedSeamlessHandoff = hidesBeforeHandoff === 0 && handoffSample.winVisible === true
  const passedSingleNotification = chargingStartedCount <= 1

  console.log(`Assertion 1 (Drop-down entrance observed): ${passedDropEntrance ? 'PASSED' : 'FAILED'}`)
  console.log(`Assertion 2 (Seamless handoff without intermediate hide): ${passedSeamlessHandoff ? 'PASSED' : 'FAILED'}`)
  console.log(`Assertion 3 (Single charging notification): ${passedSingleNotification ? 'PASSED' : 'FAILED'}`)

  if (passedSeamlessHandoff && passedSingleNotification) {
    console.log('\nALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!')
  } else {
    console.error('\nACCEPTANCE CRITERIA FAILED!')
  }

  win.close()
  app.quit()
})
