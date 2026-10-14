import os from 'os'
import { SystemStats } from '../../shared/types'

let previousCpuTimes = getCpuTimes()

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

export function getSystemStats(): SystemStats {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memoryPercent = Math.round((usedMem / totalMem) * 100)

  const cpus = os.cpus()
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Generic CPU'
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
    isCharging: null
  }
}
