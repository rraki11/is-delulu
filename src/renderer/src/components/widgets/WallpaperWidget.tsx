import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Folder,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react'
import { WallpaperItem, HITODAMA_EASING } from '../../shared'

interface WallpaperCardProps {
  wall: WallpaperItem
  offset: number
  index: number
  isCenter: boolean
  isApplied: boolean
  isApplying: boolean
  onSelect: () => void
}

const WallpaperCard: React.FC<WallpaperCardProps> = React.memo(
  ({ wall, offset, index, isCenter, isApplied, isApplying, onSelect }) => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const absOffset = Math.abs(offset)
    // Smoothstep curve: d = t * t * (3 - 2t)
    const norm = Math.min(absOffset, 1)
    const d = norm * norm * (3 - 2 * norm)

    // Hitodama 3D card geometry
    const cardWidth = Math.round(330 - 264 * d)
    const cardHeight = Math.round(186 - 14 * d)
    const p = 211.47 * d + 78 * Math.max(0, absOffset - 1)
    const posX = offset < 0 ? -p : p
    const opacity = Math.max(0.12, 1 - 0.22 * norm - 0.11 * Math.max(0, absOffset - 1))
    const zIndex = 20 - Math.round(2 * absOffset)

    // Fallback gradient colors if image fails or path is mock
    const fallbackGradients = [
      'linear-gradient(135deg, #1A365D, #2B6CB0)',
      'linear-gradient(135deg, #744210, #D69E2E)',
      'linear-gradient(135deg, #2D3748, #4A5568)',
      'linear-gradient(135deg, #234E52, #319795)',
      'linear-gradient(135deg, #44337A, #805AD5)'
    ]
    const fallbackBg = fallbackGradients[Math.abs(index) % fallbackGradients.length]

    const imageSrc = useMemo(() => {
      if (!wall.filePath) return ''
      return `wallpaper-thumb://thumb?file=${encodeURIComponent(wall.filePath)}`
    }, [wall.filePath])

    return (
      <motion.div
        onClick={onSelect}
        style={{
          position: 'absolute',
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          x: posX,
          zIndex,
          opacity,
          cursor: 'pointer',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isCenter
            ? isApplied
              ? '0 12px 32px rgba(0, 0, 0, 0.65), 0 0 16px rgba(215, 181, 109, 0.25)'
              : '0 12px 32px rgba(0, 0, 0, 0.65)'
            : '0 4px 14px rgba(0, 0, 0, 0.35)',
          border: isCenter
            ? isApplied
              ? '2px solid var(--hitodama-accent, #D7B56D)'
              : '1.5px solid rgba(255, 255, 255, 0.28)'
            : '1px solid rgba(255, 255, 255, 0.08)',
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
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#161719',
            backgroundImage: fallbackBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Real Thumbnail Image */}
          {imageSrc && !imageError ? (
            <img
              src={imageSrc}
              alt={wall.name || wall.fileName}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.2s ease',
                display: 'block'
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                console.warn('[WallpaperWidget] Failed to load thumbnail for:', wall.filePath)
                setImageError(true)
              }}
            />
          ) : null}

          {/* Loading shimmer if image not yet loaded */}
          {!imageLoaded && !imageError && wall.filePath && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(20, 22, 26, 0.65)'
              }}
            >
              <Loader2 size={18} className="spin-animation" style={{ color: '#8E919A' }} />
            </div>
          )}

          {/* Missing / corrupted image placeholder */}
          {(imageError || !wall.filePath) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px',
                textAlign: 'center'
              }}
            >
              <ImageIcon size={20} style={{ color: '#A0A3AD', opacity: 0.8 }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#E4E6EB',
                  maxWidth: '90%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {wall.name || wall.fileName || 'Wallpaper'}
              </span>
            </div>
          )}

          {/* Active desktop indicator badge */}
          {isApplied && isCenter && !isApplying && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: 'rgba(18, 20, 24, 0.85)',
                backdropFilter: 'blur(6px)',
                border: '1px solid var(--hitodama-accent, #D7B56D)',
                borderRadius: '9999px',
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--hitodama-accent, #D7B56D)',
                fontSize: '10px',
                fontWeight: 600,
                zIndex: 10,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
              }}
            >
              <Check size={10} />
              <span>Active</span>
            </div>
          )}

          {/* Applying transition overlay */}
          {isApplying && isCenter && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--hitodama-accent, #D7B56D)',
                zIndex: 10
              }}
            >
              <Loader2 size={22} className="spin-animation" />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>Applying...</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }
)

