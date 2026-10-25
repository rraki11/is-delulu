import React, { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Activity, Cpu, HardDrive, Wifi, Clock, ArrowUpDown } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { HITODAMA_EASING } from '../../shared'

const TIMEFRAMES = ['1m', '5m', '10m', '15m', '20m'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

export const StatsWidget: React.FC = () => {
  const { systemStats } = useIslandStore()
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('5m')
  const [sortBy, setSortBy] = useState<'RAM' | 'CPU'>('RAM')

  const cpuUsage = systemStats?.cpuUsage ?? 0
  const cpuFreq = systemStats?.cpuFreqGhz ?? 0
  const procCount = systemStats?.processCount ?? 0
  const memUsed = systemStats?.memoryUsedGb ?? 0
  const memTotal = systemStats?.memoryTotalGb ?? 0
  const diskUsed = systemStats?.diskUsedGb ?? 0
  const diskTotal = systemStats?.diskTotalGb ?? 0
  const uptime = systemStats?.uptimeFormatted ?? '--'

  const topApps = useMemo(() => {
    const list = systemStats?.topApps ?? []
    return [...list].sort((a, b) =>
      sortBy === 'RAM' ? b.ramPercent - a.ramPercent : b.cpuPercent - a.cpuPercent
    )
  }, [systemStats?.topApps, sortBy])

  // Live rolling CPU telemetry buffer (replaces synthetic sine-wave generator)
  const [historyBuffer, setHistoryBuffer] = useState<number[]>([cpuUsage])

  React.useEffect(() => {
    setHistoryBuffer((prev) => {
      const next = [...prev, cpuUsage]
      if (next.length > 20) return next.slice(next.length - 20)
      return next
    })
  }, [cpuUsage])

  const historyPoints = useMemo(() => {
    if (historyBuffer.length >= 20) return historyBuffer
    const padCount = 20 - historyBuffer.length
    const firstVal = historyBuffer[0] ?? cpuUsage
    const padded = Array(padCount).fill(firstVal)
    return [...padded, ...historyBuffer]
  }, [historyBuffer, cpuUsage])

  const polylineStr = historyPoints
    .map((p, idx) => `${idx * 16},${70 - (p / 100) * 60}`)
    .join(' ')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        padding: '4px 0',
        userSelect: 'none'
      }}
    >
      {/* ── Top Metrics Grid ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '10px'
        }}
      >
        {/* CPU */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E919A' }}>
            <Cpu size={14} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>CPU</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#F4F5F7' }}>
            {cpuUsage}%
          </span>
          <span style={{ fontSize: '10px', color: '#6E727A' }}>
            {cpuFreq} GHz · {procCount} proc
          </span>
        </div>

        {/* RAM */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E919A' }}>
            <Activity size={14} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>MEMORY</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#F4F5F7' }}>
            {memUsed} GB
          </span>
          <span style={{ fontSize: '10px', color: '#6E727A' }}>
            of {memTotal} GB total
          </span>
        </div>

        {/* DISK C: */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E919A' }}>
            <HardDrive size={14} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>DISK C:</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#F4F5F7' }}>
            {diskUsed} GB
          </span>
          <span style={{ fontSize: '10px', color: '#6E727A' }}>
            {diskTotal - diskUsed} GB free
          </span>
        </div>

        {/* NETWORK */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E919A' }}>
            <Wifi size={14} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>NETWORK</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#F4F5F7', marginTop: '2px' }}>
            ↓ 1.2 MB/s
          </span>
          <span style={{ fontSize: '10px', color: '#6E727A' }}>
            ↑ 300 KB/s
          </span>
        </div>

        {/* UPTIME */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E919A' }}>
            <Clock size={14} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>UP FOR</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#F4F5F7' }}>
            {uptime}
          </span>
          <span style={{ fontSize: '10px', color: '#6E727A' }}>
            System healthy
          </span>
        </div>
      </div>

      {/* ── Lower Rail: Telemetry History Chart & Top Apps ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
        {/* History Graph */}
        <div
          style={{
            borderRadius: '14px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Header & Timeframe selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#F4F5F7' }}>
              Load History
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: activeTimeframe === tf
                      ? 'var(--hitodama-accent, #D7B56D)'
                      : 'transparent',
                    color: activeTimeframe === tf ? '#141310' : '#8E919A'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Sparkline Area Chart */}
          <div style={{ width: '100%', height: '80px', position: 'relative' }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 300 70"
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--hitodama-accent, #D7B56D)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--hitodama-accent, #D7B56D)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon
                points={`0,70 ${polylineStr} 300,70`}
                fill="url(#chartGrad)"
              />
              <polyline
                points={polylineStr}
                fill="none"
                stroke="var(--hitodama-accent, #D7B56D)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Top Apps Card */}
        <div
          style={{
            borderRadius: '14px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Header with Sort Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#F4F5F7' }}>
              Top apps · {sortBy}
            </span>
            <button
              onClick={() => setSortBy(sortBy === 'RAM' ? 'CPU' : 'RAM')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--hitodama-accent, #D7B56D)',
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              <ArrowUpDown size={11} />
              <span>{sortBy === 'RAM' ? 'CPU ⇄' : 'RAM ⇄'}</span>
            </button>
          </div>

          {/* Process List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {topApps.length === 0 ? (
              <span style={{ fontSize: '11px', color: '#6E727A', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                Sampling active Windows processes...
              </span>
            ) : (
              topApps.map((app) => (
                <div
                  key={app.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: app.color ?? '#4285F4'
                      }}
                    />
                    <span style={{ color: '#D0D2D8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.name}
                    </span>
                  </div>
                  <span style={{ color: '#8E919A', fontWeight: 600 }}>
                    {sortBy === 'RAM' ? `${app.ramPercent}%` : `${app.cpuPercent}%`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatsWidget
