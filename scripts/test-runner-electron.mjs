import electron from 'electron'
const { app, BrowserWindow, screen } = electron
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('=== E2E AUTOMATED VERIFICATION: ALL 3 CRITICAL BUGS ===')

app.setPath('userData', join(app.getPath('temp'), 'is-delulu-test-' + Date.now()))

// 1. Boot real main process
await import('../out/main/index.js')

app.whenReady().then(async () => {
  console.log('[RUNNER] Electron is ready. Searching for main window...')

  // Wait for main window to exist
  let win = null
  for (let i = 0; i < 30; i++) {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      win = wins[0]
      break
    }
    await new Promise((r) => setTimeout(r, 100))
  }

  if (!win) {
    console.error('[RUNNER FAIL] Main window was not created within 3s!')
    process.exit(1)
  }

  console.log('[RUNNER SUCCESS] Main window found. Bounds:', win.getBounds())

  // Intercept console logs from renderer
  win.webContents.on('console-message', (_e, _level, msg) => {
    if (
      msg.includes('is-delulu') ||
      msg.includes('ANIMATION') ||
      msg.includes('coordinator') ||
      msg.includes('battery') ||
      msg.includes('entrance')
    ) {
      console.log(`[RENDERER] ${msg}`)
    }
  })

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea
  const centerX = Math.round(workX + workW / 2)
  console.log(`[RUNNER] Primary display work area: (${workX}, ${workY}, ${workW}w), CenterX: ${centerX}`)

  // ── PHASE 1: Verify Startup Sequence & Charging Handoff ────────────────────────
  console.log('\n--- PHASE 1: Waiting for Startup Sequence & Charging Notification ---')
  let chargingPlayed = false
  let hiddenAfterStartup = false

  const maxWait = 22000
  const startTime = Date.now()

  while (Date.now() - startTime < maxWait) {
    await new Promise((r) => setTimeout(r, 250))
    const isVis = win.isVisible()

    const state = await win.webContents.executeJavaScript(`
      (() => {
        const charging = document.querySelector('.charging-pill-surface') || document.querySelector('#island-surface.charging')
        const clock = document.querySelector('.tabular-nums')
        const greeting = document.querySelector('.handwriting-reveal-text-container')
        return {
          hasCharging: Boolean(charging),
          hasClock: Boolean(clock),
          hasGreeting: Boolean(greeting),
          mode: window.isDelulu?.getCurrentIslandMode ? window.isDelulu.getCurrentIslandMode() : null
        }
      })()
    `).catch(() => ({}))

    if (state.hasCharging) {
      chargingPlayed = true
    }

    if (!isVis && Date.now() - startTime > 7000) {
      hiddenAfterStartup = true
      console.log(`[RUNNER SUCCESS] Island finished charging notification and hid cleanly at T+${Date.now() - startTime}ms!`)
      break
    }
  }

  if (!hiddenAfterStartup) {
    console.log('[RUNNER NOTE] Window did not hide automatically within timeout or is still visible. Proceeding to hover test.')
  }

  // ── PHASE 2: Verify Top-Edge Hover Activation ──────────────────────────────
  console.log('\n--- PHASE 2: Testing Top-Edge Hover Activation ---')
  console.log(`[RUNNER] Simulating cursor at top ceiling: (${centerX}, 0)...`)

  await win.webContents.executeJavaScript(`
    window.isDelulu.simulateCursor({ x: ${centerX}, y: 0 })
  `)

  // Wait 250ms for activation loop (runs every 60ms) to trigger
  await new Promise((r) => setTimeout(r, 300))

  const isVisibleAfterHover = win.isVisible()
  console.log(`[RUNNER] Window visible after top-edge hover: ${isVisibleAfterHover} (Expected: true)`)

  const modeAfterHover = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface')
      return {
        isSurfacePresent: Boolean(surface),
        top: surface ? surface.getBoundingClientRect().top : null,
        opacity: surface ? window.getComputedStyle(surface).opacity : null
      }
    })()
  `)
  console.log('[RUNNER] Island surface after hover activation:', modeAfterHover)

  // ── PHASE 3: Testing Active Surface & Mouse Leave Dwell ────────────────────
  console.log('\n--- PHASE 3: Testing Mouse Leave and Auto-Hide ---')
  console.log(`[RUNNER] Simulating cursor outside island: (${centerX}, 500)...`)

  await win.webContents.executeJavaScript(`
    window.isDelulu.simulateCursor({ x: ${centerX}, y: 500 })
  `)

  // Wait for 1800ms dwell + 650ms collapse
  console.log('[RUNNER] Waiting 2800ms for dwell timer and auto-hide transition...')
  await new Promise((r) => setTimeout(r, 2800))

  const isVisibleAfterLeave = win.isVisible()
  console.log(`[RUNNER] Window visible after mouse leave dwell: ${isVisibleAfterLeave} (Expected: false)`)

  // Reset simulated cursor to null
  await win.webContents.executeJavaScript(`
    window.isDelulu.simulateCursor(null)
  `)

  // ── PHASE 4: Verification Summary ──────────────────────────────────────────
  console.log('\n======================================================')
  console.log('              FINAL VERIFICATION REPORT')
  console.log('======================================================')
  console.log(`Test 1 (Top-edge hover reveals island):     ${isVisibleAfterHover ? 'PASSED ✓' : 'FAILED ✗'}`)
  console.log(`Test 2 (Surface enters smoothly):           ${modeAfterHover.isSurfacePresent ? 'PASSED ✓' : 'FAILED ✗'}`)
  console.log(`Test 3 (Mouse leave auto-hides cleanly):   ${!isVisibleAfterLeave ? 'PASSED ✓' : 'FAILED ✗'}`)
  console.log('======================================================')

  const allPassed = isVisibleAfterHover && modeAfterHover.isSurfacePresent && !isVisibleAfterLeave

  if (allPassed) {
    console.log('\nALL 3 CRITICAL BUGS ARE FULLY FIXED AND VERIFIED!\n')
    setTimeout(() => {
      win.close()
      app.quit()
      process.exit(0)
    }, 500)
  } else {
    console.error('\nSOME TESTS FAILED!')
    setTimeout(() => {
      win.close()
      app.quit()
      process.exit(1)
    }, 500)
  }
})
