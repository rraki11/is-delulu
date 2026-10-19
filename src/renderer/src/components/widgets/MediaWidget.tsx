import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  Disc
} from 'lucide-react'
import { useIslandStore } from '../../store/useIslandStore'
import { MediaSourceItem, MediaControlAction } from '../../../../shared/types'

/* ── Utilities ─────────────────────────────────────────────────────── */

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

/** Map an app display name to identity tokens. */
function getAppIdentity(app: string): {
  color: string
  colorDim: string
  icon: 'music' | 'browser' | 'video' | 'radio'
  label: string
} {
  const l = app.toLowerCase()
  if (l.includes('spotify'))
    return { color: '#1DB954', colorDim: 'rgba(29,185,84,0.18)', icon: 'music', label: 'Spotify' }
  if (l.includes('brave'))
    return { color: '#FF6333', colorDim: 'rgba(255,99,51,0.18)', icon: 'browser', label: 'Brave' }
  if (l.includes('chrome'))
    return { color: '#4285F4', colorDim: 'rgba(66,133,244,0.18)', icon: 'browser', label: 'Chrome' }
  if (l.includes('edge'))
    return { color: '#0078D7', colorDim: 'rgba(0,120,215,0.18)', icon: 'browser', label: 'Edge' }
  if (l.includes('firefox'))
    return { color: '#FF7139', colorDim: 'rgba(255,113,57,0.18)', icon: 'browser', label: 'Firefox' }
  if (l.includes('vlc'))
    return { color: '#FF8800', colorDim: 'rgba(255,136,0,0.18)', icon: 'video', label: 'VLC' }
  if (l.includes('apple') || l.includes('music'))
    return { color: '#FC3C44', colorDim: 'rgba(252,60,68,0.18)', icon: 'music', label: 'Music' }
  return {
    color: 'var(--accent)',
    colorDim: 'var(--accent-subtle)',
    icon: 'radio',
    label: app
  }
}

/* ── Waveform Bars ─────────────────────────────────────────────────── */
const WAVE_DELAYS = [0, 0.35, 0.18, 0.52, 0.28]

const WaveformBars: React.FC<{ active: boolean; color: string; peak?: number }> = ({
  active,
  color,
  peak = 0
}) => {
  const baseH = peak > 0.05 ? Math.max(4, Math.min(14, Math.round(peak * 22))) : 10
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '2px',
        height: '14px',
        flexShrink: 0
      }}
    >
      {WAVE_DELAYS.map((delay, i) => (
        <span
          key={i}
          style={{
            width: '2.5px',
            height: active ? `${baseH}px` : '3px',
            backgroundColor: active ? color : 'rgba(255,255,255,0.2)',
            borderRadius: '9999px',
            animation: active ? `audioWave 1.1s ease-in-out infinite` : 'none',
            animationDelay: `${delay}s`,
            transition: 'height 0.25s ease, background-color 0.25s ease'
          }}
        />
      ))}
    </div>
  )
}

/* ── App Icon ──────────────────────────────────────────────────────── */
const AppIcon: React.FC<{ identity: ReturnType<typeof getAppIdentity>; size?: number }> = ({
  identity,
  size = 36
}) => {
  const iconSize = Math.round(size * 0.45)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: identity.colorDim,
        border: `1px solid ${identity.color}33`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: identity.color,
        flexShrink: 0,
        transition: 'background-color 0.25s ease'
      }}
    >
      {identity.icon === 'music' ? (
        <Music size={iconSize} />
      ) : identity.icon === 'video' ? (
        <Tv size={iconSize} />
      ) : identity.icon === 'browser' ? (
        <Radio size={iconSize} />
      ) : (
        <Disc size={iconSize} />
      )}
    </div>
  )
}

/* ── Seekable Progress Bar ─────────────────────────────────────────── */
const ProgressBar: React.FC<{
  current: number
  duration: number
  canSeek: boolean
  accentColor: string
  onSeek: (sec: number) => void
}> = ({ current, duration, canSeek, accentColor, onSeek }) => {
  const percent = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canSeek) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(Math.round(ratio * duration))
    },
    [canSeek, duration, onSeek]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div
        onClick={handleClick}
        title={canSeek ? 'Click to seek' : undefined}
        style={{
          width: '100%',
          height: '3px',
          backgroundColor: 'rgba(255,255,255,0.09)',
          borderRadius: '9999px',
          overflow: 'hidden',
          cursor: canSeek ? 'pointer' : 'default',
          position: 'relative'
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: `linear-gradient(to right, ${accentColor}99, ${accentColor})`,
            borderRadius: '9999px',
            transition: 'width 0.15s linear'
          }}
        />
      </div>
      <div
        className="tabular-nums font-display"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-display)',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.38)',
          letterSpacing: '0.01em'
        }}
      >
        <span>{formatSeconds(current)}</span>
        <span>{formatSeconds(duration)}</span>
      </div>
    </div>
  )
}

