/**
 * Cold-Start & Startup Pipeline Performance Instrumentation
 * High-resolution millisecond milestones tracking from process boot to interactive UI.
 */

import { PerfMilestone, AnimationMetrics } from './types'

class PerformanceTracker {
  private startTime: number = Date.now()
  private milestones: PerfMilestone[] = []
  private isFinalized: boolean = false

  constructor() {
    this.record('app_process_start')
  }

  public setStartTime(time: number): void {
    this.startTime = time
    // If the first milestone was 'app_process_start' recorded before setting startTime in renderer,
    // re-align its timestamp to this.startTime
    if (this.milestones.length > 0 && this.milestones[0].name === 'app_process_start') {
      this.milestones[0].timestamp = time
      this.milestones[0].elapsedSinceStartMs = 0
      this.milestones[0].elapsedSincePrevMs = 0
    }
  }

  public record(name: string, metadata?: Record<string, unknown>): PerfMilestone {
    const now = Date.now()
    const elapsedSinceStartMs = Math.max(0, now - this.startTime)
    const prevTimestamp = this.milestones.length > 0 ? this.milestones[this.milestones.length - 1].timestamp : this.startTime
    const elapsedSincePrevMs = Math.max(0, now - prevTimestamp)

    const milestone: PerfMilestone = {
      name,
      timestamp: now,
      elapsedSinceStartMs,
      elapsedSincePrevMs,
      metadata
    }

    this.milestones.push(milestone)

    const isRenderer = typeof window !== 'undefined' && typeof window.document !== 'undefined'
    const prefix = isRenderer ? '[RENDERER PERF]' : '[MAIN PERF]'
    console.log(
      `${prefix} +${elapsedSinceStartMs}ms (+${elapsedSincePrevMs}ms): ${name}`,
      metadata ? JSON.stringify(metadata) : ''
    )

    return milestone
  }

  public getMilestones(): PerfMilestone[] {
    return [...this.milestones]
  }

  public getStartTime(): number {
    return this.startTime
  }

  public generateReport(): string {
    const lines = [
      '=================================================================',
      '         is-delulu Cold Start & Startup Performance Report        ',
      '=================================================================',
      `Base Start Time: ${new Date(this.startTime).toISOString()}`,
      '-----------------------------------------------------------------',
      'Milestone                         Total (ms)     Delta (ms)      ',
      '-----------------------------------------------------------------'
    ]

    for (const m of this.milestones) {
      const namePadded = m.name.padEnd(32, ' ')
      const totalPadded = `+${m.elapsedSinceStartMs}ms`.padStart(12, ' ')
      const deltaPadded = `+${m.elapsedSincePrevMs}ms`.padStart(12, ' ')
      lines.push(`${namePadded} ${totalPadded}   ${deltaPadded}`)
    }

    lines.push('=================================================================')
    return lines.join('\n')
  }
}

export class AnimationFrameProfiler {
  private active = false
  private name = ''
  private startTime = 0
  private lastFrameTime = 0
  private frameDeltas: number[] = []
  private rafId: number | null = null

  public start(name: string): void {
    if (typeof requestAnimationFrame === 'undefined') return
    this.name = name
    this.active = true
    this.frameDeltas = []
    this.startTime = performance.now()
    this.lastFrameTime = performance.now()

    const onFrame = (now: number): void => {
      if (!this.active) return
      const delta = now - this.lastFrameTime
      if (delta > 0) {
        this.lastFrameTime = now
        if (this.frameDeltas.length > 0 || delta < 100) {
          this.frameDeltas.push(delta)
        }
      }
      this.rafId = requestAnimationFrame(onFrame)
    }
    this.rafId = requestAnimationFrame(onFrame)
  }

  public stop(): AnimationMetrics | null {
    if (!this.active || typeof cancelAnimationFrame === 'undefined') return null
    this.active = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    const durationMs = performance.now() - this.startTime
    const totalFrames = this.frameDeltas.length
    const longFrames = this.frameDeltas.filter((d) => d > 24).length
    const droppedFrames = this.frameDeltas.filter((d) => d > 33.3).length
    const maxFrameDeltaMs = this.frameDeltas.length > 0 ? Math.max(...this.frameDeltas) : 0
    const sorted = [...this.frameDeltas].sort((a, b) => a - b)
    const p95Idx = Math.floor(sorted.length * 0.95)
    const p95FrameDeltaMs = sorted[p95Idx] || 0
    const avgFps = durationMs > 0 && totalFrames > 0 ? Math.round((totalFrames / (durationMs / 1000)) * 10) / 10 : 0

    const metrics: AnimationMetrics = {
      name: this.name,
      durationMs: Math.round(durationMs),
      totalFrames,
      avgFps,
      longFrames,
      droppedFrames,
      maxFrameDeltaMs: Math.round(maxFrameDeltaMs * 10) / 10,
      p95FrameDeltaMs: Math.round(p95FrameDeltaMs * 10) / 10,
      frameDeltas: this.frameDeltas.map((d) => Math.round(d * 10) / 10)
    }

    console.log(
      `[ANIMATION PERF] ${metrics.name}: ${metrics.totalFrames} frames over ${metrics.durationMs}ms (~${metrics.avgFps} fps). ` +
      `Long (>24ms): ${metrics.longFrames}, Dropped (>33ms): ${metrics.droppedFrames}, Max delta: ${metrics.maxFrameDeltaMs}ms, P95: ${metrics.p95FrameDeltaMs}ms`
    )

    return metrics
  }
}

export const perfTracker = new PerformanceTracker()
export const animationProfiler = new AnimationFrameProfiler()
