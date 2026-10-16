import React from 'react'
import { Cpu, HardDrive, Clock, Monitor, Copy, Check } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'

export const SystemWidget: React.FC = () => {
  const { systemStats, setStatusMessage } = useIslandStore()
  const [copied, setCopied] = React.useState(false)

  const handleCopyDiagnostics = async (): Promise<void> => {
    if (!systemStats) return
    const text = `is-delulu Hardware Telemetry:\nOS: ${systemStats.platform} (${systemStats.arch})\nHost: ${systemStats.hostname}\nCPU: ${systemStats.cpuModel} (${systemStats.cpuUsage}%)\nMemory: ${systemStats.memoryUsedGb} GB / ${systemStats.memoryTotalGb} GB (${systemStats.memoryPercent}%)\nUptime: ${systemStats.uptimeFormatted}`

    if (window.isDelulu) {
      await window.isDelulu.copyText(text)
    } else {
      navigator.clipboard.writeText(text)
    }

    setCopied(true)
    setStatusMessage('Diagnostics copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const cpuPercent = systemStats?.cpuUsage ?? 0
  const memPercent = systemStats?.memoryPercent ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Metrics Row: CPU & RAM Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {/* CPU Card */}
        <div
          className="glass-surface"
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} color="var(--accent)" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                CPU Load
              </span>
            </div>
            <span
              className="tabular-nums font-display"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em'
              }}
            >
              {cpuPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${cpuPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent) 100%)',
                borderRadius: '9999px',
                boxShadow: '0 0 8px var(--accent-glow)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={systemStats?.cpuModel}
          >
            {systemStats?.cpuModel || 'Intel / AMD Processor'}
          </span>
        </div>

        {/* RAM Card */}
        <div
          className="glass-surface"
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <HardDrive size={14} color="var(--accent)" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Memory
              </span>
            </div>
            <span
              className="tabular-nums font-display"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em'
              }}
            >
              {memPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${memPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent) 100%)',
                borderRadius: '9999px',
                boxShadow: '0 0 8px var(--accent-glow)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {systemStats?.memoryUsedGb ?? 0} GB / {systemStats?.memoryTotalGb ?? 0} GB
          </span>
        </div>
      </div>

      {/* Hardware & OS Meta Grid */}
      <div
        className="glass-surface"
        style={{
          padding: '12px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={15} color="var(--text-secondary)" />
          <div>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>OS Environment</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {systemStats?.platform || 'Windows'} ({systemStats?.arch || 'x64'})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="var(--text-secondary)" />
          <div>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Desktop Uptime</p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {systemStats?.uptimeFormatted || '0m'}
            </p>
          </div>
        </div>
      </div>

      {/* Copy Diagnostics Button */}
      <button
        onClick={handleCopyDiagnostics}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px',
          backgroundColor: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          borderRadius: 'var(--radius-button)',
          color: 'var(--accent)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all var(--transition-fast)'
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied Diagnostics!' : 'Copy Hardware Diagnostics'}
      </button>
    </div>
  )
}
