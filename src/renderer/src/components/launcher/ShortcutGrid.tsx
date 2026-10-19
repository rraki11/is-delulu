import React from 'react'
import { motion } from 'motion/react'
import { DEFAULT_SHORTCUTS } from '../../shared'
import { IconBadge } from '../common/IconBadge'

interface ShortcutGridProps {
  onLaunch: (id: string, target?: string) => void
}

export const ShortcutGrid: React.FC<ShortcutGridProps> = ({ onLaunch }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
              backgroundColor: 'var(--bg-card-hover)',
              borderColor: 'var(--border-card-hover)',
              y: -1
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onLaunch(item.id, item.target)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 6px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
              gap: '6px',
              transition: 'background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast)'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                backgroundColor: 'var(--icon-container-bg)',
                boxShadow: 'var(--icon-container-shadow)',
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
                color: item.isInstalledMock ? 'var(--badge-mock-text)' : 'var(--badge-text)',
                backgroundColor: item.isInstalledMock
                  ? 'var(--badge-mock-bg)'
                  : 'var(--badge-bg)',
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
