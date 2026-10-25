// Test Suite: Typography System Verification (SF Pro Display + Google Sans Code)
// Verifies bundled font assets, licensing, centralized CSS tokens,
// component font assignments (UI vs Monospace metrics), and production bundle integration.

const assert = require('assert')
const fs = require('fs')
const path = require('path')

console.log('=== RUNNING TYPOGRAPHY SYSTEM VERIFICATION TEST SUITE ===\n')

let passedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err)
    process.exit(1)
  }
}

// 1. Font Assets and Licensing
runTest('Typography Test 1: SF Pro Display and Google Sans Code font files are bundled in assets', () => {
  const fontDir = 'src/renderer/src/assets/fonts'
  assert(fs.existsSync(fontDir), 'Font directory must exist')

  // Verify SF Pro Display files
  const sfProRegular = path.join(fontDir, 'SFPRODISPLAYREGULAR.OTF')
  const sfProMedium = path.join(fontDir, 'SFPRODISPLAYMEDIUM.OTF')
  const sfProBold = path.join(fontDir, 'SFPRODISPLAYBOLD.OTF')
  assert(fs.existsSync(sfProRegular), 'SFPRODISPLAYREGULAR.OTF must exist')
  assert(fs.existsSync(sfProMedium), 'SFPRODISPLAYMEDIUM.OTF must exist')
  assert(fs.existsSync(sfProBold), 'SFPRODISPLAYBOLD.OTF must exist')

  // Verify Google Sans Code files
  const gscTtf = path.join(fontDir, 'GoogleSansCode.ttf')
  const gscItalic = path.join(fontDir, 'GoogleSansCode-Italic.ttf')
  const gscOfl = path.join(fontDir, 'GoogleSansCode-OFL.txt')
  assert(fs.existsSync(gscTtf), 'GoogleSansCode.ttf must exist')
  assert(fs.existsSync(gscItalic), 'GoogleSansCode-Italic.ttf must exist')
  assert(fs.existsSync(gscOfl), 'GoogleSansCode-OFL.txt must exist')

  // Verify SIL Open Font License
  const oflContent = fs.readFileSync(gscOfl, 'utf8')
  assert(oflContent.includes('SIL OPEN FONT LICENSE Version 1.1'), 'Must include valid SIL Open Font License v1.1')
  assert(oflContent.includes('Google Sans Code Project Authors'), 'Must include copyright notice for Google Sans Code')
})

// 2. Centralized CSS Typography Tokens
runTest('Typography Test 2: design-tokens.css defines centralized --font-ui and --font-mono tokens for both themes', () => {
  const tokensCss = fs.readFileSync('src/renderer/src/styles/design-tokens.css', 'utf8')

  // Verify dark theme / root
  assert(tokensCss.includes('--font-ui:'), 'Must declare --font-ui in design-tokens.css')
  assert(tokensCss.includes("'SF Pro Display'"), '--font-ui must prioritize SF Pro Display')
  assert(tokensCss.includes('--font-mono:'), 'Must declare --font-mono in design-tokens.css')
  assert(tokensCss.includes("'Google Sans Code'"), '--font-mono must prioritize Google Sans Code')

  // Verify that --font-display and --font-text map to var(--font-ui)
  assert(tokensCss.includes('--font-display: var(--font-ui)'), '--font-display must map to var(--font-ui)')
  assert(tokensCss.includes('--font-text: var(--font-ui)'), '--font-text must map to var(--font-ui)')

  // Verify light theme has identical token definitions
  const lightIndex = tokensCss.indexOf('[data-theme="light"]')
  assert(lightIndex !== -1, 'Must have [data-theme="light"] block')
  const lightBlock = tokensCss.slice(lightIndex)
  assert(lightBlock.includes('--font-ui:'), 'Light theme must declare --font-ui')
  assert(lightBlock.includes('--font-mono:'), 'Light theme must declare --font-mono')
  assert(lightBlock.includes("'Google Sans Code'"), 'Light theme must reference Google Sans Code')
})

// 3. Font-Face Directives and Utility Classes in index.css
runTest('Typography Test 3: index.css declares @font-face rules, body font, and utility classes', () => {
  const indexCss = fs.readFileSync('src/renderer/src/styles/index.css', 'utf8')

  // Check Google Sans Code @font-face
  assert(indexCss.includes("@font-face {\n  font-family: 'Google Sans Code';"), 'Must have @font-face for Google Sans Code')
  assert(indexCss.includes("url('../assets/fonts/GoogleSansCode.ttf')"), 'Must reference GoogleSansCode.ttf')
  assert(indexCss.includes("url('../assets/fonts/GoogleSansCode-Italic.ttf')"), 'Must reference GoogleSansCode-Italic.ttf')

  // Check SF Pro Display @font-face
  assert(indexCss.includes("@font-face {\n  font-family: 'SF Pro Display';"), 'Must have @font-face for SF Pro Display')

  // Check html, body font assignment
  assert(indexCss.includes('font-family: var(--font-ui);'), 'html, body must declare font-family: var(--font-ui)')

  // Check utility classes
  assert(indexCss.includes('.font-ui {'), 'Must declare .font-ui class')
  assert(indexCss.includes('.font-mono {'), 'Must declare .font-mono class')
  assert(indexCss.includes('.font-metric {'), 'Must declare .font-metric class')
  assert(indexCss.includes('.tabular-nums {'), 'Must declare .tabular-nums class')
  assert(indexCss.includes("font-variant-numeric: tabular-nums"), '.tabular-nums must set font-variant-numeric')
})

