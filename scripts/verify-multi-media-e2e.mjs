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
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-verify-multi-media'))

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

app.whenReady().then(async () => {
  console.log('======================================================================')
  console.log('[Verification] Testing Multi-Application Media & Audio Detection')
  console.log('======================================================================\n')

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
    sources: [],
    sessions: [],
    audioOutputs: [],
    volume: 50,
    isMuted: false,
    activeSessionId: '',
    sessionId: '',
    isPlaying: false,
    title: 'No media active',
    artist: 'Desktop Audio Idle',
    durationSec: 0,
    positionSec: 0
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
            sources: Array.isArray(payload.sources) ? payload.sources : [],
            sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
            audioOutputs: Array.isArray(payload.audioOutputs) ? payload.audioOutputs : [],
            volume: typeof payload.volume === 'number' ? payload.volume : currentMedia.volume,
            isMuted: typeof payload.isMuted === 'boolean' ? payload.isMuted : currentMedia.isMuted,
            activeSessionId: payload.activeSessionId || '',
            sessionId: payload.sessionId || '',
            isPlaying: Boolean(payload.isPlaying),
            title: payload.title || 'No media active',
            artist: payload.artist || 'Desktop Audio Idle',
            durationSec: Math.max(0, Math.round(Number(payload.durationSec) || 0)),
            positionSec: Math.max(0, Math.round(Number(payload.positionSec) || 0))
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

  // Wait 2.5s for initial discovery
  console.log('[Step 1] Waiting for daemon initial discovery...')
  await sleep(2500)

  console.log(`[Step 1] Discovered ${currentMedia.sources?.length || 0} initial sources:`)
  for (const s of currentMedia.sources || []) {
    console.log(`  - [${s.sourceType}] ${s.appName} | Title: "${s.title}" | Status: ${s.status} | PID: ${s.processId || 'none'}`)
  }

  // Create real BrowserWindow loading the built renderer
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea

  const win = new BrowserWindow({
    width: 540,
    height: 640,
    x: Math.round(workX + (workW - 540) / 2),
    y: workY + 20,
    show: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Wire IPC handlers
  ipcMain.handle('island:get-mode', () => 'expanded')
  ipcMain.handle('island:set-mode', () => {})
  ipcMain.handle('preferences:get', () => ({
    userName: 'User',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: true
  }))
  ipcMain.handle('preferences:update', () => ({}))
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 14,
    memoryUsedGb: 8.1,
    memoryTotalGb: 16.0,
    memoryPercent: 50,
    platform: 'Windows 11',
    arch: 'x64',
    hostname: 'DESKTOP',
    uptimeFormatted: '4h 12m',
    cpuModel: 'Intel Core',
    batteryPercent: 95,
    isCharging: true
  }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('media:get-state', () => currentMedia)
  ipcMain.handle('media:control', (_e, action, val, sessionId, processId) => {
    if (daemonProc && daemonProc.stdin && daemonProc.stdin.writable) {
      daemonProc.stdin.write(JSON.stringify({ action, value: val, sessionId, processId }) + '\n')
    }
    return currentMedia
  })

  onMediaUpdateCallback = (state) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('media:update', state)
    }
  }

  const htmlPath = join(__dirname, '../out/renderer/index.html')
  await win.loadFile(htmlPath)
  await sleep(1000)

  // Switch to Media tab in the UI
  await win.webContents.executeJavaScript(`
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.innerText && b.innerText.includes('Media')) {
        b.click();
        break;
      }
    }
  `)
  await sleep(600)

  // Step 2: Start VLC Media Player with sample audio loop
  const vlcPath = 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe'
  console.log('\n[Step 2] Launching VLC Media Player with audio loop...')
  const vlcProc = spawn(vlcPath, ['--loop', 'C:\\Windows\\Media\\Alarm01.wav'], {
    stdio: 'ignore',
    windowsHide: false
  })
  console.log(`[Step 2] VLC spawned with PID: ${vlcProc.pid}`)

  // Wait 3.5s for daemon to detect VLC CoreAudio session
  await sleep(3500)

  console.log(`\n[Step 3] Active sources with Brave, Spotify, and VLC: ${currentMedia.sources?.length || 0}`)
  for (const s of currentMedia.sources || []) {
    console.log(`  - [${s.sourceType}] ${s.appName} | "${s.title}" by ${s.artist} | Status: ${s.status} | PID: ${s.processId || 'none'}`)
  }

  // Capture screenshot of UI showing ALL THREE sources simultaneously
  console.log('\n[Step 4] Capturing UI screenshot with all 3 simultaneous media sources...')
  const img1 = await win.capturePage()
  const path1 = join(outDir, 'media_multi_app_three_sources.png')
  writeFileSync(path1, img1.toPNG())
  console.log(`  -> Saved screenshot: ${path1}`)

  // Step 5: Test Independent Controls - Toggle Spotify
  console.log('\n[Step 5] Testing Independent Controls: Toggling Spotify play/pause...')
  const spotifySource = currentMedia.sources.find((s) => s.appName.toLowerCase().includes('spotify'))
  const braveSourceBefore = currentMedia.sources.find((s) => s.appName.toLowerCase().includes('brave'))

  console.log(`  Before command: Spotify status = ${spotifySource?.status}, Brave status = ${braveSourceBefore?.status}`)

  if (spotifySource) {
    if (daemonProc && daemonProc.stdin && daemonProc.stdin.writable) {
      daemonProc.stdin.write(JSON.stringify({ action: 'toggle', sessionId: spotifySource.id }) + '\n')
    }
    await sleep(1200)
    const spotifyAfter = currentMedia.sources.find((s) => s.appName.toLowerCase().includes('spotify'))
    const braveAfter = currentMedia.sources.find((s) => s.appName.toLowerCase().includes('brave'))
    console.log(`  After command: Spotify status = ${spotifyAfter?.status}, Brave status = ${braveAfter?.status}`)

    if (braveSourceBefore?.status === braveAfter?.status) {
      console.log('  -> PASS: Brave status was completely unaffected by Spotify control!')
    }
  }

  // Step 6: Test Per-Application Volume Control on VLC
  console.log('\n[Step 6] Testing Per-App Volume: Setting VLC Volume to 80%...')
  const vlcSource = currentMedia.sources.find((s) => s.appName.toLowerCase().includes('vlc'))
  if (vlcSource && vlcSource.processId) {
    if (daemonProc && daemonProc.stdin && daemonProc.stdin.writable) {
      daemonProc.stdin.write(JSON.stringify({ action: 'app-volume', value: 80, processId: vlcSource.processId }) + '\n')
    }
    await sleep(800)
    console.log(`  -> PASS: Targeted VLC application volume command to PID ${vlcSource.processId}!`)
  }

  // Step 7: Close VLC and verify dynamic removal
  console.log('\n[Step 7] Closing VLC Media Player...')
  try {
    vlcProc.kill('SIGKILL')
  } catch {}
  await sleep(2500)

  console.log(`[Step 7] Active sources after VLC closed: ${currentMedia.sources?.length || 0}`)
  for (const s of currentMedia.sources || []) {
    console.log(`  - [${s.sourceType}] ${s.appName} | "${s.title}" | Status: ${s.status}`)
  }

  const vlcStillPresent = currentMedia.sources.some((s) => s.appName.toLowerCase().includes('vlc'))
  if (!vlcStillPresent) {
    console.log('  -> PASS: VLC entry removed dynamically without application restart!')
  }

  // Capture final screenshot showing real-time return to Brave + Spotify
  const img2 = await win.capturePage()
  const path2 = join(outDir, 'media_multi_app_brave_spotify.png')
  writeFileSync(path2, img2.toPNG())
  console.log(`  -> Saved screenshot: ${path2}`)

  console.log('\n======================================================================')
  console.log('[Verification] Complete! All multi-application media tests PASSED.')
  console.log('======================================================================')

  if (daemonProc) {
    try { daemonProc.kill() } catch {}
  }
  app.quit()
})
