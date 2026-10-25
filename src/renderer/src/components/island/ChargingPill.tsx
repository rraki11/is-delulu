import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BatteryState } from '../../shared'
import { ChargingPhase } from '../../hooks/useChargingNotification'

export interface ChargingContentProps {
  phase: ChargingPhase
  batteryState: BatteryState | null
  onClick?: () => void
}

export interface ChargingPillProps {
  phase: ChargingPhase
  batteryState: BatteryState | null
  onClick?: () => void
  isDirectHandoff?: boolean
}

// ── Timing & Physics ──────────────────────────────────────────────────────────
// Restrained spring for fluid, native system feel (no bouncy overshoot)
export const PILL_SPRING = { type: 'spring' as const, stiffness: 340, damping: 28, mass: 0.8 }
export const FADE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ── Dimensions ────────────────────────────────────────────────────────────────
// Compact geometry matches collapsed island for seamless morphing
export const COMPACT_W = 190
export const COMPACT_H = 33

export const EXPANDED_W = 320
export const EXPANDED_H = 42

// ── Lightning bolt SVG ────────────────────────────────────────────────────────
export const BoltIcon: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M13 2L4.09 12.4A.75.75 0 0 0 4.75 13.5H11v8.5l8.91-10.4a.75.75 0 0 0-.66-1.1H13V2Z" />
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────
export function formatMinutes(mins: number): string {
  if (mins < 60) return `~${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

/**
 * ChargingContent: Rendered directly inside MorphingIsland's single coherent surface
 * so that charging animations flow seamlessly without a separate pill appearing.
 */
export const ChargingContent: React.FC<ChargingContentProps> = ({
  phase,
  batteryState,
  onClick
}) => {
  const progressRef = useRef<HTMLDivElement>(null)
  const isExpanded = phase === 'expanded'

  // Validate and normalize battery percentage (0 - 100)
  const rawPercent = batteryState?.percent
  let validPercent: number | null = null

  if (typeof rawPercent === 'number' && Number.isFinite(rawPercent)) {
    if (rawPercent > 0 && rawPercent <= 1) {
      // Decimal format 0.0 - 1.0 -> 0 - 100
      validPercent = Math.round(rawPercent * 100)
    } else if (rawPercent >= 0 && rawPercent <= 100) {
      validPercent = Math.round(rawPercent)
    }
  }

  // Distinguish genuine 0% from null/unreported data:
  // If validPercent is a number (including genuine 0), show `${validPercent}%`.
  // If unavailable/null, show '--%' rather than falsely reporting '0%'.
  const percentText = validPercent !== null ? `${validPercent}%` : '--%'

  // Animate progress bar fill smoothly when percent changes
  useEffect(() => {
    if (!progressRef.current) return
    if (validPercent !== null) {
      progressRef.current.style.width = `${Math.max(2, Math.min(100, validPercent))}%`
    } else {
      progressRef.current.style.width = '0%'
    }
  }, [validPercent])

  // Clamp head bubble so it stays comfortably within track borders
  const headBubbleLeft = validPercent !== null ? Math.min(95, Math.max(6, validPercent)) : 6

  return (
    <div
      className="charging-pill-surface"
      onClick={onClick}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      <AnimatePresence initial={false}>
        {!isExpanded && (
          <motion.div
            key="compact-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: FADE_EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              boxSizing: 'border-box'
            }}
          >
            {/* Left: Charging bolt icon with subtle status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="charging-icon charging-icon--compact">
                <BoltIcon size={13} />
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.02em'
                }}
              >
                Charging
              </span>
            </div>

            {/* Right: Percentage */}
            <span
              className="tabular-nums charging-percent"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0'
              }}
            >
              {percentText}
            </span>
          </motion.div>
        )}

        {isExpanded && (
          <motion.div
            key="expanded-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, delay: 0.04, ease: FADE_EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Progress bar track */}
            <div
              className="charging-bar-track"
              style={{ flex: 1, position: 'relative' }}
            >
              {/* Filled bar with smooth glow */}
              <div
                ref={progressRef}
                className="charging-bar-fill"
                style={{
                  width: `${validPercent !== null ? Math.max(2, Math.min(100, validPercent)) : 0}%`,
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />

              {/* Leading edge indicator bubble — bolt + % */}
              <div
                className="charging-bar-head"
                style={{ left: `${headBubbleLeft}%` }}
              >
                <BoltIcon size={9} />
                <span
                  className="tabular-nums"
                  style={{ fontSize: '10px', fontWeight: 600 }}
                >
                  {percentText}
                </span>
              </div>
            </div>

            {/* Estimated time remaining */}
            {batteryState?.minutesRemaining != null && batteryState.minutesRemaining > 0 && (
              <motion.span
                className="charging-time-remaining"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.2, ease: 'easeOut' }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {formatMinutes(batteryState.minutesRemaining)}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * ChargingPill: Standalone overlay wrapper (maintained for standalone notifications if invoked outside island)
 */
export const ChargingPill: React.FC<ChargingPillProps> = ({
  phase,
  batteryState,
  onClick,
  isDirectHandoff = false
}) => {
  const isVisible = phase !== 'idle'
  const isExpanded = phase === 'expanded'
  const isExiting = phase === 'exiting'
  const targetW = isExpanded ? EXPANDED_W : COMPACT_W
  const targetH = isExpanded ? EXPANDED_H : COMPACT_H

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="charging-pill-outer"
          initial={
            isDirectHandoff
              ? { y: 0, opacity: 1, scale: 1 }
              : { y: -COMPACT_H - 20, opacity: 0, scale: 0.94 }
          }
          animate={{
            y: isExiting ? -COMPACT_H - 20 : 0,
            opacity: isExiting ? 0 : 1,
            scale: isExiting ? 0.94 : 1
          }}
          exit={{ y: -COMPACT_H - 20, opacity: 0, scale: 0.92 }}
          transition={
            isDirectHandoff && !isExiting
              ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
              : PILL_SPRING
          }
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
          {/* Outer wallpaper-derived accent glow halo */}
          <motion.div
            className="charging-pill-glow"
            animate={{
              width: targetW + 36,
              height: targetH + 22
            }}
            transition={PILL_SPRING}
            style={{
              position: 'absolute',
              top: -10,
              left: -18,
              borderRadius: '0 0 28px 28px',
              pointerEvents: 'none'
            }}
          />

          {/* Pill surface */}
          <motion.div
            className="charging-pill-surface"
            onClick={onClick}
            title={onClick ? 'Click to open dashboard' : undefined}
            animate={{
              width: targetW,
              height: targetH,
              borderRadius: isExpanded ? '0 0 20px 20px' : '0 0 17px 17px'
            }}
            transition={PILL_SPRING}
            style={{
              position: 'relative',
              backgroundColor: '#000000',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
              cursor: onClick ? 'pointer' : 'default',
              userSelect: 'none'
            }}
          >
            <ChargingContent
              phase={phase}
              batteryState={batteryState}
              onClick={onClick}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ChargingPill