// 4. Component Allocations: UI Text vs Technical Metrics
runTest('Typography Test 4: Component font assignments strictly distinguish UI text from technical metrics', () => {
  // IslandHeader: greeting -> UI, clock -> Mono
  const header = fs.readFileSync('src/renderer/src/components/island/IslandHeader.tsx', 'utf8')
  assert(header.includes("fontFamily: 'var(--font-ui)'"), 'Greeting in header must use var(--font-ui)')
  assert(header.includes("fontFamily: 'var(--font-mono)'"), 'Live clock in header must use var(--font-mono)')
  assert(header.includes('tabular-nums font-mono'), 'Live clock in header must include tabular-nums and font-mono')

  // IslandPill & MorphingIsland: collapsed clock -> Mono
  const pill = fs.readFileSync('src/renderer/src/components/island/IslandPill.tsx', 'utf8')
  assert(pill.includes("fontFamily: 'var(--font-mono)'"), 'Collapsed clock in IslandPill must use var(--font-mono)')
  const morphing = fs.readFileSync('src/renderer/src/components/island/MorphingIsland.tsx', 'utf8')
  assert(morphing.includes("fontFamily: 'var(--font-mono)'"), 'Collapsed clock in MorphingIsland must use var(--font-mono)')

  // Charging & Battery: percentage -> Mono
  const charging = fs.readFileSync('src/renderer/src/components/island/ChargingPill.tsx', 'utf8')
  assert(charging.includes("fontFamily: 'var(--font-mono)'"), 'Charging percentage must use var(--font-mono)')
  const lowBattery = fs.readFileSync('src/renderer/src/components/island/LowBatteryPill.tsx', 'utf8')
  assert(lowBattery.includes("fontFamily: 'var(--font-ui)'"), 'Low battery label must use var(--font-ui)')
  assert(lowBattery.includes("fontFamily: 'var(--font-mono)'"), 'Low battery percentage must use var(--font-mono)')

  // NavigationTabBar: tabs -> UI
  const navBar = fs.readFileSync('src/renderer/src/components/island/NavigationTabBar.tsx', 'utf8')
  assert(navBar.includes("fontFamily: 'var(--font-ui)'"), 'Navigation tabs must use var(--font-ui)')

  // StatsWidget: percentage, chips, disk, net, uptime, apps -> Mono; labels -> UI
  const stats = fs.readFileSync('src/renderer/src/components/widgets/StatsWidget.tsx', 'utf8')
  assert(stats.includes("fontFamily: 'var(--font-mono)'"), 'Stats circular percentage must use var(--font-mono)')
  assert(stats.includes("fontFamily: 'var(--font-ui)'"), 'Stats card labels must use var(--font-ui)')
  assert(stats.includes('{diskUsed} / {diskTotal} GB'), 'Stats must render disk metrics')

  // ControlsWidget: volume percentage and timestamps -> Mono
  const controls = fs.readFileSync('src/renderer/src/components/widgets/ControlsWidget.tsx', 'utf8')
  assert(controls.includes("fontFamily: 'var(--font-mono)'"), 'Volume percentage and media times must use var(--font-mono)')

  // TodayWidget: giant clock digits and date numbers -> Mono
  const today = fs.readFileSync('src/renderer/src/components/widgets/TodayWidget.tsx', 'utf8')
  assert(today.includes("fontFamily: 'var(--font-mono)'"), 'Today widget clock digits must use var(--font-mono)')
})

// 5. Build Artifact Verification
runTest('Typography Test 5: Production build packages Google Sans Code and SF Pro assets into out/renderer/assets', () => {
  const outAssets = 'out/renderer/assets'
  assert(fs.existsSync(outAssets), 'out/renderer/assets must exist')

  const files = fs.readdirSync(outAssets)
  const gscBundled = files.some((f) => f.startsWith('GoogleSansCode-') && f.endsWith('.ttf'))
  const sfProBundled = files.some((f) => f.startsWith('SFPRODISPLAY') && f.endsWith('.OTF'))

  assert(gscBundled, 'Production assets must contain compiled GoogleSansCode variable TTF font')
  assert(sfProBundled, 'Production assets must contain compiled SFPRODISPLAY OTF font')

  // Verify compiled CSS points to Google Sans Code
  const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'))
  assert(cssFile, 'Production assets must contain index-*.css')
  const cssContent = fs.readFileSync(path.join(outAssets, cssFile), 'utf8')
  assert(cssContent.includes('Google Sans Code'), 'Compiled CSS must contain Google Sans Code font-family')
  assert(cssContent.includes('--font-ui'), 'Compiled CSS must contain --font-ui token')
  assert(cssContent.includes('--font-mono'), 'Compiled CSS must contain --font-mono token')
})

console.log(`\n=== ALL ${passedTests} TYPOGRAPHY VERIFICATION TESTS PASSED ===\n`)
