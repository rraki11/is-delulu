import { dialog, BrowserWindow, nativeImage, app, screen } from 'electron'
import { readdirSync, statSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { spawn } from 'child_process'
import { pathToFileURL } from 'url'
import { WallpaperItem } from '../../shared/types'
import { getPreferences, updatePreferences } from './preferences'
import {
  extractPaletteFromWallpaper,
  getWindowsWallpaperPath,
  pauseWallpaperMonitor,
  resumeWallpaperMonitor
} from './wallpaper'
import { getMainWindow } from '../window'

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.avif'])

// In-memory LRU thumbnail cache: key = `${filePath}:${mtimeMs}` -> dataUrl
const thumbnailCache = new Map<string, string>()
const MAX_CACHE_ITEMS = 150

export type TransitionLifecycleState =
  | 'idle'
  | 'preparing'
  | 'animating'
  | 'applying'
  | 'completed'
  | 'failed'

let transitionState: TransitionLifecycleState = 'idle'
let transitionStartTime = 0
let activeTransitionWin: BrowserWindow | null = null

const TRANSITION_WATCHDOG_TIMEOUT_MS = 10000 // 10 seconds max duration before auto-recovery
const SET_WALLPAPER_TIMEOUT_MS = 6000 // 6 seconds max for native wallpaper update

function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer)
  })
}

function resolveWallpaperExePath(): string | null {
  const possiblePaths = [
    join(process.cwd(), 'src/main/services/set-wallpaper.exe'),
    join(app.getAppPath(), 'src/main/services/set-wallpaper.exe'),
    join(app.getAppPath(), 'out/main/services/set-wallpaper.exe'),
    join(__dirname, 'services/set-wallpaper.exe'),
    join(__dirname, 'set-wallpaper.exe')
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return null
}

function resolveWallpaperScriptPath(): string | null {
  const possiblePaths = [
    join(process.cwd(), 'src/main/services/set-wallpaper.ps1'),
    join(process.cwd(), 'scripts/set-wallpaper.ps1'),
    join(app.getAppPath(), 'src/main/services/set-wallpaper.ps1'),
    join(app.getAppPath(), 'scripts/set-wallpaper.ps1'),
    join(__dirname, 'services/set-wallpaper.ps1'),
    join(__dirname, 'set-wallpaper.ps1'),
    join(app.getAppPath(), 'out/main/services/set-wallpaper.ps1')
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return null
}

function executeSetWallpaperPowerShellAsync(filePath: string): Promise<boolean> {
  const scriptPath = resolveWallpaperScriptPath()
  return new Promise<boolean>((resolve) => {
    let settled = false
    let child: any = null

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        if (child) {
          try {
            child.kill()
          } catch {}
        }
        console.warn('[WallpaperGallery] PowerShell wallpaper update timed out after', SET_WALLPAPER_TIMEOUT_MS, 'ms')
        resolve(false)
      }
    }, SET_WALLPAPER_TIMEOUT_MS)

    try {
      if (scriptPath && existsSync(scriptPath)) {
        child = spawn(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-ImagePath', filePath],
          { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
        )
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

      child.on('close', (code: number) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(code === 0)
        }
      })

      child.on('error', (err: any) => {
        console.warn('[WallpaperGallery] PowerShell child error:', err)
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(false)
        }
      })
    } catch (spawnErr) {
      console.warn('[WallpaperGallery] Failed to spawn PowerShell:', spawnErr)
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(false)
      }
    }
  })
}

function executeSetWallpaperAsync(filePath: string): Promise<boolean> {
  const exePath = resolveWallpaperExePath()
  if (exePath && existsSync(exePath)) {
    return new Promise<boolean>((resolve) => {
      let settled = false
      let child: any = null

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          if (child) {
            try {
              child.kill()
            } catch {}
          }
          console.warn('[WallpaperGallery] Helper exe timed out, falling back to PowerShell')
          resolve(false)
        }
      }, 5000)

      try {
        child = spawn(exePath, [filePath], {
          stdio: ['ignore', 'ignore', 'ignore'],
          windowsHide: true
        })

        child.on('close', (code: number) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(code === 0)
          }
        })

        child.on('error', (err: any) => {
          console.warn('[WallpaperGallery] Helper exe error, falling back:', err)
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
    }).then((ok) => {
      if (ok) return true
      return executeSetWallpaperPowerShellAsync(filePath)
    })
  }

  return executeSetWallpaperPowerShellAsync(filePath)
}

