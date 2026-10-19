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

app.setName('is-delulu-scenarios-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-scenarios-verify'))

app.whenReady().then(async () => {
  console.log('=== STARTING TEST SUITE FOR ALL 5 WELCOME & CHARGING SCENARIOS ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'
  let isNotificationActive = false
  let showCalls = 0
  let hideCalls = 0
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

  const originalShowInactive = win.showInactive.bind(win)
  win.showInactive = () => {
    showCalls++
    console.log(`[WINDOW EVENT] win.showInactive() called (total: ${showCalls})`)
    return originalShowInactive()
  }

  const originalHide = win.hide.bind(win)
  win.hide = () => {
    hideCalls++
    console.log(`[WINDOW EVENT] win.hide() called (total: ${hideCalls})`)
    return originalHide()
  }

  let currentBatteryState = {
    percent: 85,
    isOnAC: true,
    isCharging: true,
    isEnergySaver: false
  }

  ipcMain.handle('battery:get-state', () => currentBatteryState)
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

  const sampleState = async () => {
    return await win.webContents.executeJavaScript(`
      (() => {
        const surface = document.getElementById('island-surface')
        const chargingPill = document.querySelector('.charging-pill-surface')
        const textContainer = document.querySelector('.handwriting-reveal-text-container')
        const clockContainer = document.querySelector('.island-clock-container')
        
        let surfaceTop = null
        let surfaceOpacity = null
        if (surface) {
          const rect = surface.getBoundingClientRect()
          surfaceTop = rect.top
          surfaceOpacity = parseFloat(window.getComputedStyle(surface).opacity)
        }

        let chargingTop = null
        let chargingOpacity = null
        if (chargingPill) {
          const rect = chargingPill.getBoundingClientRect()
          chargingTop = rect.top
          chargingOpacity = parseFloat(window.getComputedStyle(chargingPill).opacity)
        }

        const hasClock = Boolean(clockContainer && parseFloat(window.getComputedStyle(clockContainer).opacity) > 0.5)
        const hasCharging = Boolean(chargingPill && parseFloat(window.getComputedStyle(chargingPill).opacity) > 0.5)
        const hasText = Boolean(textContainer && parseFloat(window.getComputedStyle(textContainer).opacity) > 0.1)

        return {
          surfaceTop,
          surfaceOpacity,
          chargingTop,
          chargingOpacity,
          hasCharging,
          hasText,
          hasClock
        }
      })()
    `)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Startup with charger already connected
  // Order: Entrance starts -> Entrance completes -> Greeting starts -> Greeting completes -> Clock appears -> Charging handoff begins -> Charging notification completes -> One final hide/exit
  // ───────────────────────────────────────────────────────────────────────────
  console.log('>>> [SCENARIO 1] STARTUP WITH CHARGER ALREADY CONNECTED')
  currentBatteryState = {
    percent: 85,
    isOnAC: true,
    isCharging: true,
    isEnergySaver: false
  }
  showCalls = 0
  hideCalls = 0
  isNotificationActive = false
  currentMode = 'collapsed'

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  win.showInactive()
  win.webContents.send('island:start-welcome')

  const s1Start = await sampleState()
  console.log(`[SCENARIO 1] T+0ms: surfaceTop=${s1Start.surfaceTop}, surfaceOpacity=${s1Start.surfaceOpacity}, winVisible=${win.isVisible()}`)
  
  await new Promise(r => setTimeout(r, 250))
  const s1Sliding = await sampleState()
  console.log(`[SCENARIO 1] T+250ms (Sliding): surfaceTop=${s1Sliding.surfaceTop}, surfaceOpacity=${s1Sliding.surfaceOpacity}`)

  await new Promise(r => setTimeout(r, 350))
  const s1Settled = await sampleState()
  console.log(`[SCENARIO 1] T+600ms (Settled): surfaceTop=${s1Settled.surfaceTop}, surfaceOpacity=${s1Settled.surfaceOpacity}`)

  // Poll until clock reveals
  let s1Clock = null
  for (let i = 0; i < 70; i++) {
    await new Promise(r => setTimeout(r, 100))
    const s = await sampleState()
    if (s.hasClock) {
      s1Clock = s
      console.log(`[SCENARIO 1] Clock revealed! hides=${hideCalls}`)
      break
    }
  }

  const hidesAtClock = hideCalls

  // Poll until charging pill mounts (handoff after 800ms dwell)
  let s1Charging = null
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100))
    const s = await sampleState()
    if (s.hasCharging) {
      s1Charging = s
      console.log(`[SCENARIO 1] Charging handoff observed! hasCharging=true, chargingOpacity=${s.chargingOpacity}, hides=${hideCalls}`)
      break
    }
  }

  // Take screenshot of charging handoff
  const img1 = await win.capturePage()
  writeFileSync(join(outDir, '01_scenario1_charging_handoff.png'), img1.toPNG())

  const s1HandoffSeamless = hidesAtClock === 0 && hideCalls === 0 && Boolean(s1Charging?.hasCharging)
  console.log(`[SCENARIO 1] Seamless handoff without hide? ${s1HandoffSeamless ? 'PASSED' : 'FAILED'}`)

  // Poll until charging notification completes and window hides
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 100))
    if (!win.isVisible() || hideCalls >= 1) {
      console.log(`[SCENARIO 1] Charging notification finished and window hidden! hides=${hideCalls}`)
      break
    }
  }

  const s1Passed = s1Sliding.surfaceTop < 0 && s1Settled.surfaceTop === 0 && s1HandoffSeamless && hideCalls === 1
  console.log(`>>> [SCENARIO 1] OVERALL: ${s1Passed ? 'PASSED' : 'FAILED'}\n`)

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Startup with charger disconnected
  // Sequence: Drop down entrance -> greeting -> clock dwell (2600ms) -> smooth slide up exit -> hide
  // ───────────────────────────────────────────────────────────────────────────
  console.log('>>> [SCENARIO 2] STARTUP WITH CHARGER DISCONNECTED')
  currentBatteryState = {
    percent: 75,
    isOnAC: false,
    isCharging: false,
    isEnergySaver: false
  }
  showCalls = 0
  hideCalls = 0
  isNotificationActive = false
  currentMode = 'collapsed'

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  win.showInactive()
  win.webContents.send('island:start-welcome')

  const s2Start = await sampleState()
  console.log(`[SCENARIO 2] T+0ms: surfaceTop=${s2Start.surfaceTop}`)

  await new Promise(r => setTimeout(r, 250))
  const s2Sliding = await sampleState()
  console.log(`[SCENARIO 2] T+250ms (Sliding): surfaceTop=${s2Sliding.surfaceTop}`)

  // Poll until clock reveals
  let s2Clock = null
  for (let i = 0; i < 70; i++) {
    await new Promise(r => setTimeout(r, 100))
    const s = await sampleState()
    if (s.hasClock) {
      s2Clock = s
      console.log(`[SCENARIO 2] Clock revealed! hides=${hideCalls}`)
      break
    }
  }

  // Poll until 2600ms clock dwell finishes and window hides
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 100))
    if (!win.isVisible() || hideCalls >= 1) {
      console.log(`[SCENARIO 2] Post-dwell exit complete! winVisible=${win.isVisible()}, hides=${hideCalls}`)
      break
    }
  }

  const s2Passed = s2Sliding.surfaceTop < 0 && Boolean(s2Clock?.hasClock) && hideCalls >= 1
  console.log(`>>> [SCENARIO 2] OVERALL: ${s2Passed ? 'PASSED' : 'FAILED'}\n`)

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Connecting charger during greeting
  // Sequence: Greeting is playing -> charger connects -> charging notification queued -> clock appears -> hands off directly to charging
  // ───────────────────────────────────────────────────────────────────────────
  console.log('>>> [SCENARIO 3] CONNECTING CHARGER DURING GREETING')
  currentBatteryState = {
    percent: 60,
    isOnAC: false,
    isCharging: false,
    isEnergySaver: false
  }
  showCalls = 0
  hideCalls = 0
  isNotificationActive = false
  currentMode = 'collapsed'

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  win.showInactive()
  win.webContents.send('island:start-welcome')

  // During greeting writing (T+1500ms), plug in charger!
  await new Promise(r => setTimeout(r, 1500))
  console.log('[SCENARIO 3] Connecting charger during greeting...')
  currentBatteryState = {
    percent: 60,
    isOnAC: true,
    isCharging: true,
    isEnergySaver: false
  }
  win.webContents.send('battery:update', currentBatteryState)
  win.webContents.send('battery:charging-started', currentBatteryState)

  // Poll for clock
  for (let i = 0; i < 70; i++) {
    await new Promise(r => setTimeout(r, 100))
    const s = await sampleState()
    if (s.hasClock) {
      console.log(`[SCENARIO 3] Clock revealed after greeting! hides=${hideCalls}`)
      break
    }
  }

  // Poll for charging handoff
  let s3Charging = null
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100))
    const s = await sampleState()
    if (s.hasCharging) {
      s3Charging = s
      console.log(`[SCENARIO 3] Seamless handoff to charging observed! hides=${hideCalls}`)
      break
    }
  }

  const s3Passed = Boolean(s3Charging?.hasCharging) && hideCalls === 0
  console.log(`>>> [SCENARIO 3] OVERALL: ${s3Passed ? 'PASSED' : 'FAILED'}\n`)

  // Wait for charging notification to complete
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 100))
    if (!win.isVisible() || hideCalls >= 1) break
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Connecting charger during clock transition
  // Sequence: Greeting finishes, clock transition occurs -> charger connects -> seamless handoff to charging
  // ───────────────────────────────────────────────────────────────────────────
  console.log('>>> [SCENARIO 4] CONNECTING CHARGER DURING CLOCK TRANSITION')
  currentBatteryState = {
    percent: 50,
    isOnAC: false,
    isCharging: false,
    isEnergySaver: false
  }
  showCalls = 0
  hideCalls = 0
  isNotificationActive = false
  currentMode = 'collapsed'

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  win.showInactive()
  win.webContents.send('island:start-welcome')

  // Wait until clock starts revealing
  for (let i = 0; i < 70; i++) {
    await new Promise(r => setTimeout(r, 100))
    const s = await sampleState()
    if (s.hasClock) {
      console.log('[SCENARIO 4] Clock revealed! Connecting charger...')
      currentBatteryState = {
        percent: 50,
        isOnAC: true,
        isCharging: true,
        isEnergySaver: false
      }
      win.webContents.send('battery:update', currentBatteryState)
      win.webContents.send('battery:charging-started', currentBatteryState)
      break
    }
  }

  // Poll for charging handoff
  let s4Charging = null
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100))
    const s = await sampleState()
    if (s.hasCharging) {
      s4Charging = s
      console.log(`[SCENARIO 4] Seamless handoff to charging observed! hides=${hideCalls}`)
      break
    }
  }

  const s4Passed = Boolean(s4Charging?.hasCharging) && hideCalls === 0
  console.log(`>>> [SCENARIO 4] OVERALL: ${s4Passed ? 'PASSED' : 'FAILED'}\n`)

  // Wait for charging notification to complete
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 100))
    if (!win.isVisible() || hideCalls >= 1) break
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Resuming from sleep
  // Sequence: powerMonitor resume event -> triggers fresh welcome -> drops down from top edge
  // ───────────────────────────────────────────────────────────────────────────
  console.log('>>> [SCENARIO 5] RESUMING FROM SLEEP')
  showCalls = 0
  hideCalls = 0
  isNotificationActive = false
  currentMode = 'collapsed'
  win.showInactive()
  win.webContents.send('island:mode-changed', 'collapsed')
  win.webContents.send('island:lifecycle-event', { type: 'resume' })

  const s5Start = await sampleState()
  console.log(`[SCENARIO 5] T+0ms (Resume): surfaceTop=${s5Start.surfaceTop}, opacity=${s5Start.surfaceOpacity}`)

  await new Promise(r => setTimeout(r, 250))
  const s5Sliding = await sampleState()
  console.log(`[SCENARIO 5] T+250ms (Sliding): surfaceTop=${s5Sliding.surfaceTop}`)

  await new Promise(r => setTimeout(r, 350))
  const s5Settled = await sampleState()
  console.log(`[SCENARIO 5] T+600ms (Settled): surfaceTop=${s5Settled.surfaceTop}`)

  const s5Passed = s5Sliding.surfaceTop < 0 && s5Settled.surfaceTop === 0
  console.log(`>>> [SCENARIO 5] OVERALL: ${s5Passed ? 'PASSED' : 'FAILED'}\n`)

  // ───────────────────────────────────────────────────────────────────────────
  // FINAL VERIFICATION REPORT
  // ───────────────────────────────────────────────────────────────────────────
  console.log('====================================================')
  console.log('              ALL 5 SCENARIOS SUMMARY               ')
  console.log('====================================================')
  console.log(`Scenario 1 (Startup with Charger Connected):  ${s1Passed ? 'PASSED' : 'FAILED'}`)
  console.log(`Scenario 2 (Startup with Charger Disconnected): ${s2Passed ? 'PASSED' : 'FAILED'}`)
  console.log(`Scenario 3 (Connecting Charger During Greeting): ${s3Passed ? 'PASSED' : 'FAILED'}`)
  console.log(`Scenario 4 (Connecting Charger During Clock):    ${s4Passed ? 'PASSED' : 'FAILED'}`)
  console.log(`Scenario 5 (Resuming From Sleep):                ${s5Passed ? 'PASSED' : 'FAILED'}`)
  console.log('====================================================')

  const allPassed = s1Passed && s2Passed && s3Passed && s4Passed && s5Passed
  if (allPassed) {
    console.log('\n*** ALL 5 REQUIRED SCENARIOS SUCCESSFULLY VERIFIED! ***\n')
  } else {
    console.error('\n*** ONE OR MORE SCENARIOS FAILED! ***\n')
  }

  win.close()
  app.quit()
})
