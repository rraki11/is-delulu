import { nativeImage, app } from 'electron'
import { join } from 'path'
import { existsSync, statSync, watch, FSWatcher, readFileSync, writeFileSync } from 'fs'
import { exec } from 'child_process'
import { AccentPalette, UserPreferences } from '../../shared/types'

// Cache palette based on path and modified time
let cachedKey = ''
let cachedPalette: AccentPalette | null = null

function getPaletteCacheFilePath(): string {
  try {
    return join(app.getPath('userData'), 'palette-cache.json')
  } catch {
    return ''
  }
}

function loadPaletteCache(): void {
  if (cachedPalette) return
  try {
    const p = getPaletteCacheFilePath()
    if (p && existsSync(p)) {
      const raw = readFileSync(p, 'utf-8')
      const data = JSON.parse(raw)
      if (data && data.key && data.palette) {
        cachedKey = data.key
        cachedPalette = data.palette
      }
    }
  } catch {}
}

function savePaletteCache(key: string, palette: AccentPalette): void {
  try {
    const p = getPaletteCacheFilePath()
    if (p) {
      writeFileSync(p, JSON.stringify({ key, palette }), 'utf-8')
    }
  } catch {}
}

// Watcher and timer
let themesWatcher: FSWatcher | null = null
let pollTimer: NodeJS.Timeout | null = null
let watchDebounceTimer: NodeJS.Timeout | null = null
let lastKnownPath = ''
let lastKnownMtime = 0

// Helper HSL / RGB converters
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: Math.round(h * 360), s, l }
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360
  h /= 360
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  const num = parseInt(clean, 16)
  if (isNaN(num)) return { r: 139, g: 92, b: 246 }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number): string => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase()
}

/**
 * Returns default is-delulu chartreuse palette
 */
export function getDefaultAccentPalette(): AccentPalette {
  return {
    primary: '#A3E635',
    primaryLight: '#6366F1',
    secondary: '#8B5CF6',
    highlight: '#00F0FF',
    glow: 'rgba(163, 230, 53, 0.12)',
    subtle: 'rgba(163, 230, 53, 0.08)',
    border: 'rgba(163, 230, 53, 0.32)',
    text: '#A3E635',
    sourceWallpaper: undefined
  }
}

/**
 * Creates a complete harmonious palette from any user-selected hex color (Manual Mode)
 */
