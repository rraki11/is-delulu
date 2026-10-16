import fs from 'fs'
import path from 'path'

function parseOpenTypeNameTable(buffer) {
  // Read SFNT header
  const numTables = buffer.readUInt16BE(4)
  let nameTableOffset = 0
  let os2TableOffset = 0

  for (let i = 0; i < numTables; i++) {
    const tag = buffer.toString('utf8', 12 + i * 16, 12 + i * 16 + 4)
    const offset = buffer.readUInt32BE(12 + i * 16 + 8)
    if (tag === 'name') nameTableOffset = offset
    if (tag === 'OS/2') os2TableOffset = offset
  }

  const result = { names: {}, weightClass: null }

  if (os2TableOffset > 0) {
    result.weightClass = buffer.readUInt16BE(os2TableOffset + 4)
  }

  if (nameTableOffset > 0) {
    const count = buffer.readUInt16BE(nameTableOffset + 2)
    const stringOffset = nameTableOffset + buffer.readUInt16BE(nameTableOffset + 4)

    for (let i = 0; i < count; i++) {
      const record = nameTableOffset + 6 + i * 12
      const platformID = buffer.readUInt16BE(record)
      const nameID = buffer.readUInt16BE(record + 6)
      const length = buffer.readUInt16BE(record + 8)
      const offset = buffer.readUInt16BE(record + 10)

      let str = ''
      if (platformID === 0 || platformID === 3) {
        // UTF-16BE
        const strBuf = buffer.slice(stringOffset + offset, stringOffset + offset + length)
        str = strBuf.swap16().toString('utf16le')
      } else {
        str = buffer.toString('latin1', stringOffset + offset, stringOffset + offset + length)
      }

      if (!result.names[nameID]) {
        result.names[nameID] = str
      }
    }
  }

  return result
}

const dir = 'c:/Users/rrake/OneDrive/Desktop/H/fonts/zip/extracted'
const files = fs.readdirSync(dir).filter(f => f.endsWith('.OTF'))

console.log('---------------------------------------------------------------------------------------------------')
console.log('FILE | OS/2 WEIGHT | ID 1 (Family) | ID 2 (Subfamily) | ID 4 (Full Name) | ID 6 (PostScript)')
console.log('---------------------------------------------------------------------------------------------------')

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file))
  const parsed = parseOpenTypeNameTable(buf)
  console.log(`${file} | weightClass=${parsed.weightClass} | Family="${parsed.names[1]}" | Sub="${parsed.names[2]}" | Full="${parsed.names[4]}" | PS="${parsed.names[6]}"`)
}
