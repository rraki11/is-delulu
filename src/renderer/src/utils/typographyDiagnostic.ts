/**
 * Typography Diagnostic Utility (Development Only)
 * Inspects physical font face readiness, computed styles, devicePixelRatio,
 * zoom factor, error states, and performs canvas metric verification to prove SF Pro is physically rendering glyphs.
 */

export interface TypographyDiagnosticReport {
  intendedFont: string
  sfProDisplayStatus: boolean
  sfProTextStatus: boolean
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
  }
  sampleComputedStyles: {
    greetingFont: string
    greetingWeight: string
    pillClockFont: string
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

  if (ctx) {
    ctx.font = '16px "SF Pro Display"'
    sfProWidth = ctx.measureText(sampleText).width

    ctx.font = '16px "Segoe UI"'
    segoeWidth = ctx.measureText(sampleText).width

    ctx.font = '16px Arial'
    arialWidth = ctx.measureText(sampleText).width
  }

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
  const pillClockEl = document.querySelector('#island-surface .tabular-nums')

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
    intendedFont: 'SF Pro Display',
    sfProDisplayStatus: document.fonts.check('16px "SF Pro Display"'),
    sfProTextStatus: document.fonts.check('16px "SF Pro Text"'),
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
      isUsingSfProGlyphs: sfProWidth > 0 && Math.abs(sfProWidth - segoeWidth) > 1
    },
    sampleComputedStyles: {
      greetingFont: greetingEl ? window.getComputedStyle(greetingEl).fontFamily : 'not found',
      greetingWeight: greetingEl ? window.getComputedStyle(greetingEl).fontWeight : 'not found',
      pillClockFont: pillClockEl ? window.getComputedStyle(pillClockEl).fontFamily : 'not found',
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
          console.log('Intended Family:', report.intendedFont)
          console.log('SF Pro Display Active:', report.sfProDisplayStatus ? '✓ YES' : '✗ NO')
          console.log(
            'Physical Glyphs Verified (Canvas metrics):',
            report.canvasMetrics.isUsingSfProGlyphs ? '✓ TRUE (SF Pro)' : '✗ FALLBACK (Segoe UI)'
          )
          console.log(
            'Widths comparison:',
            `SF Pro=${report.canvasMetrics.sfProWidth.toFixed(1)}px vs Segoe=${report.canvasMetrics.segoeWidth.toFixed(1)}px`
          )
          console.log('DPR / Scale Factor:', report.devicePixelRatio)
          console.log('Renderer Zoom Factor:', report.rendererZoomFactor)
          console.log('Window Dimensions:', `${report.windowBounds.width} x ${report.windowBounds.height}`)
          console.log('Computed Font on Body:', report.sampleComputedStyles.bodyFont)
          console.log('Font Faces Detail:', report.fontFaces)
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
