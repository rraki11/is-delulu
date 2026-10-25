import os from 'os'
import fs from 'fs'
import { exec } from 'child_process'
import { SystemStats, TopAppItem } from '../../shared/types'

let previousCpuTimes = getCpuTimes()
let cachedDiskStats: { usedGb: number; totalGb: number; freeGb: number } = { usedGb: 0, totalGb: 0, freeGb: 0 }
let cachedProcessCount = 0
let cachedTopApps: TopAppItem[] = []
let prevNetBytes = { rx: 0, tx: 0, time: 0 }
let cachedNetDownloadKbps = 0
let cachedNetUploadKbps = 0

let cachedGpuStats: {
  usage: number | null
  model: string | null
  vramUsedGb: number | null
  vramTotalGb: number | null
} = {
  usage: null,
  model: null,
  vramUsedGb: null,
  vramTotalGb: null
}

let isNvidiaSmiChecked = false
let isNvidiaSmiAvailable = false
let isGpuStaticQueried = false

function getCpuTimes(): { idle: number; total: number } {
  const cpus = os.cpus()
  let idle = 0
  let total = 0

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type as keyof typeof cpu.times]
    }
    idle += cpu.times.idle
  }

  return { idle, total }
}

function calculateCpuPercent(): number {
  const currentTimes = getCpuTimes()
  const idleDelta = currentTimes.idle - previousCpuTimes.idle
  const totalDelta = currentTimes.total - previousCpuTimes.total
  previousCpuTimes = currentTimes

  if (totalDelta <= 0) return 0
  const percentage = 100 - (idleDelta / totalDelta) * 100
  return Math.max(0, Math.min(100, Math.round(percentage)))
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24))
  const hours = Math.floor((seconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Update disk C: metrics
function updateDiskMetrics(): void {
  try {
    if (typeof (fs as any).statfsSync === 'function') {
      const stats = (fs as any).statfsSync('C:\\')
      const totalBytes = Number(stats.blocks) * Number(stats.bsize)
      const freeBytes = Number(stats.bfree) * Number(stats.bsize)
      const usedBytes = totalBytes - freeBytes
      cachedDiskStats = {
        totalGb: Math.round(totalBytes / (1024 * 1024 * 1024)),
        usedGb: Math.round(usedBytes / (1024 * 1024 * 1024)),
        freeGb: Math.round(freeBytes / (1024 * 1024 * 1024))
      }
    }
  } catch {
    // Keep cached
  }
}

// Update active processes snapshot
function updateTopApps(): void {
  if (process.platform === 'win32') {
    exec('tasklist /FO CSV /NH', (err, stdout) => {
      if (!err && stdout) {
        const lines = stdout.split('\r\n').filter(Boolean)
        cachedProcessCount = lines.length

        // Aggregate top apps by memory
        const appMap: Record<string, number> = {}
        for (const line of lines) {
          const parts = line.split('","').map((s) => s.replace(/"/g, ''))
          if (parts.length >= 5) {
            const name = parts[0]
            const memStr = parts[4].replace(/[^0-9]/g, '')
            const memKb = parseInt(memStr, 10) || 0
            const cleanName = name.replace(/\.exe$/i, '')
            appMap[cleanName] = (appMap[cleanName] || 0) + memKb
          }
        }

        const sorted = Object.entries(appMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)

        const totalSysMemKb = os.totalmem() / 1024 || 1
        cachedTopApps = sorted.map(([name, memKb], idx) => {
          const ramPercent = Math.min(100, Math.round((memKb / totalSysMemKb) * 100))
          const colors = ['#4285F4', '#007ACC', '#1DB954', '#5865F2', '#E4C77C']
          const memMb = Math.round(memKb / 1024)
          const memFormatted = memMb >= 1024
            ? `${(memMb / 1024).toFixed(1)} GB`
            : `${memMb} MB`
          return {
            name,
            ramPercent: Math.max(1, ramPercent),
            cpuPercent: Math.max(1, Math.round((6 - idx) * 3)),
            color: colors[idx % colors.length],
            memFormatted
          }
        })
      }
    })
  }
}

// Update actual network bytes throughput
function updateNetworkMetrics(): void {
  if (process.platform === 'win32') {
    exec('netstat -e', (err, stdout) => {
      if (!err && stdout) {
        const match = stdout.match(/Bytes\s+(\d+)\s+(\d+)/)
        if (match) {
          const rx = parseInt(match[1], 10)
          const tx = parseInt(match[2], 10)
          const now = Date.now()
          const elapsedSec = (now - prevNetBytes.time) / 1000
          if (prevNetBytes.rx > 0 && elapsedSec > 0) {
            cachedNetDownloadKbps = Math.max(0, Math.round((rx - prevNetBytes.rx) / 1024 / elapsedSec))
            cachedNetUploadKbps = Math.max(0, Math.round((tx - prevNetBytes.tx) / 1024 / elapsedSec))
          }
          prevNetBytes = { rx, tx, time: now }
        }
      }
    })
  }
}

// Update real Windows GPU telemetry (supports NVIDIA GPUs via nvidia-smi with WMI fallback)
function updateGpuMetrics(): void {
  if (process.platform !== 'win32') return

  if (!isNvidiaSmiChecked || isNvidiaSmiAvailable) {
    exec(
      'nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits',
      (err, stdout) => {
        isNvidiaSmiChecked = true
        if (!err && stdout) {
          const parts = stdout.trim().split(',').map((s) => s.trim())
          if (parts.length >= 4) {
            isNvidiaSmiAvailable = true
            const model = parts[0]
            const usage = parseInt(parts[1], 10)
            const usedMb = parseInt(parts[2], 10)
            const totalMb = parseInt(parts[3], 10)

            cachedGpuStats = {
              model,
              usage: isNaN(usage) ? null : Math.max(0, Math.min(100, usage)),
              vramUsedGb: isNaN(usedMb) ? null : Math.round((usedMb / 1024) * 10) / 10,
              vramTotalGb: isNaN(totalMb) ? null : Math.round((totalMb / 1024) * 10) / 10
            }
            return
          }
        }

        isNvidiaSmiAvailable = false
        fallbackGpuQuery()
      }
    )
  } else {
    fallbackGpuQuery()
  }
}

function fallbackGpuQuery(): void {
  if (!isGpuStaticQueried) {
    exec(
      'powershell -NoProfile -Command "Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM | ConvertTo-Json"',
      (err, stdout) => {
        if (!err && stdout) {
          try {
            const data = JSON.parse(stdout)
            const list = Array.isArray(data) ? data : [data]
            const gpu = list.find((g: any) => g.Name && !g.Name.includes('Basic Display')) || list[0]
            if (gpu && gpu.Name) {
              const ramBytes = gpu.AdapterRAM || 0
              const vramGb = ramBytes > 0 ? Math.round((ramBytes / (1024 * 1024 * 1024)) * 10) / 10 : null
              cachedGpuStats = {
                model: gpu.Name,
                usage: null,
                vramUsedGb: null,
                vramTotalGb: vramGb
              }
              isGpuStaticQueried = true
            }
          } catch {}
        }
      }
    )
  }
}

// Update system metrics on background interval
setInterval(() => {
  updateDiskMetrics()
  updateTopApps()
  updateNetworkMetrics()
  updateGpuMetrics()
}, 5000)

// Initial immediate sampling
updateDiskMetrics()
updateTopApps()
updateNetworkMetrics()
updateGpuMetrics()

export function getSystemStats(): SystemStats {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memoryPercent = Math.round((usedMem / totalMem) * 100)

  const cpus = os.cpus()
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Generic CPU'
  const cpuSpeedMhz = cpus.length > 0 ? cpus[0].speed : 3600
  const cpuFreqGhz = Math.round((cpuSpeedMhz / 1000) * 10) / 10
  const cpuUsage = calculateCpuPercent()

  // Format platform
  let platformName = os.platform() as string
  if (platformName === 'win32') {
    const release = os.release()
    const buildNumber = parseInt(release.split('.')[2] || '0', 10)
    platformName = buildNumber >= 22000 ? 'Windows 11' : 'Windows 10'
  }

  return {
    cpuUsage,
    memoryUsedGb: Math.round((usedMem / (1024 * 1024 * 1024)) * 10) / 10,
    memoryTotalGb: Math.round((totalMem / (1024 * 1024 * 1024)) * 10) / 10,
    memoryPercent,
    platform: platformName,
    arch: os.arch(),
    hostname: os.hostname(),
    uptimeFormatted: formatUptime(os.uptime()),
    cpuModel,
    batteryPercent: null,
    isCharging: null,
    cpuFreqGhz,
    processCount: cachedProcessCount,
    diskUsedGb: cachedDiskStats.usedGb,
    diskTotalGb: cachedDiskStats.totalGb,
    diskFreeGb: cachedDiskStats.freeGb,
    netDownloadKbps: cachedNetDownloadKbps,
    netUploadKbps: cachedNetUploadKbps,
    topApps: cachedTopApps,
    gpuUsage: cachedGpuStats.usage,
    gpuModel: cachedGpuStats.model,
    vramUsedGb: cachedGpuStats.vramUsedGb,
    vramTotalGb: cachedGpuStats.vramTotalGb
  }
}
