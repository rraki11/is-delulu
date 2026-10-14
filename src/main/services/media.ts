import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'
import {
  MediaState,
  MediaSourceItem,
  MediaSessionItem,
  AudioOutputItem,
  MediaControlAction
} from '../../shared/types'
import { MediaSessionService } from './media-session'
import { AudioSessionService } from './audio-session'

const mediaSessionService = new MediaSessionService()
const audioSessionService = new AudioSessionService()

let daemonProc: ChildProcess | null = null
let mediaChangeListeners: ((state: MediaState) => void)[] = []
let isStarting = false

let currentMedia: MediaState = {
  hasSession: false,
  sources: [],
  sessions: [],
  audioOutputs: [],
  activeSessionId: '',
  isPlaying: false,
  title: 'No media active',
  artist: 'Desktop Audio Idle',
  durationSec: 0,
  positionSec: 0,
  volume: 75,
  isMuted: false,
  app: '',
  status: 'Closed'
}

export function onMediaChange(listener: (state: MediaState) => void): () => void {
  mediaChangeListeners.push(listener)
  return () => {
    mediaChangeListeners = mediaChangeListeners.filter((l) => l !== listener)
  }
}

function broadcastMedia(state: MediaState): void {
  currentMedia = { ...state }
  for (const listener of mediaChangeListeners) {
    try {
      listener(currentMedia)
    } catch (err) {
      console.error('[is-delulu:media] Listener error:', err)
    }
  }
}