export function generatePaletteFromHex(hex: string): AccentPalette {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const rgbDelta = Math.max(r, g, b) - Math.min(r, g, b)
  const isNeutral = rgbDelta <= 14 || s < 0.12 || l > 0.95 || l < 0.06

  if (isNeutral) {
    const isBright = l >= 0.50
    const primaryHex = isBright ? '#F8FAFC' : '#E2E8F0'
    const primaryLightHex = '#0F172A'
    return {
      primary: primaryHex,
      primaryLight: primaryLightHex,
      secondary: '#94A3B8',
      highlight: '#E2E8F0',
      glow: 'rgba(248, 250, 252, 0.28)',
      subtle: 'rgba(248, 250, 252, 0.10)',
      border: 'rgba(248, 250, 252, 0.35)',
      text: '#FFFFFF',
      sourceWallpaper: undefined
    }
  }

  const darkPrimary = hslToRgb(h, Math.max(s, 0.75), 0.58)
  const lightPrimary = hslToRgb(h, Math.max(s, 0.8), 0.36)
  const secondary = hslToRgb((h + 35) % 360, Math.max(s, 0.7), 0.55)
  const highlight = hslToRgb((h + 160) % 360, Math.max(s, 0.85), 0.6)
  const textClr = hslToRgb(h, Math.max(s, 0.85), 0.72)

  return {
    primary: toHex(darkPrimary.r, darkPrimary.g, darkPrimary.b),
    primaryLight: toHex(lightPrimary.r, lightPrimary.g, lightPrimary.b),
    secondary: toHex(secondary.r, secondary.g, secondary.b),
    highlight: toHex(highlight.r, highlight.g, highlight.b),
    glow: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.28)`,
    subtle: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.09)`,
    border: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.35)`,
    text: toHex(textClr.r, textClr.g, textClr.b),
    sourceWallpaper: undefined
  }
}

let cachedRegistryWallpaperPath: string | null = null
let isRegistryQueryPending = false

function triggerAsyncRegistryWallpaperCheck(): void {
  if (isRegistryQueryPending) return
  isRegistryQueryPending = true
  exec('reg query "HKCU\\Control Panel\\Desktop" /v WallPaper', (err, stdout) => {
    isRegistryQueryPending = false
    if (!err && stdout) {
      const match = stdout.match(/WallPaper\s+REG_SZ\s+(.*)/i)
      if (match && match[1]) {
        const candidate = match[1].trim()
        if (candidate && existsSync(candidate)) {
          try {
            const st = statSync(candidate)
            if (st.size > 0) {
              cachedRegistryWallpaperPath = candidate
            }
          } catch {}
        }
      }
    }
  })
}

/**
 * Retrieves the current Windows desktop wallpaper file path
 * Fast, non-blocking: checks TranscodedWallpaper first (0ms), then registry cache.
 */
export function getWindowsWallpaperPath(): string | null {
  // 1. Check TranscodedWallpaper in Themes directory (instant file stat, 0ms)
  try {
    const appData = process.env.APPDATA || ''
    if (appData) {
      const transcoded = join(appData, 'Microsoft/Windows/Themes/TranscodedWallpaper')
      if (existsSync(transcoded)) {
        const st = statSync(transcoded)
        if (st.size > 0) return transcoded
      }
    }
  } catch {}

  // 2. Fall back to cached registry wallpaper path
  if (cachedRegistryWallpaperPath && existsSync(cachedRegistryWallpaperPath)) {
    return cachedRegistryWallpaperPath
  }

  // 3. Asynchronously trigger background query if not already cached
  triggerAsyncRegistryWallpaperCheck()

  return null
}

/**
 * Analyzes the wallpaper image locally and extracts a harmonious palette.
 * Intelligently handles bright white, ivory, light-gray, monochromatic, pastel,
 * hybrid, and rich chromatic wallpapers with accessibility and contrast calibration.
 */
export function extractPaletteFromWallpaper(filePath: string): AccentPalette | null {
  try {
    if (!existsSync(filePath)) return null

    loadPaletteCache()

    const st = statSync(filePath)
    const key = `${filePath}:${st.mtimeMs}`
    if (cachedPalette && cachedKey === key) {
      return cachedPalette
    }

    // Load and downsample image to 64x64 thumbnail via Electron's native engine
    const image = nativeImage.createFromPath(filePath)
    if (image.isEmpty()) return null

    const thumb = image.resize({ width: 64, height: 64, quality: 'good' })
    const bitmap = thumb.toBitmap()
    if (!bitmap || bitmap.length === 0) return null

    // 16 Hue Buckets (22.5 deg each) for fine-grained color quantization
    const BUCKET_COUNT = 16
    const BUCKET_SIZE = 360 / BUCKET_COUNT
    const buckets = Array.from({ length: BUCKET_COUNT }, () => ({
      count: 0,
      rSum: 0,
      gSum: 0,
      bSum: 0,
      sSum: 0,
      lSum: 0
    }))

    let totalValidCount = 0
    let neutralCount = 0
    let neutralRSum = 0
    let neutralGSum = 0
    let neutralBSum = 0
    let brightNeutralCount = 0
    let brightNeutralRSum = 0
    let brightNeutralGSum = 0
    let brightNeutralBSum = 0
    let darkNeutralCount = 0
    let pastelCount = 0

    for (let i = 0; i < bitmap.length; i += 4) {
      // BGRA format from Electron bitmap
      const b = bitmap[i]
      const g = bitmap[i + 1]
      const r = bitmap[i + 2]
      const a = bitmap[i + 3]
      if (a < 180) continue

      totalValidCount++
      const { h, s, l } = rgbToHsl(r, g, b)
      const rgbDelta = Math.max(r, g, b) - Math.min(r, g, b)

      // Neutral check: small RGB channel spread, very low saturation, or extreme luminance
      const isNeutral = rgbDelta <= 14 || s < 0.12 || l > 0.96 || l < 0.06

      if (isNeutral) {
        neutralCount++
        neutralRSum += r
        neutralGSum += g
        neutralBSum += b
        if (l >= 0.68) {
          brightNeutralCount++
          brightNeutralRSum += r
          brightNeutralGSum += g
          brightNeutralBSum += b
        }
        if (l < 0.25) {
          darkNeutralCount++
        }
      } else {
        // Chromatic or pastel pixels
        if (l >= 0.58 && s < 0.50) {
          pastelCount++
        }

        if (l >= 0.08 && l <= 0.95) {
          const bucketIdx = Math.min(Math.floor(h / BUCKET_SIZE), BUCKET_COUNT - 1)
          const bkt = buckets[bucketIdx]
          bkt.count++
          bkt.rSum += r
          bkt.gSum += g
          bkt.bSum += b
          bkt.sSum += s
          bkt.lSum += l
        }
      }
    }

    if (totalValidCount === 0) {
      return getDefaultAccentPalette()
    }

    const neutralRatio = neutralCount / totalValidCount
    const brightNeutralRatio = brightNeutralCount / totalValidCount
    const darkNeutralRatio = darkNeutralCount / totalValidCount
    const pastelRatio = pastelCount / totalValidCount

    // Score chromatic clusters
    const scored = buckets
      .map((bkt, idx) => {
        if (bkt.count === 0) return null
        const avgS = bkt.sSum / bkt.count
        const avgL = bkt.lSum / bkt.count
        const avgR = Math.round(bkt.rSum / bkt.count)
        const avgG = Math.round(bkt.gSum / bkt.count)
        const avgB = Math.round(bkt.bSum / bkt.count)
        const hue = Math.round((idx + 0.5) * BUCKET_SIZE)
        const ratio = bkt.count / totalValidCount

        // Score balancing population, vibrant saturation, and pleasing lightness
        const score = bkt.count * (0.8 + avgS * 1.5) * (1 - Math.abs(avgL - 0.55) * 0.8)
        return { idx, count: bkt.count, avgS, avgL, hue, r: avgR, g: avgG, b: avgB, ratio, score }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score)

    let palette: AccentPalette

    // --------------------------------------------------------------------------
    // CASE 1: Predominantly White / Ivory / Light-Gray Neutral Wallpaper
    // --------------------------------------------------------------------------
    if (
      brightNeutralRatio >= 0.45 ||
      (neutralRatio >= 0.75 && brightNeutralCount >= darkNeutralCount)
    ) {
      // If there are no chromatic clusters or only tiny stray noise (< 9% of image)
      if (scored.length === 0 || scored[0].ratio < 0.09) {
        const avgR = Math.round(brightNeutralRSum / Math.max(brightNeutralCount, 1))
        const avgG = Math.round(brightNeutralGSum / Math.max(brightNeutralCount, 1))
        const avgB = Math.round(brightNeutralBSum / Math.max(brightNeutralCount, 1))
        const hsl = rgbToHsl(avgR, avgG, avgB)

        // Warm Ivory / Champagne pearl
        if (avgR > avgB + 5 || (hsl.h >= 25 && hsl.h <= 70 && hsl.s >= 0.04)) {
          palette = {
            primary: '#FFFDF5',
            primaryLight: '#1C1917',
            secondary: '#D97706',
            highlight: '#FEF08A',
            glow: 'rgba(254, 249, 195, 0.35)',
            subtle: 'rgba(254, 249, 195, 0.12)',
            border: 'rgba(254, 249, 195, 0.35)',
            text: '#FFFDF5',
            sourceWallpaper: filePath
          }
        } else if (avgB > avgR + 4 || (hsl.h >= 190 && hsl.h <= 260 && hsl.s >= 0.04)) {
          // Cool Frost / Ice Silver
          palette = {
            primary: '#F1F5F9',
            primaryLight: '#0F172A',
            secondary: '#38BDF8',
            highlight: '#E2E8F0',
            glow: 'rgba(241, 245, 249, 0.32)',
            subtle: 'rgba(241, 245, 249, 0.10)',
            border: 'rgba(241, 245, 249, 0.35)',
            text: '#FFFFFF',
            sourceWallpaper: filePath
          }
        } else {
          // Pure Minimalist Platinum / Frost
          palette = {
            primary: '#F8FAFC',
            primaryLight: '#0F172A',
            secondary: '#94A3B8',
            highlight: '#E2E8F0',
            glow: 'rgba(248, 250, 252, 0.30)',
            subtle: 'rgba(248, 250, 252, 0.12)',
            border: 'rgba(248, 250, 252, 0.35)',
            text: '#FFFFFF',
            sourceWallpaper: filePath
          }
        }

        cachedKey = key
        cachedPalette = palette
        savePaletteCache(key, palette)
        return palette
      }
    }

    // --------------------------------------------------------------------------
    // CASE 2: Predominantly Dark Neutral Monochromatic Wallpaper
    // --------------------------------------------------------------------------
    if (darkNeutralRatio >= 0.70 && (scored.length === 0 || scored[0].ratio < 0.05)) {
      palette = {
        primary: '#E2E8F0',
        primaryLight: '#1E293B',
        secondary: '#38BDF8',
        highlight: '#F8FAFC',
        glow: 'rgba(226, 232, 240, 0.28)',
        subtle: 'rgba(226, 232, 240, 0.10)',
        border: 'rgba(226, 232, 240, 0.32)',
        text: '#F8FAFC',
        sourceWallpaper: filePath
      }
      cachedKey = key
      cachedPalette = palette
      savePaletteCache(key, palette)
      return palette
    }

    // --------------------------------------------------------------------------
    // CASE 3: Chromatic, Pastel, or Hybrid Wallpapers
    // --------------------------------------------------------------------------
    if (scored.length > 0) {
      const winner = scored[0]
      const isPastel = (winner.avgL >= 0.60 && winner.avgS < 0.55) || pastelRatio >= 0.35

      let darkPrimary: { r: number; g: number; b: number }
      let lightPrimary: { r: number; g: number; b: number }

      if (isPastel) {
        darkPrimary = hslToRgb(
          winner.hue,
          Math.max(winner.avgS, 0.45),
          Math.min(Math.max(winner.avgL, 0.64), 0.76)
        )
        lightPrimary = hslToRgb(winner.hue, Math.max(winner.avgS, 0.65), 0.35)
      } else {
        darkPrimary = hslToRgb(winner.hue, Math.max(winner.avgS, 0.68), 0.58)
        lightPrimary = hslToRgb(winner.hue, Math.max(winner.avgS, 0.75), 0.36)
      }

      // Find secondary cluster with distinct hue distance (>= 30 deg)
      const secondaryCandidate = scored.slice(1).find((c) => {
        const diff = Math.abs(c.hue - winner.hue)
        const distance = Math.min(diff, 360 - diff)
        return distance >= 30
      })

      const secHue = secondaryCandidate ? secondaryCandidate.hue : (winner.hue + 35) % 360
      const secS = secondaryCandidate ? secondaryCandidate.avgS : winner.avgS
      const secondaryRgb = hslToRgb(secHue, Math.max(secS, 0.6), 0.54)
      const highlightRgb = hslToRgb((winner.hue + 160) % 360, Math.max(winner.avgS, 0.8), 0.62)
      const textRgb = hslToRgb(winner.hue, Math.max(winner.avgS, 0.75), 0.72)

      palette = {
        primary: toHex(darkPrimary.r, darkPrimary.g, darkPrimary.b),
        primaryLight: toHex(lightPrimary.r, lightPrimary.g, lightPrimary.b),
        secondary: toHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b),
        highlight: toHex(highlightRgb.r, highlightRgb.g, highlightRgb.b),
        glow: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.28)`,
        subtle: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.09)`,
        border: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.35)`,
        text: toHex(textRgb.r, textRgb.g, textRgb.b),
        sourceWallpaper: filePath
      }

      cachedKey = key
      cachedPalette = palette
      savePaletteCache(key, palette)
      return palette
    }

    // Default Fallback
    palette = getDefaultAccentPalette()
    cachedKey = key
    cachedPalette = palette
    savePaletteCache(key, palette)
    return palette
  } catch (err) {
    console.warn('[WallpaperService] Extraction failed:', err)
    return null
  }
}

