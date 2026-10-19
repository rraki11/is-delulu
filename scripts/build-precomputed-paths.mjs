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
  'hi',
  'hello'
]

// Rough estimation of path length from SVG 'd' commands for precomputed ratios
function estimatePathLength(d) {
  let len = 0
  let lastX = 0, lastY = 0
  const segments = d.trim().split(/(?=[ML])/)
  for (const seg of segments) {
    const trimmed = seg.trim()
    const type = trimmed[0]
    const coords = trimmed.slice(1).trim().split(/[\s,]+/).map(parseFloat)
    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i]
      const y = coords[i + 1]
      if (!isNaN(x) && !isNaN(y)) {
        if (type === 'L') {
          const dx = x - lastX
          const dy = y - lastY
          len += Math.sqrt(dx * dx + dy * dy)
        }
        lastX = x
        lastY = y
      }
    }
  }
  return len
}

function processGreeting(str) {
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
      // Split into individual strokes (M ... L ...)
      const strokes = g.d.trim().split(/(?=M)/).filter(Boolean)
      for (const stroke of strokes) {
        // Track bounds
        const parts = stroke.trim().split(/\s*([ML])\s*/).filter(Boolean)
        for (let j = 0; j < parts.length; j++) {
          if (parts[j] !== 'M' && parts[j] !== 'L') {
            const coords = parts[j].trim().split(/\s+/)
            for (let k = 0; k < coords.length; k += 2) {
              const x = parseFloat(coords[k]) + curX
              const y = 800 - parseFloat(coords[k + 1])
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        const translatedD = stroke.replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/g, (_, cmd, x, y) => {
          const nx = parseFloat(x) + curX
          const ny = 800 - parseFloat(y)
          return `${cmd} ${nx.toFixed(1)} ${ny.toFixed(1)}`
        })
        const estLen = estimatePathLength(translatedD)
        subpaths.push({ d: translatedD.trim(), len: Math.max(estLen, 1) })
      }
    }
    curX += g.advX
  }

  // Padding
  const pad = 40
  const vbMinX = minX - pad
  const vbMinY = minY - pad
  const vbW = maxX - minX + pad * 2
  const vbH = maxY - minY + pad * 2

  const totalLen = subpaths.reduce((sum, sp) => sum + sp.len, 0)
  let cum = 0
  const strokes = subpaths.map((sp) => {
    const start = cum / totalLen
    cum += sp.len
    const end = cum / totalLen
    return {
      d: sp.d,
      len: Math.round(sp.len),
      start: Number(start.toFixed(4)),
      end: Number(end.toFixed(4))
    }
  })

  return {
    str,
    viewBox: `${vbMinX.toFixed(1)} ${vbMinY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`,
    width: Math.round(vbW),
    height: Math.round(vbH),
    strokes
  }
}

const result = {}
for (const g of greetings) {
  result[g] = processGreeting(g)
  console.log(`Greeting "${g}": ${result[g].strokes.length} strokes, viewBox: ${result[g].viewBox}`)
}

fs.writeFileSync('src/renderer/src/components/island/greetingPaths.json', JSON.stringify(result, null, 2))
console.log('Successfully wrote src/renderer/src/components/island/greetingPaths.json')
