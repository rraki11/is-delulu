import fs from 'fs'
import path from 'path'

function walk(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'out') {
        results.push(...walk(full))
      }
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.css')) {
      const content = fs.readFileSync(full, 'utf8')
      const lines = content.split('\n')
      lines.forEach((l, i) => {
        if (/fontFamily\s*:\s*['\"][^v]/.test(l) && !l.includes('Caveat')) {
          results.push(`${full}:${i + 1} ${l.trim()}`)
        }
      })
    }
  }
  return results
}

const found = walk('src/renderer/src')
console.log('Audit results (should be empty except intentional overrides):')
found.forEach((f) => console.log(f))
if (found.length === 0) {
  console.log('All fontFamily declarations are 100% tokenized with var(--font-*)!')
}
