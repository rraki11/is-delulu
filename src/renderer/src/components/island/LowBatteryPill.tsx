import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BatteryState } from '../../shared'

export type LowBatteryPhase = 'idle' | 'entering' | 'active' | 'exiting'

interface LowBatteryPillProps {
  phase: LowBatteryPhase
  percent?: number | null
  batteryState?: BatteryState | null
  onClick?: () => void
}

// ── Timing & Physics ──────────────────────────────────────────────────────────
const PILL_SPRING = { type: 'spring' as const, stiffness: 340, damping: 28, mass: 0.8 }

const COMPACT_W = 205
const COMPACT_H = 33

// ── Battery Level Indicator SVG Icon ──────────────────────────────────────────
const LowBatteryIcon: React.FC<{ percent: number }> = ({ percent }) => {
  const clamped = Math.max(4, Math.min(100, percent))
  const innerWidth = (clamped / 100) * 16 // 16px max inner width

  return (
    <svg
      width="22"
      height="12"
      viewBox="0 0 22 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Outer battery body */}
      <rect
        x="0.75"
        y="0.75"
        width="18.5"
        height="10.5"
        rx="2.75"
        stroke="#EF4444"
        strokeWidth="1.2"
        strokeOpacity="0.45"
      />
      {/* Battery positive terminal nub on right */}
      <path
        d="M20.5 4C20.5 3.72386 20.7239 3.5 21 3.5C21.2761 3.5 21.5 3.72386 21.5 4V8C21.5 8.27614 21.2761 8.5 21 8.5C20.7239 8.5 20.5 8.27614 20.5 8V4Z"
        fill="#EF4444"
        fillOpacity="0.45"
      />
      {/* Low battery red fill */}
      <rect
        x="2"
        y="2"
        width={innerWidth}
        height="8"
        rx="1.5"
        fill="url(#low-battery-gradient)"
      />
      <defs>
        <linearGradient id="low-battery-gradient" x1="2" y1="6" x2="18" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DC2626" />
          <stop offset="1" stopColor="#EF4444" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export const LowBatteryPill: React.FC<LowBatteryPillProps> = ({
  phase,
  percent,
  batteryState,
  onClick
}) => {
  const isVisible = phase !== 'idle'
  const isExiting = phase === 'exiting'
  const displayPercent = percent ?? batteryState?.percent ?? 30

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="low-battery-pill-outer"
          aria-label={`Low Battery — ${displayPercent}%`}
          aria-live="assertive"
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
          {/* Subtle red accent glow halo */}
          <div
            className="low-battery-glow"
            style={{
              position: 'absolute',
              top: -8,
              left: -14,
              width: COMPACT_W + 28,
              height: COMPACT_H + 18,
              borderRadius: '0 0 24px 24px',
              background: 'radial-gradient(ellipse 90% 70% at 50% 10%, rgba(239, 68, 68, 0.22) 0%, transparent 75%)',
              pointerEvents: 'none'
            }}
          />

          {/* Pill surface */}
          <div
            className="low-battery-pill-surface"
            onClick={onClick}
            style={{
              position: 'relative',
              width: COMPACT_W,
              height: COMPACT_H,
              borderRadius: '0 0 17px 17px',
              backgroundColor: '#000000',
              border: '1px solid rgba(239, 68, 68, 0.18)',
              borderTop: 'none',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              boxSizing: 'border-box',
              cursor: onClick ? 'pointer' : 'default',
              userSelect: 'none',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 12px rgba(239, 68, 68, 0.15)'
            }}
          >
            {/* Left: Low Battery text */}
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#FFFFFF',
                letterSpacing: '0.01em'
              }}
            >
              Low Battery
            </span>

            {/* Right: Percentage and battery indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="tabular-nums"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#EF4444',
                  letterSpacing: '0'
                }}
              >
                {displayPercent}%
              </span>
              <LowBatteryIcon percent={displayPercent} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LowBatteryPill
