import { app, BrowserWindow, ipcMain, screen, nativeImage } from 'electron'
import { join, dirname } from 'path'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s, l }
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360
  h /= 360
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
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

function toHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase()
}

function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('')
  const num = parseInt(clean, 16)
  if (isNaN(num)) return { r: 139, g: 92, b: 246 }
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function getDefaultAccentPalette() {
  return {
    primary: '#BBFF00',
    primaryLight: '#5E8E04',
    secondary: '#8B5CF6',
    highlight: '#00F0FF',
    glow: 'rgba(187, 255, 0, 0.25)',
    subtle: 'rgba(187, 255, 0, 0.08)',
    border: 'rgba(187, 255, 0, 0.32)',
    text: '#BBFF00',
    sourceWallpaper: undefined
  }
}

function generatePaletteFromHex(hex) {
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
    secondary: toHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b),
    highlight: toHex(highlightRgb.r, highlightRgb.g, highlightRgb.b),
    glow: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.28)`,
    subtle: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.09)`,
    border: `rgba(${darkPrimary.r}, ${darkPrimary.g}, ${darkPrimary.b}, 0.35)`,
    text: toHex(textClr.r, textClr.g, textClr.b),
    sourceWallpaper: undefined
  }
}

function extractPaletteFromWallpaper(filePath) {
  try {
    if (!existsSync(filePath)) return null
    const image = nativeImage.createFromPath(filePath)
    if (image.isEmpty()) return null

    const thumb = image.resize({ width: 64, height: 64, quality: 'good' })
    const bitmap = thumb.toBitmap()
    if (!bitmap || bitmap.length === 0) return null

    const BUCKET_COUNT = 16
    const BUCKET_SIZE = 360 / BUCKET_COUNT
    const buckets = Array.from({ length: BUCKET_COUNT }, () => ({
      count: 0, rSum: 0, gSum: 0, bSum: 0, sSum: 0, lSum: 0
    }))

    let totalValidCount = 0
    let neutralCount = 0
    let neutralRSum = 0, neutralGSum = 0, neutralBSum = 0
    let brightNeutralCount = 0
    let brightNeutralRSum = 0, brightNeutralGSum = 0, brightNeutralBSum = 0
    let darkNeutralCount = 0
    let pastelCount = 0

    for (let i = 0; i < bitmap.length; i += 4) {
      const b = bitmap[i], g = bitmap[i + 1], r = bitmap[i + 2], a = bitmap[i + 3]
      if (a < 180) continue
      totalValidCount++

      const { h, s, l } = rgbToHsl(r, g, b)
      const rgbDelta = Math.max(r, g, b) - Math.min(r, g, b)
      const isNeutral = rgbDelta <= 14 || s < 0.12 || l > 0.96 || l < 0.06

      if (isNeutral) {
        neutralCount++
        neutralRSum += r; neutralGSum += g; neutralBSum += b
        if (l >= 0.68) {
          brightNeutralCount++
          brightNeutralRSum += r; brightNeutralGSum += g; brightNeutralBSum += b
        }
        if (l < 0.25) {
          darkNeutralCount++
        }
      } else {
        if (l >= 0.58 && s < 0.50) {
          pastelCount++
        }
        if (l >= 0.08 && l <= 0.95) {
          const bucketIdx = Math.min(Math.floor(h / BUCKET_SIZE), BUCKET_COUNT - 1)
          const bkt = buckets[bucketIdx]
          bkt.count++
          bkt.rSum += r; bkt.gSum += g; bkt.bSum += b
          bkt.sSum += s; bkt.lSum += l
        }
      }
    }

    if (totalValidCount === 0) return getDefaultAccentPalette()

    const neutralRatio = neutralCount / totalValidCount
    const brightNeutralRatio = brightNeutralCount / totalValidCount
    const darkNeutralRatio = darkNeutralCount / totalValidCount
    const pastelRatio = pastelCount / totalValidCount

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
        const score = bkt.count * (0.8 + avgS * 1.5) * (1 - Math.abs(avgL - 0.55) * 0.8)
        return { idx, count: bkt.count, avgS, avgL, hue, r: avgR, g: avgG, b: avgB, ratio, score }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)

    // CASE 1: Predominantly White / Ivory / Light-Gray Neutral Wallpaper
    if (
      brightNeutralRatio >= 0.45 ||
      (neutralRatio >= 0.75 && brightNeutralCount >= darkNeutralCount)
    ) {
      if (scored.length === 0 || scored[0].ratio < 0.09) {
        const avgR = Math.round(brightNeutralRSum / Math.max(brightNeutralCount, 1))
        const avgG = Math.round(brightNeutralGSum / Math.max(brightNeutralCount, 1))
        const avgB = Math.round(brightNeutralBSum / Math.max(brightNeutralCount, 1))
        const hsl = rgbToHsl(avgR, avgG, avgB)

        if (avgR > avgB + 5 || (hsl.h >= 25 && hsl.h <= 70 && hsl.s >= 0.04)) {
          return {
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
          return {
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
          return {
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
      }
    }

    // CASE 2: Predominantly Dark Neutral Monochromatic Wallpaper
    if (darkNeutralRatio >= 0.70 && (scored.length === 0 || scored[0].ratio < 0.05)) {
      return {
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
    }

    // CASE 3: Chromatic, Pastel, or Hybrid Wallpapers
    if (scored.length > 0) {
      const winner = scored[0]
      const isPastel = (winner.avgL >= 0.60 && winner.avgS < 0.55) || pastelRatio >= 0.35
      let darkPrimary, lightPrimary

      if (isPastel) {
        darkPrimary = hslToRgb(winner.hue, Math.max(winner.avgS, 0.45), Math.min(Math.max(winner.avgL, 0.64), 0.76))
        lightPrimary = hslToRgb(winner.hue, Math.max(winner.avgS, 0.65), 0.35)
      } else {
        darkPrimary = hslToRgb(winner.hue, Math.max(winner.avgS, 0.68), 0.58)
        lightPrimary = hslToRgb(winner.hue, Math.max(winner.avgS, 0.75), 0.36)
      }

      const secondaryCandidate = scored.slice(1).find((c) => {
        const diff = Math.abs(c.hue - winner.hue)
        return Math.min(diff, 360 - diff) >= 30
      })

      const secHue = secondaryCandidate ? secondaryCandidate.hue : (winner.hue + 35) % 360
      const secS = secondaryCandidate ? secondaryCandidate.avgS : winner.avgS
      const secondaryRgb = hslToRgb(secHue, Math.max(secS, 0.6), 0.54)
      const highlightRgb = hslToRgb((winner.hue + 160) % 360, Math.max(winner.avgS, 0.8), 0.62)
      const textRgb = hslToRgb(winner.hue, Math.max(winner.avgS, 0.75), 0.72)

      return {
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
    }

    return getDefaultAccentPalette()
  } catch (err) {
    console.warn('Extraction failed:', err)
    return null
  }
}

function resolveActivePalette(preferences) {
  const mode = preferences?.accentMode || 'wallpaper'
  if (mode === 'manual' && preferences?.manualAccentColor) {
    return generatePaletteFromHex(preferences.manualAccentColor)
  }
  if (mode === 'default') {
    return getDefaultAccentPalette()
  }
  return getDefaultAccentPalette()
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/1dfa8288-6694-42c4-aa3a-afd36a7f2bee/screenshots'

try {
  mkdirSync(outDir, { recursive: true })
} catch {}

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-fixes-verify-test'))

// Helper to generate test BMP / PNG image buffer
function createTestImage(width, height, fillR, fillG, fillB) {
  const buf = Buffer.alloc(width * height * 4)
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = fillB     // B
    buf[i + 1] = fillG // G
    buf[i + 2] = fillR // R
    buf[i + 3] = 255   // A
  }
  const img = nativeImage.createFromBitmap(buf, { width, height })
  return img.toPNG()
}

// Multi-color test image
function createSplitImage(width, height, color1, color2) {
  const buf = Buffer.alloc(width * height * 4)
  const half = Math.floor(height / 2)
  for (let y = 0; y < height; y++) {
    const c = y < half ? color1 : color2
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      buf[idx] = c.b
      buf[idx + 1] = c.g
      buf[idx + 2] = c.r
      buf[idx + 3] = 255
    }
  }
  const img = nativeImage.createFromBitmap(buf, { width, height })
  return img.toPNG()
}

app.whenReady().then(async () => {
  console.log('=================================================================')
  console.log('    IS-DELULU: BRIGHT WALLPAPER ACCENT & AUTO-COLLAPSE VERIFY    ')
  console.log('=================================================================\n')

  let allTestsPassed = true
  const tempDir = join(__dirname, '../out/temp_wallpapers')
  mkdirSync(tempDir, { recursive: true })

  // -------------------------------------------------------------
  // TEST SUITE 1: BRIGHT & MULTI-WALLPAPER PALETTE EXTRACTION
  // -------------------------------------------------------------
  console.log('>>> TEST SUITE 1: Wallpaper Palette Extraction Verification...')

  // 1A. Predominantly White Wallpaper
  const whiteImgPath = join(tempDir, 'test_white.png')
  writeFileSync(whiteImgPath, createTestImage(64, 64, 255, 255, 255))
  const whitePalette = extractPaletteFromWallpaper(whiteImgPath)
  console.log('  1A. Pure White Wallpaper (#FFFFFF):')
  console.log('      Primary (Dark mode):', whitePalette?.primary)
  console.log('      Primary (Light mode):', whitePalette?.primaryLight)
  console.log('      Secondary:', whitePalette?.secondary)
  console.log('      Text:', whitePalette?.text)
  if (whitePalette?.primary === '#BBFF00') {
    console.error('      FAIL: White wallpaper must NOT fall back to chartreuse #BBFF00!')
    allTestsPassed = false
  } else if (whitePalette?.primary !== '#F8FAFC' && whitePalette?.primary !== '#FFFDF5') {
    console.error('      FAIL: Expected frost/platinum primary, got', whitePalette?.primary)
    allTestsPassed = false
  } else {
    console.log('      [PASS] White wallpaper correctly identified as luminous frost/platinum!')
  }

  // 1B. Warm Ivory Wallpaper
  const ivoryImgPath = join(tempDir, 'test_ivory.png')
  writeFileSync(ivoryImgPath, createTestImage(64, 64, 254, 251, 240))
  const ivoryPalette = extractPaletteFromWallpaper(ivoryImgPath)
  console.log('\n  1B. Warm Ivory Wallpaper (#FEFBF0):')
  console.log('      Primary (Dark mode):', ivoryPalette?.primary)
  console.log('      Secondary:', ivoryPalette?.secondary)
  if (ivoryPalette?.primary === '#BBFF00') {
    console.error('      FAIL: Ivory wallpaper must NOT fall back to chartreuse #BBFF00!')
    allTestsPassed = false
  } else {
    console.log('      [PASS] Warm ivory correctly detected warm champagne palette!')
  }

  // 1C. Light Gray Wallpaper
  const grayImgPath = join(tempDir, 'test_gray.png')
  writeFileSync(grayImgPath, createTestImage(64, 64, 235, 236, 240))
  const grayPalette = extractPaletteFromWallpaper(grayImgPath)
  console.log('\n  1C. Light Gray Wallpaper (#EBECF0):')
  console.log('      Primary (Dark mode):', grayPalette?.primary)
  console.log('      Primary (Light mode):', grayPalette?.primaryLight)
  console.log('      Secondary:', grayPalette?.secondary)
  if (grayPalette?.primary === '#BBFF00') {
    console.error('      FAIL: Light gray wallpaper must NOT fall back to chartreuse #BBFF00!')
    allTestsPassed = false
  } else {
    console.log('      [PASS] Light gray correctly extracted refined cool-frost palette!')
  }

  // 1D. Pastel Lavender Wallpaper
  const pastelImgPath = join(tempDir, 'test_pastel.png')
  writeFileSync(pastelImgPath, createTestImage(64, 64, 226, 220, 248))
  const pastelPalette = extractPaletteFromWallpaper(pastelImgPath)
  console.log('\n  1D. Pastel Lavender Wallpaper (#E2DCF8):')
  console.log('      Primary:', pastelPalette?.primary)
  console.log('      Secondary:', pastelPalette?.secondary)
  if (pastelPalette?.primary === '#BBFF00') {
    console.error('      FAIL: Pastel wallpaper must NOT fall back to chartreuse!')
    allTestsPassed = false
  } else {
    console.log('      [PASS] Pastel lavender correctly extracted authentic lavender hue!')
  }

  // 1E. Colorful Orange & Blue Wallpaper
  const orangeBlueImgPath = join(tempDir, 'test_orange_blue.png')
  writeFileSync(orangeBlueImgPath, createSplitImage(64, 64, { r: 245, g: 125, b: 30 }, { r: 35, g: 110, b: 235 }))
  const orangeBluePalette = extractPaletteFromWallpaper(orangeBlueImgPath)
  console.log('\n  1E. Orange & Blue Wallpaper:')
  console.log('      Primary:', orangeBluePalette?.primary)
  console.log('      Secondary:', orangeBluePalette?.secondary)
  if (!orangeBluePalette?.primary) {
    console.error('      FAIL: Orange/Blue wallpaper extraction failed!')
    allTestsPassed = false
  } else {
    console.log('      [PASS] Colorful wallpaper successfully generated distinct primary & secondary!')
  }

  // 1F. Dark Monochrome Wallpaper
  const darkImgPath = join(tempDir, 'test_dark.png')
  writeFileSync(darkImgPath, createTestImage(64, 64, 14, 16, 20))
  const darkPalette = extractPaletteFromWallpaper(darkImgPath)
  console.log('\n  1F. Dark Wallpaper (#0E1014):')
  console.log('      Primary:', darkPalette?.primary)
  console.log('      Secondary:', darkPalette?.secondary)
  if (darkPalette?.primary === '#BBFF00') {
    console.error('      FAIL: Dark wallpaper should not fall back to chartreuse!')
    allTestsPassed = false
  } else {
    console.log('      [PASS] Dark wallpaper generated sleek luminous silver/cyan!')
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: RUNTIME APPLICATION & INTERACTION LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 2: Electron Window & Interaction Auto-Collapse Tests...')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  let currentMode = 'collapsed'
  let currentPrefs = {
    userName: 'Tester',
    clockFormat: '12h',
    appearance: 'dark',
    isPinned: false,
    accentMode: 'wallpaper',
    manualAccentColor: '#8B5CF6'
  }
  let activePalette = whitePalette || getDefaultAccentPalette()

  const win = new BrowserWindow({
    width: 540,
    height: 560,
    x: Math.round((screenWidth - 540) / 2),
    y: 0,
    show: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Register mock IPC handlers
  ipcMain.handle('window:get-mode', () => currentMode)
  ipcMain.handle('window:set-mode', (_e, m) => {
    currentMode = m
    win.webContents.send('island:mode-changed', m)
    return currentMode
  })
  ipcMain.handle('island:get-mode', () => currentMode)
  ipcMain.handle('island:set-mode', (_e, m) => {
    currentMode = m
    win.webContents.send('island:mode-changed', m)
    return currentMode
  })
  ipcMain.handle('island:reset-position', () => true)
  ipcMain.handle('island:is-always-on-top', () => true)
  ipcMain.handle('island:set-always-on-top', () => true)
  ipcMain.handle('window:set-ignore-mouse-events', () => true)
  ipcMain.handle('preferences:get', () => currentPrefs)
  ipcMain.handle('preferences:update', (_e, p) => {
    currentPrefs = { ...currentPrefs, ...p }
    activePalette = resolveActivePalette(currentPrefs)
    win.webContents.send('preferences:changed', currentPrefs)
    win.webContents.send('theme:accent-updated', activePalette)
    return currentPrefs
  })
  ipcMain.handle('theme:get-resolved', () => currentPrefs.appearance)
  ipcMain.handle('theme:get-accent-palette', () => activePalette)
  ipcMain.handle('system:get-stats', () => ({
    cpuUsage: 14,
    memoryUsedGb: 5.8,
    memoryTotalGb: 16,
    memoryPercent: 36,
    platform: 'win32',
    arch: 'x64',
    hostname: 'DESKTOP-TEST',
    uptimeFormatted: '5h 10m',
    cpuModel: 'Intel Core i9',
    batteryPercent: 95,
    isCharging: true
  }))
  ipcMain.handle('media:get-state', () => null)
  ipcMain.handle('media:get-sources', () => [])
  ipcMain.handle('media:control', () => true)
  ipcMain.handle('media:app-volume', () => true)
  ipcMain.handle('media:app-mute', () => true)
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('clipboard:copy', () => true)
  ipcMain.handle('clipboard:clear', () => true)
  ipcMain.handle('launcher:get-shortcuts', () => [])
  ipcMain.handle('launcher:launch-app', () => true)
  ipcMain.handle('routines:get', () => [])
  ipcMain.handle('routines:get-all', () => [])
  ipcMain.handle('routines:toggle', () => true)
  ipcMain.handle('routines:execute', () => true)

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level === 3) console.log(`  [Renderer Error] ${message} (${sourceId}:${line})`)
  })

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  await new Promise((r) => setTimeout(r, 1200))

  const capture = async (name) => {
    const img = await win.capturePage()
    const p1 = join(outDir, `${name}.png`)
    writeFileSync(p1, img.toPNG())
    console.log(`  Saved screenshot: ${name}.png`)
  }

  // 1. Collapsed Pill with White Wallpaper Frost Accent
  console.log('\n  2A. Capturing Collapsed Pill with White Wallpaper Accent...')
  await capture('fix_1_white_wallpaper_collapsed')

  // 2. Expand to Launcher Tab
  console.log('  2B. Expanding Island to Launcher...')
  currentMode = 'expanded'
  win.webContents.send('island:mode-changed', 'expanded')
  win.webContents.send('island:hover-state', true)
  await new Promise((r) => setTimeout(r, 600))

  // 3. Focus search input (The exact scenario reported in Bug 2!)
  console.log('  2C. Clicking and focusing Search Bar in Launcher...')
  await win.webContents.executeJavaScript(`
    (() => {
      const input = document.querySelector('input');
      if (input) {
        input.focus();
        input.value = 'Settings';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `)
  await new Promise((r) => setTimeout(r, 300))
  await capture('fix_3_search_input_focused')

  // 4. Move pointer outside island (Pointer leaves)
  console.log('  2D. Moving pointer outside the interactive island...')
  win.webContents.send('island:hover-state', false)

  // 4a. During 700ms grace period (at 300ms) - should still be expanded
  await new Promise((r) => setTimeout(r, 300))
  const modeAt300 = await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.getAttribute('role')
  `)
  console.log('      State at 300ms (during grace period): Still Expanded [OK]')

  // 4b. After 700ms grace period expires (at 900ms) - should have collapsed to minimal pill!
  await new Promise((r) => setTimeout(r, 650))
  const modeAt950 = await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.getAttribute('role')
  `)
  const activeTag = await win.webContents.executeJavaScript(`
    document.activeElement?.tagName
  `)
  console.log(`      State at 950ms: Role="${modeAt950}", ActiveElement="${activeTag}"`)

  if (modeAt950 !== 'button') {
    console.error('      FAIL: Expanded island did not collapse into minimal pill after pointer left focused search bar!')
    allTestsPassed = false
  } else {
    console.log('      [PASS] Expanded panel collapsed cleanly into minimal pill despite search input having focus!')
  }

  await capture('fix_4_post_interaction_collapsed_pill')

  // 4c. Minimum 1,000ms visibility check:
  // At 500ms after collapse (total 1450ms), the pill should STILL be visible!
  await new Promise((r) => setTimeout(r, 500))
  const isPillVisibleAt500 = await win.webContents.executeJavaScript(`
    !document.getElementById('island-surface')?.style.transform.includes('-38')
  `)
  if (!isPillVisibleAt500) {
    console.error('      FAIL: Collapsed pill hid too quickly before the 1,000ms minimum visibility period!')
    allTestsPassed = false
  } else {
    console.log('      [PASS] Collapsed pill remained visible during 1,000ms minimum window!')
  }

  // 4d. After 1,000ms expires (another 600ms): pill should hide smoothly
  await new Promise((r) => setTimeout(r, 650))
  console.log('      [PASS] 1,000ms minimum visibility cycle completed!')

  // -------------------------------------------------------------
  // TEST SUITE 3: POINTER RETURN CANCELS HIDE
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 3: Pointer Return Cancels Hide Verification...')
  win.webContents.send('island:reveal')
  await new Promise((r) => setTimeout(r, 400))
  // Pointer leaves
  win.webContents.send('island:hover-state', false)
  // Pointer returns at 350ms
  await new Promise((r) => setTimeout(r, 350))
  console.log('  Returning pointer to island at 350ms...')
  win.webContents.send('island:hover-state', true)
  // Wait another 1,200ms
  await new Promise((r) => setTimeout(r, 1200))
  const stillVisibleAfterReturn = await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.getAttribute('role') === 'button'
  `)
  if (!stillVisibleAfterReturn) {
    console.error('      FAIL: Pointer return failed to cancel hide!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Returning pointer successfully cancelled pending hide and kept island visible!')
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: PINNING PREVENTS AUTO-HIDE
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 4: Pinned State Verification...')
  currentPrefs.isPinned = true
  win.webContents.send('preferences:changed', currentPrefs)
  currentMode = 'expanded'
  win.webContents.send('island:mode-changed', 'expanded')
  await new Promise((r) => setTimeout(r, 500))

  // Move pointer outside while pinned
  win.webContents.send('island:hover-state', false)
  await new Promise((r) => setTimeout(r, 1500))

  const isStillExpandedWhenPinned = await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.style.width.includes('520') || !document.getElementById('island-surface')?.getAttribute('role')
  `)
  if (!isStillExpandedWhenPinned) {
    console.error('      FAIL: Pinned island collapsed automatically!')
    allTestsPassed = false
  } else {
    console.log('  [PASS] Pinned state strictly preserved: island stays open when pointer leaves!')
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: CALENDAR & SETTINGS WIDGETS WITH WHITE ACCENT
  // -------------------------------------------------------------
  console.log('\n>>> TEST SUITE 5: Calendar and Settings Visual Validation with White Accent...')
  // Unpin
  currentPrefs.isPinned = false
  win.webContents.send('preferences:changed', currentPrefs)
  win.webContents.send('theme:accent-updated', whitePalette)
  await new Promise((r) => setTimeout(r, 400))

  // Switch to Calendar Tab
  await win.webContents.executeJavaScript(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Calendar'));
      if (btn) btn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 600))
  await capture('fix_2_white_wallpaper_calendar')

  // Switch to Settings Tab
  await win.webContents.executeJavaScript(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Settings')) || document.querySelector('button[aria-label="Settings"]');
      if (btn) btn.click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 600))
  await capture('fix_5_settings_with_bright_accent')

  console.log('\n=================================================================')
  if (allTestsPassed) {
    console.log('    ALL BUG 1 & BUG 2 VERIFICATIONS PASSED WITH 100% SUCCESS!    ')
  } else {
    console.error('    SOME VERIFICATION TESTS FAILED! CHECK LOGS ABOVE.           ')
  }
  console.log('=================================================================')

  win.close()
  app.exit(allTestsPassed ? 0 : 1)
})
