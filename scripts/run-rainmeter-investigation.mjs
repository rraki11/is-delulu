import { spawn } from 'child_process'
import { join } from 'path'

const electronPath = join(process.cwd(), 'node_modules/electron/dist/electron.exe')
const proc = spawn(electronPath, ['scripts/investigate-rainmeter-perf.mjs'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

proc.on('close', (code) => {
  console.log(`Investigation finished with exit code ${code}`)
})