function resolveDaemonPath(): string | null {
  const possiblePaths = [
    join(__dirname, 'services/gsmtc-daemon.ps1'),
    join(__dirname, 'gsmtc-daemon.ps1'),
    join(app.getAppPath(), 'src/main/services/gsmtc-daemon.ps1'),
    join(app.getAppPath(), 'out/main/services/gsmtc-daemon.ps1'),
    join(process.cwd(), 'src/main/services/gsmtc-daemon.ps1')
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return null
}

export function startMediaMonitor(): void {
  if (daemonProc && !daemonProc.killed) return
  if (isStarting) return
  isStarting = true

  const scriptPath = resolveDaemonPath()
  if (!scriptPath) {
    console.error('[is-delulu:media] Could not find gsmtc-daemon.ps1')
    isStarting = false
    return
  }

  console.log('[is-delulu:media] Spawning Windows GSMTC & Audio daemon:', scriptPath)

  try {
    daemonProc = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      {
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true
      }
    )

    isStarting = false

    let lineBuffer = ''

    daemonProc.stdout?.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString('utf8')
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || ''

      for (const rawLine of lines) {
        const trimmed = rawLine.trim()
        if (!trimmed.startsWith('{')) continue
        try {
          const payload = JSON.parse(trimmed)
          if (payload.type === 'media') {
            const rawSessions = Array.isArray(payload.sessions) ? payload.sessions : []
            const sessions: MediaSessionItem[] = rawSessions.map((s: Record<string, unknown>) => ({
              sessionId: String(s.sessionId || s.appId || ''),
              appId: String(s.appId || ''),
              app: String(s.app || ''),
              title: String(s.title || 'Active Playback'),
              artist: String(s.artist || s.app || ''),
              album: s.album ? String(s.album) : undefined,
              status: String(s.status || 'Closed'),
              isPlaying: Boolean(s.isPlaying),
              positionSec: Number(s.positionSec) || 0,
              durationSec: Number(s.durationSec) || 0,
              canPlay: s.canPlay !== undefined ? Boolean(s.canPlay) : true,
              canPause: s.canPause !== undefined ? Boolean(s.canPause) : true,
              canNext: s.canNext !== undefined ? Boolean(s.canNext) : true,
              canPrev: s.canPrev !== undefined ? Boolean(s.canPrev) : true,
              canToggle: s.canToggle !== undefined ? Boolean(s.canToggle) : true,
              canSeek: s.canSeek !== undefined ? Boolean(s.canSeek) : Boolean(Number(s.durationSec) > 0),
              appVolume: typeof s.appVolume === 'number' ? s.appVolume : undefined,
              isAppMuted: typeof s.isAppMuted === 'boolean' ? s.isAppMuted : undefined,
              processId: typeof s.processId === 'number' ? s.processId : undefined,
              lastUpdated: s.lastUpdated ? Number(s.lastUpdated) : Date.now()
            }))

            const rawOutputs = Array.isArray(payload.audioOutputs) ? payload.audioOutputs : []
            const audioOutputs: AudioOutputItem[] = rawOutputs.map((o: Record<string, unknown>) => ({
              processId: Number(o.processId) || 0,
              name: String(o.name || ''),
              displayName: o.displayName ? String(o.displayName) : undefined,
              peakLevel: Number(o.peakLevel) || 0,
              volume: typeof o.volume === 'number' ? o.volume : 100,
              isMuted: Boolean(o.isMuted),
              isActive: Boolean(o.isActive)
            }))

            const rawSources = Array.isArray(payload.sources) ? payload.sources : []
            const sources: MediaSourceItem[] = rawSources.map((src: Record<string, unknown>) => ({
              id: String(src.id || src.sessionId || src.appId || ''),
              sourceType: (src.sourceType === 'audio-session' ? 'audio-session' : 'media-session') as 'media-session' | 'audio-session',
              appId: String(src.appId || ''),
              appName: String(src.appName || src.app || ''),
              title: String(src.title || 'Active Playback'),
              artist: String(src.artist || src.appName || ''),
              album: src.album ? String(src.album) : undefined,
              status: String(src.status || 'Closed'),
              isPlaying: Boolean(src.isPlaying),
              isAudioActive: Boolean(src.isAudioActive),
              peakLevel: Number(src.peakLevel) || 0,
              positionSec: Number(src.positionSec) || 0,
              durationSec: Number(src.durationSec) || 0,
              canPlay: Boolean(src.canPlay),
              canPause: Boolean(src.canPause),
              canNext: Boolean(src.canNext),
              canPrev: Boolean(src.canPrev),
              canToggle: Boolean(src.canToggle),
              canSeek: Boolean(src.canSeek),
              canVolume: Boolean(src.canVolume),
              appVolume: typeof src.appVolume === 'number' ? src.appVolume : 100,
              isAppMuted: Boolean(src.isAppMuted),
              processId: typeof src.processId === 'number' ? src.processId : undefined,
              lastUpdated: src.lastUpdated ? Number(src.lastUpdated) : Date.now()
            }))

            // Update individual services
            mediaSessionService.updateSessions(sessions, payload.activeSessionId)
            audioSessionService.updateOutputs(audioOutputs, payload.volume, payload.isMuted)

            const activeSession = mediaSessionService.getActiveSession()

            broadcastMedia({
              hasSession: sources.length > 0 || sessions.length > 0,
              sources,
              sessions,
              activeSessionId: mediaSessionService.getActiveSessionId(),
              audioOutputs,
              volume: audioSessionService.getMasterVolume(),
              isMuted: audioSessionService.isMasterMuted(),
              // Legacy backwards compatibility fields
              sessionId: activeSession?.sessionId ?? '',
              isPlaying: Boolean(payload.isPlaying ?? activeSession?.isPlaying),
              title: payload.title || (activeSession?.title ?? 'No media active'),
              artist: payload.artist || (activeSession?.artist ?? 'Desktop Audio Idle'),
              album: payload.album || activeSession?.album,
              durationSec: Number(payload.durationSec) || activeSession?.durationSec || 0,
              positionSec: Number(payload.positionSec) || activeSession?.positionSec || 0,
              app: payload.app || (activeSession?.app ?? ''),
              status: payload.status || (activeSession?.status ?? 'Closed'),
              canPlay: activeSession?.canPlay ?? false,
              canPause: activeSession?.canPause ?? false,
              canNext: activeSession?.canNext ?? false,
              canPrev: activeSession?.canPrev ?? false,
              canToggle: activeSession?.canToggle ?? false,
              canSeek: activeSession?.canSeek ?? false
            })
          }
        } catch {
          // ignore transient parse error
        }
      }
    })

    daemonProc.on('exit', (code) => {
      console.log(`[is-delulu:media] GSMTC daemon exited with code ${code}`)
      daemonProc = null
      setTimeout(() => {
        startMediaMonitor()
      }, 2000)
    })

    daemonProc.on('error', (err) => {
      console.error('[is-delulu:media] Failed to spawn GSMTC daemon:', err)
      daemonProc = null
      isStarting = false
    })
  } catch (err) {
    console.error('[is-delulu:media] Error initiating media monitor:', err)
    daemonProc = null
    isStarting = false
  }
}

