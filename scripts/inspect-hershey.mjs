const res = await fetch('https://raw.githubusercontent.com/techninja/hersheytextjs/master/hersheytext.json')
const data = await res.json()

console.log('Available fonts:', Object.keys(data))
console.log('Cursive info:', data.cursive.name, 'num chars:', data.cursive.chars.length)

const sampleChars = [' ', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', "'"]
for (const ch of sampleChars) {
  const idx = ch.charCodeAt(0) - 32
  const cData = data.cursive.chars[idx]
  console.log(`Char '${ch}' (idx ${idx}): offset=${cData?.o}, d="${cData?.d}"`)
}
