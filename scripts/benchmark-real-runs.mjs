import { spawn, execSync } from 'child_process'
import { join } from 'path'

const NUM_RUNS = 4

function killAllElectron() {
  try {
    execSync('taskkill /IM electron.exe /F /T', { stdio: 'ignore' })
  } catch {}
}

async function runSingleLaunch(runIndex) {
  killAllElectron()
  await new Promise((r) => setTimeout(r, 800))

  console.log(`\n================== LAUNCH RUN #${runIndex + 1} ==================`)
  return new Promise((resolve, reject) => {
    const electronPath = join(process.cwd(), 'node_modules/electron/dist/electron.exe')
    const electronProc = spawn(electronPath, ['.'], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const milestones = {}
    const animationMetrics = []
    let stdoutBuffer = ''

    const terminate = () => {
      try {
        if (electronProc.pid) {
          execSync(`taskkill /pid ${electronProc.pid} /T /F`, { stdio: 'ignore' })
        }
      } catch {}
      killAllElectron()
    }

    const timeout = setTimeout(() => {
      console.warn(`Run #${runIndex + 1} timed out after 14s`)
      terminate()
      resolve({ runIndex, milestones, animationMetrics, success: false, raw: stdoutBuffer })
    }, 14000)

    electronProc.stdout.on('data', (data) => {
      const text = data.toString()
      stdoutBuffer += text
      process.stdout.write(`[Run #${runIndex + 1}] ${text}`)

      // Parse [MAIN PERF] +Xms (+Yms): milestone_name
      const perfMatches = text.matchAll(/\[(?:MAIN|RENDERER) PERF\] \+(\d+)ms \(\+(\d+)ms\): (\w+)/g)
      for (const m of perfMatches) {
        const totalMs = parseInt(m[1], 10)
        const name = m[3]
        if (!milestones[name]) {
          milestones[name] = totalMs
        }
      }

      // Parse [MAIN ANIMATION LOG]
      const animMatches = text.matchAll(/\[MAIN ANIMATION LOG\] (\{.*?\})/g)
      for (const am of animMatches) {
        try {
          const parsed = JSON.parse(am[1])
          animationMetrics.push(parsed)
        } catch {}
      }

      // When welcome sequence finishes, we have captured the full cold-start lifecycle
      if (text.includes('welcome_animation_complete') || text.includes('handleWelcomeComplete called')) {
        setTimeout(() => {
          clearTimeout(timeout)
          terminate()
          resolve({ runIndex, milestones, animationMetrics, success: true, raw: stdoutBuffer })
        }, 1000)
      }
    })

    electronProc.stderr.on('data', (data) => {
      process.stderr.write(`[Run #${runIndex + 1} ERR] ${data.toString()}`)
    })

    electronProc.on('error', (err) => {
      clearTimeout(timeout)
      terminate()
      reject(err)
    })
  })
}

function calculateMedian(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

async function runBenchmark() {
  console.log('Starting multi-run cold start benchmark across %d launches...', NUM_RUNS)
  const results = []

  for (let i = 0; i < NUM_RUNS; i++) {
    const res = await runSingleLaunch(i)
    results.push(res)
    // Cooldown between runs so OS caches and electron processes fully settle
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log('\n=================================================================')
  console.log('                 MULTI-RUN COLD START RESULTS SUMMARY            ')
  console.log('=================================================================')

  const milestoneNames = [
    'app_process_start',
    'main_process_ready',
    'main_window_created',
    'renderer_did_finish_load',
    'first_rendered_frame',
    'first_interactive_frame',
    'background_services_ready',
    'welcome_animation_start',
    'welcome_animation_complete'
  ]

  console.log(
    'Milestone'.padEnd(30) +
    results.map((_, i) => `Run #${i + 1}`.padStart(10)).join('') +
    'Median'.padStart(12)
  )
  console.log('-'.repeat(30 + NUM_RUNS * 10 + 12))

  for (const name of milestoneNames) {
    const values = results.map((r) => r.milestones[name] ?? null)
    const validValues = values.filter((v) => typeof v === 'number')
    const median = calculateMedian(validValues)

    const line =
      name.padEnd(30) +
      values.map((v) => (v !== null ? `+${v}ms`.padStart(10) : 'N/A'.padStart(10))).join('') +
      `+${median}ms`.padStart(12)
    console.log(line)
  }

  console.log('=================================================================')
  console.log('                 ANIMATION FRAME TIMINGS & SMOOTHNESS            ')
  console.log('=================================================================')

  for (const r of results) {
    console.log(`\n--- Run #${r.runIndex + 1} Animation Details ---`)
    if (r.animationMetrics.length === 0) {
      console.log('  No animation metrics captured.')
    }
    for (const a of r.animationMetrics) {
      console.log(
        `  * ${a.name.padEnd(24)}: ${a.totalFrames} frames in ${a.durationMs}ms (~${a.avgFps} fps). ` +
        `Dropped (>33ms): ${a.droppedFrames}, Long (>24ms): ${a.longFrames}, Max hitch: ${a.maxFrameDeltaMs}ms, P95: ${a.p95FrameDeltaMs}ms`
      )
    }
  }
}

runBenchmark().catch(console.error)
