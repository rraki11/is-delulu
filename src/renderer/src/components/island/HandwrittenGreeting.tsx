import React, { useEffect, useRef, useState } from 'react'
import greetingPathsData from './greetingPaths.json'

interface StrokeData {
  d: string
  len: number
  start: number
  end: number
}

interface GreetingData {
  str: string
  viewBox: string
  width: number
  height: number
  strokes: StrokeData[]
}

const GREETING_MAP: Record<string, GreetingData> = greetingPathsData as Record<string, GreetingData>

export interface HandwrittenGreetingProps {
  greeting: string
  isWriting: boolean
  isHolding?: boolean
}

export function getWritingDuration(greeting: string): number {
  if (greeting === 'hello') {
    return 2200 // 2.2s allows "hello" to write out fully and finish slowly so the handwriting is felt
  }
  return 1400 // 1.4s for "hi"
}

export const HANDWRITING_DURATION_MS = 2200

// Natural handwriting easing with steady letter pacing and an expressive, slow finish
function easeWriting(t: number, greeting: string): number {
  const clamped = Math.min(Math.max(t, 0), 1)
  if (greeting === 'hello') {
    // For "hello", gentle onset, steady letter flow, and a distinctly slow finish on the final 'o' and tail
    return Math.pow(Math.sin((clamped * Math.PI) / 2), 1.35)
  }
  return Math.pow(Math.sin((clamped * Math.PI) / 2), 1.25)
}

export const HandwrittenGreeting: React.FC<HandwrittenGreetingProps> = ({
  greeting,
  isWriting,
  isHolding = false
}) => {
  const data = GREETING_MAP[greeting]
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [progress, setProgress] = useState<number>(() =>
    prefersReducedMotion ? 1 : 0
  )
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(1)
      return
    }

    if (isHolding) {
      // Keep completed strokes fully drawn during hold and fade-out
      setProgress(1)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      return
    }

    if (!isWriting) {
      setProgress(0)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      return
    }

    // Animate stroke writing smoothly with tailored duration and slow finish
    const duration = getWritingDuration(greeting)
    setProgress(0)
    startTimeRef.current = null

    const step = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now
      }
      const elapsed = now - startTimeRef.current
      const rawProgress = Math.min(elapsed / duration, 1)
      const easedProgress = easeWriting(rawProgress, greeting)

      setProgress(easedProgress)

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        setProgress(1)
        animFrameRef.current = null
      }
    }

    animFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [isWriting, isHolding, greeting, prefersReducedMotion])

  // Fallback to stylized font if greeting is not in predefined path list
  if (!data) {
    return (
      <span
        className="handwriting-reveal-text"
        style={{
          fontFamily: "'Caveat', cursive, 'SF Pro Display', system-ui, sans-serif",
          fontSize: '22px',
          fontWeight: 500,
          color: 'rgba(244, 245, 240, 0.95)',
          letterSpacing: '0.01em',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          maxWidth: '180px',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {greeting}
      </span>
    )
  }

  return (
    <svg
      className="handwriting-reveal-svg"
      data-greeting={greeting}
      viewBox={data.viewBox}
      aria-label={greeting}
      role="img"
      style={{
        height: '29px',
        maxWidth: '180px',
        width: 'auto',
        overflow: 'visible',
        display: 'block'
      }}
    >
      {data.strokes.map((stroke, index) => {
        // Calculate stroke offset based on global normalized progress
        let offset = stroke.len
        let isVisible = false

        if (progress >= stroke.end) {
          offset = 0
          isVisible = true
        } else if (progress > stroke.start) {
          const localT = (progress - stroke.start) / (stroke.end - stroke.start)
          offset = Math.max(0, stroke.len * (1 - localT))
          isVisible = true
        }

        return (
          <path
            key={index}
            d={stroke.d}
            fill="none"
            stroke="rgba(244, 245, 240, 0.95)"
            strokeWidth={40}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={stroke.len}
            strokeDashoffset={offset}
            style={{
              visibility: isVisible ? 'visible' : 'hidden',
              transition: 'none'
            }}
          />
        )
      })}
    </svg>
  )
}