function resolveRevealHtmlPath(): string {
  const possiblePaths = [
    join(process.cwd(), 'src/main/services/wallpaper-reveal.html'),
    join(app.getAppPath(), 'src/main/services/wallpaper-reveal.html'),
    join(app.getAppPath(), 'out/main/services/wallpaper-reveal.html'),
    join(__dirname, 'services/wallpaper-reveal.html'),
    join(__dirname, 'wallpaper-reveal.html')
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return join(__dirname, 'wallpaper-reveal.html')
}

/**
 * Scans a folder for supported wallpaper images.
 */
export function scanWallpaperFolder(folderPath: string): WallpaperItem[] {
  if (!folderPath || !existsSync(folderPath)) return []

  try {
    const stat = statSync(folderPath)
    if (!stat.isDirectory()) return []

    const entries = readdirSync(folderPath, { withFileTypes: true })
    const items: WallpaperItem[] = []

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const ext = extname(entry.name).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue

      const fullPath = join(folderPath, entry.name)
      try {
        const fileStat = statSync(fullPath)
        if (fileStat.size <= 0) continue

        items.push({
          id: `${fullPath}:${fileStat.mtimeMs}`,
          name: basename(entry.name, ext),
          fileName: entry.name,
          filePath: fullPath,
          fileSize: fileStat.size,
          modifiedTime: fileStat.mtimeMs
        })
      } catch {
        // Skip unreadable files
      }
    }

    // Natural alphabetical sort
    items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    return items
  } catch (err) {
    console.warn('[WallpaperGallery] Failed to scan directory:', err)
    return []
  }
}

/**
 * Generates or retrieves a lightweight base64 thumbnail for a wallpaper image.
 */
export function getWallpaperThumbnail(filePath: string): string | null {
  if (!filePath || !existsSync(filePath)) return null

  try {
    const ext = extname(filePath).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) return null

    const stat = statSync(filePath)
    const cacheKey = `${filePath}:${stat.mtimeMs}`

    if (thumbnailCache.has(cacheKey)) {
      return thumbnailCache.get(cacheKey)!
    }

    const img = nativeImage.createFromPath(filePath)
    if (img.isEmpty()) return null

    const size = img.getSize()
    if (size.width === 0 || size.height === 0) return null

    // Target thumbnail max bounds: 360x225 (16:10 / 16:9 ratio)
    const maxW = 360
    const maxH = 225
    const scale = Math.min(maxW / size.width, maxH / size.height, 1)
    const targetW = Math.max(1, Math.round(size.width * scale))
    const targetH = Math.max(1, Math.round(size.height * scale))

    const thumb = img.resize({ width: targetW, height: targetH, quality: 'good' })
    const dataUrl = thumb.toDataURL()

    if (thumbnailCache.size >= MAX_CACHE_ITEMS) {
      const firstKey = thumbnailCache.keys().next().value
      if (firstKey) thumbnailCache.delete(firstKey)
    }

    thumbnailCache.set(cacheKey, dataUrl)
    return dataUrl
  } catch (err) {
    console.warn('[WallpaperGallery] Error generating thumbnail for:', filePath, err)
    return null
  }
}

function orderWithSelectedFirst(images: WallpaperItem[], selectedPath?: string): WallpaperItem[] {
  if (!selectedPath || images.length <= 1) return images
  const targetLower = selectedPath.toLowerCase()
  const idx = images.findIndex((img) => img.filePath.toLowerCase() === targetLower)
  if (idx > 0) {
    const selected = images[idx]
    const remaining = images.filter((_, i) => i !== idx)
    return [selected, ...remaining]
  }
  return images
}

/**
 * Opens native Windows folder picker dialog and returns scanned images.
 */
