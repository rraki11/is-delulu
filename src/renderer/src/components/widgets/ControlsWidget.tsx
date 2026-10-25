import React, { useState } from 'react'
import { motion } from 'motion/react'
import {
  Wifi,
  Bluetooth,
  Volume2,
  Moon,
  Sun,
  ChevronRight,
  SkipBack,
  Play,
  Pause,
  SkipForward
} from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { HITODAMA_EASING } from '../../shared'

export const ControlsWidget: React.FC = () => {
  const { mediaState, theme, setTheme } = useIslandStore()
  const [wifiActive, setWifiActive] = useState(true)
  const [bluetoothActive, setBluetoothActive] = useState(false)
  const [nightLightActive, setNightLightActive] = useState(false)

  const isPlaying = mediaState?.isPlaying ?? false
  const title = mediaState?.title && mediaState.title !== 'No media active'
    ? mediaState.title
    : 'lofi beats to study and relax'
  const artist = mediaState?.artist && mediaState.artist !== 'Desktop Audio Idle'
    ? mediaState.artist
    : 'lofi radio'

  const volume = mediaState?.volume ?? 75
  const durationSec = mediaState?.durationSec ?? 3735
  const positionSec = mediaState?.positionSec ?? 57

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = String(Math.floor(sec % 60)).padStart(2, '0')
    return `${m}:${s}`
  }

  const handleToggleWifi = async (): Promise<void> => {
    setWifiActive(!wifiActive)
    if (window.isDelulu?.openQuickSetting) {
      await window.isDelulu.openQuickSetting('wifi')
    }
  }

  const handleToggleBluetooth = async (): Promise<void> => {
    setBluetoothActive(!bluetoothActive)
    if (window.isDelulu?.openQuickSetting) {
      await window.isDelulu.openQuickSetting('bluetooth')
    }
  }

  const handleOpenAudio = async (): Promise<void> => {
    if (window.isDelulu?.openQuickSetting) {
      await window.isDelulu.openQuickSetting('audio')
    }
  }

  const handleToggleNightLight = async (): Promise<void> => {
    setNightLightActive(!nightLightActive)
    if (window.isDelulu?.openQuickSetting) {
      await window.isDelulu.openQuickSetting('nightlight')
    }
  }

  const handleToggleDarkMode = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (window.isDelulu?.updatePreferences) {
      window.isDelulu.updatePreferences({ appearance: next })
    }
  }

  const handleVolumeChange = async (e: React.MouseEvent<HTMLDivElement>): Promise<void> => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newPercent = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)))
    if (window.isDelulu?.setMasterVolume) {
      await window.isDelulu.setMasterVolume(newPercent)
    } else if (window.isDelulu?.controlMedia) {
      await window.isDelulu.controlMedia('volume', newPercent)
    }
  }

  const handleMediaControl = async (action: 'prev' | 'toggle' | 'next'): Promise<void> => {
    if (window.isDelulu?.controlMedia) {
      await window.isDelulu.controlMedia(action)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '604px',
        margin: '0 auto',
        padding: '6px 0',
        userSelect: 'none'
      }}
    >
      {/* â”€â”€ Row 1 Tiles: Wi-Fi, Bluetooth, Audio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px'
        }}
      >
        {/* Wi-Fi Tile */}
        <motion.div
          onClick={handleToggleWifi}
          style={{
            height: '56px',
            borderRadius: '14px',
            padding: '10px 14px',
            backgroundColor: wifiActive ? 'var(--hitodama-accent, #D7B56D)' : '#1C1C1E',
            color: wifiActive ? '#141310' : '#F4F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.16, ease: HITODAMA_EASING }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wifi size={18} strokeWidth={2.2} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Wi-Fi</span>
              <span
                style={{
                  fontSize: '11px',
                  color: wifiActive ? 'rgba(20, 19, 16, 0.75)' : '#8E919A',
                  fontWeight: 500
                }}
              >
                {wifiActive ? 'Home 5G' : 'Disconnected'}
              </span>
            </div>
          </div>
          <ChevronRight
            size={14}
            style={{ opacity: wifiActive ? 0.8 : 0.4 }}
          />
        </motion.div>

        {/* Bluetooth Tile */}
        <motion.div
          onClick={handleToggleBluetooth}
          style={{
            height: '56px',
            borderRadius: '14px',
            padding: '10px 14px',
            backgroundColor: bluetoothActive ? 'var(--hitodama-accent, #D7B56D)' : '#1C1C1E',
            color: bluetoothActive ? '#141310' : '#F4F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.16, ease: HITODAMA_EASING }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bluetooth size={18} strokeWidth={2.2} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Bluetooth</span>
              <span
                style={{
                  fontSize: '11px',
                  color: bluetoothActive ? 'rgba(20, 19, 16, 0.75)' : '#8E919A',
                  fontWeight: 500
                }}
              >
                {bluetoothActive ? 'Connected' : 'Off'}
              </span>
            </div>
          </div>
          <ChevronRight
            size={14}
            style={{ opacity: bluetoothActive ? 0.8 : 0.4 }}
          />
        </motion.div>

        {/* Audio Output Tile */}
        <motion.div
          onClick={handleOpenAudio}
          style={{
            height: '56px',
            borderRadius: '14px',
            padding: '10px 14px',
            backgroundColor: 'var(--hitodama-accent, #D7B56D)',
            color: '#141310',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.16, ease: HITODAMA_EASING }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Volume2 size={18} strokeWidth={2.2} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Audio</span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(20, 19, 16, 0.75)',
                  fontWeight: 500
                }}
              >
                Speakers
              </span>
            </div>
          </div>
          <ChevronRight size={14} style={{ opacity: 0.8 }} />
        </motion.div>
      </div>

      {/* â”€â”€ Row 2 Tiles: Night Light, Dark Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px'
        }}
      >
        {/* Night Light */}
        <motion.div
          onClick={handleToggleNightLight}
          style={{
            height: '56px',
            borderRadius: '14px',
            padding: '10px 16px',
            backgroundColor: nightLightActive ? 'var(--hitodama-accent, #D7B56D)' : '#1C1C1E',
            color: nightLightActive ? '#141310' : '#F4F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.16, ease: HITODAMA_EASING }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Moon size={18} strokeWidth={2.2} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Night Light</span>
              <span
                style={{
                  fontSize: '11px',
                  color: nightLightActive ? 'rgba(20, 19, 16, 0.75)' : '#8E919A',
                  fontWeight: 500
                }}
              >
                {nightLightActive ? 'On' : 'Off'}
              </span>
            </div>
          </div>
          <ChevronRight
            size={14}
            style={{ opacity: nightLightActive ? 0.8 : 0.4 }}
          />
        </motion.div>

        {/* Dark Mode */}
        <motion.div
          onClick={handleToggleDarkMode}
          style={{
            height: '56px',
            borderRadius: '14px',
            padding: '10px 16px',
            backgroundColor: theme === 'dark' ? 'var(--hitodama-accent, #D7B56D)' : '#1C1C1E',
            color: theme === 'dark' ? '#141310' : '#F4F5F7',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.16, ease: HITODAMA_EASING }}
        >
          {theme === 'dark' ? <Moon size={18} strokeWidth={2.2} /> : <Sun size={18} strokeWidth={2.2} />}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Dark mode</span>
            <span
              style={{
                fontSize: '11px',
                color: theme === 'dark' ? 'rgba(20, 19, 16, 0.75)' : '#8E919A',
                fontWeight: 500
              }}
            >
              {theme === 'dark' ? 'On' : 'Off'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* â”€â”€ Row 3: Master Volume Slider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        onClick={handleVolumeChange}
        style={{
          width: '100%',
          height: '42px',
          borderRadius: '9999px',
          backgroundColor: '#1C1C1E',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          overflow: 'hidden'
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.max(6, volume)}%`,
            backgroundColor: 'var(--hitodama-accent, #D7B56D)',
            borderRadius: '9999px',
            pointerEvents: 'none'
          }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 16px',
            boxSizing: 'border-box',
            pointerEvents: 'none'
          }}
        >
          <Volume2 size={16} strokeWidth={2.2} color={volume > 8 ? '#141310' : '#8E919A'} />
          <span
            className="tabular-nums font-mono"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              color: volume > 92 ? '#141310' : '#F4F5F7'
            }}
          >
            {Math.round(volume)}%
          </span>
        </div>
      </div>

      {/* â”€â”€ Row 4: Integrated Media Player Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          width: '100%',
          borderRadius: '16px',
          backgroundColor: '#151618',
          padding: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Device Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Volume2 size={12} color="#8E919A" />
          <span style={{ fontSize: '11px', color: '#8E919A', fontWeight: 500 }}>
            Speakers
          </span>
        </div>

        {/* Track Info & Controls Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Cover & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
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
                <Volume2 size={20} color="rgba(255, 255, 255, 0.8)" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#F4F5F7',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {title}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#8E919A',
                  fontWeight: 500
                }}
              >
                {artist}
              </span>
            </div>
          </div>

          {/* Controls: Prev, Play/Pause, Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <motion.button
              onClick={() => handleMediaControl('prev')}
              style={{
                background: 'none',
                border: 'none',
                color: '#8E919A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              whileHover={{ color: '#F4F5F7', scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <SkipBack size={16} fill="currentColor" />
            </motion.button>

            <motion.button
              onClick={() => handleMediaControl('toggle')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--hitodama-accent, #D7B56D)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#141310'
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              {isPlaying ? (
                <Pause size={18} fill="#141310" />
              ) : (
                <Play size={18} fill="#141310" style={{ marginLeft: '2px' }} />
              )}
            </motion.button>

            <motion.button
              onClick={() => handleMediaControl('next')}
              style={{
                background: 'none',
                border: 'none',
                color: '#8E919A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              whileHover={{ color: '#F4F5F7', scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <SkipForward size={16} fill="currentColor" />
            </motion.button>
          </div>
        </div>

        {/* Scrubber Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
                backgroundColor: 'var(--hitodama-accent, #D7B56D)',
                borderRadius: '2px'
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#8E919A',
              fontWeight: 500
            }}
          >
            <span className="tabular-nums font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(positionSec)}</span>
            <span className="tabular-nums font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(durationSec)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ControlsWidget
