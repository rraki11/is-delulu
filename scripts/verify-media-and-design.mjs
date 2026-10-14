import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/3eace421-3cf0-4312-96c4-7755d90e7611/screenshots'

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-media-verify'))

app.whenReady().then(async () => {
  console.log('[Verification] Starting Windows Media & Minimal Island UI verification...')

  // Spawn GSMTC daemon directly
  const daemonPath = join(__dirname, '../src/main/services/gsmtc-daemon.ps1')
  console.log('[Verification] Spawning GSMTC daemon from:', daemonPath)

  let daemonProc = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', daemonPath],
    {
      stdio: ['pipe', 'pipe', 'inherit'],
      windowsHide: true
    }
  )

  let currentMedia = {
    hasSession: false,
    isPlaying: false,
    title: 'No media active',
    artist: 'Desktop Audio Idle',
    durationSec: 0,
    positionSec: 0,
    volume: 75,
    isMuted: false,
    app: '',
    status: 'Closed'
  }

  let lineBuffer = ''
  let onMediaUpdateCallback = null

  daemonProc.stdout.on('data', (chunk) => {
    lineBuffer += chunk.toString('utf8')
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''

    for (const rawLine of lines) {
      const trimmed = rawLine.trim()
      if (!trimmed.startsWith('{')) continue
      try {
        const payload = JSON.parse(trimmed)
        if (payload.type === 'media') {
          currentMedia = {
            hasSession: Boolean(payload.hasSession),
            isPlaying: Boolean(payload.isPlaying),
            title: payload.title || 'No media active',
            artist: payload.artist || 'Desktop Audio Idle',
            durationSec: Math.max(0, Math.round(Number(payload.durationSec) || 0)),
            positionSec: Math.max(0, Math.round(Number(payload.positionSec) || 0)),
            volume: 75,
            isMuted: false,
            app: payload.app || '',
            status: payload.status || 'Closed'
          }
          console.log('  [Daemon Event] Live Media State Updated:', {
            app: currentMedia.app,
            title: currentMedia.title,
            artist: currentMedia.artist,
            isPlaying: currentMedia.isPlaying,
            durationSec: currentMedia.durationSec,
            positionSec: currentMedia.positionSec
          })
          if (onMediaUpdateCallback) {
            onMediaUpdateCallback(currentMedia)
          }
        }
      } catch (err) {
        console.error('  [Daemon Parse Error]', err)
      }
    }
  })

  // Wait 1.8s for daemon initial capture
  await new Promise((r) => setTimeout(r, 1800))

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea

  const win = new BrowserWindow({
    width: 540,
    height: 560,
    x: Math.round(workX + (workW - 540) / 2),
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
    userName: 'Tester',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false
  }

  // Register IPC Handlers
  ipcMain.handle('window:set-ignore-mouse-events', () => {})
  ipcMain.handle('island:set-mode', (_e, m) => { currentMode = m })
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('island:reset-position', () => {})
  ipcMain.handle('island:minimize', () => { currentMode = 'collapsed' })
  ipcMain.handle('island:close', () => { currentMode = 'hidden' })
  ipcMain.handle('island:is-always-on-top', () => true)
  ipcMain.handle('island:set-always-on-top', () => {})
  ipcMain.handle('preferences:get', () => prefs)
  ipcMain.handle('preferences:update', (_e, p) => { prefs = { ...prefs, ...p }; return prefs })
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 12, memoryUsedGb: 6.2, memoryTotalGb: 16, memoryPercent: 39,
    platform: 'win32', arch: 'x64', hostname: 'PC', uptimeFormatted: '2h 15m',
    cpuModel: 'Intel Core i9', batteryPercent: 92, isCharging: true
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('clipboard:copy', () => true)
  ipcMain.handle('clipboard:clear', () => true)
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('routines:toggle', () => [])
  ipcMain.handle('debug:toggle-force-visible', () => false)
  ipcMain.handle('debug:get-status', () => ({
    forceVisible: false, mode: currentMode, bounds: win.getBounds(), cursor: { x: 0, y: 0 }
  }))

  // Real Media IPC
  ipcMain.handle('media:get-state', () => currentMedia)
  ipcMain.handle('media:control', async (_e, action, value) => {
    console.log(`  [IPC media:control] Sending "${action}" (${value ?? ''}) to daemon stdin...`)
    if (action === 'toggle' || action === 'play' || action === 'pause' || action === 'next' || action === 'prev') {
      daemonProc.stdin.write(`${action}\n`)
      if (action === 'toggle') {
        currentMedia = { ...currentMedia, isPlaying: !currentMedia.isPlaying }
      }
    } else if (action === 'volume' && typeof value === 'number') {
      currentMedia = { ...currentMedia, volume: value }
    }
    return currentMedia
  })

  onMediaUpdateCallback = (updated) => {
    if (!win.isDestroyed()) {
      win.webContents.send('media:update', updated)
    }
  }

  win.webContents.on('console-message', (_e, _lvl, msg) => {
    console.log(`  [Renderer] ${msg}`)
  })

  const bundlePath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(bundlePath)
  await new Promise((r) => setTimeout(r, 1200))

  // 1. INSPECT AND VERIFY MINIMAL COLLAPSED PILL
  console.log('\n--- VERIFYING REQUIREMENT 2 & 3: MINIMAL COLLAPSED PILL ---')
  const pillInspection = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return { error: 'No island-surface element' };

      const text = surface.innerText.trim();
      const hasChevron = !!surface.querySelector('svg.lucide-chevron-down');
      // Check for green elements
      const allEls = Array.from(surface.querySelectorAll('*'));
      const greenEls = allEls.filter(el => {
        const s = window.getComputedStyle(el);
        return s.backgroundColor.includes('202, 242, 69') || s.color.includes('202, 242, 69') || s.borderColor.includes('202, 242, 69');
      });

      const hasCompanionBadge = text.toUpperCase().includes('COMPANION');
      const hasIsDelulu = text.toLowerCase().includes('is-delulu');
      const hasGreeting = text.toLowerCase().includes('good morning') || text.toLowerCase().includes('good afternoon') || text.toLowerCase().includes('good evening');

      const style = window.getComputedStyle(surface);
      return {
        pillText: text,
        hasChevron,
        greenElementsCount: greenEls.length,
        hasCompanionBadge,
        hasIsDelulu,
        hasGreeting,
        surfaceBorderColor: style.borderColor,
        surfaceBoxShadow: style.boxShadow,
        surfaceBackgroundColor: style.backgroundColor
      };
    })()
  `)
  console.log('  Collapsed Pill inspection:', pillInspection)

  const imgCollapsed = await win.capturePage()
  const p1 = join(outDir, 'media_test_1_collapsed_pill.png')
  writeFileSync(p1, imgCollapsed.toPNG())
  console.log(`  [Screenshot Saved] ${p1}`)

  // 2. EXPAND PANEL & VERIFY OUTER BORDER (NO GREEN OUTLINE)
  console.log('\n--- VERIFYING REQUIREMENT 3: EXPANDED PANEL OUTLINE ---')
  await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (surface) surface.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 700))

  const expandedInspection = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const style = window.getComputedStyle(surface);
      return {
        surfaceBorderColor: style.borderColor,
        surfaceBorderRadius: style.borderRadius,
        surfaceBackgroundColor: style.backgroundColor
      };
    })()
  `)
  console.log('  Expanded Panel inspection:', expandedInspection)

  const imgExpanded = await win.capturePage()
  const p2 = join(outDir, 'media_test_2_expanded_panel.png')
  writeFileSync(p2, imgExpanded.toPNG())
  console.log(`  [Screenshot Saved] ${p2}`)

  // 3. SWITCH TO MEDIA TAB & VERIFY GSMTC MEDIA SESSION
  console.log('\n--- VERIFYING REQUIREMENT 1: REAL MEDIA SESSION IN BRAVE/WINDOWS ---')
  await win.webContents.executeJavaScript(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const mediaTabBtn = buttons.find(b => b.innerText.includes('Media') || b.querySelector('svg.lucide-music'));
      if (mediaTabBtn) {
        mediaTabBtn.click();
        return true;
      }
      return false;
    })()
  `)
  await new Promise((r) => setTimeout(r, 600))

  const mediaWidgetInspection = await win.webContents.executeJavaScript(`
    (() => {
      const titles = Array.from(document.querySelectorAll('h4')).map(h => h.innerText);
      const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.innerText);
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        title: b.title || '',
        disabled: b.disabled
      }));
      const badges = Array.from(document.querySelectorAll('span')).map(s => s.innerText);

      return {
        trackTitle: titles[0] || '',
        artistOrNotice: paragraphs[0] || '',
        badges: badges,
        buttons: buttons
      };
    })()
  `)
  console.log('  MediaWidget DOM inspection:', mediaWidgetInspection)

  const imgMedia = await win.capturePage()
  const p3 = join(outDir, 'media_test_3_media_tab.png')
  writeFileSync(p3, imgMedia.toPNG())
  console.log(`  [Screenshot Saved] ${p3}`)

  // 4. TEST MEDIA TOGGLE CONTROL IN UI
  console.log('\n--- VERIFYING REQUIREMENT 1: PLAY/PAUSE INTERACTION ---')
  const beforeState = currentMedia.isPlaying
  await win.webContents.executeJavaScript(`
    (() => {
      const toggleBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Play' || b.title === 'Pause');
      if (toggleBtn) toggleBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 600))
  console.log(`  Toggled state: before=${beforeState}, now=${currentMedia.isPlaying}`)

  // Restore playback state
  if (currentMedia.isPlaying !== beforeState) {
    console.log('  Restoring original playback state...')
    await win.webContents.executeJavaScript(`
      (() => {
        const toggleBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Play' || b.title === 'Pause');
        if (toggleBtn) toggleBtn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 600))
  }

  // Cleanup
  console.log('\n[Verification] Stopping daemon and closing verification window...')
  try {
    daemonProc.kill()
  } catch {}
  win.close()
  app.quit()
})
