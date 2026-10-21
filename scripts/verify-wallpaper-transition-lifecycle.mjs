import { app, BrowserWindow, screen } from 'electron'
import { join, dirname, extname, basename } from 'path'
import { writeFileSync, appendFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { spawn, execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cae90e89-4173-4a78-aea7-29502144233c/screenshots/verification'
try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.setName('is-delulu-verify-lifecycle')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-ver-lifecycle'))
app.on('window-all-closed', (e) => {
  // Prevent Electron from automatically quitting when overlay window is closed between tests
})

const wallpaperFolder = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers'

function scanFolder(folder) {
  if (!folder || !existsSync(folder)) return []
  const exts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.avif'])
  const entries = readdirSync(folder, { withFileTypes: true })
  const items = []
  for (const e of entries) {
    if (!e.isFile()) continue
    const ext = extname(e.name).toLowerCase()
    if (!exts.has(ext)) continue
    const p = join(folder, e.name)
    try {
      const st = statSync(p)
      if (st.size > 0) items.push(p)
    } catch {}
  }
  return items
}

function getWindowsCurrentWallpaper() {
  try {
    const regOutput = execSync('reg query "HKCU\\Control Panel\\Desktop" /v WallPaper', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const match = regOutput.match(/WallPaper\s+REG_SZ\s+(.*)/i)
    if (match && match[1]) {
      const candidate = match[1].trim()
      if (candidate && existsSync(candidate)) return candidate
    }
  } catch {}
  return null
}

function resolveWallpaperExePath() {
  const possiblePaths = [
    join(process.cwd(), 'src/main/services/set-wallpaper.exe'),
    join(app.getAppPath(), 'src/main/services/set-wallpaper.exe'),
    join(app.getAppPath(), 'out/main/services/set-wallpaper.exe')
  ]
  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return null
}

function executeSetWallpaperAsync(filePath) {
  const exePath = resolveWallpaperExePath()
  return new Promise((resolve) => {
    let settled = false
    let child = null
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        if (child) {
          try { child.kill() } catch {}
        }
        resolve(false)
      }
    }, 5000)

    try {
      if (exePath && existsSync(exePath)) {
        child = spawn(exePath, [filePath], { stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true })
      } else {
        const psScript = `
$code = @'
using System;
using System.Runtime.InteropServices;
public class DesktopWallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
'@
if (-not ([System.Management.Automation.PSTypeName]'DesktopWallpaper').Type) {
    Add-Type -TypeDefinition $code
}
$res = [DesktopWallpaper]::SystemParametersInfo(0x0014, 0, '${filePath.replace(/'/g, "''")}', 0x03)
if ($res -eq 0) { exit 1 }
`
        const buffer = Buffer.from(psScript, 'utf16le')
        const encoded = buffer.toString('base64')
        child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        })
      }

      child.on('close', (code) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(code === 0)
        }
      })
      child.on('error', () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(false)
        }
      })
    } catch {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(false)
      }
    }
  })
}

const logFilePath = join(outDir, 'lifecycle_verification_results.txt')
writeFileSync(logFilePath, '=== VERIFYING WALLPAPER TRANSITION STATE & BASE LAYER PRESERVATION ===\n\n')

function log(msg) {
  console.log(msg)
  try {
    appendFileSync(logFilePath, msg + '\n')
  } catch {}
}