export function stopMediaMonitor(): void {
  if (daemonProc) {
    try {
      daemonProc.kill()
    } catch {}
    daemonProc = null
  }
}

let lastCommandTime = 0
let lastCommandAction = ''

export function getMediaState(): MediaState {
  return { ...currentMedia }
}

export function controlMedia(
  action: MediaControlAction,
  value?: number | boolean,
  sessionId?: string,
  processId?: number
): MediaState {
  const now = Date.now()
  const targetKey = `${action}:${sessionId || 'global'}:${processId || 'none'}`

  // Guard against accidental double-clicks (debounce per action+session by 100ms)
  if (action !== 'volume' && action !== 'app-volume' && action !== 'seek' && targetKey === lastCommandAction && now - lastCommandTime < 100) {
    return { ...currentMedia }
  }
  lastCommandTime = now
  lastCommandAction = targetKey

  // Optimistic UI updates
  if (action === 'volume' && typeof value === 'number') {
    audioSessionService.applyOptimisticMasterVolume(value)
    currentMedia.volume = audioSessionService.getMasterVolume()
    currentMedia.isMuted = audioSessionService.isMasterMuted()
    broadcastMedia(currentMedia)
  } else if (action === 'mute') {
    audioSessionService.applyOptimisticMasterMute(typeof value === 'boolean' ? value : undefined)
    currentMedia.isMuted = audioSessionService.isMasterMuted()
    broadcastMedia(currentMedia)
  } else if (action === 'app-volume' && typeof processId === 'number' && typeof value === 'number') {
    audioSessionService.applyOptimisticAppVolume(processId, value)
    const src = currentMedia.sources.find((s) => s.processId === processId || s.id === sessionId)
    if (src) {
      src.appVolume = Math.max(0, Math.min(100, Math.round(value)))
      src.isAppMuted = src.appVolume === 0
    }
    broadcastMedia(currentMedia)
  } else if (action === 'app-mute' && typeof processId === 'number') {
    audioSessionService.applyOptimisticAppMute(processId, typeof value === 'boolean' ? value : undefined)
    const src = currentMedia.sources.find((s) => s.processId === processId || s.id === sessionId)
    if (src) {
      src.isAppMuted = typeof value === 'boolean' ? value : !src.isAppMuted
    }
    broadcastMedia(currentMedia)
  } else {
    // Media session transport action
    const updatedSession = mediaSessionService.applyOptimisticTransport(action, sessionId, value)
    if (updatedSession) {
      const src = currentMedia.sources.find((s) => s.id === sessionId || s.appId === sessionId)
      if (src) {
        src.isPlaying = updatedSession.isPlaying
        src.status = updatedSession.status
        src.positionSec = updatedSession.positionSec
      }
      if (updatedSession.sessionId === currentMedia.activeSessionId || !currentMedia.activeSessionId) {
        currentMedia.isPlaying = updatedSession.isPlaying
        currentMedia.status = updatedSession.status
        currentMedia.positionSec = updatedSession.positionSec
      }
      broadcastMedia(currentMedia)
    }
  }

  // Forward command payload to native daemon
  if (daemonProc && daemonProc.stdin && daemonProc.stdin.writable) {
    try {
      const cmdPayload = JSON.stringify({
        action,
        value,
        sessionId: sessionId || currentMedia.activeSessionId || null,
        processId: processId ?? null
      })
      daemonProc.stdin.write(`${cmdPayload}\n`)
    } catch (err) {
      console.error('[is-delulu:media] Failed to write command to daemon:', err)
    }
  }

  return { ...currentMedia }
}
