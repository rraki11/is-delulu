import fs from 'fs'

const res = await fetch('https://raw.githubusercontent.com/techninja/hersheytextjs/master/svg_fonts/EMSAllure.svg')
const text = await res.text()

const glyphRegex = /<glyph\s+unicode="([^"]+)"\s+glyph-name="([^"]+)"\s+horiz-adv-x="([^"]+)"\s*(?:d="([^"]+)")?\s*\/>/g
let match
const glyphs = {}
while ((match = glyphRegex.exec(text)) !== null) {
  const [_, unicode, name, advX, d] = match
  let ch = unicode
  if (ch === '&apos;') ch = "'"
  if (ch === '&quot;') ch = '"'
  if (ch === '&amp;') ch = '&'
  if (ch === '&#x22;') ch = '"'
  if (ch === '&#x27;') ch = "'"
  glyphs[ch] = { name, advX: parseFloat(advX), d: d || '' }
}

const greetings = [
  'hello',
  'one step at a time',
  'good morning',
  'good afternoon',
  'good evening',
  'make today count',
  "you've got this"
]

function getGreetingSvgData(str) {
  let curX = 0
  const subpaths = []
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    const g = glyphs[ch]
    if (!g) {
      curX += 300
      continue
    }
    if (g.d) {
      const parts = g.d.trim().split(/\s*([ML])\s*/).filter(Boolean)
      let currentCmd = ''
      for (let j = 0; j < parts.length; j++) {
        if (parts[j] === 'M' || parts[j] === 'L') {
          currentCmd = parts[j]
        } else {
          const coords = parts[j].trim().split(/\s+/)
          for (let k = 0; k < coords.length; k += 2) {
            const x = parseFloat(coords[k]) + curX
            const y = 800 - parseFloat(coords[k + 1]) // 800 is baseline/ascent flip
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      
      const translatedD = g.d.replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/g, (_, cmd, x, y) => {
        const nx = parseFloat(x) + curX
        const ny = 800 - parseFloat(y)
        return `${cmd}${nx.toFixed(1)},${ny.toFixed(1)}`
      })
      subpaths.push(translatedD)
    }
    curX += g.advX
  }

  // Padding
  const pad = 30
  const vbMinX = minX - pad
  const vbMinY = minY - pad
  const vbW = maxX - minX + pad * 2
  const vbH = maxY - minY + pad * 2

  return {
    str,
    d: subpaths.join(' '),
    viewBox: `${vbMinX.toFixed(1)} ${vbMinY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`,
    width: vbW,
    height: vbH,
    aspectRatio: (vbW / vbH).toFixed(2),
    minX, maxX, minY, maxY
  }
}

for (const g of greetings) {
  const data = getGreetingSvgData(g)
  console.log(`\nGreeting: "${data.str}"`)
  console.log(`  viewBox: ${data.viewBox}`)
  console.log(`  Dimensions: ${data.width.toFixed(0)} x ${data.height.toFixed(0)} (aspect ${data.aspectRatio})`)
  console.log(`  Subpaths length: ${data.d.length} chars`)
}

// Generate an HTML file with all SVGs rendered so we can visually inspect
let html = `<!DOCTYPE html><html><head><style>
body { background: #111; color: #fff; font-family: sans-serif; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
.pill { width: 190px; height: 33px; background: #0A0D0E; border: 1px solid rgba(255,255,255,0.15); border-radius: 0 0 17px 17px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
path { fill: none; stroke: #F4F5F0; stroke-width: 32; stroke-linecap: round; stroke-linejoin: round; }
</style></head><body>`

for (const g of greetings) {
  const data = getGreetingSvgData(g)
  html += `<div><h3>${g}</h3><div class="pill"><svg viewBox="${data.viewBox}" style="height: 20px; max-width: 156px; overflow: visible;"><path d="${data.d}" /></svg></div></div>`
}
html += `</body></html>`
fs.writeFileSync('scripts/preview-greetings.html', html)
console.log('\nWrote scripts/preview-greetings.html')