/* ── Volume Slider (inline, compact) ──────────────────────────────── */
const VolumeControl: React.FC<{
  volume: number
  isMuted: boolean
  accentColor: string
  appName: string
  onMuteToggle: () => void
  onVolumeChange: (v: number) => void
}> = ({ volume, isMuted, accentColor, appName, onMuteToggle, onVolumeChange }) => (
  <div
    style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}
    title={`${appName} volume`}
  >
    <button
      onClick={onMuteToggle}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        color: isMuted ? 'rgba(255,80,80,0.85)' : 'rgba(255,255,255,0.45)',
        transition: 'color 0.2s ease'
      }}
      title={isMuted ? `Unmute ${appName}` : `Mute ${appName}`}
      aria-label={isMuted ? `Unmute ${appName}` : `Mute ${appName}`}
    >
      {isMuted || volume === 0 ? (
        <VolumeX size={12} color="rgba(255,80,80,0.85)" />
      ) : volume < 50 ? (
        <Volume1 size={12} />
      ) : (
        <Volume2 size={12} />
      )}
    </button>
    <input
      type="range"
      min={0}
      max={100}
      value={isMuted ? 0 : volume}
      onChange={(e) => onVolumeChange(Number(e.target.value))}
      style={{ width: '52px', accentColor, cursor: 'pointer', height: '3px' }}
      title={`${appName} volume: ${volume}%`}
    />
    <span
      style={{
        fontSize: '9px',
        fontWeight: 600,
        color: isMuted ? 'rgba(255,80,80,0.85)' : 'rgba(255,255,255,0.38)',
        fontVariantNumeric: 'tabular-nums',
        minWidth: '22px',
        textAlign: 'right'
      }}
    >
      {isMuted ? '—' : `${volume}%`}
    </span>
  </div>
)

/* ── Transport Controls ────────────────────────────────────────────── */
const TransportControls: React.FC<{
  isMediaSession: boolean
  isPlaying: boolean
  isPending: boolean
  accentColor: string
  appName: string
  onPrev: () => void
  onToggle: () => void
  onNext: () => void
}> = ({ isMediaSession, isPlaying, isPending, accentColor, appName, onPrev, onToggle, onNext }) => {
  const skipBtnStyle = (enabled: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    padding: '5px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: enabled ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.45,
    transition: 'background 0.15s ease, color 0.15s ease, transform 0.12s ease'
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <button
        style={skipBtnStyle(isMediaSession)}
        onClick={onPrev}
        disabled={!isMediaSession || isPending}
        title={isMediaSession ? `Prev / −10s in ${appName}` : 'Not supported'}
        aria-label={`Previous in ${appName}`}
      >
        <SkipBack size={13} />
      </button>

      <button
        onClick={onToggle}
        disabled={!isMediaSession || isPending}
        title={isMediaSession ? `${isPlaying ? 'Pause' : 'Play'} ${appName}` : 'Not supported'}
        aria-label={`${isPlaying ? 'Pause' : 'Play'} ${appName}`}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isMediaSession
            ? isPlaying
              ? accentColor
              : 'rgba(255,255,255,0.12)'
            : 'rgba(255,255,255,0.04)',
          color: isMediaSession
            ? isPlaying
              ? '#0A0D0E'
              : 'rgba(255,255,255,0.85)'
            : 'rgba(255,255,255,0.25)',
          cursor: isMediaSession ? 'pointer' : 'not-allowed',
          opacity: isMediaSession ? 1 : 0.4,
          boxShadow:
            isMediaSession && isPlaying ? `0 2px 10px ${accentColor}55` : 'none',
          transition:
            'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease'
        }}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '1px' }} />}
      </button>

      <button
        style={skipBtnStyle(isMediaSession)}
        onClick={onNext}
        disabled={!isMediaSession || isPending}
        title={isMediaSession ? `Next / +10s in ${appName}` : 'Not supported'}
        aria-label={`Next in ${appName}`}
      >
        <SkipForward size={13} />
      </button>
    </div>
  )
}

/* ── Palette tokens type ───────────────────────────────────────────── */
interface PaletteTokens {
  primary: string
  secondary: string
  highlight: string
  glow: string
  subtle: string
}

/* ── Single Media Source Card ──────────────────────────────────────── */

interface MediaSourceCardProps {
  source: MediaSourceItem
  onAction: (
    action: MediaControlAction,
    val?: number | boolean,
    sessionId?: string,
    processId?: number
  ) => Promise<void>
  isPending: boolean
  palette: PaletteTokens
}

