import { app } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { performance } from 'perf_hooks'
import { execFileSync } from 'child_process'

const POWERSHELL_PROBE = `
Add-Type -AssemblyName System.Windows.Forms
$p = [System.Windows.Forms.SystemInformation]::PowerStatus
$b = Get-CimInstance -ClassName Win32_Battery -ErrorAction SilentlyContinue

$line = [string]$p.PowerLineStatus
$charge = [string]$p.BatteryChargeStatus
$pct = if ($b) { [math]::Round($b.EstimatedChargeRemaining) } else { [math]::Round($p.BatteryLifePercent * 100) }
$mins = if ($b -and $b.EstimatedRunTime -gt 0 -and $b.EstimatedRunTime -lt 71582788) { $b.EstimatedRunTime } else { -1 }

Write-Output "$line::$charge::$pct::$mins"
`

function queryBatteryState() {
  try {
    const raw = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_PROBE],
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 4000
      }
    ).trim()
    return raw
  } catch (err) {
    return null
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.setName('is-delulu-perf-diagnostics')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.setPath('userData', join(app.getPath('temp'), 'is-delulu-perf-diagnostics'))

app.whenReady().then(async () => {
  console.log('=== IS-DELULU PERFORMANCE & CURSOR STUTTER DIAGNOSTICS ===\n')

  // 1. Measure synchronous battery query overhead
  console.log('--- Diagnostic 1: Measuring queryBatteryState() blocking time ---')
  const queryTimes = []
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now()
    const state = queryBatteryState()
    const dt = performance.now() - t0
    queryTimes.push(dt)
    console.log(`  Query #${i + 1}: took ${dt.toFixed(2)}ms | State:`, state)
  }
  const avgQuery = (queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length).toFixed(2)
  console.log(`  --> Average main-thread blocking time per battery query: ${avgQuery}ms\n`)

  // 2. Measure Event Loop Lag while battery monitor is active
  console.log('--- Diagnostic 2: Event Loop Lag & Heartbeat (measuring stutter) ---')
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
      console.log(`  [STUTTER DETECTED] Main thread blocked for ${lag.toFixed(2)}ms at t=${now.toFixed(0)}ms`)
    }
    expected = performance.now() + 50
  }, 50)

  let batteryPollTimer = null
  const startBatteryMonitor = (cb) => {
    batteryPollTimer = setInterval(() => {
      const state = queryBatteryState()
      if (state) cb(state)
    }, 2000)
  }
  const stopBatteryMonitor = () => {
    if (batteryPollTimer) clearInterval(batteryPollTimer)
  }

  let batteryUpdateCount = 0
  startBatteryMonitor((state) => {
    batteryUpdateCount++
    console.log(`  [Battery Update #${batteryUpdateCount}] raw=${state}`)
  })

  // Measure for 6.5 seconds
  await new Promise((r) => setTimeout(r, 6500))

  stopBatteryMonitor()
  clearInterval(heartbeatTimer)

  const avgLag = (totalLag / heartbeats).toFixed(2)
  console.log('\n--- Diagnostic Results ---')
  console.log(`  Total Heartbeat Samples: ${heartbeats}`)
  console.log(`  Stutter events (>50ms freeze): ${lagCount}`)
  console.log(`  Peak Main-Thread Freeze: ${maxLag.toFixed(2)}ms`)
  console.log(`  Average Event Loop Lag: ${avgLag}ms`)
  console.log(`  Battery updates fired: ${batteryUpdateCount}`)

  console.log('\n=== DIAGNOSTICS COMPLETE ===')
  app.quit()
})
