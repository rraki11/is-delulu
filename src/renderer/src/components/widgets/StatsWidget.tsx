import React, { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'

const TIMEFRAMES = ['1m', '5m', '10m', '15m', '20m'] as const
type Timeframe = (typeof TIMEFRAMES)[number]

interface CircularProgressRingProps {
  percentage: number | null
  color: string
  size?: number
  strokeWidth?: number
}

const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  percentage,
  color,
  size = 68,
  strokeWidth = 5.5
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const validPercent = percentage !== null ? Math.min(100, Math.max(0, percentage)) : 0
  const offset = circumference - (validPercent / 100) * circumference

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress stroke */}
        {percentage !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.33, 1, 0.68, 1)' }}
          />
        )}
      </svg>
      {/* Centered percentage label */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#F4F5F7',
            letterSpacing: '-0.02em'
          }}
        >
          {percentage !== null ? `${Math.round(percentage)}%` : '--'}
        </span>
      </div>
    </div>
  )
}

interface StatMetricCardProps {
  percentage: number | null
  color: string
  label: string
  subtitle: string
  chips: string[]
}

const StatMetricCard: React.FC<StatMetricCardProps> = ({
  percentage,
  color,
  label,
  subtitle,
  chips
}) => {
  return (
    <div
      style={{
        padding: '12px 8px 10px 8px',
        borderRadius: '14px',
        backgroundColor: '#161719',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        minWidth: 0,
        boxSizing: 'border-box'
      }}
    >
      <CircularProgressRing percentage={percentage} color={color} size={66} strokeWidth={5.5} />
      <span
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '0.04em',
          marginTop: '6px'
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '9.5px',
          color: '#8E919A',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: '2px',
          padding: '0 4px',
          lineHeight: '1.2'
        }}
        title={subtitle}
      >
        {subtitle}
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          marginTop: '8px',
          flexWrap: 'wrap'
        }}
      >
        {chips.map((chip, idx) => (
          <span
            key={idx}
            style={{
              padding: '2px 6px',
              borderRadius: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              fontSize: '9.5px',
              fontWeight: 500,
              color: '#C0C3CC',
              whiteSpace: 'nowrap'
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

function formatNetSpeed(kbps: number): string {
  if (kbps >= 1024) {
    return `${(kbps / 1024).toFixed(1)} MB/s`
  }
  return `${kbps} KB/s`
}

export const StatsWidget: React.FC = () => {
  const { systemStats } = useIslandStore()
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('5m')
  const [sortBy, setSortBy] = useState<'RAM' | 'CPU'>('RAM')

  // CPU
  const cpuUsage = systemStats?.cpuUsage ?? 0
  const cpuModel = systemStats?.cpuModel ?? 'Processor'
  const cpuFreq = systemStats?.cpuFreqGhz ?? 0
  const procCount = systemStats?.processCount ?? 0

  // GPU
  const gpuUsage = systemStats?.gpuUsage ?? null
  const gpuModel = systemStats?.gpuModel ?? 'GPU'
  const vramUsed = systemStats?.vramUsedGb ?? null
  const vramTotal = systemStats?.vramTotalGb ?? null

  const gpuChips = useMemo(() => {
    if (vramUsed !== null && vramTotal !== null) {
      return [`${vramUsed} / ${vramTotal} GB`]
    }
    if (vramTotal !== null) {
      return [`${vramTotal} GB`]
    }
    return ['Unavailable']
  }, [vramUsed, vramTotal])

  // RAM
  const memUsed = systemStats?.memoryUsedGb ?? 0
  const memTotal = systemStats?.memoryTotalGb ?? 0
  const memPercent = systemStats?.memoryPercent ?? (memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0)
  const memFree = Math.max(0, Math.round((memTotal - memUsed) * 10) / 10)

  // Secondary metrics
  const diskUsed = systemStats?.diskUsedGb ?? 0
  const diskTotal = systemStats?.diskTotalGb ?? 0
  const netDown = formatNetSpeed(systemStats?.netDownloadKbps ?? 0)
  const netUp = formatNetSpeed(systemStats?.netUploadKbps ?? 0)
  const uptime = systemStats?.uptimeFormatted ?? '--'

  // Top Apps
  const topApps = useMemo(() => {
    const list = systemStats?.topApps ?? []
    return [...list].sort((a, b) =>
      sortBy === 'RAM' ? b.ramPercent - a.ramPercent : b.cpuPercent - a.cpuPercent
    )
  }, [systemStats?.topApps, sortBy])

  // Rolling CPU telemetry buffer for Load History sparkline
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
        display: 'grid',
        gridTemplateColumns: '1.58fr 1fr',
        gap: '12px',
        width: '100%',
        maxWidth: '840px',
        margin: '0 auto',
        padding: '2px 0',
        userSelect: 'none'
      }}
    >
      {/* ── Left Column: Prominent Metric Cards & System Rail ──────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Row 1: Three distinct circular usage cards (CPU, GPU, RAM) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px'
          }}
        >
          {/* CPU Card */}
          <StatMetricCard
            percentage={cpuUsage}
            color="#EAB308"
            label="CPU"
            subtitle={cpuModel}
            chips={[`${cpuFreq} GHz`, `${procCount} proc`]}
          />

          {/* GPU Card */}
          <StatMetricCard
            percentage={gpuUsage}
            color="#C084FC"
            label="GPU"
            subtitle={gpuModel}
            chips={gpuChips}
          />

          {/* RAM Card */}
          <StatMetricCard
            percentage={memPercent}
            color="#4ADE80"
            label="RAM"
            subtitle={`${memUsed} / ${memTotal} GB`}
            chips={[`${memFree} GB free`]}
          />
        </div>

        {/* Row 2: Secondary horizontal cards (DISK C:, NETWORK, UP FOR) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px'
          }}
        >
          {/* DISK C: */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              backgroundColor: '#161719',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: 0
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#7E828C', letterSpacing: '0.04em' }}>
              DISK C:
            </span>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#F4F5F7',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {diskUsed} / {diskTotal} GB
            </span>
          </div>

          {/* NETWORK */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              backgroundColor: '#161719',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: 0
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#7E828C', letterSpacing: '0.04em' }}>
              NETWORK
            </span>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#F4F5F7',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              ↓ {netDown} ↑ {netUp}
            </span>
          </div>

          {/* UP FOR */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              backgroundColor: '#161719',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: 0
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#7E828C', letterSpacing: '0.04em' }}>
              UP FOR
            </span>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#F4F5F7',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {uptime}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right Column: Top Apps & Load History ──────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Top Apps Card */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '14px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          {/* Header with Sort Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#F4F5F7' }}>
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
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--hitodama-accent, #D7B56D)',
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              <ArrowUpDown size={10} />
              <span>{sortBy === 'RAM' ? 'CPU ⇄' : 'RAM ⇄'}</span>
            </button>
          </div>

          {/* Process List with letter badges and progress bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {topApps.length === 0 ? (
              <span
                style={{
                  fontSize: '10px',
                  color: '#6E727A',
                  fontStyle: 'italic',
                  padding: '8px 0',
                  textAlign: 'center'
                }}
              >
                Sampling Windows processes...
              </span>
            ) : (
              topApps.slice(0, 4).map((app) => (
                <div key={app.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10.5px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          color: '#C8CCD4',
                          fontSize: '9px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {app.name.charAt(0).toUpperCase()}
                      </span>
                      <span
                        style={{
                          color: '#D8DAE0',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={app.name}
                      >
                        {app.name}
                      </span>
                    </div>
                    <span style={{ color: '#8E919A', fontWeight: 600, fontSize: '10px' }}>
                      {sortBy === 'RAM'
                        ? app.memFormatted || `${app.ramPercent}%`
                        : `${app.cpuPercent}%`}
                    </span>
                  </div>
                  {/* Subtle horizontal progress bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '2.5px',
                      borderRadius: '2px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, sortBy === 'RAM' ? app.ramPercent : app.cpuPercent * 3)}%`,
                        height: '100%',
                        backgroundColor: app.color || '#4ADE80',
                        borderRadius: '2px',
                        transition: 'width 300ms ease'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Load History Card */}
        <div
          style={{
            padding: '8px 12px 10px 12px',
            borderRadius: '14px',
            backgroundColor: '#161719',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Header & Timeframe selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#F4F5F7' }}>
              Load History
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  style={{
                    padding: '1px 6px',
                    borderRadius: '4px',
                    border: 'none',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: activeTimeframe === tf
                      ? 'var(--hitodama-accent, #D7B56D)'
                      : 'transparent',
                    color: activeTimeframe === tf ? '#141310' : '#8E919A',
                    transition: 'background-color 150ms ease'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Sparkline Area Chart */}
          <div style={{ width: '100%', height: '46px', position: 'relative', marginTop: '2px' }}>
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
              <polygon points={`0,70 ${polylineStr} 300,70`} fill="url(#chartGrad)" />
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
      </div>
    </div>
  )
}

export default StatsWidget
