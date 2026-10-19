const res = await fetch('https://raw.githubusercontent.com/techninja/hersheytextjs/master/hersheytext.json')
const data = await res.json()

console.log('scripts name:', data.scripts?.name)
console.log('scriptc name:', data.scriptc?.name)
console.log('cursive name:', data.cursive?.name)

// Let's test how 'scripts' renders letters 'h', 'e', 'l', 'l', 'o'
for (const fontName of ['scripts', 'scriptc', 'cursive']) {
  console.log(`\n=== FONT: ${fontName} ===`)
  for (const ch of ['h', 'e', 'l', 'o', ' ', 't']) {
    const idx = ch.charCodeAt(0) - 32
    const cData = data[fontName].chars[idx]
    console.log(`  '${ch}': offset=${cData?.o}, d="${cData?.d?.slice(0, 50)}..."`)
  }
}
