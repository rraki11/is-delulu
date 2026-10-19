import React from 'react'
import { motion, AnimatePresence } from 'motion/react'

export type EnergySaverPhase = 'idle' | 'entering' | 'active' | 'exiting'

interface EnergySaverPillProps {
  phase: EnergySaverPhase
  mode: 'on' | 'off'
  threshold?: number | null
  onClick?: () => void
}

// ── Timing & Physics ──────────────────────────────────────────────────────────
const PILL_SPRING = { type: 'spring' as const, stiffness: 340, damping: 28, mass: 0.8 }

const COMPACT_W = 205
const COMPACT_H = 33

// ── Leaf / Eco SVG Icon ───────────────────────────────────────────────────────
const LeafIcon: React.FC<{ size?: number; className?: string; off?: boolean }> = ({
  size = 14,
  off = false
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: 'block', flexShrink: 0 }}
  >
    <path
      d="M12 2C6.5 2 2 6.5 2 12C2 15.5 3.8 18.5 6.5 20.3C6.4 19.9 6.3 19.5 6.3 19C6.3 14 10.3 10 15.3 10C15.8 10 16.2 10.1 16.6 10.2C17.5 7.2 16.3 4.2 14.5 3C13.7 2.4 12.8 2 12 2Z"
      fill={off ? '#9CA3AF' : '#10B981'}
    />
    <path
      d="M21.5 5.5C21.8 6.5 22 7.7 22 9C22 14.5 17.5 19 12 19C11.5 19 11 18.9 10.5 18.8C12.3 16.7 13.5 14 13.5 11C13.5 10.5 13.4 10 13.3 9.5C14.7 9.8 16.2 10 17.7 10C19.2 10 20.5 8.1 21.5 5.5Z"
      fill={off ? '#6B7280' : '#34D399'}
      fillOpacity="0.85"
    />
  </svg>
)

export const EnergySaverPill: React.FC<EnergySaverPillProps> = ({
  phase,
  mode,
  threshold,
  onClick
}) => {
  const isVisible = phase !== 'idle'
  const isExiting = phase === 'exiting'
  const isOn = mode === 'on'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="energy-saver-pill-outer"
          aria-label={isOn ? 'Energy Saver On' : 'Energy Saver Off'}
          aria-live="polite"
          initial={{ y: -COMPACT_H - 20, opacity: 0, scale: 0.94 }}
          animate={{
            y: isExiting ? -COMPACT_H - 20 : 0,
            opacity: isExiting ? 0 : 1,
            scale: isExiting ? 0.94 : 1
          }}
          exit={{ y: -COMPACT_H - 20, opacity: 0, scale: 0.92 }}
          transition={PILL_SPRING}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            x: '-50%',
            zIndex: 200,
            transformOrigin: 'top center',
            originX: 0.5,
            originY: 0,
            pointerEvents: 'auto'
          }}
        >
          {/* Subtle eco green glow halo */}
          <div
            className="energy-saver-glow"
            style={{
              position: 'absolute',
              top: -8,
              left: -14,
              width: COMPACT_W + 28,
              height: COMPACT_H + 18,
              borderRadius: '0 0 24px 24px',
              background: isOn
                ? 'radial-gradient(ellipse 90% 70% at 50% 10%, rgba(16, 185, 129, 0.22) 0%, transparent 75%)'
                : 'radial-gradient(ellipse 90% 70% at 50% 10%, rgba(156, 163, 175, 0.15) 0%, transparent 75%)',
              pointerEvents: 'none'
            }}
          />

          {/* Pill surface */}
          <div
            className="energy-saver-pill-surface"
            onClick={onClick}
            style={{
              position: 'relative',
              width: COMPACT_W,
              height: COMPACT_H,
              borderRadius: '0 0 17px 17px',
              backgroundColor: '#000000',
              border: isOn ? '1px solid rgba(16, 185, 129, 0.22)' : '1px solid rgba(156, 163, 175, 0.18)',
              borderTop: 'none',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              boxSizing: 'border-box',
              cursor: onClick ? 'pointer' : 'default',
              userSelect: 'none',
              boxShadow: isOn
                ? '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 12px rgba(16, 185, 129, 0.15)'
                : '0 4px 16px rgba(0, 0, 0, 0.6)'
            }}
          >
            {/* Left: Leaf Icon + Energy Saver text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <LeafIcon size={14} off={!isOn} />
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  letterSpacing: '0.01em'
                }}
              >
                Energy Saver
              </span>
            </div>

            {/* Right: Status badge (On / Off) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isOn ? '#10B981' : '#9CA3AF',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase'
                }}
              >
                {isOn ? 'On' : 'Off'}
              </span>
              {isOn && threshold != null && threshold > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'rgba(16, 185, 129, 0.7)',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    padding: '1px 5px',
                    borderRadius: '4px'
                  }}
                >
                  {threshold}%
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default EnergySaverPill
