import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app, powerMonitor } from 'electron'
import { existsSync } from 'fs'
import { BatteryState } from '../../shared/types'

// ── Internal state ────────────────────────────────────────────────────────────
let daemonProc: ChildProcess | null = null
let onChangeCallback: ((state: BatteryState) => void) | null = null
let lastKnownState: BatteryState = {
  percent: null,
  isCharging: null,
  isFullyCharged: null,
  isOnAC: null,
  isEnergySaver: null,
  energySaverThreshold: null,
  minutesRemaining: null
}
let isStarting = false
let isStopped = false

function resolveDaemonPath(): string | null {
  const possiblePaths = [
    join(process.cwd(), 'src/main/services/battery-daemon.ps1'),
    join(app.getAppPath(), 'src/main/services/battery-daemon.ps1'),
    join(__dirname, 'services/battery-daemon.ps1'),
    join(__dirname, 'battery-daemon.ps1'),
    join(app.getAppPath(), 'out/main/services/battery-daemon.ps1')
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return null
}

function processBatteryUpdate(current: BatteryState): void {
  const prev = lastKnownState
  lastKnownState = current

  const chargingChanged = prev.isCharging !== current.isCharging
  const acChanged = prev.isOnAC !== current.isOnAC
  const percentChanged =
    prev.percent === null ||
    current.percent === null ||
    Math.abs(prev.percent - current.percent) >= 1
  const fullChanged = prev.isFullyCharged !== current.isFullyCharged
  const energySaverChanged = prev.isEnergySaver !== current.isEnergySaver
  const thresholdChanged = prev.energySaverThreshold !== current.energySaverThreshold

  if (energySaverChanged) {
    console.log(
      `[is-delulu:battery] Energy Saver state changed: ${prev.isEnergySaver} -> ${current.isEnergySaver} (threshold=${current.energySaverThreshold})`
    )
  }

  if (
    chargingChanged ||
    acChanged ||
    percentChanged ||
    fullChanged ||
    energySaverChanged ||
    thresholdChanged
  ) {
    onChangeCallback?.(current)
  }
}

/**
 * Returns current battery state synchronously from cached memory.
 * Zero overhead, non-blocking, 0ms.
 */
export function getBatteryState(): BatteryState {
  return { ...lastKnownState }
}

/**
 * Requests an immediate battery check from the running daemon.
 */
export function requestBatteryRefresh(): void {
  console.log('[is-delulu:battery] Requesting battery status query from daemon')
  if (daemonProc && daemonProc.stdin && daemonProc.stdin.writable) {
    try {
      daemonProc.stdin.write('query\n')
    } catch (err) {
      console.warn('[is-delulu:battery] Failed to send query to daemon:', err)
    }
  }
}

let powerChangeHandler: (() => void) | null = null

/**
 * Starts non-blocking Windows battery monitoring using persistent Win32 daemon
 * and native Electron OS powerMonitor event hooks.
 */
export function startBatteryMonitor(onUpdate: (state: BatteryState) => void): void {
  stopBatteryMonitor()
  isStopped = false
  onChangeCallback = onUpdate

  // 1. Hook native OS power events (WM_POWERBROADCAST) for instant zero-latency detection
  try {
    powerChangeHandler = (): void => {
      requestBatteryRefresh()
    }
    powerMonitor.on('on-ac', powerChangeHandler)
    powerMonitor.on('on-battery', powerChangeHandler)
  } catch (err) {
    console.warn('[BatteryService] powerMonitor hooks not available:', err)
  }

  // 2. Start persistent background Win32 daemon
  startDaemon()
}

function startDaemon(): void {
  if (isStopped || daemonProc || isStarting) return
  isStarting = true

  const scriptPath = resolveDaemonPath()
  if (!scriptPath) {
    console.error('[BatteryService] Could not find battery-daemon.ps1')
    isStarting = false
    return
  }

  try {
    daemonProc = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      }
    )

    isStarting = false

    daemonProc.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString('utf8').trim()
      if (msg) {
        console.log(`[BatteryDaemon] ${msg}`)
      }
    })

    let lineBuffer = ''

    daemonProc.stdout?.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString('utf8')
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || ''

      for (const rawLine of lines) {
        const trimmed = rawLine.trim()
        if (!trimmed.startsWith('{')) continue
        try {
          const payload = JSON.parse(trimmed)
          if (payload.type === 'battery') {
            const newState: BatteryState = {
              percent: typeof payload.percent === 'number' ? payload.percent : null,
              isCharging: typeof payload.isCharging === 'boolean' ? payload.isCharging : null,
              isFullyCharged:
                typeof payload.isFullyCharged === 'boolean' ? payload.isFullyCharged : null,
              isOnAC: typeof payload.isOnAC === 'boolean' ? payload.isOnAC : null,
              isEnergySaver:
                typeof payload.isEnergySaver === 'boolean' ? payload.isEnergySaver : null,
              energySaverThreshold:
                typeof payload.energySaverThreshold === 'number'
                  ? payload.energySaverThreshold
                  : null,
              minutesRemaining:
                typeof payload.minutesRemaining === 'number' ? payload.minutesRemaining : null
            }
            processBatteryUpdate(newState)
          }
        } catch {
          // ignore transient json parse error
        }
      }
    })

    daemonProc.on('exit', (code) => {
      daemonProc = null
      if (!isStopped) {
        setTimeout(() => {
          startDaemon()
        }, 2000)
      }
    })

    daemonProc.on('error', (err) => {
      console.error('[BatteryService] Daemon error:', err)
      daemonProc = null
      isStarting = false
    })
  } catch (err) {
    console.error('[BatteryService] Failed to spawn battery daemon:', err)
    daemonProc = null
    isStarting = false
  }
}

export function stopBatteryMonitor(): void {
  isStopped = true
  if (powerChangeHandler) {
    try {
      powerMonitor.removeListener('on-ac', powerChangeHandler)
      powerMonitor.removeListener('on-battery', powerChangeHandler)
    } catch {}
    powerChangeHandler = null
  }
  if (daemonProc) {
    try {
      if (daemonProc.stdin && daemonProc.stdin.writable) {
        daemonProc.stdin.write('exit\n')
      }
      daemonProc.kill()
    } catch {}
    daemonProc = null
  }
  onChangeCallback = null
}
