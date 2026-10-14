export type IslandMode = 'hidden' | 'collapsed' | 'expanded'

export type ExpandedTab = 'launcher' | 'clipboard' | 'system' | 'media' | 'routines' | 'settings'

export type ClockFormat = '12h' | '24h'
export type AppearanceMode = 'system' | 'light' | 'dark'

export interface UserPreferences {
  userName: string
  clockFormat: ClockFormat
  appearance: AppearanceMode
  isPinned: boolean
}

export interface SystemStats {
  cpuUsage: number // 0 - 100
  memoryUsedGb: number
  memoryTotalGb: number
  memoryPercent: number // 0 - 100
  platform: string
  arch: string
  hostname: string
  uptimeFormatted: string
  cpuModel: string
  batteryPercent: number | null
  isCharging: boolean | null
}

export interface ClipboardItem {
  id: string
  text: string
  preview: string
  timestamp: number
  type: 'url' | 'code' | 'text'
  charCount: number
}

export interface AppShortcut {
  id: string
  title: string
  category: 'system' | 'productivity' | 'dev' | 'media'
  icon: string
  description: string
  target: string
  isInstalledMock?: boolean
}

export interface CommandItem {
  id: string
  title: string
  category: 'action' | 'navigation' | 'setting'
  icon: string
  description: string
  keywords: string[]
  shortcut?: string
}

export type MediaControlAction =
  | 'toggle'
  | 'play'
  | 'pause'
  | 'next'
  | 'prev'
  | 'forward'
  | 'backward'
  | 'seek'
  | 'volume'
  | 'mute'
  | 'app-volume'
  | 'app-mute'

export interface MediaSourceItem {
  id: string
  sourceType: 'media-session' | 'audio-session'
  appId: string
  appName: string
  title: string
  artist: string
  album?: string
  status: 'Playing' | 'Paused' | 'Audible' | 'Audio Active' | 'Idle Audio' | 'Closed' | string
  isPlaying: boolean
  isAudioActive: boolean
  peakLevel: number
  positionSec: number
  durationSec: number
  canPlay: boolean
  canPause: boolean
  canNext: boolean
  canPrev: boolean
  canToggle: boolean
  canSeek: boolean
  canVolume: boolean
  appVolume?: number
  isAppMuted?: boolean
  processId?: number
  lastUpdated?: number
}

export interface MediaSessionItem {
  sessionId: string
  appId: string
  app: string
  title: string
  artist: string
  album?: string
  status: 'Playing' | 'Paused' | 'Stopped' | 'Closed' | string
  isPlaying: boolean
  positionSec: number
  durationSec: number
  canPlay: boolean
  canPause: boolean
  canNext: boolean
  canPrev: boolean
  canToggle: boolean
  canSeek: boolean
  appVolume?: number
  isAppMuted?: boolean
  processId?: number
  lastUpdated?: number
}

export interface AudioOutputItem {
  processId: number
  name: string
  displayName?: string
  peakLevel: number
  volume?: number
  isMuted?: boolean
  isActive: boolean
}

export interface MediaState {
  hasSession: boolean
  sources: MediaSourceItem[]
  sessions: MediaSessionItem[]
  activeSessionId?: string
  // Output sources from Windows Core Audio
  audioOutputs: AudioOutputItem[]
  // Windows Master System Volume
  volume: number // 0 - 100
  isMuted: boolean
  // Legacy / primary session fields for backwards compatibility
  sessionId?: string
  isPlaying: boolean
  title: string
  artist: string
  album?: string
  durationSec: number
  positionSec: number
  app?: string
  status?: string
  canPlay?: boolean
  canPause?: boolean
  canNext?: boolean
  canPrev?: boolean
  canToggle?: boolean
  canSeek?: boolean
}

export interface DesktopRoutine {
  id: string
  name: string
  description: string
  icon: string
  isActive: boolean
  tags: string[]
  steps: string[]
}

export interface ActionResult {
  success: boolean
  message: string
}

export interface WindowDimensions {
  width: number
  height: number
}

export interface IsDeluluAPI {
  // Window management
  setIslandMode: (mode: IslandMode) => Promise<void>
  getIslandMode: () => Promise<IslandMode>
  onIslandModeChanged: (callback: (mode: IslandMode) => void) => () => void
  onIslandReveal: (callback: () => void) => () => void
  onIslandHoverState: (callback: (isHovered: boolean) => void) => () => void
  resetPosition: () => Promise<void>
  minimizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isAlwaysOnTop: () => Promise<boolean>
  setAlwaysOnTop: (enabled: boolean) => Promise<void>
  setIgnoreMouseEvents: (ignore: boolean, forward?: boolean) => Promise<void>

  // System statistics
  getSystemStats: () => Promise<SystemStats>
  onSystemStatsUpdate: (callback: (stats: SystemStats) => void) => () => void

  // Clipboard operations
  getClipboardHistory: () => Promise<ClipboardItem[]>
  copyText: (text: string) => Promise<boolean>
  clearClipboard: () => Promise<boolean>
  onClipboardUpdate: (callback: (items: ClipboardItem[]) => void) => () => void

  // Launching & desktop integration
  launchShortcut: (shortcutId: string, target?: string) => Promise<ActionResult>
  runCommand: (commandId: string) => Promise<ActionResult>

  // Media
  getMediaState: () => Promise<MediaState>
  controlMedia: (
    action: MediaControlAction,
    value?: number | boolean,
    sessionId?: string,
    processId?: number
  ) => Promise<MediaState>
  onMediaStateUpdate: (callback: (media: MediaState) => void) => () => void

  // Routines
  getRoutines: () => Promise<DesktopRoutine[]>
  toggleRoutine: (routineId: string) => Promise<DesktopRoutine[]>

  // Preferences & personalization
  getPreferences: () => Promise<UserPreferences>
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<UserPreferences>
  onPreferencesChanged: (callback: (prefs: UserPreferences) => void) => () => void
  getResolvedTheme: () => Promise<'light' | 'dark'>
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => () => void

  // Diagnostics & Debug
  toggleForceVisibleDebug: () => Promise<boolean>
  getDebugStatus: () => Promise<DebugStatus>
  onForceVisibleChanged: (callback: (isForced: boolean) => void) => () => void
}

export interface DebugStatus {
  forceVisible: boolean
  mode: IslandMode
  bounds: { x: number; y: number; width: number; height: number }
  cursor: { x: number; y: number }
}
