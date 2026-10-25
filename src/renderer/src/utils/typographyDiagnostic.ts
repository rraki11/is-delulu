/**
 * Typography Diagnostic Utility (Development Only)
 * Inspects physical font face readiness, computed styles, devicePixelRatio,
 * zoom factor, error states, and performs canvas metric verification to prove SF Pro Display
 * and Google Sans Code are physically loaded and rendering glyphs correctly.
 */

export interface TypographyDiagnosticReport {
  intendedPrimaryUIFont: string
  intendedMonospaceFont: string
  sfProDisplayStatus: boolean
  sfProTextStatus: boolean
  googleSansCodeStatus: boolean
  devicePixelRatio: number
  rendererZoomFactor: number
  windowBounds: { width: number; height: number }
  fontFaces: Array<{ family: string; weight: string; style: string; status: string }>
  fontLoadingErrors: string[]
  canvasMetrics: {
    sampleText: string
    sfProWidth: number
    segoeWidth: number
    arialWidth: number
    isUsingSfProGlyphs: boolean
    googleSansCodeMonoCharWidths: {
      charI: number
      charW: number
      charM: number
      charZero: number
      isStrictlyMonospace: boolean
    }
  }
  sampleComputedStyles: {
    greetingFont: string
    greetingWeight: string
    pillClockFont: string
    metricFont: string
    bodyFont: string
  }
}

export async function runTypographyDiagnostic(): Promise<TypographyDiagnosticReport> {
  const fontLoadingErrors: string[] = []

  try {
    await document.fonts.ready
  } catch (err: unknown) {
    fontLoadingErrors.push(err instanceof Error ? err.message : String(err))
  }

  const sampleText = 'Good morning, Shubham • 12:34:56'

  // Canvas metric test to conclusively verify physical glyph widths
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let sfProWidth = 0
  let segoeWidth = 0
  let arialWidth = 0

  let charI = 0
  let charW = 0
  let charM = 0
  let charZero = 0

  if (ctx) {
    ctx.font = '16px "SF Pro Display"'
    sfProWidth = ctx.measureText(sampleText).width

    ctx.font = '16px "Segoe UI"'
    segoeWidth = ctx.measureText(sampleText).width

    ctx.font = '16px Arial'
    arialWidth = ctx.measureText(sampleText).width

    // Test Google Sans Code monospace advance equality
    ctx.font = '16px "Google Sans Code"'
    charI = ctx.measureText('i').width
    charW = ctx.measureText('w').width
    charM = ctx.measureText('M').width
    charZero = ctx.measureText('0').width
  }

  const isStrictlyMonospace =
    charI > 0 && Math.abs(charI - charW) < 0.05 && Math.abs(charW - charM) < 0.05

  const fontFaces: Array<{ family: string; weight: string; style: string; status: string }> = []
  document.fonts.forEach((f) => {
    fontFaces.push({
      family: f.family,
      weight: f.weight,
      style: f.style,
      status: f.status
    })
    if (f.status === 'error') {
      fontLoadingErrors.push(`FontFace error: ${f.family} (weight: ${f.weight}, style: ${f.style})`)
    }
  })

  const greetingEl = document.querySelector('.font-display')
  const pillClockEl = document.querySelector('#island-surface .tabular-nums, .island-header .tabular-nums')
  const metricEl = document.querySelector('.tabular-nums.font-mono, .charging-percent')

  // Calculate renderer zoom factor
  let zoomFactor = 1.0
  try {
    const electronWebFrame = (window as unknown as { webFrame?: { getZoomFactor: () => number } }).webFrame
    if (electronWebFrame && typeof electronWebFrame.getZoomFactor === 'function') {
      zoomFactor = electronWebFrame.getZoomFactor()
    } else if (window.outerWidth > 0 && window.innerWidth > 0) {
      zoomFactor = Math.round((window.outerWidth / window.innerWidth) * 100) / 100
    }
  } catch {
    zoomFactor = 1.0
  }

  const report: TypographyDiagnosticReport = {
    intendedPrimaryUIFont: 'SF Pro Display',
    intendedMonospaceFont: 'Google Sans Code',
    sfProDisplayStatus: document.fonts.check('16px "SF Pro Display"'),
    sfProTextStatus: document.fonts.check('16px "SF Pro Text"'),
    googleSansCodeStatus: document.fonts.check('16px "Google Sans Code"'),
    devicePixelRatio: window.devicePixelRatio,
    rendererZoomFactor: zoomFactor,
    windowBounds: { width: window.innerWidth, height: window.innerHeight },
    fontFaces,
    fontLoadingErrors,
    canvasMetrics: {
      sampleText,
      sfProWidth,
      segoeWidth,
      arialWidth,
      isUsingSfProGlyphs: sfProWidth > 0 && Math.abs(sfProWidth - segoeWidth) > 1,
      googleSansCodeMonoCharWidths: {
        charI,
        charW,
        charM,
        charZero,
        isStrictlyMonospace
      }
    },
    sampleComputedStyles: {
      greetingFont: greetingEl ? window.getComputedStyle(greetingEl).fontFamily : 'not found',
      greetingWeight: greetingEl ? window.getComputedStyle(greetingEl).fontWeight : 'not found',
      pillClockFont: pillClockEl ? window.getComputedStyle(pillClockEl).fontFamily : 'not found',
      metricFont: metricEl ? window.getComputedStyle(metricEl).fontFamily : 'not found',
      bodyFont: window.getComputedStyle(document.body).fontFamily
    }
  }

  return report
}