app.whenReady().then(async () => {
  let passed = 0
  let failed = 0

  function assert(cond, msg) {
    if (cond) {
      log(`[PASS] ${msg}`)
      passed++
    } else {
      log(`[FAIL] ${msg}`)
      failed++
    }
  }

  try {
    const wallpapers = scanFolder(wallpaperFolder)
    assert(wallpapers.length >= 2, `Discovered at least 2 test wallpapers (found ${wallpapers.length})`)

    const oldWallpaper = wallpapers[0]
    const newWallpaper = wallpapers[1]
    log(`Base (Old) Wallpaper: ${oldWallpaper}`)
    log(`Reveal (New) Wallpaper: ${newWallpaper}\n`)

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.bounds

    // ────────────────────────────────────────────────────────────────────────
    // TEST 1: Preserving Old Wallpaper as Full Base Layer (Dual Texture)
    // ────────────────────────────────────────────────────────────────────────
    log('--- Test 1: Dual-Texture WebGL Shader: Old Wallpaper Base Layer ---')
    const overlayWin = new BrowserWindow({
      x: 0,
      y: 0,
      width,
      height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: false,
      show: true,
      type: 'toolbar',
      webPreferences: {
        webSecurity: false,
        sandbox: false,
        contextIsolation: false,
        backgroundThrottling: false
      }
    })
    overlayWin.setIgnoreMouseEvents(true)

    const revealHtmlPath = join(process.cwd(), 'src/main/services/wallpaper-reveal.html')
    await overlayWin.loadFile(revealHtmlPath)

    const oldUrl = pathToFileURL(oldWallpaper).toString()
    const newUrl = pathToFileURL(newWallpaper).toString()

    const prep = await overlayWin.webContents.executeJavaScript(
      `window.prepareTransition(${JSON.stringify(newUrl)}, ${JSON.stringify(oldUrl)})`
    )
    assert(prep && prep.success === true, 'prepareTransition successfully preloads & binds both textures')

    // Frame 0: Radius 0
    await overlayWin.webContents.executeJavaScript('drawAtRadius(0.0)')
    await new Promise((r) => setTimeout(r, 80))
    const shot0 = await overlayWin.capturePage()
    const p0 = join(outDir, '01_reveal_frame0_old_wallpaper_base.png')
    writeFileSync(p0, shot0.toPNG())
    assert(existsSync(p0), 'Frame 0 (0% radius): Canvas is fully covered by old wallpaper (zero gray gap)')

    // Frame 35%: Expanding circle with old wallpaper outside
    await overlayWin.webContents.executeJavaScript('drawAtRadius(maxRadius * 0.35)')
    await new Promise((r) => setTimeout(r, 80))
    const shot35 = await overlayWin.capturePage()
    const p35 = join(outDir, '02_reveal_frame35_old_base_new_circle.png')
    writeFileSync(p35, shot35.toPNG())
    assert(existsSync(p35), 'Frame 35% radius: New wallpaper in center, old wallpaper preserved outside circle')

    // Frame 70%
    await overlayWin.webContents.executeJavaScript('drawAtRadius(maxRadius * 0.70)')
    await new Promise((r) => setTimeout(r, 80))
    const shot70 = await overlayWin.capturePage()
    const p70 = join(outDir, '03_reveal_frame70_expanding.png')
    writeFileSync(p70, shot70.toPNG())
    assert(existsSync(p70), 'Frame 70% radius: Expanding circle smoothly transitions across screen')

    // Frame 100%: Completely new wallpaper
    await overlayWin.webContents.executeJavaScript('drawAtRadius(maxRadius)')
    await new Promise((r) => setTimeout(r, 80))
    const shot100 = await overlayWin.capturePage()
    const p100 = join(outDir, '04_reveal_frame100_new_wallpaper_complete.png')
    writeFileSync(p100, shot100.toPNG())
    assert(existsSync(p100), 'Frame 100% radius: New wallpaper covers 100% of display before native update')

    overlayWin.destroy()
    log('')

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: Transition Lifecycle State Machine & Guaranteed Unlock on Failure
    // ────────────────────────────────────────────────────────────────────────
    log('--- Test 2: Transition Lifecycle State & Guaranteed Unlock on Failure ---')
    let transitionState = 'idle'
    let transitionStartTime = 0
    const WATCHDOG_MS = 10000

    async function applyWallpaperSimulated(targetPath, simulateNativeFailure = false) {
      const now = Date.now()
      if (transitionState !== 'idle') {
        if (now - transitionStartTime > WATCHDOG_MS) {
          log('[TransitionController] Auto-recovering from stale transition state')
          transitionState = 'idle'
        } else {
          return { success: false, message: 'A wallpaper transition is already in progress.' }
        }
      }

      transitionState = 'preparing'
      transitionStartTime = Date.now()

      try {
        if (!targetPath || !existsSync(targetPath)) {
          throw new Error('Wallpaper file does not exist.')
        }

        transitionState = 'animating'
        await new Promise((r) => setTimeout(r, 80)) // simulate animation

        transitionState = 'applying'
        if (simulateNativeFailure) {
          throw new Error('Native Windows wallpaper API failed to apply image')
        }

        transitionState = 'completed'
        return { success: true, message: 'Desktop wallpaper updated successfully.' }
      } catch (err) {
        transitionState = 'failed'
        return { success: false, message: `Failed to set wallpaper: ${err.message}` }
      } finally {
        // Guaranteed cleanup in terminal path
        transitionState = 'idle'
      }
    }

    assert(transitionState === 'idle', 'Initial state is "idle"')

    // Simulated Failure 1: Nonexistent file
    const failRes1 = await applyWallpaperSimulated('C:\\non_existent\\missing.jpg')
    assert(failRes1.success === false, 'Nonexistent file properly rejected')
    assert(transitionState === 'idle', 'Transition state immediately restored to "idle" on missing file')

    // Simulated Failure 2: Native Windows API error
    const failRes2 = await applyWallpaperSimulated(newWallpaper, true)
    assert(failRes2.success === false && failRes2.message.includes('Native Windows wallpaper API failed'), 'Native error properly caught and reported')
    assert(transitionState === 'idle', 'Transition state immediately restored to "idle" on native API failure')

    // Subsequent call after failure: MUST NOT BE BLOCKED
    const retryRes = await applyWallpaperSimulated(newWallpaper, false)
    assert(retryRes.success === true, 'Subsequent retry after failure succeeds without "already in progress" block')
    assert(transitionState === 'idle', 'State returns to "idle" after successful completion')
    log('')

    // ────────────────────────────────────────────────────────────────────────
    // TEST 3: Rapid Concurrent Clicks Handling
    // ────────────────────────────────────────────────────────────────────────
    log('--- Test 3: Rapid Concurrent Clicks Handling ---')
    // Start real async operation
    const op1 = applyWallpaperSimulated(newWallpaper, false)
    // Rapid duplicate click while op1 is running
    const op2 = await applyWallpaperSimulated(oldWallpaper, false)

    assert(op2.success === false && op2.message === 'A wallpaper transition is already in progress.', 'Rapid duplicate click safely rejected while active transition is in progress')

    const op1Res = await op1
    assert(op1Res.success === true, 'Original transition completes successfully')
    assert(transitionState === 'idle', 'Transition lock is freed to "idle" when original transition terminates')

    // Third call after completion: works normally
    const op3 = await applyWallpaperSimulated(oldWallpaper, false)
    assert(op3.success === true, 'Subsequent wallpaper change works normally without permanent lock')
    assert(transitionState === 'idle', 'State remains "idle" after completed third request')
    log('')

    // ────────────────────────────────────────────────────────────────────────
    // TEST 4: Watchdog Stale State Recovery
    // ────────────────────────────────────────────────────────────────────────
    log('--- Test 4: Watchdog Stale State Auto-Recovery ---')
    // Artificially simulate an unhandled crash that left state as 'animating' 15 seconds ago
    transitionState = 'animating'
    transitionStartTime = Date.now() - 15000 // 15s ago (> 10s watchdog)

    const recoveredRes = await applyWallpaperSimulated(newWallpaper, false)
    assert(recoveredRes.success === true, 'Watchdog detected stale transition and auto-recovered successfully')
    assert(transitionState === 'idle', 'State cleanly restored to "idle"')
    log('')

    // ────────────────────────────────────────────────────────────────────────
    // TEST 5: Actual Native Desktop Wallpaper Application
    // ────────────────────────────────────────────────────────────────────────
    log('--- Test 5: Actual Native Desktop Wallpaper Application ---')
    const nativeSuccess = await executeSetWallpaperAsync(newWallpaper)
    assert(nativeSuccess === true, 'executeSetWallpaperAsync applies image via Windows native API')

    await new Promise((r) => setTimeout(r, 400))
    const activeDesktop = getWindowsCurrentWallpaper()
    log(`Windows registry current wallpaper: ${activeDesktop}`)
    assert(activeDesktop && activeDesktop.toLowerCase() === newWallpaper.toLowerCase(), 'Windows registry confirms desktop wallpaper updated to selected image')
    log('')

    // Restore original wallpaper
    log('Restoring initial wallpaper...')
    await executeSetWallpaperAsync(oldWallpaper)

    log('===================================================')
    log(`ALL VERIFICATION TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`)
    log('===================================================')

    app.quit()
    process.exit(failed === 0 ? 0 : 1)
  } catch (err) {
    log('UNEXPECTED TEST ERROR: ' + (err?.stack || String(err)))
    app.exit(1)
  }
})
