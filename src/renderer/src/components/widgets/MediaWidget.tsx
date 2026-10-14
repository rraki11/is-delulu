import React, { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Music,
  Radio,
  Tv,
  Layers,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  Disc
} from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { MediaSourceItem, MediaControlAction } from '../../../../shared/types'

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function getAppBadge(app: string): { color: string; bg: string; border: string; icon: 'music' | 'browser' | 'video' | 'radio' } {
  const lower = app.toLowerCase()
  if (lower.includes('spotify')) {
    return { color: '#1DB954', bg: 'rgba(29, 185, 84, 0.14)', border: 'rgba(29, 185, 84, 0.35)', icon: 'music' }
  }
  if (lower.includes('brave')) {
    return { color: '#FF5500', bg: 'rgba(255, 85, 0, 0.14)', border: 'rgba(255, 85, 0, 0.35)', icon: 'browser' }
  }
  if (lower.includes('chrome')) {
    return { color: '#4285F4', bg: 'rgba(66, 133, 244, 0.14)', border: 'rgba(66, 133, 244, 0.35)', icon: 'browser' }
  }
  if (lower.includes('edge')) {
    return { color: '#0078D7', bg: 'rgba(0, 120, 215, 0.14)', border: 'rgba(0, 120, 215, 0.35)', icon: 'browser' }
  }
  if (lower.includes('firefox')) {
    return { color: '#FF7139', bg: 'rgba(255, 113, 57, 0.14)', border: 'rgba(255, 113, 57, 0.35)', icon: 'browser' }
  }
  if (lower.includes('vlc')) {
    return { color: '#FF8800', bg: 'rgba(255, 136, 0, 0.16)', border: 'rgba(255, 136, 0, 0.4)', icon: 'video' }
  }
  if (lower.includes('apple')) {
    return { color: '#FC3C44', bg: 'rgba(252, 60, 68, 0.14)', border: 'rgba(252, 60, 68, 0.35)', icon: 'music' }
  }
  return { color: 'var(--accent)', bg: 'rgba(255, 255, 255, 0.08)', border: 'var(--border-subtle)', icon: 'radio' }
}

interface MediaSourceCardProps {
  source: MediaSourceItem
  onAction: (
    action: MediaControlAction,
    val?: number | boolean,
    sessionId?: string,
    processId?: number
  ) => Promise<void>
  isPending: boolean
}

