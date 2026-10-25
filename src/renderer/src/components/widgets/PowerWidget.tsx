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
  { id: 'lock',     label: 'Lock',      icon: Lock },
  { id: 'sleep',    label: 'Sleep',     icon: Moon },
  { id: 'restart',  label: 'Restart',   icon: RotateCcw },
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
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        width: '100%',
        maxWidth: '580px',
        margin: '0 auto',
        padding: '10px 0',
        userSelect: 'none'
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
              height: '84px',
              borderRadius: '16px',
              backgroundColor: isHovered
                ? 'rgba(38, 40, 46, 0.95)'
                : 'rgba(25, 26, 30, 0.85)',
              border: isHovered
                ? '1px solid rgba(255, 255, 255, 0.16)'
                : '1px solid rgba(255, 255, 255, 0.05)',
              outline: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: isHovered ? '#FFFFFF' : '#D0D2D8',
              boxShadow: isHovered
                ? '0 6px 16px rgba(0, 0, 0, 0.35)'
                : 'none',
              transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.18, ease: HITODAMA_EASING }}
          >
            <IconComponent
              size={22}
              strokeWidth={2}
              style={{
                color: isSelected
                  ? 'var(--hitodama-accent, #D7B56D)'
                  : isHovered
                  ? '#FFFFFF'
                  : '#B4B7C0'
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}
            >
              {opt.label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

export default PowerWidget
