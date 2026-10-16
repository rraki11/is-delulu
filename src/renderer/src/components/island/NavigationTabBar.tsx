import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'motion/react'
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
  { id: 'launcher',  label: 'Launcher',  icon: Search },
  { id: 'calendar',  label: 'Calendar',  icon: Calendar },
  { id: 'system',    label: 'System',    icon: Cpu },
  { id: 'clipboard', label: 'Clipboard', icon: ClipboardList },
  { id: 'media',     label: 'Media',     icon: Music },
  { id: 'routines',  label: 'Routines',  icon: Sparkles },
  { id: 'settings',  label: 'Settings',  icon: Settings }
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
  const [canScrollLeft,  setCanScrollLeft]  = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // ── Scroll status ──────────────────────────────────────────────────
  const updateScrollStatus = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2)
  }, [])

  // ── Scroll active tab into view ────────────────────────────────────
  const scrollTabIntoView = useCallback((tabId: ExpandedTab, smooth = true) => {
    const el = containerRef.current
    if (!el) return
    const activeBtn = el.querySelector(`button[data-tab="${tabId}"]`) as HTMLElement | null
    if (!activeBtn) return

    const MARGIN = 8
    const targetLeft  = activeBtn.offsetLeft - MARGIN
    const targetRight = activeBtn.offsetLeft + activeBtn.offsetWidth + MARGIN

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isVisible = !document.hidden
    const behavior: ScrollBehavior = smooth && isVisible && !isReducedMotion ? 'smooth' : 'auto'

    if (targetLeft < el.scrollLeft) {
      const dest = Math.max(0, targetLeft)
      try {
        el.scrollTo({ left: dest, behavior })
        setTimeout(() => {
          if (el && Math.abs(el.scrollLeft - dest) > 2) { el.scrollLeft = dest; updateScrollStatus() }
        }, 350)
      } catch { el.scrollLeft = dest }
    } else if (targetRight > el.scrollLeft + el.clientWidth) {
      const dest = Math.min(el.scrollWidth - el.clientWidth, targetRight - el.clientWidth)
      try {
        el.scrollTo({ left: dest, behavior })
        setTimeout(() => {
          if (el && Math.abs(el.scrollLeft - dest) > 2) { el.scrollLeft = dest; updateScrollStatus() }
        }, 350)
      } catch { el.scrollLeft = dest }
    }
    updateScrollStatus()
  }, [updateScrollStatus])

  useEffect(() => {
    scrollTabIntoView(activeTab, true)
    updateScrollStatus()
  }, [activeTab, scrollTabIntoView, updateScrollStatus])

  // ── Trackpad / wheel horizontal scroll ────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent): void => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
        updateScrollStatus()
      } else if (Math.abs(e.deltaX) > 0) {
        requestAnimationFrame(updateScrollStatus)
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('scroll', updateScrollStatus, { passive: true })
    window.addEventListener('resize', updateScrollStatus)
    updateScrollStatus()
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('scroll', updateScrollStatus)
      window.removeEventListener('resize', updateScrollStatus)
    }
  }, [updateScrollStatus])

  // ── Keyboard navigation ────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    const cur = TABS.findIndex((t) => t.id === activeTab)
    if (cur === -1) return
    const jump = (idx: number): void => {
      const tab = TABS[idx].id
      setActiveTab(tab);
      (containerRef.current?.querySelector(`button[data-tab="${tab}"]`) as HTMLElement | null)?.focus()
    }
    if      (e.key === 'ArrowRight') { e.preventDefault(); jump((cur + 1) % TABS.length) }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); jump((cur - 1 + TABS.length) % TABS.length) }
    else if (e.key === 'Home')       { e.preventDefault(); jump(0) }
    else if (e.key === 'End')        { e.preventDefault(); jump(TABS.length - 1) }
  }

  return (
    <div className="nav-seg-wrap">
      {/* Left scroll fade */}
      {canScrollLeft  && <div data-testid="nav-fade-left"  className="nav-seg-fade nav-seg-fade--left"  />}
      {/* Right scroll fade */}
      {canScrollRight && <div data-testid="nav-fade-right" className="nav-seg-fade nav-seg-fade--right" />}

      {/* Recessed outer track */}
      <div
        ref={containerRef}
        data-testid="tab-bar"
        role="tablist"
        aria-label="Island Navigation Tabs"
        onKeyDown={handleKeyDown}
        className="nav-seg-track nav-tab-bar no-drag"
      >
        {TABS.map((tab) => {
          const Icon     = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              title={tab.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-seg-item nav-tab-button${isActive ? ' nav-seg-item--active' : ''}`}
            >
              {/* Sliding raised pill */}
              {isActive && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="nav-seg-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.65 }}
                  aria-hidden="true"
                />
              )}

              {/* Icon — sits above pill via z-index */}
              <span className="nav-seg-content" aria-hidden="true">
                <Icon size={15} strokeWidth={isActive ? 2 : 1.6} className="nav-seg-icon" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default NavigationTabBar
