import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'

interface IslandPillProps {
  onExpand: () => void
}

export const IslandPill: React.FC<IslandPillProps> = ({ onExpand }) => {
  const { preferences } = useIslandStore()
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date()
      const is12h = preferences?.clockFormat === '12h'
      setTime(
        now.toLocaleTimeString([], {
          hour: is12h ? 'numeric' : '2-digit',
          minute: '2-digit',
          hour12: is12h
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [preferences?.clockFormat])

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onExpand()
        }
      }}
      initial={{ y: -34, opacity: 0, scale: 1 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -34, opacity: 0, scale: 1 }}
      whileHover={{
        scale: 1.035,
        y: 0,
        transition: { duration: 0.16, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      title="Click to expand"
      style={{
        position: 'absolute',
        top: 0,
        transformOrigin: 'top center',
        originX: 0.5,
        originY: 0,
        width: '184px',
        height: '32px',
        backgroundColor: 'var(--bg-pill)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderTop: 'none',
        borderRadius: 'var(--radius-pill)',
        boxShadow: 'var(--shadow-pill)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
        padding: '0 16px',
        boxSizing: 'border-box'
      }}
    >
      {/* Minimal Digital Clock */}
      <span
        className="tabular-nums"
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#F4F5F0',
          letterSpacing: '0.02em',
          lineHeight: 1
        }}
      >
        {time}
      </span>
    </motion.div>
  )
}
export default IslandPill
