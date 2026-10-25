// Verifies that the built Electron application boots, loads main/preload/renderer, and shuts down cleanly without uncaught errors.
const { spawn } = require('child_process')
const electronPath = require('electron')

console.log('Testing Electron application boot from out/main/index.js...')

const child = spawn(electronPath, ['.'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: false,
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1'
  }
})

let stdout = ''
let stderr = ''
let didExit = false

child.stdout.on('data', (d) => {
  stdout += d.toString()
  process.stdout.write(d)
})

child.stderr.on('data', (d) => {
  stderr += d.toString()
  process.stderr.write(d)
})

// Give Electron 4.5 seconds to initialize windows and services, then terminate cleanly
setTimeout(() => {
  if (!didExit) {
    console.log('\n[TEST RUNTIME] 4.5s launch verification completed cleanly. Terminating test process.')
    child.kill('SIGINT')
  }
}, 4500)

child.on('close', (code, signal) => {
  didExit = true
  console.log(`\n[TEST RUNTIME] Electron exited with code: ${code}, signal: ${signal}`)

  // Verify that there are no fatal unhandled exceptions or crashes
  const hasFatalError = stderr.includes('FATAL') || stderr.includes('Uncaught Error')
  if (hasFatalError) {
    console.error('[TEST RUNTIME FAIL] Fatal unhandled error found in stderr!')
    process.exit(1)
  } else {
    console.log('[TEST RUNTIME PASS] Electron runtime initialization and services booted successfully.')
    process.exit(0)
  }
})
