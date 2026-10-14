import React from 'react'

interface StatusDotProps {
  status?: 'active' | 'idle' | 'warning'
  pulse?: boolean
  size?: number
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status = 'active',
  pulse = true,
  size = 7
}) => {
  const getColor = (): string => {
    switch (status) {
      case 'active':
        return 'var(--accent)'
      case 'idle':
        return 'var(--accent-muted)'
      case 'warning':
        return '#FFB020'
    }
  }

  const color = getColor()

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size
      }}
    >
      {pulse && (
        <span
          style={{
            position: 'absolute',
            width: size * 2.2,
            height: size * 2.2,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.25,
            animation: 'pulseGlow 2s infinite'
          }}
        />
      )}
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}`
        }}
      />
    </div>
  )
}
