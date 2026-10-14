import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
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
import { ExpandedTab } from '../../shared'

interface ExpandedPanelProps {
  onCollapse: () => void
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

export const ExpandedPanel: React.FC<ExpandedPanelProps> = ({ onCollapse }) => {
  const { activeTab, setActiveTab, setStatusMessage } = useIslandStore()

  const handleExecuteAction = async (id: string, target?: string): Promise<void> => {
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

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: -14 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: -14 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      style={{
        position: 'absolute',
        top: '4px',
        width: '520px',
        maxHeight: '540px',
        transformOrigin: 'top center',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-panel)',
        boxShadow: 'var(--shadow-panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
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
          borderBottom: '1px solid var(--border-subtle)'
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
                borderRadius: '8px',
                background: isActive ? 'var(--accent-subtle)' : 'transparent',
                border: isActive
                  ? '1px solid var(--border-active)'
                  : '1px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Tab Content */}
      <div
        style={{
          padding: '16px',
          overflowY: 'auto',
          flex: 1
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'launcher' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
  )
}
export default ExpandedPanel