type FeedbackStatus = 'idle' | 'applying' | 'success' | 'error'

interface FeedbackState {
  status: FeedbackStatus
  message?: string
  targetPath?: string
}

export const WallpaperWidget: React.FC = () => {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([])
  const [activeCenter, setActiveCenter] = useState(0)
  const [appliedWallpaperPath, setAppliedWallpaperPath] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle' })
  const [activeFolderFilter, setActiveFolderFilter] = useState<'recent' | 'custom'>('recent')
  const [loading, setLoading] = useState(true)
  const [folderPath, setFolderPath] = useState<string | null>(null)

  // Asynchronous guards & drag tracking refs
  const isApplyingRef = useRef(false)
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const dragStartXRef = useRef(0)
  const wheelAccumulatorRef = useRef(0)
  const lastWheelTimeRef = useRef(0)

  // Load saved wallpaper images from backend
  const loadWallpapers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      if (window.isDelulu?.getWallpaperImages) {
        const res = await window.isDelulu.getWallpaperImages()
        if (res.success && res.images && res.images.length > 0) {
          setWallpapers(res.images)
          setFolderPath(res.folderPath)
          setActiveCenter(0)
        }
      }

      // Check current desktop wallpaper path
      if (window.isDelulu?.getCurrentDesktopWallpaper) {
        const currentPath = await window.isDelulu.getCurrentDesktopWallpaper()
        if (currentPath) {
          setAppliedWallpaperPath(currentPath)
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
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [loadWallpapers])

  const handleSelectFolder = async (): Promise<void> => {
    if (window.isDelulu?.selectWallpaperFolder) {
      const res = await window.isDelulu.selectWallpaperFolder()
      if (!res.canceled && res.images && res.images.length > 0) {
        setWallpapers(res.images)
        setFolderPath(res.folderPath || null)
        setActiveFolderFilter('custom')
        setActiveCenter(0)
      }
    }
  }

  // Core apply wallpaper function reusing existing backend pipeline
  const handleApplyWallpaper = useCallback(
    async (item: WallpaperItem, _index: number): Promise<void> => {
      if (!item || !item.filePath) return

      // Prevent concurrent duplicate requests
      if (isApplyingRef.current) return
      isApplyingRef.current = true

      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }

      setFeedback({
        status: 'applying',
        targetPath: item.filePath,
        message: 'Applying wallpaper...'
      })

      try {
        if (window.isDelulu?.applyDesktopWallpaper) {
          const result = await window.isDelulu.applyDesktopWallpaper(item.filePath)
          if (result && result.success) {
            setAppliedWallpaperPath(item.filePath)

            // Reorder gallery: move applied wallpaper to the first position (index 0)
            setWallpapers((prev) => {
              const idx = prev.findIndex((w) => w.filePath === item.filePath)
              if (idx > 0) {
                const selected = prev[idx]
                const remaining = prev.filter((_, i) => i !== idx)
                return [selected, ...remaining]
              }
              return prev
            })
            setActiveCenter(0)

            setFeedback({
              status: 'success',
              targetPath: item.filePath,
              message: 'Wallpaper applied'
            })

            // Auto-dismiss success notification after 3 seconds
            feedbackTimerRef.current = setTimeout(() => {
              setFeedback((prev) => (prev.status === 'success' ? { status: 'idle' } : prev))
            }, 3000)
          } else {
            setFeedback({
              status: 'error',
              targetPath: item.filePath,
              message: result?.message || 'Failed to apply wallpaper'
            })
          }
        }
      } catch (err) {
        console.error('[WallpaperWidget] Error applying desktop wallpaper:', err)
        setFeedback({
          status: 'error',
          targetPath: item.filePath,
          message: 'An unexpected error occurred while applying wallpaper'
        })
      } finally {
        isApplyingRef.current = false
      }
    },
    []
  )

  // Fallback stock gallery when no wallpapers are in folder
  const displayWallpapers = useMemo(() => {
    if (wallpapers.length > 0) return wallpapers
    return [
      { id: 'w1', name: 'Terrace Sunset', fileName: 'w1.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w2', name: 'Autumn Path', fileName: 'w2.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w3', name: 'Misty Mountains', fileName: 'w3.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w4', name: 'Alpine Lake', fileName: 'w4.jpg', filePath: '', fileSize: 0, modifiedTime: 0 },
      { id: 'w5', name: 'Neon Twilight', fileName: 'w5.jpg', filePath: '', fileSize: 0, modifiedTime: 0 }
    ]
  }, [wallpapers])

  const count = displayWallpapers.length

  // Carousel positioning step (strictly scrolls carousel without applying wallpaper)
  const handleStep = useCallback(
    (direction: 1 | -1) => {
      setActiveCenter((prev) => {
        const next = prev + direction
        if (next < 0) return count - 1
        if (next >= count) return 0
        return next
      })
    },
    [count]
  )

  // Click on a wallpaper card (applies immediately on click)
  const handleCardClick = (wall: WallpaperItem, index: number, offset: number): void => {
    // If pointer gesture was dragging/swiping, suppress accidental click
    if (hasDraggedRef.current) return

    // Prevent duplicate triggers if an application is already in flight
    if (isApplyingRef.current) return

    // If card is already applied and clicked in center, show confirmation without redundant reload
    if (wall.filePath && wall.filePath === appliedWallpaperPath && offset === 0) {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      setFeedback({
        status: 'success',
        targetPath: wall.filePath,
        message: 'Wallpaper already active'
      })
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback((prev) => (prev.status === 'success' ? { status: 'idle' } : prev))
      }, 2000)
      return
    }

    // Center the card visually
    if (offset !== 0) {
      setActiveCenter(index)
    }

    // Immediately apply as Windows desktop wallpaper
    handleApplyWallpaper(wall, index)
  }

  // Horizontal mouse-wheel and trackpad scrolling (does NOT apply wallpaper)
  const handleWheel = (e: React.WheelEvent): void => {
    e.stopPropagation()
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(delta) < 2) return

    wheelAccumulatorRef.current += delta
    const now = Date.now()

    if (Math.abs(wheelAccumulatorRef.current) >= 35 || now - lastWheelTimeRef.current > 180) {
      const step = wheelAccumulatorRef.current > 0 ? 1 : -1
      wheelAccumulatorRef.current = 0
      lastWheelTimeRef.current = now
      handleStep(step)
    }
  }

  // Pointer drag horizontal swipe
  const handlePointerDown = (e: React.PointerEvent): void => {
    isDraggingRef.current = true
    hasDraggedRef.current = false
    dragStartXRef.current = e.clientX
  }

  const handlePointerMove = (e: React.PointerEvent): void => {
    if (!isDraggingRef.current) return
    const deltaX = e.clientX - dragStartXRef.current
    if (Math.abs(deltaX) > 8) {
      hasDraggedRef.current = true
    }
    if (Math.abs(deltaX) > 40) {
      handleStep(deltaX > 0 ? -1 : 1)
      dragStartXRef.current = e.clientX
    }
  }

  const handlePointerUp = (): void => {
    isDraggingRef.current = false
    // Delay resetting hasDraggedRef slightly so any immediate onClick is suppressed
    setTimeout(() => {
      hasDraggedRef.current = false
    }, 60)
  }

  // Keyboard navigation: Arrow keys scroll; Enter applies centered wallpaper
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      handleStep(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      handleStep(1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const curr = displayWallpapers[activeCenter]
      if (curr) handleApplyWallpaper(curr, activeCenter)
    }
  }

  // Interactive scrubber click (strictly jumps carousel without applying)
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    const targetIndex = Math.min(count - 1, Math.floor(percent * count))
    setActiveCenter(targetIndex)
  }

  // Virtualized indices: only render cards within Â±5 offsets of activeCenter (11 cards max)
  const visibleCards = useMemo(() => {
    if (count === 0) return []
    const cards: { wall: WallpaperItem; offset: number; index: number }[] = []
    const range = Math.min(5, Math.floor((count - 1) / 2))

    for (let offset = -range; offset <= range; offset++) {
      let index = (activeCenter + offset) % count
      if (index < 0) index += count
      const wall = displayWallpapers[index]
      if (wall) {
        cards.push({ wall, offset, index })
      }
    }
    return cards
  }, [activeCenter, count, displayWallpapers])

  const activeWall = displayWallpapers[activeCenter]

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
        padding: '0 8px',
        boxSizing: 'border-box',
        outline: 'none',
        userSelect: 'none'
      }}
    >
      {/* â”€â”€ Top Header Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          height: '28px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              setActiveFolderFilter('recent')
              loadWallpapers()
            }}
            style={{
              padding: '3px 12px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor:
                activeFolderFilter === 'recent'
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
              padding: '3px 12px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor:
                activeFolderFilter === 'custom'
                  ? 'var(--hitodama-accent, #D7B56D)'
                  : 'rgba(255, 255, 255, 0.08)',
              color: activeFolderFilter === 'custom' ? '#141310' : '#8E919A',
              transition: 'background-color 160ms ease, color 160ms ease'
            }}
          >
            My folder
          </button>
          <span style={{ fontSize: '11px', color: '#6E727A', fontWeight: 500, marginLeft: '4px' }}>
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
            alignItems: 'center',
            borderRadius: '6px',
            transition: 'color 140ms ease'
          }}
          title={folderPath ? `Current: ${folderPath}` : 'Select Wallpaper Folder'}
        >
          <Folder size={15} />
        </button>
      </div>

      {/* â”€â”€ 3D Perspective Carousel Track â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          height: '205px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1000px',
          overflow: 'visible',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab'
        }}
      >
        {/* Left Chevron Navigation Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleStep(-1)
          }}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 30,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(18, 20, 24, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#F4F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'background-color 150ms ease, transform 150ms ease'
          }}
          title="Previous Wallpaper"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Right Chevron Navigation Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleStep(1)
          }}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 30,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(18, 20, 24, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#F4F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'background-color 150ms ease, transform 150ms ease'
          }}
          title="Next Wallpaper"
        >
          <ChevronRight size={16} />
        </button>

        {/* Virtualized Cards List */}
        {visibleCards.map(({ wall, offset, index }) => (
          <WallpaperCard
            key={wall.filePath || `${wall.id}-${index}`}
            wall={wall}
            offset={offset}
            index={index}
            isCenter={offset === 0}
            isApplied={!!wall.filePath && wall.filePath === appliedWallpaperPath}
            isApplying={feedback.status === 'applying' && feedback.targetPath === wall.filePath}
            onSelect={() => handleCardClick(wall, index, offset)}
          />
        ))}
      </div>

      {/* â”€â”€ Bottom Controls & Scrubber â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginTop: '10px',
          width: '100%'
        }}
      >
        {/* Interactive Scrubber Track & Counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: '560px'
          }}
        >
          <div
            onClick={handleScrubberClick}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            title="Click to jump to image"
          >
            <div
              style={{
                height: '100%',
                width: `${count > 0 ? Math.round(((activeCenter + 1) / count) * 100) : 0}%`,
                backgroundColor: 'var(--hitodama-accent, #D7B56D)',
                borderRadius: '2px',
                transition: 'width 140ms ease'
              }}
            />
          </div>

          <span
            className="tabular-nums font-mono"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#8E919A',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
              minWidth: '55px',
              textAlign: 'right'
            }}
          >
            {count > 0 ? activeCenter + 1 : 0} of {count}
          </span>
        </div>

        {/* Wallpaper Title & Dynamic Status Feedback */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '560px',
            height: '24px'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#A0A3AD',
              maxWidth: '340px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500
            }}
            title={activeWall?.name || activeWall?.fileName || ''}
          >
            {activeWall?.name || activeWall?.fileName || 'Selected Wallpaper'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AnimatePresence mode="wait">
              {feedback.status === 'applying' && (
                <motion.div
                  key="applying"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: 'var(--hitodama-accent, #D7B56D)',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  <Loader2 size={12} className="spin-animation" />
                  <span>Applying wallpaper...</span>
                </motion.div>
              )}

              {feedback.status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#4ADE80',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  <Check size={13} />
                  <span>{feedback.message || 'Wallpaper applied'}</span>
                </motion.div>
              )}

              {feedback.status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#F87171',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  <AlertCircle size={13} />
                  <span>{feedback.message || 'Failed to apply'}</span>
                  <button
                    onClick={() => {
                      if (activeWall) handleApplyWallpaper(activeWall, activeCenter)
                    }}
                    style={{
                      background: 'rgba(248, 113, 113, 0.15)',
                      border: '1px solid rgba(248, 113, 113, 0.3)',
                      color: '#FCA5A5',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      marginLeft: '4px',
                      fontWeight: 600
                    }}
                  >
                    Retry
                  </button>
                </motion.div>
              )}

              {feedback.status === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color:
                      activeWall?.filePath && activeWall.filePath === appliedWallpaperPath
                        ? 'var(--hitodama-accent, #D7B56D)'
                        : '#6E727A'
                  }}
                >
                  {activeWall?.filePath && activeWall.filePath === appliedWallpaperPath ? (
                    <>
                      <Check size={11} />
                      <span style={{ fontWeight: 500 }}>Active wallpaper</span>
                    </>
                  ) : (
                    <span>Click image to apply</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WallpaperWidget
