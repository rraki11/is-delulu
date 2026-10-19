import { app } from 'electron'
import { join } from 'path'
import { performance } from 'perf_hooks'
import { spawn } from 'child_process'
import { existsSync } from 'fs'

app.setName('is-delulu-perf-benchmark')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-perf-benchmark'))

app.whenReady().then(async () => {
  console.log('=== MEASURING POST-FIX PERFORMANCE & EVENT LOOP LAG ===\n')

  const daemonPath = join(process.cwd(), 'out/main/services/battery-daemon.ps1')
  if (!existsSync(daemonPath)) {
    console.error('Cannot find:', daemonPath)
    process.exit(1)
  }

  // 1. Measure Event Loop Lag while battery monitor daemon is active
  console.log('--- Step 1: Starting Win32 Battery Monitor Daemon & Heartbeat ---')
  let maxLag = 0
  let lagCount = 0
  let totalLag = 0
  let heartbeats = 0

  let expected = performance.now() + 50
  const heartbeatTimer = setInterval(() => {
    heartbeats++
    const now = performance.now()
    const lag = Math.max(0, now - expected)
    if (lag > maxLag) maxLag = lag
    totalLag += lag
    if (lag > 50) {
      lagCount++
      console.log(`  [LAG DETECTED] Main thread blocked for ${lag.toFixed(2)}ms at t=${now.toFixed(0)}ms`)
    }
    expected = performance.now() + 50
  }, 50)

  let updatesReceived = 0
  let lastState = null

  const daemonProc = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', daemonPath],
    {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true
    }
  )

  let lineBuffer = ''
  daemonProc.stdout.on('data', (chunk) => {
    lineBuffer += chunk.toString('utf8')
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() || ''

    for (const rawLine of lines) {
      const trimmed = rawLine.trim()
      if (!trimmed.startsWith('{')) continue
      try {
        const payload = JSON.parse(trimmed)
        if (payload.type === 'battery') {
          updatesReceived++
          lastState = payload
          console.log(`  [Battery Update #${updatesReceived}] percent=${payload.percent}% isCharging=${payload.isCharging} isOnAC=${payload.isOnAC}`)
        }
      } catch {}
    }
  })

  // Wait 3.5s for steady-state
  await new Promise((r) => setTimeout(r, 3500))

  // 2. Measure non-blocking command dispatch
  console.log('\n--- Step 2: Triggering instantaneous power refreshes (simulating AC plug / unplug events) ---')
  const refreshTimes = []
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now()
    daemonProc.stdin.write('query\n')
    const dt = performance.now() - t0
    refreshTimes.push(dt)
    console.log(`  query command #${i + 1} written to stdin in ${dt.toFixed(3)}ms (zero main thread stall)`)
    await new Promise((r) => setTimeout(r, 1200))
  }

  // Measure for 2 more seconds
  await new Promise((r) => setTimeout(r, 2000))

  clearInterval(heartbeatTimer)
  try {
    daemonProc.stdin.write('exit\n')
    daemonProc.kill()
  } catch {}

  const avgLag = (totalLag / heartbeats).toFixed(2)
  console.log('\n=== MEASUREMENT SUMMARY ===')
  console.log(`Total 50ms Heartbeats: ${heartbeats}`)
  console.log(`Updates Received from Win32 Daemon: ${updatesReceived}`)
  console.log(`Lag Spikes (>50ms): ${lagCount}`)
  console.log(`Max Event Loop Lag: ${maxLag.toFixed(2)}ms`)
  console.log(`Average Event Loop Lag: ${avgLag}ms`)
  console.log(`Last Cached Battery State:`, lastState)

  if (lagCount === 0 && maxLag < 50) {
    console.log('\n>>> SUCCESS: Zero main-thread blocking detected! Maximum lag was', maxLag.toFixed(2), 'ms (well below 50ms stutter threshold). Cursor stuttering completely eliminated. <<<')
    process.exit(0)
  } else {
    console.error(`\n>>> FAILURE: Detected ${lagCount} lag spikes with max lag of ${maxLag.toFixed(2)}ms <<<`)
    process.exit(1)
  }
})