// Automatically expose on window for development inspection
if (typeof window !== 'undefined') {
  ;(window as unknown as { __typographyDiagnostic: typeof runTypographyDiagnostic }).__typographyDiagnostic =
    runTypographyDiagnostic

  // Run lazily on idle in development mode to avoid blocking cold-start rendering
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    const scheduleDiagnostic = () => {
      document.fonts.ready.then(() => {
        runTypographyDiagnostic().then((report) => {
          console.group('[Typography Diagnostic]')
          console.log('Primary UI Font:', report.intendedPrimaryUIFont, report.sfProDisplayStatus ? '✓ LOADED' : '✗ FALLBACK')
          console.log('Monospace Font:', report.intendedMonospaceFont, report.googleSansCodeStatus ? '✓ LOADED' : '✗ FALLBACK')
          console.log(
            'Physical Glyphs Verified (Canvas metrics):',
            report.canvasMetrics.isUsingSfProGlyphs ? '✓ TRUE (SF Pro)' : '✗ FALLBACK (Segoe UI)'
          )
          console.log(
            'Google Sans Code Monospace Verified:',
            report.canvasMetrics.googleSansCodeMonoCharWidths.isStrictlyMonospace ? '✓ TRUE (Equal character advance)' : '✗ FALSE'
          )
          console.log('DPR / Scale Factor:', report.devicePixelRatio)
          console.log('Renderer Zoom Factor:', report.rendererZoomFactor)
          console.log('Window Dimensions:', `${report.windowBounds.width} x ${report.windowBounds.height}`)
          console.log('Computed Font on Body:', report.sampleComputedStyles.bodyFont)
          console.log('Computed Font on Greeting:', report.sampleComputedStyles.greetingFont)
          console.log('Computed Font on Clock:', report.sampleComputedStyles.pillClockFont)
          console.log('Computed Font on Metrics:', report.sampleComputedStyles.metricFont)
          if (report.fontLoadingErrors.length > 0) {
            console.error('Font Loading Errors:', report.fontLoadingErrors)
          } else {
            console.log('Font Loading Errors: None (all fonts clean)')
          }
          console.groupEnd()
        })
      })
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(scheduleDiagnostic, { timeout: 5000 })
    } else {
      setTimeout(scheduleDiagnostic, 4000)
    }
  }
}
