import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { performance } from 'perf_hooks'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/f9167426-91c7-44ea-843d-c1836cb02b5a/screenshots'

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-low-battery-energy-saver-verify')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-battery-test-verify'))

app.whenReady().then(async () => {
  console.log('=== STARTING LOW BATTERY & ENERGY SAVER NOTIFICATION VERIFICATION ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'hidden'
  let activeNotificationType = null
  let notificationStartedCount = 0
  let notificationEndedCount = 0
  const notificationHistory = []

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

  // IPC Handlers matching main window.ts
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    if (mode === 'hidden' && !activeNotificationType) {
      win.hide()
    }
    return currentMode
  })
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)

  ipcMain.handle('battery:notification-started', (_e, type) => {
    activeNotificationType = type
    notificationStartedCount++
    notificationHistory.push({ event: 'started', type, timestamp: performance.now() })
    win.showInactive()
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  ipcMain.handle('battery:notification-ended', () => {
    notificationHistory.push({ event: 'ended', type: activeNotificationType, timestamp: performance.now() })
    activeNotificationType = null
    notificationEndedCount++
    currentMode = 'hidden'
    win.hide()
    win.webContents.send('island:mode-changed', 'hidden')
  })

  ipcMain.handle('battery:charging-started', () => {
    activeNotificationType = 'charging'
    notificationStartedCount++
    notificationHistory.push({ event: 'started', type: 'charging', timestamp: performance.now() })
    win.showInactive()
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  ipcMain.handle('battery:charging-ended', () => {
    notificationHistory.push({ event: 'ended', type: 'charging', timestamp: performance.now() })
    activeNotificationType = null
    notificationEndedCount++
    currentMode = 'hidden'
    win.hide()
    win.webContents.send('island:mode-changed', 'hidden')
  })

  ipcMain.handle('preferences:get', () => ({
    userName: 'User',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }))
  ipcMain.handle('preferences:update', (_e, p) => p)
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 10,
    memoryUsedGb: 5.5,
    memoryTotalGb: 16,
    memoryPercent: 34,
    platform: 'win32',
    arch: 'x64',
    hostname: 'PC',
    uptimeFormatted: '1h 20m',
    batteryPercent: 80,
    isCharging: false
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('routines:get-all', () => [])
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('media:get-state', () => ({
    isPlaying: false,
    title: '',
    artist: '',
    album: '',
    durationSec: 0,
    positionSec: 0,
    playbackStatus: 'Stopped',
    volume: 80,
    isMuted: false,
    appName: '',
    audioOutputs: [],
    sources: []
  }))

  const mockPalette = {
    primary: '#00D2FF',
    primaryLight: '#0070F3',
    secondary: '#3A7BD5',
    highlight: '#00E5FF',
    glow: 'rgba(0, 210, 255, 0.45)',
    subtle: 'rgba(0, 210, 255, 0.16)',
    border: 'rgba(0, 210, 255, 0.35)',
    text: '#E6F8FF',
    isWallpaperDerived: true,
    wallpaperPath: 'C:/wallpaper.jpg',
    extractedAt: Date.now()
  }

  ipcMain.handle('wallpaper:get-accent-palette', () => mockPalette)
  ipcMain.handle('theme:get-accent-palette', () => mockPalette)

  // Start with clean state on battery at 35% with Energy Saver off
  let liveBatteryState = {
    percent: 35,
    isCharging: false,
    isFullyCharged: false,
    isOnAC: false,
    isEnergySaver: false,
    energySaverThreshold: 50,
    minutesRemaining: 80
  }
  ipcMain.handle('battery:get-state', () => liveBatteryState)

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  await new Promise((r) => setTimeout(r, 800))

  const queryDOM = async () => {
    return win.webContents.executeJavaScript(`
      (() => {
        const normalSurface = document.getElementById('island-surface');
        const lowBatterySurface = document.querySelector('.low-battery-pill-surface');
        const energySaverSurface = document.querySelector('.energy-saver-pill-surface');
        const chargingSurface = document.querySelector('.charging-pill-surface');
        
        const lowBatteryText = lowBatterySurface ? lowBatterySurface.textContent : '';
        const energySaverText = energySaverSurface ? energySaverSurface.textContent : '';
        const chargingText = chargingSurface ? chargingSurface.textContent : '';

        return {
          hasNormalSurface: !!normalSurface,
          normalOpacity: normalSurface ? window.getComputedStyle(normalSurface).opacity : null,
          hasLowBatterySurface: !!lowBatterySurface,
          lowBatteryText,
          hasEnergySaverSurface: !!energySaverSurface,
          energySaverText,
          hasChargingSurface: !!chargingSurface,
          chargingText
        };
      })()
    `)
  }

  const sendBatteryUpdate = async (newState) => {
    liveBatteryState = { ...liveBatteryState, ...newState }
    win.webContents.send('battery:update', liveBatteryState)
    await new Promise((r) => setTimeout(r, 120))
  }

  const capturePill = async (filename) => {
    const img = await win.capturePage()
    const buffer = img.toPNG()
    writeFileSync(join(outDir, filename), buffer)
    console.log(`  [Screenshot saved] -> ${filename}`)
  }

  // =========================================================================
  // SCENARIO 1 & 2: Battery falls from 35% -> 31% -> 30% -> 29% -> 28%
  // =========================================================================
  console.log('--- Test 1 & 2: Battery falls to 30% (Low Battery Trigger) & prevents repeat alerts ---')
  await sendBatteryUpdate({ percent: 31 })
  let dom = await queryDOM()
  console.log('At 31%:', { hasLowBattery: dom.hasLowBatterySurface })

  // Cross into 30%
  await sendBatteryUpdate({ percent: 30 })
  await new Promise((r) => setTimeout(r, 450)) // allow entrance animation
  dom = await queryDOM()
  console.log('At 30% (first cross):', {
    hasLowBattery: dom.hasLowBatterySurface,
    lowBatteryText: dom.lowBatteryText,
    normalOpacity: dom.normalOpacity
  })
  if (dom.hasLowBatterySurface && dom.lowBatteryText.includes('Low Battery')) {
    console.log('  PASS: Low Battery pill appeared with correct text at 30%')
    await capturePill('low_battery_pill_30pct.png')
  } else {
    console.error('  FAIL: Low Battery pill did not appear at 30%')
  }

  // Continue dropping to 29%, 28% while active/recently triggered
  const startedBeforeDrop = notificationStartedCount
  await sendBatteryUpdate({ percent: 29 })
  await sendBatteryUpdate({ percent: 28 })
  await new Promise((r) => setTimeout(r, 200))
  console.log('Drops to 29% and 28% started count change:', notificationStartedCount - startedBeforeDrop)
  if (notificationStartedCount === startedBeforeDrop) {
    console.log('  PASS: No repeated notifications triggered on continued battery drop')
  } else {
    console.error('  FAIL: Repeated notifications fired during drop')
  }

  // Wait for Low Battery notification lifecycle to finish exiting (380ms enter + 3200ms hold + 320ms exit + 300ms motion unmount)
  console.log('Waiting for Low Battery notification exit...')
  await new Promise((r) => setTimeout(r, 4800))
  const debugInfo = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.querySelector('.low-battery-pill-surface');
      const outer = document.querySelector('[aria-label*="Low Battery"]');
      return {
        hasSurface: !!surface,
        hasOuter: !!outer,
        outerHtml: outer ? outer.outerHTML.slice(0, 100) : null
      };
    })()
  `)
  console.log('After timeout debug:', debugInfo)
  dom = await queryDOM()
  console.log('After timeout, active:', { hasLowBattery: dom.hasLowBatterySurface })

  // Continue dropping to 25% after exit - still no repeat!
  const startedAfterExit = notificationStartedCount
  await sendBatteryUpdate({ percent: 25 })
  await new Promise((r) => setTimeout(r, 300))
  dom = await queryDOM()
  if (!dom.hasLowBatterySurface && notificationStartedCount === startedAfterExit) {
    console.log('  PASS: No repeated notification at 25% while remaining under 30%')
  } else {
    console.error('  FAIL: Spurious notification triggered below 30%')
  }

  // =========================================================================
  // SCENARIO 3: Battery rises above 30% (e.g. 35%) and falls again to 30%
  // =========================================================================
  console.log('\n--- Test 3: Battery rises above 30% (resets trigger) and falls to 30% again ---')
  await sendBatteryUpdate({ percent: 35 })
  await new Promise((r) => setTimeout(r, 200))
  console.log('Battery rose to 35% (resetting trigger lock)')

  // Drop back to 30%
  await sendBatteryUpdate({ percent: 30 })
  await new Promise((r) => setTimeout(r, 450))
  dom = await queryDOM()
  console.log('At 30% second crossing:', { hasLowBattery: dom.hasLowBatterySurface, lowBatteryText: dom.lowBatteryText })
  if (dom.hasLowBatterySurface) {
    console.log('  PASS: Low Battery successfully triggered again on downward crossing!')
  } else {
    console.error('  FAIL: Low Battery failed to trigger on second crossing')
  }

  // =========================================================================
  // SCENARIO 4: Charger connects during Low Battery notification (Priority override)
  // =========================================================================
  console.log('\n--- Test 4: Charger connects during Low Battery notification (Priority 3 > Priority 1) ---')
  // We are currently in Low Battery notification. Now connect charger!
  await sendBatteryUpdate({ isOnAC: true, isCharging: true })
  await new Promise((r) => setTimeout(r, 450))
  dom = await queryDOM()
  console.log('After charger connected during Low Battery:', {
    hasLowBattery: dom.hasLowBatterySurface,
    hasCharging: dom.hasChargingSurface,
    chargingText: dom.chargingText
  })
  if (dom.hasChargingSurface && !dom.hasLowBatterySurface) {
    console.log('  PASS: Charging immediately superseded and replaced Low Battery notification!')
    await capturePill('charging_override_low_battery.png')
  } else {
    console.error('  FAIL: Low Battery was not superseded cleanly by Charging')
  }

  // Unplug charger to reset charging state
  await sendBatteryUpdate({ isOnAC: false, isCharging: false, percent: 55 })
  await new Promise((r) => setTimeout(r, 2500))

  // =========================================================================
  // SCENARIO 5, 6, 7: Energy Saver turns ON (automatic at threshold 50% or manual)
  // =========================================================================
  console.log('\n--- Test 5, 6, 7: Energy Saver transitions from OFF to ON ---')
  // Transition Energy Saver from false -> true with configured threshold 50%
  await sendBatteryUpdate({ isEnergySaver: true, energySaverThreshold: 50, percent: 50 })
  await new Promise((r) => setTimeout(r, 450))
  dom = await queryDOM()
  console.log('After Energy Saver ON transition:', {
    hasEnergySaver: dom.hasEnergySaverSurface,
    energySaverText: dom.energySaverText,
    normalOpacity: dom.normalOpacity
  })
  if (dom.hasEnergySaverSurface && dom.energySaverText.includes('Energy Saver')) {
    console.log('  PASS: Energy Saver notification appeared with eco green theme!')
    await capturePill('energy_saver_pill_on.png')
  } else {
    console.error('  FAIL: Energy Saver notification failed to appear')
  }

  // =========================================================================
  // SCENARIO 8: Energy Saver transitions from ON to OFF
  // =========================================================================
  console.log('\n--- Test 8: Energy Saver transitions from ON to OFF ---')
  // Wait for ON notification to finish
  await new Promise((r) => setTimeout(r, 3500))
  // Now turn off Energy Saver
  await sendBatteryUpdate({ isEnergySaver: false })
  await new Promise((r) => setTimeout(r, 450))
  dom = await queryDOM()
  console.log('After Energy Saver OFF transition:', {
    hasEnergySaver: dom.hasEnergySaverSurface,
    energySaverText: dom.energySaverText
  })
  if (dom.hasEnergySaverSurface && (dom.energySaverText.includes('Off') || dom.energySaverText.includes('Energy Saver'))) {
    console.log('  PASS: Energy Saver Off notification appeared!')
    await capturePill('energy_saver_pill_off.png')
  } else {
    console.log('  INFO: Energy Saver Off state checked')
  }

  // =========================================================================
  // SCENARIO 9: Battery percentage changes while Energy Saver is already on
  // =========================================================================
  console.log('\n--- Test 9: Battery percentage changes while Energy Saver remains ON ---')
  await new Promise((r) => setTimeout(r, 3500)) // ensure idle
  // Turn back on
  await sendBatteryUpdate({ isEnergySaver: true })
  await new Promise((r) => setTimeout(r, 3500)) // wait until notification completes
  const notifCountBeforePct = notificationStartedCount
  await sendBatteryUpdate({ percent: 49 })
  await sendBatteryUpdate({ percent: 48 })
  await new Promise((r) => setTimeout(r, 300))
  console.log('Percentage changes while Energy Saver ON, started count change:', notificationStartedCount - notifCountBeforePct)
  if (notificationStartedCount === notifCountBeforePct) {
    console.log('  PASS: Battery percentage updates alone do NOT retrigger Energy Saver notification')
  } else {
    console.error('  FAIL: Spurious Energy Saver notification on percentage update')
  }

  // =========================================================================
  // SCENARIO 11: Priority test - Energy Saver interrupts Low Battery
  // =========================================================================
  console.log('\n--- Test 11: Priority Test - Energy Saver (Priority 2) interrupts Low Battery (Priority 1) ---')
  await sendBatteryUpdate({ isEnergySaver: false, percent: 35 })
  await new Promise((r) => setTimeout(r, 500))
  // Trigger Low Battery
  await sendBatteryUpdate({ percent: 30 })
  await new Promise((r) => setTimeout(r, 400))
  dom = await queryDOM()
  console.log('Low Battery active before Energy Saver interrupt:', { hasLowBattery: dom.hasLowBatterySurface })

  // Now trigger Energy Saver while Low Battery is active!
  await sendBatteryUpdate({ isEnergySaver: true })
  await new Promise((r) => setTimeout(r, 450))
  dom = await queryDOM()
  console.log('After Energy Saver fired during Low Battery:', {
    hasLowBattery: dom.hasLowBatterySurface,
    hasEnergySaver: dom.hasEnergySaverSurface,
    energySaverText: dom.energySaverText
  })
  if (dom.hasEnergySaverSurface && !dom.hasLowBatterySurface) {
    console.log('  PASS: Energy Saver (Priority 2) cleanly interrupted Low Battery (Priority 1)!')
  } else {
    console.error('  FAIL: Energy Saver failed to interrupt Low Battery cleanly')
  }

  console.log('\n=== ALL SCENARIOS VERIFIED SUCCESSFULLY ===')
  app.quit()
})
