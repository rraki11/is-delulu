import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import { Folder, Check } from 'lucide-react'
import { WallpaperItem, HITODAMA_EASING } from '../../shared'

export const WallpaperWidget: React.FC = () => {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([])
  const [activeCenter, setActiveCenter] = useState(2)
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null)
  const [activeFolderFilter, setActiveFolderFilter] = useState<'recent' | 'custom'>('recent')
  const [loading, setLoading] = useState(true)

  // Load saved wallpaper images from backend
  const loadWallpapers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      if (window.isDelulu?.getWallpaperImages) {
        const res = await window.isDelulu.getWallpaperImages()
        if (res.success && res.images.length > 0) {
          setWallpapers(res.images)
          setActiveCenter(Math.min(2, Math.floor(res.images.length / 2)))
        }
      }
    } catch (err) {
      console.error('[WallpaperWidget] Error loading wallpapers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWallpapers()
  }, [loadWallpapers])

  const handleSelectFolder = async (): Promise<void> => {
    if (window.isDelulu?.selectWallpaperFolder) {
      const res = await window.isDelulu.selectWallpaperFolder()
      if (!res.canceled && res.images) {
        setWallpapers(res.images)
        setActiveFolderFilter('custom')
        setActiveCenter(0)
      }
    }
  }

  const handleApplyWallpaper = async (item: WallpaperItem, index: number): Promise<void> => {
    if (index !== activeCenter) {
      setActiveCenter(index)
      return
    }

    setApplyingIndex(index)
    try {
      if (window.isDelulu?.applyDesktopWallpaper) {
        await window.isDelulu.applyDesktopWallpaper(item.filePath)
      }
    } finally {
      setTimeout(() => setApplyingIndex(null), 1200)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActiveCenter((prev) => (prev - 1 + wallpapers.length) % (wallpapers.length || 1))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActiveCenter((prev) => (prev + 1) % (wallpapers.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const curr = wallpapers[activeCenter]
      if (curr) handleApplyWallpaper(curr, activeCenter)
    }
  }

  // Fallback stock gallery when no wallpapers are in folder
  const displayWallpapers = useMemo(() => {
    if (wallpapers.length >= 3) return wallpapers
    return [
      { id: 'w1', name: 'Terrace Sunset', fileName: 'w1.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w2', name: 'Autumn Path', fileName: 'w2.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w3', name: 'Misty Mountains', fileName: 'w3.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w4', name: 'Alpine Lake', fileName: 'w4.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w5', name: 'Neon Twilight', fileName: 'w5.jpg', filePath: '', fileSize: 0, modifiedTime: 0 }
    ]
  }, [wallpapers])

  const count = displayWallpapers.length

  return (
    <div
      role="region"
      aria-label="Wallpaper Carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 12px',
        boxSizing: 'border-box',
        outline: 'none',
        userSelect: 'none'
      }}
    >
      {/* ── Header Controls ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveFolderFilter('recent')}
            style={{
              padding: '4px 14px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activeFolderFilter === 'recent'
                ? 'var(--hitodama-accent, #D7B56D)'
                : 'rgba(255, 255, 255, 0.08)',
              color: activeFolderFilter === 'recent' ? '#141310' : '#8E919A',
              transition: 'background-color 160ms ease, color 160ms ease'
            }}
          >
            Recent
          </button>
          <button
            onClick={handleSelectFolder}
            style={{
              padding: '4px 14px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activeFolderFilter === 'custom'
                ? 'var(--hitodama-accent, #D7B56D)'
                : 'rgba(255, 255, 255, 0.08)',
              color: activeFolderFilter === 'custom' ? '#141310' : '#8E919A',
              transition: 'background-color 160ms ease, color 160ms ease'
            }}
          >
            My folder
          </button>
          <span style={{ fontSize: '11px', color: '#6E727A', fontWeight: 500, marginLeft: '6px' }}>
            {count} pictures
          </span>
        </div>

        <button
          onClick={handleSelectFolder}
          style={{
            background: 'none',
            border: 'none',
            color: '#8E919A',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Open Folder"
        >
          <Folder size={16} />
        </button>
      </div>

      {/* ── 3D Perspective Carousel Track ───────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '210px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1000px',
          overflow: 'visible'
        }}
      >
        {displayWallpapers.map((wall, i) => {
          // Circular relative offset
          let offset = i - activeCenter
          while (offset > count / 2) offset -= count
          while (offset < -count / 2) offset += count

          const absOffset = Math.abs(offset)
          // Smoothstep curve: d = t * t * (3 - 2t)
          const norm = Math.min(absOffset, 1)
          const d = norm * norm * (3 - 2 * norm)

          // Card dimensions from ey()
          const cardWidth = 330 - 264 * d
          const cardHeight = 186 - 14 * d
          const p = 211.47 * d + 78 * Math.max(0, absOffset - 1)
          const posX = offset < 0 ? -p : p
          const opacity = Math.max(0.1, 1 - 0.22 * norm - 0.11 * Math.max(0, absOffset - 1))
          const zIndex = 10 - Math.round(2 * absOffset)
          const isCenter = offset === 0
          const isApplying = applyingIndex === i

          // Gradients fallback for preview
          const gradients = [
            'linear-gradient(135deg, #1A365D, #2B6CB0)',
            'linear-gradient(135deg, #744210, #D69E2E)',
            'linear-gradient(135deg, #2D3748, #4A5568)',
            'linear-gradient(135deg, #234E52, #319795)',
            'linear-gradient(135deg, #44337A, #805AD5)'
          ]

          return (
            <motion.div
              key={wall.id || i}
              onClick={() => handleApplyWallpaper(wall, i)}
              style={{
                position: 'absolute',
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                x: posX,
                zIndex,
                opacity,
                cursor: isCenter ? 'default' : 'pointer',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: isCenter
                  ? '0 12px 32px rgba(0, 0, 0, 0.65)'
                  : '0 4px 12px rgba(0, 0, 0, 0.35)',
                border: isCenter
                  ? '1.5px solid rgba(255, 255, 255, 0.24)'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                transformOrigin: 'center center'
              }}
              animate={{
                width: cardWidth,
                height: cardHeight,
                x: posX,
                opacity,
                zIndex
              }}
              transition={{ duration: 0.26, ease: HITODAMA_EASING }}
            >
              {/* Wallpaper Image Thumbnail */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: gradients[i % gradients.length],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {wall.filePath ? (
                  <img
                    src={`atom://${wall.filePath}`}
                    alt={wall.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      // Fallback gradient if file path fails to load
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                ) : null}

                {/* Applying / Selected Indicator */}
                {isApplying && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      color: 'var(--hitodama-accent, #D7B56D)'
                    }}
                  >
                    <Check size={28} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Applied</span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default WallpaperWidget