const MediaSourceCard: React.FC<MediaSourceCardProps> = ({
  source,
  onAction,
  isPending,
  palette
}) => {
  const isMediaSession = source.sourceType === 'media-session'
  const isPlaying = source.isPlaying
  const isAudible =
    source.isAudioActive ||
    source.status === 'Audible' ||
    (source.peakLevel && source.peakLevel > 0.001)
  const duration = source.durationSec
  const serverPos = source.positionSec

  const [currentPos, setCurrentPos] = useState<number>(serverPos)
  useEffect(() => {
    setCurrentPos(serverPos)
  }, [serverPos])
  useEffect(() => {
    if (!isPlaying || duration <= 0) return
    const id = setInterval(() => {
      setCurrentPos((p) => (p >= duration ? duration : p + 1))
    }, 1000)
    return () => clearInterval(id)
  }, [isPlaying, duration])

  const identity = getAppIdentity(source.appName || source.appId)
  const appVolume = typeof source.appVolume === 'number' ? source.appVolume : 100
  const isAppMuted = Boolean(source.isAppMuted)

  /*
   * Wallpaper-adaptive gradient background.
   * When playing, blend two palette glow radials over a dark base so the
   * card picks up the wallpaper colours. When paused, keep it dark/neutral.
   */
  const cardBg = isPlaying
    ? [
        `radial-gradient(ellipse 100% 80% at 0% 0%,   ${palette.glow} 0%, transparent 60%)`,
        `radial-gradient(ellipse 70% 60%  at 100% 100%, ${palette.subtle} 0%, transparent 65%)`,
        'var(--bg-card)'
      ].join(', ')
    : 'var(--bg-card)'

  const cardBorder = isPlaying
    ? '1px solid var(--accent-border)'
    : '1px solid var(--border-subtle)'

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '14px',
        background: cardBg,
        border: cardBorder,
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.35s ease, border-color 0.35s ease'
      }}
    >
      {/* ── Row 1: App icon + Track info + Waveform ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AppIcon identity={identity} size={36} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Source identity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                color: identity.color,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                opacity: 0.85
              }}
            >
              {identity.label}
            </span>
            {/* Live status indicator dot */}
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: isPlaying ? '#4ade80' : 'rgba(255,255,255,0.22)',
                flexShrink: 0,
                transition: 'background-color 0.3s ease',
                boxShadow: isPlaying ? '0 0 4px rgba(74,222,128,0.6)' : 'none'
              }}
            />
          </div>

          {/* Track title */}
          <p
            className="font-text"
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
              letterSpacing: '-0.01em',
              lineHeight: 1.25
            }}
            title={source.title}
          >
            {source.title || (isMediaSession ? 'Untitled' : `${source.appName} Audio`)}
          </p>

          {/* Artist */}
          <p
            className="font-text"
            style={{
              fontFamily: 'var(--font-text)',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.42)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
              letterSpacing: '-0.005em',
              lineHeight: 1.3,
              marginTop: '1px'
            }}
            title={source.artist}
          >
            {source.artist || source.appName}
          </p>
        </div>

        <WaveformBars
          active={Boolean(isPlaying || isAudible)}
          color={identity.color}
          peak={source.peakLevel}
        />
      </div>

      {/* ── Row 2: Progress bar ── */}
      {duration > 0 && (
        <ProgressBar
          current={currentPos}
          duration={duration}
          canSeek={Boolean(source.canSeek)}
          accentColor={identity.color}
          onSeek={(sec) => {
            setCurrentPos(sec)
            onAction('seek', sec, source.id)
          }}
        />
      )}

      {/* ── Row 3: Transport + Volume ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}
      >
        <TransportControls
          isMediaSession={isMediaSession}
          isPlaying={isPlaying}
          isPending={isPending}
          accentColor={identity.color}
          appName={source.appName}
          onPrev={() => isMediaSession && onAction('prev', undefined, source.id)}
          onToggle={() => isMediaSession && onAction('toggle', undefined, source.id)}
          onNext={() => isMediaSession && onAction('next', undefined, source.id)}
        />

        {source.processId != null && (
          <VolumeControl
            volume={appVolume}
            isMuted={isAppMuted}
            accentColor={identity.color}
            appName={source.appName}
            onMuteToggle={() =>
              onAction('app-mute', !isAppMuted, source.id, source.processId)
            }
            onVolumeChange={(v) =>
              onAction('app-volume', v, source.id, source.processId)
            }
          />
        )}
      </div>
    </div>
  )
}

/* ── Master System Volume Footer ───────────────────────────────────── */
const SystemVolumeFooter: React.FC<{
  volume: number
  isMuted: boolean
  onMute: () => void
  onVolume: (v: number) => void
}> = ({ volume, isMuted, onMute, onVolume }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 10px',
      borderRadius: '10px',
      backgroundColor: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      marginTop: '2px'
    }}
    title="Windows system output volume"
  >
    <button
      onClick={onMute}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        color: isMuted ? 'rgba(255,80,80,0.8)' : 'var(--text-secondary)',
        flexShrink: 0
      }}
      title={isMuted ? 'Unmute system' : 'Mute system'}
      aria-label={isMuted ? 'Unmute system volume' : 'Mute system volume'}
    >
      {isMuted || volume === 0 ? (
        <VolumeX size={14} color="rgba(255,80,80,0.8)" />
      ) : volume < 50 ? (
        <Volume1 size={14} />
      ) : (
        <Volume2 size={14} />
      )}
    </button>

    <span
      style={{
        fontSize: '10px',
        color: 'rgba(255,255,255,0.35)',
        fontWeight: 500,
        flexShrink: 0,
        letterSpacing: '0.01em'
      }}
    >
      System
    </span>

    <input
      type="range"
      min={0}
      max={100}
      value={isMuted ? 0 : volume}
      onChange={(e) => onVolume(Number(e.target.value))}
      style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer', height: '3px' }}
      title={`System volume: ${volume}%`}
    />

    <span
      style={{
        fontSize: '10px',
        fontWeight: 600,
        color: isMuted ? 'rgba(255,80,80,0.8)' : 'var(--accent)',
        fontVariantNumeric: 'tabular-nums',
        minWidth: '28px',
        textAlign: 'right',
        flexShrink: 0
      }}
    >
      {isMuted ? 'Muted' : `${volume}%`}
    </span>
  </div>
)

