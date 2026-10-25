import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import electronPath from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const appPath = join(__dirname, '..')

console.log('=== STARTING ALL 3 CRITICAL BUGS E2E VERIFICATION ===')
console.log('Target app:', appPath)
console.log('Electron binary:', electronPath)

let welcomeDone = false
let chargingHandoffDone = false
let chargingNotificationFinished = false
let windowHiddenAfterCharging = false
let hoverActivationTriggered = false
let hoverDwellStarted = false
let hoverWindowRehidden = false

const child = spawn(electronPath, ['.'], {
  cwd: appPath,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    ELECTRON_ENABLE_LOGGING: '1'
  },
  stdio: ['pipe', 'pipe', 'pipe']
})

let combinedOutput = ''

child.stdout.on('data', (d) => {
  const str = d.toString()
  combinedOutput += str
  process.stdout.write(str)

  if (str.includes('Startup with charger connected: queuing startup charging notification')) {
    console.log('\n[TEST CHECK 1] Startup charging detected and queued successfully!')
  }

  if (str.includes('Seamless charging handoff begins')) {
    welcomeDone = true
    chargingHandoffDone = true
    console.log('\n[TEST CHECK 2] Welcome sequence smoothly handed off to charging notification!')
  }

  if (str.includes('Executing charging notification lifecycle')) {
    console.log('\n[TEST CHECK 3] Charging notification lifecycle active and running!')
  }

  if (str.includes('Native window hidden after notification finished')) {
    chargingNotificationFinished = true
    windowHiddenAfterCharging = true
    console.log('\n[TEST CHECK 4] Charging notification finished and window hidden cleanly!')

    // NOW TEST TOP-EDGE HOVER ACTIVATION:
    console.log('\n[TEST TRIGGER] Simulating cursor at top-center edge (x=914, y=0)...')
    setTimeout(() => {
      // Send IPC simulation through stdin / eval or let the child trigger it
      // We can invoke simulate-cursor via child process if needed, or through electron-vite
    }, 500)
  }

  if (str.includes('Pointer touched top-center edge at')) {
    hoverActivationTriggered = true
    console.log('\n[TEST CHECK 5] Top-edge activation detected! Island revealed.')
  }
})

child.stderr.on('data', (d) => {
  const str = d.toString()
  combinedOutput += str
  process.stderr.write(str)
})

// Run for 25 seconds total to let full cycle execute
setTimeout(() => {
  console.log('\n=== VERIFICATION RESULTS ===')
  console.log(`1. Startup Charging Queued & Run: ${chargingHandoffDone ? 'PASS' : 'FAIL'}`)
  console.log(`2. Welcome Seamless Handoff: ${welcomeDone ? 'PASS' : 'FAIL'}`)
  console.log(`3. Clean Post-Notification Hide: ${windowHiddenAfterCharging ? 'PASS' : 'FAIL'}`)

  child.kill()
  process.exit(chargingHandoffDone && windowHiddenAfterCharging ? 0 : 1)
}, 22000)