/**
 * Resolves active palette based on user preferences (Wallpaper, Manual, or Default)
 * Fast and non-blocking: resolves from in-memory or disk cache in 0ms.
 */
export function resolveActivePalette(preferences?: Partial<UserPreferences>): AccentPalette {
  const mode = preferences?.accentMode || 'wallpaper'

  if (mode === 'manual' && preferences?.manualAccentColor) {
    return generatePaletteFromHex(preferences.manualAccentColor)
  }

  if (mode === 'default') {
    return getDefaultAccentPalette()
  }

  // Wallpaper mode: check memory or disk cache first (0ms)
  loadPaletteCache()

  const currentPath = getWindowsWallpaperPath()
  if (currentPath) {
    try {
      const st = statSync(currentPath)
      const key = `${currentPath}:${st.mtimeMs}`
      if (cachedPalette && cachedKey === key) {
        return cachedPalette
      }
    } catch {}

    const extracted = extractPaletteFromWallpaper(currentPath)
    if (extracted) return extracted
  }

  if (cachedPalette) {
    return cachedPalette
  }

  return getDefaultAccentPalette()
}

let isMonitorPaused = false

/**
 * Temporarily pauses wallpaper monitoring to prevent heavy disk/CPU work during transitions
 */
export function pauseWallpaperMonitor(): void {
  isMonitorPaused = true
}

