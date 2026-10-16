import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Search,
  Calendar,
  Cpu,
  ClipboardList,
  Music,
  Sparkles,
  Settings
} from 'lucide-react'
import { ExpandedTab } from '../../shared'

export const TABS: { id: ExpandedTab; label: string; icon: React.ElementType }[] = [
  { id: 'launcher', label: 'Launcher', icon: Search },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'system', label: 'System', icon: Cpu },
  { id: 'clipboard', label: 'Clipboard', icon: ClipboardList },
  { id: 'media', label: 'Media', icon: Music },
  { id: 'routines', label: 'Routines', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings }
]

interface NavigationTabBarProps {
  activeTab: ExpandedTab
  setActiveTab: (tab: ExpandedTab) => void
}

export const NavigationTabBar: React.FC<NavigationTabBarProps> = ({
  activeTab,
  setActiveTab
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll position to display subtle fade edge cues
  const updateScrollStatus = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2)
  }, [])

  // Keep selected tab in view with comfortable margin
  const scrollTabIntoView = useCallback((tabId: ExpandedTab, smooth = true) => {
    const el = containerRef.current
    if (!el) return
    const activeBtn = el.querySelector(`button[data-tab="${tabId}"]`) as HTMLElement | null
    if (!activeBtn) return

    const MARGIN = 12
    const targetLeft = activeBtn.offsetLeft - MARGIN
    const targetRight = activeBtn.offsetLeft + activeBtn.offsetWidth + MARGIN

    const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isVisible = typeof document !== 'undefined' && !document.hidden
    const behavior: ScrollBehavior = smooth && isVisible && !isReducedMotion ? 'smooth' : 'auto'

    if (targetLeft < el.scrollLeft) {
      const dest = Math.max(0, targetLeft)
      try {
        el.scrollTo({ left: dest, behavior: smooth ? 'smooth' : 'auto' })
        setTimeout(() => {
          if (el && Math.abs(el.scrollLeft - dest) > 2) {
            el.scrollLeft = dest
            updateScrollStatus()
          }
        }, 350)
      } catch {
        el.scrollLeft = dest
      }
    } else if (targetRight > el.scrollLeft + el.clientWidth) {
      const dest = Math.min(el.scrollWidth - el.clientWidth, targetRight - el.clientWidth)
      try {
        el.scrollTo({ left: dest, behavior: smooth ? 'smooth' : 'auto' })
        setTimeout(() => {
          if (el && Math.abs(el.scrollLeft - dest) > 2) {
            el.scrollLeft = dest
            updateScrollStatus()
          }
        }, 350)
      } catch {
        el.scrollLeft = dest
      }
    }
    updateScrollStatus()
  }, [updateScrollStatus])

  // Scroll active tab into view when activeTab prop changes
  useEffect(() => {
    scrollTabIntoView(activeTab, true)
    updateScrollStatus()
  }, [activeTab, scrollTabIntoView, updateScrollStatus])

  // Trackpad & Wheel horizontal navigation listener
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent): void => {
      // If content does not overflow, let default events pass through
      if (el.scrollWidth <= el.clientWidth) return

      // Two-finger horizontal trackpad gestures produce dominant deltaX.
      // Vertical wheel or two-finger vertical trackpad gestures over the tab bar produce dominant deltaY.
      // We translate deltaY to horizontal scroll over the navigation bar, without hijacking elsewhere.
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        e.preventDefault()
        const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
        el.scrollLeft += delta
        updateScrollStatus()
      } else if (Math.abs(e.deltaX) > 0) {
        // Native horizontal trackpad scrolling handles deltaX, but trigger scroll status update
        requestAnimationFrame(updateScrollStatus)
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('scroll', updateScrollStatus, { passive: true })
    window.addEventListener('resize', updateScrollStatus)

    // Initial check
    updateScrollStatus()

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('scroll', updateScrollStatus)
      window.removeEventListener('resize', updateScrollStatus)
    }
  }, [updateScrollStatus])

  // Accessible keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab)
    if (currentIndex === -1) return

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % TABS.length
      const nextTab = TABS[nextIndex].id
      setActiveTab(nextTab)
      const nextBtn = containerRef.current?.querySelector(
        `button[data-tab="${nextTab}"]`
      ) as HTMLElement | null
      nextBtn?.focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + TABS.length) % TABS.length
      const prevTab = TABS[prevIndex].id
      setActiveTab(prevTab)
      const prevBtn = containerRef.current?.querySelector(
        `button[data-tab="${prevTab}"]`
      ) as HTMLElement | null
      prevBtn?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      const firstTab = TABS[0].id
      setActiveTab(firstTab)
      const firstBtn = containerRef.current?.querySelector(
        `button[data-tab="${firstTab}"]`
      ) as HTMLElement | null
      firstBtn?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const lastTab = TABS[TABS.length - 1].id
      setActiveTab(lastTab)
      const lastBtn = containerRef.current?.querySelector(
        `button[data-tab="${lastTab}"]`
      ) as HTMLElement | null
      lastBtn?.focus()
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: 'rgba(125, 125, 125, 0.05)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      {/* Left Scroll Gradient Cue */}
      {canScrollLeft && (
        <div
          data-testid="nav-fade-left"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '28px',
            background: 'linear-gradient(to right, rgba(18, 21, 21, 0.95), transparent)',
            pointerEvents: 'none',
            zIndex: 3
          }}
        />
      )}

      {/* Right Scroll Gradient Cue */}
      {canScrollRight && (
        <div
          data-testid="nav-fade-right"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '28px',
            background: 'linear-gradient(to left, rgba(18, 21, 21, 0.95), transparent)',
            pointerEvents: 'none',
            zIndex: 3
          }}
        />
      )}

      {/* Horizontally Scrollable Tab Container */}
      <div
        ref={containerRef}
        data-testid="tab-bar"
        role="tablist"
        aria-label="Island Navigation Tabs"
        onKeyDown={handleKeyDown}
        className="nav-tab-bar no-drag"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 12px',
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className="nav-tab-button"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-button)',
                border: isActive
                  ? '1px solid var(--border-active)'
                  : '1px solid transparent',
                backgroundColor: isActive
                  ? 'var(--accent-subtle)'
                  : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-text)',
                fontSize: '11px',
                fontWeight: isActive ? 500 : 400,
                lineHeight: '14px',
                letterSpacing: '0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
                userSelect: 'none'
              }}
            >
              <Icon size={13} style={{ flexShrink: 0 }} />
              <span style={{ lineHeight: '14px' }}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default NavigationTabBar
