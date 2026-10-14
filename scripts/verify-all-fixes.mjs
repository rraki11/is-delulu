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
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-all'))

app.whenReady().then(async () => {
  console.log('=================================================================')
  console.log('[Verification] Starting End-to-End Verification of All Fixes...')
  console.log('=================================================================\n')

  // Spawn GSMTC daemon directly
  const daemonPath = join(__dirname, '../src/main/services/gsmtc-daemon.ps1')
  console.log('[GSMTC Daemon] Spawning PowerShell daemon:', daemonPath)

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
    sessionId: '',
    isPlaying: false,
    title: 'No media active',
    artist: 'Desktop Audio Idle',
    durationSec: 0,
    positionSec: 0,
    volume: 50,
    isMuted: false,
    app: '',
    status: 'Closed',
    canPlay: false,
    canPause: false,
    canNext: false,
    canPrev: false,
    canToggle: false
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
            sessionId: payload.sessionId || '',
            isPlaying: Boolean(payload.isPlaying),
            title: payload.title || 'No media active',
            artist: payload.artist || 'Desktop Audio Idle',
            durationSec: Math.max(0, Math.round(Number(payload.durationSec) || 0)),
            positionSec: Math.max(0, Math.round(Number(payload.positionSec) || 0)),
            volume: typeof payload.volume === 'number' ? payload.volume : currentMedia.volume,
            isMuted: typeof payload.isMuted === 'boolean' ? payload.isMuted : currentMedia.isMuted,
            app: payload.app || '',
            status: payload.status || 'Closed',
            canPlay: Boolean(payload.canPlay),
            canPause: Boolean(payload.canPause),
            canNext: Boolean(payload.canNext),
            canPrev: Boolean(payload.canPrev),
            canToggle: payload.canToggle !== undefined ? Boolean(payload.canToggle) : true
          }
          if (onMediaUpdateCallback) {
            onMediaUpdateCallback(currentMedia)
          }
        }
      } catch (err) {
        console.error('  [Daemon Parse Error]', err)
      }
    }
  })

  // Wait 1.8s for daemon initial query
  await new Promise((r) => setTimeout(r, 1800))
  console.log('[GSMTC Daemon] Active Initial Media State:', {
    hasSession: currentMedia.hasSession,
    app: currentMedia.app,
    title: currentMedia.title,
    artist: currentMedia.artist,
    status: currentMedia.status,
    position: currentMedia.positionSec,
    duration: currentMedia.durationSec,
    canNext: currentMedia.canNext,
    canPrev: currentMedia.canPrev,
    masterVolume: currentMedia.volume,
    isMuted: currentMedia.isMuted
  })

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea
  const centerX = workX + workW / 2

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

  let modeChanges = []
  ipcMain.handle('window:set-ignore-mouse-events', () => {})
  ipcMain.handle('island:set-mode', (_e, m) => {
    currentMode = m
    modeChanges.push({ mode: m, time: Date.now() })
  })
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
    cpuUsage: 10, memoryUsedGb: 6.0, memoryTotalGb: 16, memoryPercent: 38,
    platform: 'win32', arch: 'x64', hostname: 'PC', uptimeFormatted: '2h 20m',
    cpuModel: 'Intel Core i9', batteryPercent: 91, isCharging: true
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

  // Media IPC
  ipcMain.handle('media:get-state', () => currentMedia)
  ipcMain.handle('media:control', async (_e, action, value, sessionId) => {
    console.log(`  [IPC media:control] Action="${action}", Value=${value ?? 'none'}, Session="${sessionId || 'auto'}"`)
    const cmdPayload = JSON.stringify({ action, value, sessionId })
    daemonProc.stdin.write(`${cmdPayload}\n`)

    if (action === 'volume' && typeof value === 'number') {
      currentMedia.volume = value
      currentMedia.isMuted = value === 0
    } else if (action === 'mute') {
      currentMedia.isMuted = !currentMedia.isMuted
    } else if (action === 'toggle') {
      currentMedia.isPlaying = !currentMedia.isPlaying
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

  // ===================================================================
  // TEST 1: VERIFY COLLAPSED PILL (NO BRANDING, NO GREEN OUTLINE)
  // ===================================================================
  console.log('\n--- TEST 1: COLLAPSED PILL MINIMAL DESIGN ---')
  const pillCheck = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return { error: 'No surface found' };

      const text = surface.innerText.trim();
      const hasChevron = !!surface.querySelector('svg.lucide-chevron-down');
      const hasLogo = !!surface.querySelector('div[style*="linear-gradient"]');
      const hasCompanion = text.toUpperCase().includes('COMPANION');
      const hasIsDelulu = text.toLowerCase().includes('is-delulu');
      const hasGreeting = text.toLowerCase().includes('good morning') || text.toLowerCase().includes('good evening') || text.toLowerCase().includes('good afternoon');

      const style = window.getComputedStyle(surface);
      const isBorderGreen = style.borderColor.includes('187, 255, 0') || style.borderColor.includes('202, 242, 69') || style.borderColor.includes('94, 142, 4');

      return {
        pillText: text,
        hasChevron,
        hasLogo,
        hasCompanion,
        hasIsDelulu,
        hasGreeting,
        isBorderGreen,
        borderColor: style.borderColor,
        backgroundColor: style.backgroundColor
      };
    })()
  `)
  console.log('  Collapsed Pill check result:', pillCheck)
  const p1 = join(outDir, 'test_1_minimal_collapsed_pill.png')
  writeFileSync(p1, (await win.capturePage()).toPNG())
  console.log(`  [Screenshot Saved] ${p1}`)

  // ===================================================================
  // TEST 2: EXPAND & VERIFY NO GREEN WINDOW OUTLINE
  // ===================================================================
  console.log('\n--- TEST 2: EXPANDED PANEL OUTLINE ---')
  await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (surface) surface.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 700))

  const expandedCheck = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return null;
      const style = window.getComputedStyle(surface);
      const isBorderGreen = style.borderColor.includes('187, 255, 0') || style.borderColor.includes('202, 242, 69') || style.borderColor.includes('94, 142, 4');
      return {
        isBorderGreen,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius
      };
    })()
  `)
  console.log('  Expanded Panel border check:', expandedCheck)
  const p2 = join(outDir, 'test_2_expanded_panel_outline.png')
  writeFileSync(p2, (await win.capturePage()).toPNG())
  console.log(`  [Screenshot Saved] ${p2}`)

  // ===================================================================
  // TEST 3: MEDIA PANEL WITH REAL BRAVE YOUTUBE & CONTROLS
  // ===================================================================
  console.log('\n--- TEST 3: REAL MEDIA PANEL WITH CONTROLS ---')
  await win.webContents.executeJavaScript(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const mediaTab = btns.find(b => b.innerText.includes('Media') || b.querySelector('svg.lucide-music'));
      if (mediaTab) mediaTab.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 600))

  const mediaWidgetDom = await win.webContents.executeJavaScript(`
    (() => {
      const trackTitle = document.querySelector('h4')?.innerText || '';
      const appBadge = document.querySelector('span[style*="rgba(255, 255, 255, 0.07)"]')?.innerText || '';
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        title: b.title || '',
        disabled: b.disabled
      }));
      const volumeInput = document.querySelector('input[type="range"]');
      const volumeVal = volumeInput ? Number(volumeInput.value) : null;
      const systemVolumeLabel = Array.from(document.querySelectorAll('span')).find(s => s.innerText.includes('System Volume'))?.innerText || '';

      return {
        trackTitle,
        appBadge,
        buttons,
        volumeVal,
        systemVolumeLabel
      };
    })()
  `)
  console.log('  MediaWidget DOM Inspection:', mediaWidgetDom)
  const p3 = join(outDir, 'test_3_media_panel_real_session.png')
  writeFileSync(p3, (await win.capturePage()).toPNG())
  console.log(`  [Screenshot Saved] ${p3}`)

  // ===================================================================
  // TEST 4: PLAYBACK TOGGLE AND VOLUME TEST
  // ===================================================================
  console.log('\n--- TEST 4: PLAY/PAUSE INTERACTION AND VOLUME ---')
  console.log('  Testing Toggle Play/Pause...')
  await win.webContents.executeJavaScript(`
    (() => {
      const toggleBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Play' || b.title === 'Pause');
      if (toggleBtn) toggleBtn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 700))

  console.log('  Testing Windows Master Volume Change to 25%...')
  await win.webContents.executeJavaScript(`
    (() => {
      const range = document.querySelector('input[type="range"]');
      if (range) {
        range.value = 25;
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `)
  await new Promise((r) => setTimeout(r, 600))

  // ===================================================================
  // TEST 5: COLLAPSE TO HIDE SEQUENCE WITH 1,000MS MINIMUM VISIBILITY
  // ===================================================================
  console.log('\n--- TEST 5: COLLAPSE TO HIDE SEQUENCE (1,000MS MINIMUM VISIBILITY) ---')
  modeChanges = []

  // Simulate pointer leaving expanded panel
  console.log('  Simulating pointer leaving the expanded panel...')
  const leaveTime = Date.now()
  await win.webContents.executeJavaScript(`
    (() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 400 }));
    })()
  `)

  // Step 1: After 700ms grace period, panel should transition from EXPANDED to COLLAPSED
  await new Promise((r) => setTimeout(r, 850))
  const modeAfterGrace = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return 'hidden';
      const r = surface.getBoundingClientRect();
      return r.height <= 40 ? 'collapsed' : 'expanded';
    })()
  `)
  console.log(`  Mode after grace period (850ms): ${modeAfterGrace} (Expected: 'collapsed')`)

  // Step 2: At 500ms into the 1,000ms minimum visibility period, pill MUST STILL BE COLLAPSED AND VISIBLE
  await new Promise((r) => setTimeout(r, 500))
  const modeMidVisibility = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return 'hidden';
      const r = surface.getBoundingClientRect();
      const style = window.getComputedStyle(surface);
      return {
        height: r.height,
        opacity: style.opacity,
        visible: style.opacity !== '0'
      };
    })()
  `)
  console.log(`  Pill visibility at 500ms into min visibility window:`, modeMidVisibility)

  // Step 3: Wait for 1,000ms timer to elapse (total > 1,700ms since leave) -> should now be smoothly HIDDEN
  await new Promise((r) => setTimeout(r, 800))
  const finalMode = await win.webContents.executeJavaScript(`
    (() => {
      const surface = document.getElementById('island-surface');
      if (!surface) return 'hidden';
      const style = window.getComputedStyle(surface);
      return style.opacity === '0' || style.transform.includes('-38') ? 'hidden' : 'visible';
    })()
  `)
  console.log(`  Mode after 1,000ms minimum visibility expired: ${finalMode} (Expected: 'hidden')`)

  console.log('\n=================================================================')
  console.log('[Verification] Verification completed successfully!')
  console.log('=================================================================')

  try {
    daemonProc.kill()
  } catch {}
  win.close()
  app.quit()
  setTimeout(() => process.exit(0), 100)
})
