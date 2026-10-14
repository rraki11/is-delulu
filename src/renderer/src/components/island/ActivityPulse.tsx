import React from 'react'

interface ActivityPulseProps {
  isPlayingMedia?: boolean
}

export const ActivityPulse: React.FC<ActivityPulseProps> = ({ isPlayingMedia = false }) => {
  if (isPlayingMedia) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          height: '14px',
          padding: '0 2px'
        }}
      >
        <span
          style={{
            width: '2px',
            backgroundColor: 'var(--accent)',
            borderRadius: '2px',
            animation: 'audioWave 1.2s ease-in-out infinite',
            animationDelay: '0s'
          }}
        />
        <span
          style={{
            width: '2px',
            backgroundColor: 'var(--accent)',
            borderRadius: '2px',
            animation: 'audioWave 1.2s ease-in-out infinite',
            animationDelay: '0.2s'
          }}
        />
        <span
          style={{
            width: '2px',
            backgroundColor: 'var(--accent)',
            borderRadius: '2px',
            animation: 'audioWave 1.2s ease-in-out infinite',
            animationDelay: '0.4s'
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          boxShadow: '0 0 8px var(--accent)'
        }}
        className="pulse-animation"
      />
    </div>
  )
}