/**
 * Resumes wallpaper monitoring and updates last known path to avoid redundant re-extractions
 */
export function resumeWallpaperMonitor(skipPath?: string): void {
  isMonitorPaused = false
  if (skipPath) {
    lastKnownPath = skipPath
    try {
      lastKnownMtime = statSync(skipPath).mtimeMs
    } catch {}
  }
}

/**
 * Starts automatic wallpaper monitoring and notifies listeners on change.
 * Defers initial check so cold-start rendering is never blocked.
 */
export function startWallpaperMonitor(onUpdate: (palette: AccentPalette) => void): void {
  stopWallpaperMonitor()

  const checkWallpaper = (): void => {
    if (isMonitorPaused) return
    try {
      const currentPath = getWindowsWallpaperPath()
      if (!currentPath) return

      let mtime = 0
      try {
        mtime = statSync(currentPath).mtimeMs
      } catch {}

      if (currentPath !== lastKnownPath || mtime !== lastKnownMtime) {
        lastKnownPath = currentPath
        lastKnownMtime = mtime
        console.log('[WallpaperService] Wallpaper change detected:', currentPath)
        const palette = extractPaletteFromWallpaper(currentPath)
        if (palette) {
          onUpdate(palette)
        }
      }
    } catch (err) {
      console.warn('[WallpaperService] Error during check:', err)
    }
  }

  // Defer initial check slightly so startup window creation, paint, and welcome animation run at full FPS
  setTimeout(checkWallpaper, 1200)

  // Watch Themes directory
  try {
    const appData = process.env.APPDATA || ''
    const themesDir = join(appData, 'Microsoft/Windows/Themes')
    if (existsSync(themesDir)) {
      themesWatcher = watch(themesDir, (_eventType, _fileName) => {
        // Debounce to allow Windows file writes to complete cleanly without thrashing
        if (watchDebounceTimer) clearTimeout(watchDebounceTimer)
        watchDebounceTimer = setTimeout(checkWallpaper, 400)
      })
    }
  } catch (watchErr) {
    console.warn('[WallpaperService] Could not set up fs.watch on Themes dir:', watchErr)
  }

  // Polling fallback every 12s (using lightweight statSync, zero execSync)
  pollTimer = setInterval(checkWallpaper, 12000)
}

/**
 * Stops wallpaper monitoring
 */
export function stopWallpaperMonitor(): void {
  if (watchDebounceTimer) {
    clearTimeout(watchDebounceTimer)
    watchDebounceTimer = null
  }
  if (themesWatcher) {
    try {
      themesWatcher.close()
    } catch {}
    themesWatcher = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
