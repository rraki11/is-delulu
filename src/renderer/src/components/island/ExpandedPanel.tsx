import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { IslandHeader } from './IslandHeader'
import { NavigationTabBar } from './NavigationTabBar'
import { CommandSearch } from '../launcher/CommandSearch'
import { ShortcutGrid } from '../launcher/ShortcutGrid'
import { CalendarWidget } from '../widgets/CalendarWidget'
import { SystemWidget } from '../widgets/SystemWidget'
import { ClipboardWidget } from '../widgets/ClipboardWidget'
import { MediaWidget } from '../widgets/MediaWidget'
import { RoutinesWidget } from '../widgets/RoutinesWidget'
import { SettingsWidget } from '../settings/SettingsWidget'
import { useIslandStore } from '../../store/useIslandStore'
import { WINDOW_CONFIG } from '../../shared'

interface ExpandedPanelProps {
  onCollapse: () => void
}

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
        width: `${WINDOW_CONFIG.panel.width}px`,
        maxHeight: `${WINDOW_CONFIG.panel.height}px`,
        transformOrigin: 'top center',
        backgroundColor: 'var(--bg-panel)',
        border: 'none',
        borderRadius: 'var(--radius-panel)',
        boxShadow: 'var(--shadow-panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Precision Iridescent Metallic Rim */}
      <div className="island-iridescent-rim expanded" aria-hidden="true" />
      {/* Inner Metallic Chamfer */}
      <div className="island-inner-bevel" aria-hidden="true" />

      {/* Panel Header */}
      <IslandHeader onCollapse={onCollapse} />

      {/* Navigation Tab Bar */}
      <NavigationTabBar activeTab={activeTab} setActiveTab={setActiveTab} />

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
