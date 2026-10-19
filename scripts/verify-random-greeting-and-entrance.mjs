import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.setName('is-delulu-verify-greeting-entrance')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-ge'))

app.whenReady().then(async () => {
  console.log('=== VERIFYING RANDOM GREETING SELECTION & ENTRANCE SEQUENCE ===\n')

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
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false
    }
  })

  const currentBatteryState = {
    percent: 85,
    isOnAC: false,
    isCharging: false,
    isEnergySaver: false
  }

  ipcMain.handle('battery:get-state', () => currentBatteryState)
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

  const sampleState = async () => {
    return await win.webContents.executeJavaScript(`
      (() => {
        const surface = document.getElementById('island-surface')
        const greetingSvg = document.querySelector('.handwriting-reveal-svg')
        const textContainer = document.querySelector('.handwriting-reveal-text-container')
        const rect = surface ? surface.getBoundingClientRect() : null

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
          surfaceTop: rect ? rect.top : null,
          surfaceOpacity: surface ? parseFloat(window.getComputedStyle(surface).opacity) : null,
          hasTextContainer: Boolean(textContainer),
          textOpacity: textContainer ? parseFloat(window.getComputedStyle(textContainer).opacity) : 0,
          detectedGreeting
        }
      })()
    `)
  }

  const GREETING_RESULTS = []
  const ENTRANCE_RESULTS = []

  // Run 10 consecutive fresh welcome sequences
  for (let run = 1; run <= 10; run++) {
    console.log(`\n--- RUN #${run} ---`)
    await win.loadFile(join(__dirname, '../out/renderer/index.html'))
    win.showInactive()
    win.webContents.send('island:start-welcome')

    // T+0ms: must start above screen (y: -50)
    const sStart = await sampleState()

    // T+250ms: sliding down
    await new Promise(r => setTimeout(r, 250))
    const sSliding = await sampleState()

    // T+600ms: settled at y: 0
    await new Promise(r => setTimeout(r, 350))
    const sSettled = await sampleState()

    console.log(`[RUN #${run}] T=0ms: top=${sStart.surfaceTop}, opacity=${sStart.surfaceOpacity}`)
    console.log(`[RUN #${run}] T=250ms (sliding): top=${sSliding.surfaceTop}, hasText=${sSliding.hasTextContainer}`)
    console.log(`[RUN #${run}] T=600ms (settled): top=${sSettled.surfaceTop}`)

    const entranceOk = sStart.surfaceTop < 0 && sSliding.surfaceTop < 0 && sSettled.surfaceTop === 0 && !sSliding.hasTextContainer
    ENTRANCE_RESULTS.push(entranceOk)

    // Now wait for handwriting to start and detect greeting
    let greetingDetected = null
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 50))
      const s = await sampleState()
      if (s.detectedGreeting) {
        greetingDetected = s.detectedGreeting
        console.log(`[RUN #${run}] Greeting revealed: "${greetingDetected}" (top=${s.surfaceTop})`)
        break
      }
    }

    if (greetingDetected) {
      GREETING_RESULTS.push(greetingDetected)
    }
  }

  console.log('\n=================================================')
  console.log('              SUMMARY OF 10 RUNS                 ')
  console.log('=================================================')
  console.log('Entrance sequenced properly (starts top, slides down, settled before text):', ENTRANCE_RESULTS.every(Boolean) ? 'ALL 10 PASSED' : 'FAILED')
  console.log('Greetings recorded across 10 runs:', GREETING_RESULTS)
  const hiCount = GREETING_RESULTS.filter(g => g === 'hi').length
  const helloCount = GREETING_RESULTS.filter(g => g === 'hello').length
  console.log(`Count: "hi"=${hiCount}, "hello"=${helloCount}`)

  const randomnessOk = hiCount > 0 && helloCount > 0
  console.log('Both "hi" and "hello" appeared randomly:', randomnessOk ? 'PASSED' : 'FAILED')
  console.log('=================================================')

  app.quit()
})
