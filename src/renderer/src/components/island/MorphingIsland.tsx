import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronDown,
  Search,
  Calendar,
  Cpu,
  ClipboardList,
  Music,
  Sparkles,
  Settings
} from 'lucide-react'
import { IslandHeader } from './IslandHeader'
import { CommandSearch } from '../launcher/CommandSearch'
import { ShortcutGrid } from '../launcher/ShortcutGrid'
import { CalendarWidget } from '../widgets/CalendarWidget'
import { SystemWidget } from '../widgets/SystemWidget'
import { ClipboardWidget } from '../widgets/ClipboardWidget'
import { MediaWidget } from '../widgets/MediaWidget'
import { RoutinesWidget } from '../widgets/RoutinesWidget'
import { SettingsWidget } from '../settings/SettingsWidget'
import { useIslandStore } from '../../store/useIslandStore'
import { ExpandedTab, IslandMode } from '../../shared'

interface MorphingIslandProps {
  mode: IslandMode
  onExpand: () => void
  onCollapse: () => void
  onPointerEnter?: () => void
  onPointerLeave?: () => void
}

const TABS: { id: ExpandedTab; label: string; icon: React.ElementType }[] = [
  { id: 'launcher', label: 'Launcher', icon: Search },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'system', label: 'System', icon: Cpu },
  { id: 'clipboard', label: 'Clipboard', icon: ClipboardList },
  { id: 'media', label: 'Media', icon: Music },
  { id: 'routines', label: 'Routines', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export const MorphingIsland: React.FC<MorphingIslandProps> = ({
  mode,
  onExpand,
  onCollapse,
  onPointerEnter,
  onPointerLeave
}) => {
  const { preferences, activeTab, setActiveTab, setStatusMessage } = useIslandStore()
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

  const handleExecuteAction = async (id: string, target?: string): Promise<void> => {
    if (id === 'calendar' || id === 'cmd-open-calendar') {
      setActiveTab('calendar')
      return
    }
    if (window.isDelulu) {
      if (id.startsWith('cmd-')) {
        const result = await window.isDelulu.runCommand(id)
        setStatusMessage(result.message)
      } else {
        const result = await window.isDelulu.launchShortcut(id, target)
        setStatusMessage(result.message)
      }
    } else {
      setStatusMessage(`Action triggered: ${id}`)
    }
  }

  const isExpanded = mode === 'expanded'
  const isHidden = mode === 'hidden'

  return (
    <motion.div
      id="island-surface"
      role={mode === 'collapsed' ? 'button' : undefined}
      tabIndex={mode === 'collapsed' ? 0 : undefined}
      onClick={mode === 'collapsed' ? onExpand : undefined}
      onKeyDown={
        mode === 'collapsed'
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onExpand()
              }
            }
          : undefined
      }
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      initial={false}
      animate={{
        width: isExpanded ? 520 : 184,
        height: isExpanded ? 536 : 32,
        borderRadius: isExpanded ? '0px 0px 22px 22px' : '0px 0px 16px 16px',
        backgroundColor: isExpanded ? 'var(--bg-panel)' : 'var(--bg-pill)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        boxShadow: isExpanded ? 'var(--shadow-panel)' : 'var(--shadow-pill)',
        y: isHidden ? -38 : 0,
        opacity: isHidden ? 0 : 1
      }}
      whileHover={
        mode === 'collapsed'
          ? { scale: 1.035, y: 0, transition: { duration: 0.16, ease: 'easeOut' } }
          : undefined
      }
      whileTap={
        mode === 'collapsed'
          ? { scale: 0.98 }
          : undefined
      }
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 32,
        mass: 0.8
      }}
      title={mode === 'collapsed' ? 'Click to expand' : undefined}
      style={{
        position: 'absolute',
        top: 0,
        transformOrigin: 'top center',
        originX: 0.5,
        originY: 0,
        borderStyle: 'solid',
        borderWidth: '1px',
        borderTop: 'none',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: mode === 'collapsed' ? 'pointer' : 'default',
        userSelect: 'none',
        outline: 'none',
        pointerEvents: isHidden ? 'none' : 'auto',
        zIndex: 100
      }}
    >
      {/* Collapsed Pill Content (Minimal Digital Clock Only) */}
      {!isExpanded && (
        <motion.div
          key="pill-clock"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
            boxSizing: 'border-box',
            pointerEvents: 'auto'
          }}
        >
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
      )}

      {/* Expanded Panel Dashboard Content */}
      {isExpanded && (
        <motion.div
          key="expanded-dashboard"
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            width: '520px',
            height: '536px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {/* Panel Header */}
          <IslandHeader onCollapse={onCollapse} />

        {/* Navigation Tab Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '8px 14px',
            backgroundColor: 'rgba(125, 125, 125, 0.05)',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-button)',
                  border: isActive
                    ? '1px solid var(--border-active)'
                    : '1px solid transparent',
                  backgroundColor: isActive
                    ? 'var(--accent-subtle)'
                    : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  outline: 'none'
                }}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Active Tab View */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
              {activeTab === 'launcher' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <CommandSearch onExecuteAction={handleExecuteAction} />
                  <ShortcutGrid onLaunch={handleExecuteAction} />
                </div>
              )}
              {activeTab === 'calendar' && <CalendarWidget />}
              {activeTab === 'system' && <SystemWidget />}
              {activeTab === 'clipboard' && <ClipboardWidget />}
              {activeTab === 'media' && <MediaWidget />}
              {activeTab === 'routines' && <RoutinesWidget />}
              {activeTab === 'settings' && <SettingsWidget />}
            </motion.div>
          </AnimatePresence>
        </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default MorphingIsland