export async function selectWallpaperFolder(window?: BrowserWindow | null): Promise<{
  canceled: boolean
  folderPath?: string
  images?: WallpaperItem[]
  error?: string
}> {
  try {
    const parentWin = window || getMainWindow() || undefined
    const prefs = getPreferences()
    const defaultPath =
      prefs.wallpaperFolderPath && existsSync(prefs.wallpaperFolderPath)
        ? prefs.wallpaperFolderPath
        : undefined

    const result = await dialog.showOpenDialog(parentWin as BrowserWindow, {
      title: 'Select Wallpaper Collection Folder',
      properties: ['openDirectory', 'dontAddToRecent'],
      defaultPath
    })

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const folderPath = result.filePaths[0]
    updatePreferences({ wallpaperFolderPath: folderPath })

    const rawImages = scanWallpaperFolder(folderPath)
    const images = orderWithSelectedFirst(rawImages, prefs.selectedWallpaperPath)
    return {
      canceled: false,
      folderPath,
      images
    }
  } catch (err) {
    console.error('[WallpaperGallery] Error opening folder dialog:', err)
    return { canceled: false, error: String(err) }
  }
}

/**
 * Gets wallpaper images from the saved folder or an explicit folder path.
 */
export function getSavedWallpaperImages(customFolder?: string): {
  success: boolean
  folderPath: string | null
  images: WallpaperItem[]
  error?: string
} {
  try {
    const prefs = getPreferences()
    const targetFolder = customFolder || prefs.wallpaperFolderPath

    if (!targetFolder) {
      return { success: true, folderPath: null, images: [] }
    }

    if (!existsSync(targetFolder)) {
      return {
        success: false,
        folderPath: targetFolder,
        images: [],
        error: 'The saved wallpaper folder no longer exists or is inaccessible.'
      }
    }

    const rawImages = scanWallpaperFolder(targetFolder)
    const images = orderWithSelectedFirst(rawImages, prefs.selectedWallpaperPath)
    return { success: true, folderPath: targetFolder, images }
  } catch (err) {
    return { success: false, folderPath: null, images: [], error: String(err) }
  }
}

/**
 * Applies the selected wallpaper image as the Windows desktop wallpaper with a circular reveal transition.
 * Preserves the previous wallpaper as the background base layer so no gray frames or gaps appear.
 */
