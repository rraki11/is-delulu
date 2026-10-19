const res = await fetch('https://raw.githubusercontent.com/techninja/hersheytextjs/master/svg_fonts/EMSAllure.svg')
const text = await res.text()

// Parse all glyphs
const glyphRegex = /<glyph\s+unicode="([^"]+)"\s+glyph-name="([^"]+)"\s+horiz-adv-x="([^"]+)"\s*(?:d="([^"]+)")?\s*\/>/g
let match
const glyphs = {}
while ((match = glyphRegex.exec(text)) !== null) {
  const [_, unicode, name, advX, d] = match
  glyphs[unicode] = { name, advX: parseFloat(advX), d: d || '' }
}

console.log('Total glyphs in EMSAllure:', Object.keys(glyphs).length)
console.log('Sample glyphs:', Object.keys(glyphs).filter(k => k >= 'a' && k <= 'z'))
for (const ch of ['h', 'e', 'l', 'o', ' ', 'o', 'n', 's', 't', 'p', 'a', 'i', 'm']) {
  if (glyphs[ch]) {
    console.log(`Glyph '${ch}': advX=${glyphs[ch].advX}, d=${glyphs[ch].d.slice(0, 60)}...`)
  } else {
    console.log(`Glyph '${ch}' MISSING!`)
  }
}
