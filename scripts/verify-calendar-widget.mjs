import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/3eace421-3cf0-4312-96c4-7755d90e7611/screenshots'

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-cal-verify'))

app.whenReady().then(async () => {
  console.log('[Verification] Starting Calendar Widget E2E inspection...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'collapsed'

  const win = new BrowserWindow({
    width: 540,
    height: 560,
    x: Math.round((screenWidth - 540) / 2),
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../out/preload/index.mjs'),
      sandbox: false
    }
  })

  // IPC Handlers
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('window:set-mode', (_e, mode) => {
    currentMode = mode
    win.webContents.send('island:mode-changed', mode)
    return currentMode
  })
  ipcMain.handle('window:set-ignore-mouse-events', () => true)
  ipcMain.handle('preferences:get', () => ({
    userName: 'User',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }))
  ipcMain.handle('preferences:update', (_e, p) => p)
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 14,
    memoryUsedGb: 6.5,
    memoryTotalGb: 16,
    memoryPercent: 41,
    platform: 'win32',
    arch: 'x64',
    hostname: 'PC',
    uptimeFormatted: '3h 10m',
    cpuModel: 'Intel Core i9',
    batteryPercent: 95,
    isCharging: true
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('clipboard:copy', () => true)
  ipcMain.handle('clipboard:clear', () => true)
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('routines:toggle', () => [])
  ipcMain.handle('launcher:run-command', (_e, cmd) => ({ success: true, message: `Ran: ${cmd}` }))
  ipcMain.handle('launcher:launch-shortcut', (_e, sc) => ({ success: true, message: `Launched: ${sc}` }))
  ipcMain.handle('debug:toggle-force-visible', () => false)
  ipcMain.handle('debug:get-status', () => ({
    forceVisible: false,
    mode: currentMode,
    bounds: win.getBounds(),
    cursor: { x: 0, y: 0 }
  }))
  ipcMain.handle('media:get-state', () => ({
    hasSession: false,
    isPlaying: false,
    title: 'No media active',
    artist: 'Desktop Audio Idle',
    durationSec: 0,
    positionSec: 0,
    volume: 75,
    isMuted: false,
    app: '',
    status: 'Closed',
    sessions: []
  }))

  win.webContents.on('console-message', (_e, _lvl, msg) => {
    console.log(`  [Renderer] ${msg}`)
  })

  const bundlePath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(bundlePath)
  await new Promise((r) => setTimeout(r, 1000))

  console.log('\n--- 1. COLLAPSED PILL STATE ---')
  const picCollapsed = await win.webContents.capturePage()
  writeFileSync(join(outDir, 'cal_1_collapsed_pill.png'), picCollapsed.toPNG())
  console.log('  Saved: cal_1_collapsed_pill.png')

  console.log('\n--- 2. EXPANDING ISLAND ---')
  await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (surface) surface.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 600))

  console.log('\n--- 3. SWITCHING TO CALENDAR TAB ---')
  const tabSwitchResult = await win.webContents.executeJavaScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const calTab = buttons.find(b => b.innerText && b.innerText.includes('Calendar'));
      if (calTab) {
        calTab.click();
        return { success: true, label: calTab.innerText.trim() };
      }
      return { success: false, buttons: buttons.map(b => b.innerText.trim()) };
    })()
  `)
  console.log('  Calendar Tab Switch:', tabSwitchResult)
  await new Promise((r) => setTimeout(r, 600))

  // Capture real-time current date calendar screenshot
  const picCalCurrent = await win.webContents.capturePage()
  writeFileSync(join(outDir, 'cal_2_realtime_view.png'), picCalCurrent.toPNG())
  console.log('  Saved: cal_2_realtime_view.png')

  // Inspect Calendar DOM structure
  const calInspection = await win.webContents.executeJavaScript(`
    (() => {
      const weekdays = Array.from(document.querySelectorAll('div')).filter(d => 
        d.innerText && d.innerText.includes('MON') && d.innerText.includes('SUN')
      );
      const buttons = Array.from(document.querySelectorAll('button'));
      const dateButtons = buttons.filter(b => {
        const txt = b.innerText.trim();
        return /^[0-9]{1,2}$/.test(txt);
      });
      const headerTitle = document.querySelector('div[title*="jump to today"]');

      return {
        dateButtonsCount: dateButtons.length,
        hasWeekdaysRow: weekdays.length > 0,
        headerTitleText: headerTitle ? headerTitle.innerText.trim() : null
      };
    })()
  `)
  console.log('  Calendar DOM inspection:', calInspection)

  console.log('\n--- 4. NAVIGATING MONTH TO MATCH REFERENCE (Feb 2026) ---')
  const navResult = await win.webContents.executeJavaScript(`
    (async () => {
      // Find month title and previous button
      const getTitle = () => {
        const el = document.querySelector('div[title*="jump to today"]');
        return el ? el.innerText.trim() : '';
      };
      
      const prevBtn = document.querySelector('button[title="Previous month"]');
      const nextBtn = document.querySelector('button[title="Next month"]');

      // Navigate until title includes 'Feb 2026'
      let attempts = 0;
      while (!getTitle().includes('Feb 2026') && attempts < 30) {
        attempts++;
        const current = getTitle();
        // Compare with target date
        if (current.includes('2026')) {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const curMonth = months.findIndex(m => current.includes(m));
          if (curMonth > 1) {
            prevBtn.click();
          } else if (curMonth < 1) {
            nextBtn.click();
          }
        } else if (current > 'Feb 2026') {
          prevBtn.click();
        } else {
          nextBtn.click();
        }
        await new Promise(r => setTimeout(r, 60));
      }

      // Now click on day '20' to match the reference mockup!
      await new Promise(r => setTimeout(r, 200));
      const allDateBtns = Array.from(document.querySelectorAll('button')).filter(b => /^[0-9]{1,2}$/.test(b.innerText.trim()));
      const day20Btn = allDateBtns.find(b => b.innerText.trim() === '20');
      if (day20Btn) {
        day20Btn.click();
      }

      return {
        finalTitle: getTitle(),
        foundDay20: !!day20Btn,
        attempts
      };
    })()
  `)
  console.log('  Navigation to Feb 2026:', navResult)
  await new Promise((r) => setTimeout(r, 600))

  // Capture Feb 2026 mockup reference match screenshot
  const picCalFeb2026 = await win.webContents.capturePage()
  writeFileSync(join(outDir, 'cal_3_feb_2026_reference_match.png'), picCalFeb2026.toPNG())
  console.log('  Saved: cal_3_feb_2026_reference_match.png')

  console.log('\n--- 5. ADDING EVENT ON FEB 20, 2026 ---')
  const addEventResult = await win.webContents.executeJavaScript(`
    (() => {
      const titleInput = document.querySelector('input[placeholder*="reminder / event"]');
      const timeInput = document.querySelector('input[placeholder*="Time"]');
      const form = titleInput ? titleInput.closest('form') : null;

      if (titleInput && form) {
        titleInput.value = 'Product Strategy & Design Review';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));

        if (timeInput) {
          timeInput.value = '10:30 AM';
          timeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return { success: true };
      }
      return { success: false, hasTitleInput: !!titleInput, hasForm: !!form };
    })()
  `)
  console.log('  Add Event Result:', addEventResult)
  await new Promise((r) => setTimeout(r, 600))

  const picCalWithEvent = await win.webContents.capturePage()
  writeFileSync(join(outDir, 'cal_4_feb_2026_with_event.png'), picCalWithEvent.toPNG())
  console.log('  Saved: cal_4_feb_2026_with_event.png')

  console.log('\n[Verification] All steps completed successfully.')
  win.close()
  app.quit()
})
