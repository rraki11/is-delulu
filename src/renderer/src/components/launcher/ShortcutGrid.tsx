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
          className="font-display"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            fontWeight: 600,
            lineHeight: '14px',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          Quick Shortcuts
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 400,
            lineHeight: '14px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-text)'
          }}
        >
          Click to launch
        </span>
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
              backgroundColor: 'rgba(25, 30, 31, 0.95)',
              borderColor: 'var(--accent-border)'
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
              transition: 'background var(--transition-fast), border-color var(--transition-fast)'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
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
              className="font-text"
              style={{
                fontFamily: 'var(--font-text)',
                fontSize: '11px',
                fontWeight: 500,
                lineHeight: '14px',
                color: 'var(--text-primary)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '90%',
                letterSpacing: '0'
              }}
            >
              {item.title}
            </span>

            <span
              style={{
                fontSize: '9px',
                fontWeight: 500,
                lineHeight: '12px',
                letterSpacing: '0.02em',
                fontFamily: 'var(--font-text)',
                color: item.isInstalledMock ? 'var(--text-muted)' : 'var(--accent)',
                backgroundColor: item.isInstalledMock
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'var(--accent-subtle)',
                padding: '1px 5px',
                borderRadius: '4px'
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
