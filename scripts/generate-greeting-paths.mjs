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
      
      const translatedD = g.d.replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/g, (_, cmd, x, y) => {
        const nx = parseFloat(x) + curX
        const ny = 800 - parseFloat(y)
        return `${cmd} ${nx.toFixed(1)} ${ny.toFixed(1)}`
      })
      subpaths.push(translatedD)
    }
    curX += g.advX
  }

  const pad = 40
  const vbMinX = minX - pad
  const vbMinY = minY - pad
  const vbW = maxX - minX + pad * 2
  const vbH = maxY - minY + pad * 2

  return {
    str,
    d: subpaths.join(' '),
    viewBox: `${vbMinX.toFixed(1)} ${vbMinY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`,
    width: vbW,
    height: vbH
  }
}

const greetingData = {}
for (const g of greetings) {
  greetingData[g] = getGreetingSvgData(g)
}

fs.writeFileSync('src/renderer/src/components/island/greetingPaths.json', JSON.stringify(greetingData, null, 2))
console.log('Saved greetingPaths.json with all greetings!')
