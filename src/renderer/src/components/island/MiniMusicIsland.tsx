import React from 'react'
import { motion } from 'motion/react'
import { SkipBack, Play, Pause, SkipForward, Volume2 } from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { HITODAMA_EASING } from '../../shared'

export const MiniMusicIsland: React.FC = () => {
  const { mediaState } = useIslandStore()

  const isPlaying = mediaState?.isPlaying ?? false
  const title = mediaState?.title && mediaState.title !== 'No media active'
    ? mediaState.title
    : 'lofi beats to study and relax'
  const artist = mediaState?.artist && mediaState.artist !== 'Desktop Audio Idle'
    ? mediaState.artist
    : 'lofi radio'

  const durationSec = mediaState?.durationSec ?? 3735
  const positionSec = mediaState?.positionSec ?? 50

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = String(Math.floor(sec % 60)).padStart(2, '0')
    return `${m}:${s}`
  }

  const handleMediaControl = async (action: 'prev' | 'toggle' | 'next'): Promise<void> => {
    if (window.isDelulu?.controlMedia) {
      await window.isDelulu.controlMedia(action)
    }
  }

  return (
    <div
      style={{
        width: '344px',
        height: '118px',
        padding: '12px 14px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none'
      }}
    >
      {/* Top: Cover + Track Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #7B2CBF, #F72585)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}
        >
          {mediaState?.sources?.[0]?.thumbnailUrl ? (
            <img
              src={mediaState.sources[0].thumbnailUrl}
              alt="Cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Volume2 size={18} color="rgba(255, 255, 255, 0.8)" />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#F4F5F7',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: '#8E919A',
              fontWeight: 500
            }}
          >
            {artist}
          </span>
        </div>
      </div>

      {/* Middle: Scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div
          style={{
            width: '100%',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, (positionSec / (durationSec || 1)) * 100)}%`,
              backgroundColor: 'var(--hitodama-accent, #D7B56D)'
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#8E919A'
          }}
        >
          <span>{formatTime(positionSec)}</span>
          <span>{formatTime(durationSec)}</span>
        </div>
      </div>

      {/* Bottom: Playback Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px'
        }}
      >
        <motion.button
          onClick={() => handleMediaControl('prev')}
          style={{
            background: 'none',
            border: 'none',
            color: '#B4B7C0',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          whileHover={{ color: '#F4F5F7', scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
        >
          <SkipBack size={15} fill="currentColor" />
        </motion.button>

        <motion.button
          onClick={() => handleMediaControl('toggle')}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--hitodama-accent, #D7B56D)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#141310'
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          {isPlaying ? (
            <Pause size={15} fill="#141310" />
          ) : (
            <Play size={15} fill="#141310" style={{ marginLeft: '1px' }} />
          )}
        </motion.button>

        <motion.button
          onClick={() => handleMediaControl('next')}
          style={{
            background: 'none',
            border: 'none',
            color: '#B4B7C0',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          whileHover={{ color: '#F4F5F7', scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
        >
          <SkipForward size={15} fill="currentColor" />
        </motion.button>
      </div>
    </div>
  )
}

export default MiniMusicIsland
