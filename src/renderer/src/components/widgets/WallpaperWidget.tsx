import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Wallpaper,
  FolderOpen,
  CheckCircle2,
  Monitor,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { WallpaperItem } from '../../shared'
import { useIslandStore } from '../../store/useIslandStore'

interface WallpaperCardProps {
  wallpaper: WallpaperItem
  isSelected: boolean
  isCurrentDesktop: boolean
  onClick: () => void
}

const WallpaperCard: React.FC<WallpaperCardProps> = ({
  wallpaper,
  isSelected,
  isCurrentDesktop,
  onClick
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    setIsLoading(true)
    setHasError(false)

    if (window.isDelulu?.getWallpaperThumbnail) {
      window.isDelulu
        .getWallpaperThumbnail(wallpaper.filePath)
        .then((res) => {
          if (!isMountedRef.current) return
          if (res?.dataUrl) {
            setThumbUrl(res.dataUrl)
          } else {
            setHasError(true)
          }
        })
        .catch(() => {
          if (isMountedRef.current) setHasError(true)
        })
        .finally(() => {
          if (isMountedRef.current) setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }

    return () => {
      isMountedRef.current = false
    }
  }, [wallpaper.filePath])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="no-drag"
      style={{
        flex: '0 0 204px',
        width: '204px',
        height: '130px',
        position: 'relative',
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        backgroundColor: 'var(--bg-card)',
        border: isSelected
          ? '2px solid var(--accent)'
          : isCurrentDesktop
          ? '1.5px solid var(--accent-border)'
          : '1px solid var(--border-subtle)',
        boxShadow: isSelected
          ? '0 0 0 1px var(--accent), 0 8px 24px var(--accent-glow)'
          : '0 2px 8px rgba(0, 0, 0, 0.25)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        userSelect: 'none'
      }}
    >
      {/* Thumbnail or placeholder */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={wallpaper.name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : isLoading ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <Loader2
              size={18}
              className="animate-spin"
              style={{ color: 'var(--text-muted)', opacity: 0.7 }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <ImageIcon size={22} color="var(--text-muted)" />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {hasError ? 'Preview unavailable' : 'No preview'}
            </span>
          </div>
        )}

        {/* Ambient Bottom Gradient Overlay for Label Readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.85) 100%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Badges */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none'
          }}
        >
          {isCurrentDesktop ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent)',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.02em'
              }}
            >
              <Monitor size={10} />
              <span>Active</span>
            </div>
          ) : (
            <div />
          )}

          {isSelected && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                color: '#101112'
              }}
            >
              <Check size={12} strokeWidth={3} />
            </motion.div>
          )}
        </div>

        {/* Bottom Title & Details */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span
            className="font-text"
            title={wallpaper.name}
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {wallpaper.name}
          </span>
          <span
            style={{
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.65)',
              flexShrink: 0,
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {formatFileSize(wallpaper.fileSize)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export const WallpaperWidget: React.FC = () => {
  const { preferences, setPreferences, setStatusMessage } = useIslandStore()

  const [folderPath, setFolderPath] = useState<string | null>(
    preferences?.wallpaperFolderPath || null
  )
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([])
  const [selectedWallpaper, setSelectedWallpaper] = useState<WallpaperItem | null>(null)
  const [activeDesktopPath, setActiveDesktopPath] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // ── Sync Active Desktop Wallpaper ───────────────────────────────────────────
  const syncCurrentDesktop = useCallback(async () => {
    if (!window.isDelulu?.getCurrentDesktopWallpaper) return
    try {
      const current = await window.isDelulu.getCurrentDesktopWallpaper()
      setActiveDesktopPath(current)
    } catch (err) {
      console.warn('[WallpaperWidget] Failed to get desktop wallpaper:', err)
    }
  }, [])

  // ── Load Wallpapers from Folder ─────────────────────────────────────────────
  const loadWallpapers = useCallback(
    async (path?: string) => {
      if (!window.isDelulu?.getWallpaperImages) return
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const res = await window.isDelulu.getWallpaperImages(path)
        if (res.success) {
          setFolderPath(res.folderPath)
          setWallpapers(res.images)

          // Select previously saved wallpaper or active desktop or first wallpaper
          const savedPath = preferences?.selectedWallpaperPath
          let match: WallpaperItem | undefined
          if (savedPath) {
            match = res.images.find(
              (img) => img.filePath.toLowerCase() === savedPath.toLowerCase()
            )
          }
          if (!match && activeDesktopPath) {
            match = res.images.find(
              (img) => img.filePath.toLowerCase() === activeDesktopPath.toLowerCase()
            )
          }
          setSelectedWallpaper(match || res.images[0] || null)
        } else {
          setErrorMessage(res.error || 'Failed to scan the wallpaper folder.')
          setWallpapers([])
        }
      } catch (err) {
        setErrorMessage(String(err))
        setWallpapers([])
      } finally {
        setIsLoading(false)
      }
    },
    [preferences?.selectedWallpaperPath, activeDesktopPath]
  )

  // Initial load
  useEffect(() => {
    syncCurrentDesktop()
    loadWallpapers(folderPath || undefined)
  }, [])

  // Sync when preferences change
  useEffect(() => {
    if (preferences?.wallpaperFolderPath !== undefined) {
      const nextFolder = preferences.wallpaperFolderPath || null
      setFolderPath(nextFolder)
      if (nextFolder) {
        loadWallpapers(nextFolder)
      } else {
        setWallpapers([])
        setSelectedWallpaper(null)
      }
    }
  }, [preferences?.wallpaperFolderPath, loadWallpapers])

  // ── Scroll status checking ──────────────────────────────────────────────────
  const updateScrollStatus = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4)
  }, [])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    updateScrollStatus()
    el.addEventListener('scroll', updateScrollStatus, { passive: true })
    window.addEventListener('resize', updateScrollStatus)
    return () => {
      el.removeEventListener('scroll', updateScrollStatus)
      window.removeEventListener('resize', updateScrollStatus)
    }
  }, [wallpapers, updateScrollStatus])

  // Mouse wheel horizontal scroll conversion
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    const el = scrollContainerRef.current
    if (!el) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
  }

  const scrollByAmount = (amount: number): void => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  // ── Choose Folder Action ────────────────────────────────────────────────────
  const handleChooseFolder = async (): Promise<void> => {
    if (!window.isDelulu?.selectWallpaperFolder) return
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await window.isDelulu.selectWallpaperFolder()
      if (res.canceled) {
        setIsLoading(false)
        return
      }

      if (res.folderPath) {
        setFolderPath(res.folderPath)
        setPreferences({ wallpaperFolderPath: res.folderPath })
        const images = res.images || []
        setWallpapers(images)

        // Select first or current desktop
        let match: WallpaperItem | undefined
        if (activeDesktopPath) {
          match = images.find(
            (img) => img.filePath.toLowerCase() === activeDesktopPath.toLowerCase()
          )
        }
        setSelectedWallpaper(match || images[0] || null)
        setStatusMessage(
          `Loaded ${images.length} wallpaper${images.length === 1 ? '' : 's'}`
        )
      } else if (res.error) {
        setErrorMessage(res.error)
      }
    } catch (err) {
      setErrorMessage(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Select Wallpaper Card ───────────────────────────────────────────────────
  const handleSelectWallpaper = (wallpaper: WallpaperItem): void => {
    setSelectedWallpaper(wallpaper)
    if (window.isDelulu?.updatePreferences) {
      window.isDelulu.updatePreferences({ selectedWallpaperPath: wallpaper.filePath })
    }
  }

  // ── Apply Selected Wallpaper as Desktop ─────────────────────────────────────
  const handleApplyWallpaper = async (): Promise<void> => {
    if (!selectedWallpaper || !window.isDelulu?.applyDesktopWallpaper) return
    setIsApplying(true)

    try {
      const res = await window.isDelulu.applyDesktopWallpaper(selectedWallpaper.filePath)
      if (res.success) {
        setActiveDesktopPath(selectedWallpaper.filePath)
        setStatusMessage(`Desktop wallpaper set to "${selectedWallpaper.name}"`)
      } else {
        setStatusMessage(res.message || 'Failed to update desktop wallpaper')
      }
    } catch (err) {
      setStatusMessage(`Error setting wallpaper: ${String(err)}`)
    } finally {
      setIsApplying(false)
    }
  }

  const isCurrentActive =
    selectedWallpaper &&
    activeDesktopPath &&
    selectedWallpaper.filePath.toLowerCase() === activeDesktopPath.toLowerCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ── Section Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              backgroundColor: 'var(--accent-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}
          >
            <Wallpaper size={15} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              className="font-display"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Wallpapers
            </span>
            <span
              className="font-text"
              style={{
                fontFamily: 'var(--font-text)',
                fontSize: '10px',
                color: 'var(--text-muted)'
              }}
            >
              {wallpapers.length > 0
                ? `${wallpapers.length} wallpaper${wallpapers.length === 1 ? '' : 's'} available`
                : 'Browse your wallpaper collection'}
            </span>
          </div>
        </div>

        {/* Folder Selection & Refresh Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {folderPath && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => loadWallpapers(folderPath)}
              title="Refresh wallpaper gallery"
              className="no-drag"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: 'var(--btn-icon-bg)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RefreshCw
                size={13}
                className={isLoading ? 'animate-spin' : undefined}
              />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: 'var(--btn-icon-hover-bg)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleChooseFolder}
            className="no-drag font-text"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 11px',
              borderRadius: '8px',
              backgroundColor: 'var(--btn-icon-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-text)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <FolderOpen size={13} color="var(--accent)" />
            <span>{folderPath ? 'Change Folder' : 'Choose Folder'}</span>
          </motion.button>
        </div>
      </div>

      {/* ── Content View ──────────────────────────────────────────────────── */}
      {!folderPath ? (
        /* Empty State: Prompt user to choose folder */
        <div
          className="glass-surface no-drag"
          style={{
            padding: '36px 20px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: 'var(--accent-glow)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}
          >
            <FolderOpen size={24} />
          </div>

          <div style={{ maxWidth: '320px' }}>
            <h4
              className="font-text"
              style={{
                fontFamily: 'var(--font-text)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}
            >
              Select your wallpaper folder
            </h4>
            <p
              className="font-text"
              style={{
                fontFamily: 'var(--font-text)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}
            >
              Choose a folder containing your desktop images (.jpg, .png, .webp, .bmp, .avif)
              to browse your collection here.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleChooseFolder}
            className="no-drag font-text"
            style={{
              marginTop: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-glow)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent)',
              fontFamily: 'var(--font-text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <FolderOpen size={14} />
            <span>Choose Folder</span>
          </motion.button>
        </div>
      ) : errorMessage ? (
        /* Error or Inaccessible Folder State */
        <div
          className="glass-surface no-drag"
          style={{
            padding: '28px 20px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '10px'
          }}
        >
          <p
            className="font-text"
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}
          >
            {errorMessage}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleChooseFolder}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--btn-icon-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Choose Different Folder
          </motion.button>
        </div>
      ) : wallpapers.length === 0 && !isLoading ? (
        /* Empty Folder (no supported images) */
        <div
          className="glass-surface no-drag"
          style={{
            padding: '30px 20px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '10px'
          }}
        >
          <ImageIcon size={28} color="var(--text-muted)" />
          <h4
            className="font-text"
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >
            No supported wallpapers found
          </h4>
          <p
            className="font-text"
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              maxWidth: '300px'
            }}
          >
            This directory does not contain supported image files (.jpg, .png, .webp, .bmp, .avif).
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleChooseFolder}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--btn-icon-bg)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Choose Another Folder
          </motion.button>
        </div>
      ) : (
        /* ── Horizontally Scrollable Cards Row ────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            {/* Left Scroll Button Indicator */}
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scrollByAmount(-220)}
                className="no-drag"
                style={{
                  position: 'absolute',
                  left: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 17, 18, 0.85)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <ChevronLeft size={16} />
              </motion.button>
            )}

            {/* Right Scroll Button Indicator */}
            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scrollByAmount(220)}
                className="no-drag"
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 17, 18, 0.85)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <ChevronRight size={16} />
              </motion.button>
            )}

            {/* Horizontal Cards Scroll Track */}
            <div
              ref={scrollContainerRef}
              onWheel={handleWheel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                overflowX: 'auto',
                overflowY: 'hidden',
                padding: '4px 2px 10px 2px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                scrollSnapType: 'x proximity',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {wallpapers.map((item) => {
                const isSelected = selectedWallpaper?.id === item.id
                const isCurrentDesktop = Boolean(
                  activeDesktopPath &&
                    item.filePath.toLowerCase() === activeDesktopPath.toLowerCase()
                )

                return (
                  <WallpaperCard
                    key={item.id}
                    wallpaper={item}
                    isSelected={isSelected}
                    isCurrentDesktop={isCurrentDesktop}
                    onClick={() => handleSelectWallpaper(item)}
                  />
                )
              })}
            </div>
          </div>

          {/* ── Selected Wallpaper Action Bar ──────────────────────────────── */}
          <AnimatePresence mode="wait">
            {selectedWallpaper && (
              <motion.div
                key={selectedWallpaper.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="glass-surface no-drag"
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <ImageIcon size={16} />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}
                  >
                    <span
                      className="font-text"
                      title={selectedWallpaper.fileName}
                      style={{
                        fontFamily: 'var(--font-text)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {selectedWallpaper.fileName}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: isCurrentActive ? 'var(--accent)' : 'var(--text-muted)'
                      }}
                    >
                      {isCurrentActive
                        ? 'Current Windows desktop wallpaper'
                        : 'Selected wallpaper preview'}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <motion.button
                  whileHover={{ scale: isCurrentActive ? 1 : 1.02 }}
                  whileTap={{ scale: isCurrentActive ? 1 : 0.98 }}
                  disabled={isCurrentActive || isApplying}
                  onClick={handleApplyWallpaper}
                  className="font-text"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: isCurrentActive
                      ? 'var(--accent-glow)'
                      : 'var(--btn-icon-bg)',
                    border: isCurrentActive
                      ? '1px solid var(--accent-border)'
                      : '1px solid var(--border-subtle)',
                    color: isCurrentActive ? 'var(--accent)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-text)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: isCurrentActive ? 'default' : 'pointer',
                    flexShrink: 0,
                    opacity: isApplying ? 0.7 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isApplying ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : isCurrentActive ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Active Desktop</span>
                    </>
                  ) : (
                    <>
                      <Monitor size={13} color="var(--accent)" />
                      <span>Set as Desktop</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
export default WallpaperWidget
