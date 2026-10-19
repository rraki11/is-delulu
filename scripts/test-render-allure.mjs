const res = await fetch('https://raw.githubusercontent.com/techninja/hersheytextjs/master/svg_fonts/EMSAllure.svg')
const text = await res.text()

const glyphRegex = /<glyph\s+unicode="([^"]+)"\s+glyph-name="([^"]+)"\s+horiz-adv-x="([^"]+)"\s*(?:d="([^"]+)")?\s*\/>/g
let match
const glyphs = {}
while ((match = glyphRegex.exec(text)) !== null) {
  const [_, unicode, name, advX, d] = match
  // Handle XML entities like &apos;
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

function renderStringToPath(str) {
  let curX = 0
  const paths = []
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    const g = glyphs[ch]
    if (!g) {
      console.warn(`Missing char '${ch}'`)
      curX += 300
      continue
    }
    if (g.d) {
      // Offset all coordinates in g.d by curX horizontally, and invert Y so (0,0) is top-left
      // Font coords: y increases upwards. We flip: y_screen = 800 - y_font.
      // Or in SVG: <g transform="translate(0, 800) scale(1, -1)">
      // Let's do direct coordinate translation:
      // g.d is like "M 100 200 L 150 250 M ..."
      const translatedD = g.d.replace(/([ML])\s*([-\d.]+)\s+([-\d.]+)/g, (_, cmd, x, y) => {
        const nx = parseFloat(x) + curX
        const ny = 750 - parseFloat(y) // Invert Y and offset
        return `${cmd} ${nx.toFixed(1)} ${ny.toFixed(1)}`
      })
      paths.push(translatedD)
    }
    curX += g.advX
  }
  return { d: paths.join(' '), width: curX }
}

for (const g of greetings) {
  const { d, width } = renderStringToPath(g)
  console.log(`Greeting: "${g}" -> total font units width = ${width}`)
}