const MediaSourceCard: React.FC<MediaSourceCardProps> = ({ source, onAction, isPending }) => {
  const isMediaSession = source.sourceType === 'media-session'
  const isPlaying = source.isPlaying
  const isAudible = source.isAudioActive || source.status === 'Audible' || (source.peakLevel && source.peakLevel > 0.001)
  const duration = source.durationSec
  const serverPos = source.positionSec

  // Local position ticker for continuous smooth progress
  const [currentPos, setCurrentPos] = useState<number>(serverPos)

  useEffect(() => {
    setCurrentPos(serverPos)
  }, [serverPos])

  useEffect(() => {
    if (!isPlaying || duration <= 0) return
    const interval = setInterval(() => {
      setCurrentPos((prev) => (prev >= duration ? duration : prev + 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, duration])

  const progressPercent = duration > 0 ? Math.min(100, (currentPos / duration) * 100) : 0
  const appStyle = getAppBadge(source.appName || source.appId)

  const appVolume = typeof source.appVolume === 'number' ? source.appVolume : 100
  const isAppMuted = Boolean(source.isAppMuted)

  return (
    <div
      style={{
        padding: '14px',
        borderRadius: '12px',
        backgroundColor: isPlaying
          ? 'rgba(255, 255, 255, 0.04)'
          : isAudible
          ? 'rgba(255, 255, 255, 0.03)'
          : 'rgba(255, 255, 255, 0.015)',
        border: isPlaying
          ? '1px solid rgba(255, 255, 255, 0.14)'
          : isAudible
          ? '1px solid rgba(255, 255, 255, 0.09)'
          : '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        position: 'relative'
      }}
    >
      {/* Session Header: App Pill, Title, Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: appStyle.bg,
            border: `1px solid ${appStyle.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: appStyle.color,
            flexShrink: 0
          }}
        >
          {appStyle.icon === 'music' ? (
            <Music size={18} />
          ) : appStyle.icon === 'video' ? (
            <Tv size={18} />
          ) : appStyle.icon === 'browser' ? (
            <Radio size={18} />
          ) : (
            <Disc size={18} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: appStyle.bg,
                color: appStyle.color,
                border: `1px solid ${appStyle.border}`,
                flexShrink: 0,
                letterSpacing: '0.02em'
              }}
            >
              {source.appName}
            </span>

            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: isPlaying
                  ? 'rgba(29, 185, 84, 0.15)'
                  : isAudible
                  ? 'rgba(255, 136, 0, 0.15)'
                  : 'rgba(255, 255, 255, 0.06)',
                color: isPlaying ? '#1DB954' : isAudible ? '#FF8800' : 'var(--text-muted)',
                letterSpacing: '0.03em'
              }}
            >
              {isMediaSession
                ? isPlaying
                  ? 'PLAYING'
                  : 'PAUSED'
                : isAudible
                ? 'AUDIBLE'
                : 'AUDIO ACTIVE'}
            </span>

            {!isMediaSession && (
              <span
                style={{
                  fontSize: '8.5px',
                  color: 'var(--text-muted)',
                  opacity: 0.75
                }}
              >
                Core Audio
              </span>
            )}
          </div>

          <h4
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0
            }}
            title={source.title}
          >
            {source.title || (isMediaSession ? 'Untitled Track' : `${source.appName} Audio`)}
          </h4>

          <p
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0
            }}
            title={source.artist}
          >
            {source.artist || source.appName}
          </p>
        </div>

        {/* Dynamic Waveform Visualizer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '3px',
            height: '18px',
            paddingRight: '2px',
            flexShrink: 0
          }}
          title={
            isPlaying || isAudible
              ? `${source.appName} audio is currently active`
              : `${source.appName} is paused or idle`
          }
        >
          {[0.1, 0.4, 0.2, 0.5, 0.3].map((delay, idx) => {
            const activeHeight = source.peakLevel && source.peakLevel > 0.05 ? Math.max(6, Math.min(18, Math.round(source.peakLevel * 25))) : 14
            return (
              <span
                key={idx}
                style={{
                  width: '3px',
                  height: isPlaying || isAudible ? `${activeHeight}px` : '4px',
                  backgroundColor: isPlaying
                    ? appStyle.color
                    : isAudible
                    ? '#FF8800'
                    : 'var(--text-muted)',
                  borderRadius: '9999px',
                  animation: isPlaying || isAudible ? 'audioWave 1.1s ease-in-out infinite' : 'none',
                  animationDelay: `${delay}s`,
                  transition: 'height 0.3s ease, background-color 0.3s ease'
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Progress Bar (interactive seeking if duration > 0) */}
      {duration > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            onClick={(e) => {
              if (!source.canSeek) return
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left
              const ratio = Math.max(0, Math.min(1, clickX / rect.width))
              const targetSec = Math.round(ratio * duration)
              setCurrentPos(targetSec)
              onAction('seek', targetSec, source.id)
            }}
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden',
              cursor: source.canSeek ? 'pointer' : 'default',
              position: 'relative'
            }}
            title={source.canSeek ? `Click to seek in ${source.appName}` : undefined}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: appStyle.color,
                borderRadius: '9999px',
                transition: 'width 0.15s linear'
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            <span>{formatSeconds(currentPos)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>
      )}

      {/* Control Actions & Per-Application Volume */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        {/* Transport Controls Dedicated to THIS Session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-icon"
            onClick={() => isMediaSession && onAction('prev', undefined, source.id)}
            disabled={!isMediaSession || isPending}
            style={{
              cursor: isMediaSession ? 'pointer' : 'not-allowed',
              opacity: isMediaSession ? 1 : 0.3
            }}
            title={
              isMediaSession
                ? `Backward 10s / Previous Track in ${source.appName}`
                : 'Previous track unsupported for this audio session'
            }
            aria-label={`Previous track in ${source.appName}`}
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={() => isMediaSession && onAction('toggle', undefined, source.id)}
            disabled={!isMediaSession || isPending}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: !isMediaSession
                ? 'rgba(255, 255, 255, 0.05)'
                : isPlaying
                ? appStyle.color
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: !isMediaSession
                ? 'var(--text-muted)'
                : isPlaying
                ? '#0A0D0E'
                : 'var(--text-primary)',
              cursor: isMediaSession ? 'pointer' : 'not-allowed',
              opacity: isMediaSession ? 1 : 0.35,
              boxShadow: isMediaSession && isPlaying ? `0 0 10px ${appStyle.bg}` : 'none',
              transition: 'transform var(--transition-fast), background-color var(--transition-fast)'
            }}
            title={
              isMediaSession
                ? `${isPlaying ? 'Pause' : 'Play'} in ${source.appName}`
                : 'Playback controls unsupported for this audio session'
            }
            aria-label={isMediaSession ? `${isPlaying ? 'Pause' : 'Play'} in ${source.appName}` : 'Playback unsupported'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: isMediaSession ? '2px' : '0' }} />}
          </button>

          <button
            className="btn-icon"
            onClick={() => isMediaSession && onAction('next', undefined, source.id)}
            disabled={!isMediaSession || isPending}
            style={{
              cursor: isMediaSession ? 'pointer' : 'not-allowed',
              opacity: isMediaSession ? 1 : 0.3
            }}
            title={
              isMediaSession
                ? `Forward 10s / Next Track in ${source.appName}`
                : 'Next track unsupported for this audio session'
            }
            aria-label={`Next track in ${source.appName}`}
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Per-Application Volume Control (Directly targets THIS process) */}
        {source.processId && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0
            }}
            title={`${source.appName} Application Audio Volume`}
          >
            <button
              onClick={() => onAction('app-mute', !isAppMuted, source.id, source.processId)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: isAppMuted ? '#FF6B6B' : 'var(--text-secondary)'
              }}
              title={isAppMuted ? `Unmute ${source.appName}` : `Mute ${source.appName}`}
              aria-label={isAppMuted ? `Unmute ${source.appName}` : `Mute ${source.appName}`}
            >
              {isAppMuted || appVolume === 0 ? (
                <VolumeX size={13} color="#FF6B6B" />
              ) : appVolume < 50 ? (
                <Volume1 size={13} />
              ) : (
                <Volume2 size={13} />
              )}
            </button>

            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Vol:
            </span>

            <input
              type="range"
              min={0}
              max={100}
              value={isAppMuted ? 0 : appVolume}
              onChange={(e) => onAction('app-volume', Number(e.target.value), source.id, source.processId)}
              style={{
                width: '65px',
                accentColor: appStyle.color,
                cursor: 'pointer',
                height: '3px'
              }}
              title={`${source.appName} Application Volume: ${appVolume}%`}
            />

            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: isAppMuted ? '#FF6B6B' : 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: '24px',
                textAlign: 'right'
              }}
            >
              {isAppMuted ? 'Mute' : `${appVolume}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export const MediaWidget: React.FC = () => {
  const { mediaState, setMediaState } = useIslandStore()
  const [isPending, setIsPending] = useState(false)
  const [showRawOutputs, setShowRawOutputs] = useState(false)

  // Primary multi-source list (contains EVERY detected source simultaneously)
  const sources: MediaSourceItem[] = mediaState?.sources && mediaState.sources.length > 0
    ? mediaState.sources
    : mediaState?.sessions && mediaState.sessions.length > 0
    ? mediaState.sessions.map((s) => ({
        id: s.sessionId,
        sourceType: 'media-session',
        appId: s.appId,
        appName: s.app,
        title: s.title,
        artist: s.artist,
        album: s.album,
        status: s.status,
        isPlaying: s.isPlaying,
        isAudioActive: s.isPlaying,
        peakLevel: 0,
        positionSec: s.positionSec,
        durationSec: s.durationSec,
        canPlay: s.canPlay,
        canPause: s.canPause,
        canNext: s.canNext,
        canPrev: s.canPrev,
        canToggle: s.canToggle,
        canSeek: s.canSeek,
        canVolume: Boolean(s.processId),
        appVolume: s.appVolume ?? 100,
        isAppMuted: s.isAppMuted ?? false,
        processId: s.processId
      }))
    : []

  const audioOutputs = mediaState?.audioOutputs || []
  const hasSources = sources.length > 0
  const playingCount = sources.filter((s) => s.isPlaying).length

  const isMasterMuted = mediaState?.isMuted ?? false
  const masterVolume = mediaState?.volume ?? 50

  const handleAction = async (
    action: MediaControlAction,
    val?: number | boolean,
    sessionId?: string,
    processId?: number
  ): Promise<void> => {
    if (isPending && action !== 'volume' && action !== 'app-volume' && action !== 'seek') return
    if (action !== 'volume' && action !== 'app-volume' && action !== 'seek') {
      setIsPending(true)
    }

    try {
      if (window.isDelulu) {
        const updated = await window.isDelulu.controlMedia(action, val, sessionId, processId)
        setMediaState(updated)
      }
    } finally {
      if (action !== 'volume' && action !== 'app-volume' && action !== 'seek') {
        setTimeout(() => setIsPending(false), 140)
      }
    }
  }

  return (
    <div
      className="glass-surface"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Multi-Session Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={15} color="var(--accent)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Active Media & Audio Sources
          </span>
          {hasSources && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '9999px',
                backgroundColor: playingCount > 0 ? 'var(--accent-subtle)' : 'rgba(255, 255, 255, 0.08)',
                color: playingCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {sources.length} {sources.length === 1 ? 'Source' : 'Sources'} Connected
              {playingCount > 0 ? ` • ${playingCount} Playing` : ''}
            </span>
          )}
        </div>

        {/* Windows Audio Activity Diagnostics Toggle */}
        {audioOutputs.length > 0 && (
          <button
            onClick={() => setShowRawOutputs(!showRawOutputs)}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '10px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Inspect Windows Core Audio hardware streams"
          >
            <Activity size={12} />
            <span>Audio Hardware ({audioOutputs.length})</span>
            {showRawOutputs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Raw Core Audio Hardware Streams Section (Diagnostic Info) */}
      {showRawOutputs && audioOutputs.length > 0 && (
        <div
          style={{
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Windows Core Audio Hardware Endpoints
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Real-time</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {audioOutputs.map((out) => (
              <span
                key={out.processId}
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: out.isActive ? 'rgba(29, 185, 84, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  color: out.isActive ? '#1DB954' : 'var(--text-muted)',
                  border: out.isActive ? '1px solid rgba(29, 185, 84, 0.3)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: out.isActive ? '#1DB954' : 'var(--text-muted)'
                  }}
                />
                {out.name} (PID: {out.processId}) {out.isActive ? '• Active' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty State when No Sources are Discovered */}
      {!hasSources ? (
        <div
          style={{
            padding: '28px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-subtle)'
          }}
        >
          <Music size={28} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            No Media Sources Detected
          </h4>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, maxWidth: '340px' }}>
            Start playback in Spotify, Brave, Chrome, VLC, or any media application. Each will be detected and displayed here independently.
          </p>
        </div>
      ) : (
        /* Multi-Source Cards List (Displays ALL sources simultaneously!) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sources.map((source) => (
            <MediaSourceCard
              key={source.id}
              source={source}
              onAction={handleAction}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Windows Master System Volume Control (Clearly distinct from individual apps) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          marginTop: '4px'
        }}
        title="Windows Master System Volume (Affects entire system)"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleAction('mute')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: isMasterMuted ? '#FF6B6B' : 'var(--text-secondary)'
            }}
            title={isMasterMuted ? 'Unmute Windows System Volume' : 'Mute Windows System Volume'}
            aria-label={isMasterMuted ? 'Unmute Windows System Volume' : 'Mute Windows System Volume'}
          >
            {isMasterMuted || masterVolume === 0 ? (
              <VolumeX size={16} color="#FF6B6B" />
            ) : masterVolume < 50 ? (
              <Volume1 size={16} color="var(--text-secondary)" />
            ) : (
              <Volume2 size={16} color="var(--text-secondary)" />
            )}
          </button>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block' }}>
              Windows System Volume
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              Master output endpoint
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px' }}>
          <input
            type="range"
            min={0}
            max={100}
            value={isMasterMuted ? 0 : masterVolume}
            onChange={(e) => handleAction('volume', Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: 'var(--accent)',
              cursor: 'pointer',
              height: '4px'
            }}
            title={`Windows Master Volume: ${masterVolume}%`}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: isMasterMuted ? '#FF6B6B' : 'var(--accent)',
              fontVariantNumeric: 'tabular-nums',
              minWidth: '32px',
              textAlign: 'right'
            }}
          >
            {isMasterMuted ? 'Muted' : `${masterVolume}%`}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MediaWidget
