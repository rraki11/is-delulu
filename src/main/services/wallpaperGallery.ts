import { dialog, BrowserWindow, nativeImage, app } from 'electron'
import { readdirSync, statSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { execSync } from 'child_process'
import { WallpaperItem } from '../../shared/types'
import { getPreferences, updatePreferences } from './preferences'
import { extractPaletteFromWallpaper, getWindowsWallpaperPath } from './wallpaper'
import { getMainWindow } from '../window'

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.avif'])

// In-memory LRU thumbnail cache: key = `${filePath}:${mtimeMs}` -> dataUrl
const thumbnailCache = new Map<string, string>()
const MAX_CACHE_ITEMS = 150

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

    const images = scanWallpaperFolder(folderPath)
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

    const images = scanWallpaperFolder(targetFolder)
    return { success: true, folderPath: targetFolder, images }
  } catch (err) {
    return { success: false, folderPath: null, images: [], error: String(err) }
  }
}

/**
 * Applies the selected wallpaper image as the Windows desktop wallpaper.
 */
export async function applyWallpaperAsDesktop(
  filePath: string
): Promise<{ success: boolean; message?: string }> {
  if (!filePath || !existsSync(filePath)) {
    return { success: false, message: 'Wallpaper file does not exist.' }
  }

  try {
    const scriptPath = resolveWallpaperScriptPath()
    if (scriptPath) {
      execSync(
        `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -ImagePath "${filePath}"`,
        {
          stdio: ['ignore', 'ignore', 'ignore'],
          timeout: 8000
        }
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
[DesktopWallpaper]::SystemParametersInfo(0x0014, 0, '${filePath.replace(/'/g, "''")}', 0x03)
`
      const buffer = Buffer.from(psScript, 'utf16le')
      const encoded = buffer.toString('base64')
      execSync(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`, {
        stdio: ['ignore', 'ignore', 'ignore'],
        timeout: 8000
      })
    }

    updatePreferences({ selectedWallpaperPath: filePath })

    // Immediately trigger palette extraction if in wallpaper accent mode
    const prefs = getPreferences()
    const mainWindow = getMainWindow()
    if (prefs.accentMode === 'wallpaper' && mainWindow && !mainWindow.isDestroyed()) {
      const palette = extractPaletteFromWallpaper(filePath)
      if (palette) {
        mainWindow.webContents.send('theme:accent-updated', palette)
      }
    }

    return { success: true, message: 'Desktop wallpaper updated successfully.' }
  } catch (err) {
    console.error('[WallpaperGallery] Failed to set desktop wallpaper:', err)
    return { success: false, message: `Failed to set wallpaper: ${String(err)}` }
  }
}

/**
 * Returns the currently active Windows desktop wallpaper path.
 */
export function getCurrentDesktopWallpaper(): string | null {
  return getWindowsWallpaperPath()
}
