import React from 'react'
import { motion } from 'motion/react'
import { DEFAULT_SHORTCUTS } from '../../shared'
import { IconBadge } from '../common/IconBadge'

interface ShortcutGridProps {
  onLaunch: (id: string, target?: string) => void
}

export const ShortcutGrid: React.FC<ShortcutGridProps> = ({ onLaunch }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px'
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}
        >
          Quick Shortcuts
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Click to launch</span>
      </div>

      <div
        className="no-drag"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px'
        }}
      >
        {DEFAULT_SHORTCUTS.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{
              y: -2,
              backgroundColor: 'rgba(25, 30, 31, 0.95)',
              borderColor: 'rgba(187, 255, 0, 0.3)'
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onLaunch(item.id, item.target)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 6px',
              backgroundColor: 'rgba(18, 21, 21, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: 'var(--radius-card)',
              cursor: 'pointer',
              gap: '6px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)'
              }}
            >
              <IconBadge name={item.icon} size={16} />
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '90%'
              }}
            >
              {item.title}
            </span>

            <span
              style={{
                fontSize: '9px',
                color: item.isInstalledMock ? 'var(--text-muted)' : 'var(--accent)',
                backgroundColor: item.isInstalledMock
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(187, 255, 0, 0.1)',
                padding: '1px 4px',
                borderRadius: '3px'
              }}
            >
              {item.isInstalledMock ? 'Mock' : 'Native'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
