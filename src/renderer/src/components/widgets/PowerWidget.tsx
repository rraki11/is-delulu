import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Lock, Moon, RotateCcw, Power } from 'lucide-react'
import { PowerAction, HITODAMA_EASING } from '../../shared'

interface PowerOption {
  id: PowerAction
  label: string
  icon: React.ElementType
}

const POWER_OPTIONS: PowerOption[] = [
  { id: 'lock', label: 'Lock', icon: Lock },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'restart', label: 'Restart', icon: RotateCcw },
  { id: 'shutdown', label: 'Shut down', icon: Power }
]

export const PowerWidget: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)

  const handleAction = async (action: PowerAction): Promise<void> => {
    setExecuting(action)
    try {
      if (window.isDelulu?.executePowerAction) {
        await window.isDelulu.executePowerAction(action)
      } else {
        console.log(`[PowerWidget] Action triggered: ${action}`)
      }
    } finally {
      setTimeout(() => setExecuting(null), 1000)
    }
  }

  return (
    <div
      role="region"
      aria-label="Power Actions"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '8px 0',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          width: '100%',
          maxWidth: '580px',
          boxSizing: 'border-box'
        }}
      >
        {POWER_OPTIONS.map((opt, idx) => {
          const IconComponent = opt.icon
          const isHovered = hoveredIndex === idx
          const isSelected = executing === opt.id

          return (
            <motion.button
              key={opt.id}
              role="button"
              aria-label={opt.label}
              onPointerEnter={() => setHoveredIndex(idx)}
              onPointerLeave={() => setHoveredIndex(null)}
              onClick={() => handleAction(opt.id)}
              style={{
                height: '92px',
                borderRadius: '16px',
                backgroundColor: isHovered
                  ? 'var(--bg-card-hover, rgba(38, 40, 46, 0.95))'
                  : 'var(--bg-card, rgba(25, 26, 30, 0.85))',
                border: isHovered
                  ? '1px solid var(--accent-border, rgba(255, 255, 255, 0.20))'
                  : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                outline: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 8px',
                color: isHovered ? 'var(--text-primary, #FFFFFF)' : 'var(--text-secondary, #D0D2D8)',
                boxShadow: isHovered
                  ? '0 6px 18px rgba(0, 0, 0, 0.40), 0 0 12px var(--wallpaper-accent-glow, var(--accent-glow))'
                  : 'var(--shadow-card, 0 2px 8px rgba(0, 0, 0, 0.25))',
                transition:
                  'background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease'
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.18, ease: HITODAMA_EASING }}
            >
              <IconComponent
                size={24}
                strokeWidth={2}
                style={{
                  color: isSelected
                    ? 'var(--wallpaper-accent-primary, var(--hitodama-accent, #D7B56D))'
                    : isHovered
                    ? 'var(--wallpaper-accent-primary, var(--hitodama-accent, #FFFFFF))'
                    : 'var(--text-secondary, #B4B7C0)',
                  transition: 'color 160ms ease'
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap'
                }}
              >
                {opt.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export default PowerWidget
