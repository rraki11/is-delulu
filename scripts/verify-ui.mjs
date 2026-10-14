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
  console.log('[Verification] Starting visual verification...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea

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
    }
  })

  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('island:reset-position', () => {})
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 18,
    memoryUsedGb: 7.2,
    memoryTotalGb: 16.0,
    memoryPercent: 45,
    platform: 'Windows 11',
    arch: 'x64',
    hostname: 'DESKTOP-TEST',
    uptimeFormatted: '5h 22m',
    cpuModel: 'Intel Core i9-13900H @ 2.60GHz',
    batteryPercent: 88,
    isCharging: true
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('media:get-state', () => ({
    isPlaying: false,
    title: 'Idle',
    artist: 'No media active',
    durationSec: 180,
    positionSec: 45,
    volume: 75,
    isMuted: false
  }))
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('preferences:get', () => prefs)
  ipcMain.handle('preferences:update', (_e, update) => {
    prefs = { ...prefs, ...update }
    return prefs
  })
  ipcMain.handle('theme:get-resolved', () => prefs.appearance === 'light' ? 'light' : 'dark')

  const htmlPath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(htmlPath)
  await new Promise((r) => setTimeout(r, 600))

  // 1. Capture Collapsed Notch Pill in Dark Mode
  console.log('[Verification] Capturing Collapsed Notch (Dark Background)...')
  const img1 = await win.capturePage()
  const path1 = join(outDir, 'verify_notch_collapsed_dark.png')
  writeFileSync(path1, img1.toPNG())
  console.log(`Saved: ${path1}`)

  // 2. Expand and switch to Settings Tab
  console.log('[Verification] Expanding Island & Opening Settings...')
  await win.webContents.executeJavaScript(`
    const pill = document.querySelector('[role="button"]');
    if (pill) pill.click();
  `)
  await new Promise((r) => setTimeout(r, 700))

  // Click on Settings tab in UI
  await win.webContents.executeJavaScript(`
    const buttons = Array.from(document.querySelectorAll('button'));
    const settingsBtn = buttons.find(b => b.textContent.includes('Settings'));
    if (settingsBtn) settingsBtn.click();
  `)
  await new Promise((r) => setTimeout(r, 400))

  // Capture Settings in Dark Mode
  console.log('[Verification] Capturing Settings (Dark Mode)...')
  const img2 = await win.capturePage()
  const path2 = join(outDir, 'verify_settings_dark.png')
  writeFileSync(path2, img2.toPNG())
  console.log(`Saved: ${path2}`)

  // 3. Switch to Light Mode
  console.log('[Verification] Switching to Light Mode...')
  await win.webContents.executeJavaScript(`
    const lightBtns = Array.from(document.querySelectorAll('button'));
    const lightBtn = lightBtns.find(b => b.textContent.includes('Light Mode'));
    if (lightBtn) lightBtn.click();
    document.documentElement.dataset.theme = 'light';
  `)
  await new Promise((r) => setTimeout(r, 500))

  console.log('[Verification] Capturing Settings (Light Mode)...')
  const img3 = await win.capturePage()
  const path3 = join(outDir, 'verify_settings_light.png')
  writeFileSync(path3, img3.toPNG())
  console.log(`Saved: ${path3}`)

  // 4. Capture Collapsed Pill in Light Mode
  console.log('[Verification] Collapsing to Notch Pill in Light Mode...')
  await win.webContents.executeJavaScript(`
    const collapseBtns = Array.from(document.querySelectorAll('button[aria-label="Collapse Island"]'));
    if (collapseBtns.length > 0) collapseBtns[0].click();
  `)
  await new Promise((r) => setTimeout(r, 600))

  const img4 = await win.capturePage()
  const path4 = join(outDir, 'verify_notch_collapsed_light.png')
  writeFileSync(path4, img4.toPNG())
  console.log(`Saved: ${path4}`)

  console.log('[Verification] Verification complete!')
  app.quit()
})