/* ── Empty State ───────────────────────────────────────────────────── */
const EmptyMediaState: React.FC = () => (
  <div
    style={{
      padding: '32px 16px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      borderRadius: '12px',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px dashed rgba(255,255,255,0.07)'
    }}
  >
    <Music size={26} color="rgba(255,255,255,0.18)" />
    <div>
      <p
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: '4px'
        }}
      >
        No media playing
      </p>
      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
        Start playback in Spotify, a browser, VLC, or any media app
      </p>
    </div>
  </div>
)

/* ── Root Widget ───────────────────────────────────────────────────── */
export const MediaWidget: React.FC = () => {
  const { mediaState, setMediaState, accentPalette } = useIslandStore()
  const [isPending, setIsPending] = useState(false)

  // Keep ref for callback closure stability
  const isPendingRef = useRef(isPending)
  isPendingRef.current = isPending

  /* Live palette — updates whenever accent mode or wallpaper changes */
  const palette: PaletteTokens = {
    primary: accentPalette?.primary && accentPalette.primary !== '#BBFF00' ? accentPalette.primary : '#60A5FA',
    secondary: accentPalette?.secondary ?? '#818CF8',
    highlight: accentPalette?.highlight ?? '#A78BFA',
    glow: accentPalette?.glow ?? 'rgba(96, 165, 250, 0.16)',
    subtle: accentPalette?.subtle ?? 'rgba(96, 165, 250, 0.08)'
  }

  /* Build unified source list — preserves ALL simultaneous sessions */
  const sources: MediaSourceItem[] =
    mediaState?.sources && mediaState.sources.length > 0
      ? mediaState.sources
      : mediaState?.sessions && mediaState.sessions.length > 0
        ? mediaState.sessions.map((s) => ({
            id: s.sessionId,
            sourceType: 'media-session' as const,
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

  const isMasterMuted = mediaState?.isMuted ?? false
  const masterVolume = mediaState?.volume ?? 50

  const handleAction = useCallback(
    async (
      action: MediaControlAction,
      val?: number | boolean,
      sessionId?: string,
      processId?: number
    ): Promise<void> => {
      const isQuiet = action === 'volume' || action === 'app-volume' || action === 'seek'
      if (isPendingRef.current && !isQuiet) return
      if (!isQuiet) setIsPending(true)
      try {
        if (window.isDelulu) {
          const updated = await window.isDelulu.controlMedia(action, val, sessionId, processId)
          setMediaState(updated)
        }
      } finally {
        if (!isQuiet) setTimeout(() => setIsPending(false), 140)
      }
    },
    [setMediaState]
  )

  const scrollable = sources.length > 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
      {/* Per-session player cards */}
      {sources.length === 0 ? (
        <EmptyMediaState />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: scrollable ? '380px' : 'none',
            overflowY: scrollable ? 'auto' : 'visible',
            paddingRight: scrollable ? '2px' : 0
          }}
        >
          {sources.map((source) => (
            <MediaSourceCard
              key={source.id}
              source={source}
              onAction={handleAction}
              isPending={isPending}
              palette={palette}
            />
          ))}
        </div>
      )}

      {/* Windows master system volume — always shown, visually separate */}
      <SystemVolumeFooter
        volume={masterVolume}
        isMuted={isMasterMuted}
        onMute={() => handleAction('mute')}
        onVolume={(v) => handleAction('volume', v)}
      />
    </div>
  )
}

export default MediaWidget
