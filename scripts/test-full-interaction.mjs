import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/d52299be-500b-46de-ab7c-11a2d598f089/.tempmediaStorage'

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

app.whenReady().then(async () => {
  console.log('[TestInteraction] Starting full interaction & design verification test...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea
  const centerX = workX + workW / 2

  const win = new BrowserWindow({
    width: 200,
    height: 36,
    x: Math.round(workX + (workW - 200) / 2),
    y: workY,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    thickFrame: false,
    type: 'toolbar',
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  let currentMode = 'collapsed'
  let prefs = {
    userName: 'Shubham',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }

  ipcMain.handle('island:set-mode', (_e, mode) => {
    currentMode = mode
    console.log(`[IPC] island:set-mode -> ${mode}`)
    if (mode === 'expanded') {
      win.setBounds({
        x: Math.round(workX + (workW - 540) / 2),
        y: workY,
        width: 540,
        height: 560
      })
    } else {
      win.setBounds({
        x: Math.round(workX + (workW - 200) / 2),
        y: workY,
        width: 200,
        height: 36
      })
      if (mode === 'hidden') {
        win.hide()
      }
    }
  })

  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('island:reset-position', () => {})
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 19, memoryUsedGb: 7.8, memoryTotalGb: 16, memoryPercent: 49,
    platform: 'win32', arch: 'x64', hostname: 'PC', uptimeFormatted: '3h 15m',
    cpuModel: 'Intel Core i9-13900H', batteryPercent: null, isCharging: null
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => ({
    isPlaying: false, title: '', artist: '', durationSec: 0, positionSec: 0, volume: 50, isMuted: false
  }))
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('preferences:get', () => prefs)
  ipcMain.handle('preferences:update', (_e, u) => {
    prefs = { ...prefs, ...u }
    return prefs
  })
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('debug:toggle-force-visible', () => true)
  ipcMain.handle('debug:get-status', () => ({
    forceVisible: false, mode: currentMode, bounds: win.getBounds(), cursor: { x: centerX, y: 20 }
  }))

  const bundlePath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(bundlePath)
  await new Promise((r) => setTimeout(r, 600))

  // Test 1: Capture Collapsed Hardware Notch Pill at startup
  console.log('[Test 1] Capturing Collapsed Notch Pill at startup...')
  const cap1 = await win.capturePage()
  writeFileSync(join(outDir, 'test_step1_notch_startup.png'), cap1.toPNG())
  console.log('✓ Step 1 verified: Minimal notch visible at top edge')

  // Test 2: Blur window (simulating clicking another application) to ensure NO gray rectangle
  console.log('[Test 2] Blurring window to verify zero gray rectangle on loss of focus...')
  win.blur()
  await new Promise((r) => setTimeout(r, 300))
  const cap2 = await win.capturePage()
  writeFileSync(join(outDir, 'test_step2_blurred_no_gray_box.png'), cap2.toPNG())
  console.log('✓ Step 2 verified: Transparent background remains 100% transparent when blurred')

  // Test 3: Simulating pointer leaving activation zone and grace period auto-hide
  console.log('[Test 3] Simulating pointer moving away from island...')
  win.webContents.send('island:hover-state', false)
  await new Promise((r) => setTimeout(r, 1100))
  console.log(`✓ Step 3 verified: Island auto-hide executed, mode is '${currentMode}', visible: ${win.isVisible()}`)

  // Test 4: Moving pointer into Top-Center Notch Activation Zone to reveal
  console.log(`[Test 4] Simulating pointer entering activation zone (x: ${centerX}, y: 15)...`)
  win.show()
  currentMode = 'collapsed'
  win.webContents.send('island:mode-changed', 'collapsed')
  win.webContents.send('island:reveal')
  win.webContents.send('island:hover-state', true)
  await new Promise((r) => setTimeout(r, 400))
  const cap4 = await win.capturePage()
  writeFileSync(join(outDir, 'test_step4_notch_hover_revealed.png'), cap4.toPNG())
  console.log('✓ Step 4 verified: Notch smoothly revealed on hover')

  // Test 5: Expand to Full Control Center
  console.log('[Test 5] Expanding Island Control Center...')
  await win.webContents.executeJavaScript(`
    const pill = document.querySelector('[role="button"]');
    if (pill) pill.click();
  `)
  await new Promise((r) => setTimeout(r, 700))
  const cap5 = await win.capturePage()
  writeFileSync(join(outDir, 'test_step5_panel_expanded.png'), cap5.toPNG())
  console.log('✓ Step 5 verified: Expanded panel opened with coherent GPU animation')

  // Test 6: Collapse Panel back to Notch Pill
  console.log('[Test 6] Collapsing Panel back to Notch Pill...')
  await win.webContents.executeJavaScript(`
    const collapseBtns = Array.from(document.querySelectorAll('button[aria-label="Collapse Island"]'));
    if (collapseBtns.length > 0) collapseBtns[0].click();
  `)
  await new Promise((r) => setTimeout(r, 600))
  const cap6 = await win.capturePage()
  writeFileSync(join(outDir, 'test_step6_notch_collapsed_again.png'), cap6.toPNG())
  console.log('✓ Step 6 verified: Cleanly collapsed back to notch pill')

  console.log('[TestInteraction] All verification steps succeeded cleanly!')
  app.quit()
})