export async function applyWallpaperAsDesktop(
  filePath: string
): Promise<{ success: boolean; message?: string }> {
  if (!filePath || !existsSync(filePath)) {
    return { success: false, message: 'Wallpaper file does not exist.' }
  }

  const now = Date.now()
  if (transitionState !== 'idle') {
    // If the transition has been running longer than the watchdog limit, auto-recover from stale state
    if (now - transitionStartTime > TRANSITION_WATCHDOG_TIMEOUT_MS) {
      console.warn(
        `[WallpaperGallery] Recovering from stale transition state "${transitionState}" (${now - transitionStartTime}ms old)`
      )
      cleanUpActiveOverlay()
      transitionState = 'idle'
    } else {
      return { success: false, message: 'A wallpaper transition is already in progress.' }
    }
  }

  // Safely clean up any leftover overlay window from earlier calls
  cleanUpActiveOverlay()

  transitionState = 'preparing'
  transitionStartTime = Date.now()
  pauseWallpaperMonitor()

  let transitionSucceeded = false
  let overlayWin: BrowserWindow | null = null

  try {
    const mainWindow = getMainWindow()
    const targetDisplay =
      mainWindow && !mainWindow.isDestroyed()
        ? screen.getDisplayMatching(mainWindow.getBounds())
        : screen.getPrimaryDisplay()

    const { x, y, width, height } = targetDisplay.bounds

    // 1. Resolve current wallpaper for base layer (preserves previous wallpaper during reveal)
    const currentWallpaperPath = getCurrentDesktopWallpaper() || getPreferences().selectedWallpaperPath
    let oldWallpaperUrl: string | null = null
    if (currentWallpaperPath && existsSync(currentWallpaperPath)) {
      try {
        oldWallpaperUrl = pathToFileURL(currentWallpaperPath).toString()
      } catch {}
    }
    const newWallpaperUrl = pathToFileURL(filePath).toString()

    // 2. Create non-interactive full-screen transition overlay window
    overlayWin = new BrowserWindow({
      x,
      y,
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
      show: false,
      type: 'toolbar',
      webPreferences: {
        webSecurity: false,
        sandbox: false,
        contextIsolation: false,
        backgroundThrottling: false // Prevents Chromium from throttling requestAnimationFrame
      }
    })

    activeTransitionWin = overlayWin

    // Natively applies WS_EX_TRANSPARENT, allowing mouse clicks and moves to pass straight through
    overlayWin.setIgnoreMouseEvents(true)

    const htmlPath = resolveRevealHtmlPath()
    if (!existsSync(htmlPath)) {
      throw new Error('Reveal transition template not found')
    }

    await overlayWin.loadFile(htmlPath)

    // 3. Preload and decode both wallpapers, and pre-render Frame 0 (100% old wallpaper)
    transitionState = 'preparing'
    const prepareScript = `
      if (window.prepareTransition) {
        window.prepareTransition(${JSON.stringify(newWallpaperUrl)}, ${JSON.stringify(oldWallpaperUrl)});
      } else if (window.setImage) {
        window.setImage(${JSON.stringify(newWallpaperUrl)});
      } else {
        Promise.resolve({ success: true });
      }
    `
    const prepRes = await executeWithTimeout(
      overlayWin.webContents.executeJavaScript(prepareScript),
      5000,
      'Wallpaper image preloading timed out'
    )
    if (prepRes && prepRes.success === false) {
      throw new Error(prepRes.error || 'Failed to preload wallpaper image')
    }

    // 4. Reveal overlay without stealing focus. Frame 0 (old wallpaper) is already drawn!
    overlayWin.showInactive()

    // Ensure island window remains top-level
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.moveTop()
    }

    // 5. Trigger expanding circular reveal animation (target: 800ms)
    // Runs at full GPU refresh rate (140+ FPS) via WebGL shader without CPU raster spikes
    transitionState = 'animating'
    await executeWithTimeout(
      overlayWin.webContents.executeJavaScript(
        'window.startAnimation ? window.startAnimation(800) : Promise.resolve(true)'
      ),
      4000,
      'Wallpaper reveal animation timed out'
    )

    // 6. The circular reveal has completely covered the display (100% opaque new wallpaper).
    // Now coordinate the native Windows desktop wallpaper update underneath.
    // Explorer/DWM updating underneath is completely seamless because the overlay covers 100% of the display.
    transitionState = 'applying'
    const wallpaperApplied = await executeSetWallpaperAsync(filePath)
    if (!wallpaperApplied) {
      throw new Error('Native Windows wallpaper API failed to apply image')
    }

    // 7. Success! Commit new wallpaper
    transitionState = 'completed'
    transitionSucceeded = true
    updatePreferences({ selectedWallpaperPath: filePath })

    return { success: true, message: 'Desktop wallpaper updated successfully.' }
  } catch (err) {
    transitionState = 'failed'
    console.error('[WallpaperGallery] Failed to set desktop wallpaper with transition:', err)
    return {
      success: false,
      message: `Failed to set wallpaper: ${err instanceof Error ? err.message : String(err)}`
    }
  } finally {
    // 8. GUARANTEED TERMINAL CLEANUP in all paths (success, failure, timeout, or cancellation)
    cleanUpActiveOverlay()

    if (transitionSucceeded) {
      resumeWallpaperMonitor(filePath)
      // Defer palette extraction slightly so main thread and renderer stay completely idle during wrap-up
      setTimeout(() => {
        const prefs = getPreferences()
        const win = getMainWindow()
        if (prefs.accentMode === 'wallpaper' && win && !win.isDestroyed()) {
          const palette = extractPaletteFromWallpaper(filePath)
          if (palette) {
            win.webContents.send('theme:accent-updated', palette)
          }
        }
      }, 50)
    } else {
      resumeWallpaperMonitor()
    }

    transitionState = 'idle'
  }
}

/**
 * Ensures any active transition overlay window is safely destroyed.
 */
function cleanUpActiveOverlay(): void {
  if (activeTransitionWin && !activeTransitionWin.isDestroyed()) {
    try {
      activeTransitionWin.destroy()
    } catch {}
  }
  activeTransitionWin = null
}

/**
 * Ensures any active transition overlay is cleaned up immediately and state reset to idle.
 */
export function cleanUpWallpaperTransition(): void {
  cleanUpActiveOverlay()
  transitionState = 'idle'
  resumeWallpaperMonitor()
}

/**
 * Returns current transition lifecycle state.
 */
export function getWallpaperTransitionState(): TransitionLifecycleState {
  return transitionState
}

/**
 * Returns the currently active Windows desktop wallpaper path.
 */
export function getCurrentDesktopWallpaper(): string | null {
  return getWindowsWallpaperPath()
}
