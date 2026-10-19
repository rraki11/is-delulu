import fs from 'fs'

const greetingData = JSON.parse(fs.readFileSync('src/renderer/src/components/island/greetingPaths.json', 'utf8'))

const d = greetingData['one step at a time'].d
const subpaths = d.split(/(?=M)/).filter(Boolean)
console.log('Number of subpaths in "one step at a time":', subpaths.length)
for (let i = 0; i < Math.min(5, subpaths.length); i++) {
  console.log(`Subpath ${i}: ${subpaths[i].slice(0, 40)}...`)
}
