export type IslandMode = 'hidden' | 'collapsed' | 'expanded'

export type ExpandedTab =
  | 'controls'
  | 'today'
  | 'stats'
  | 'clipboard'
  | 'apps'
  | 'wallpaper'
  | 'power'
  | 'music'
  | 'settings'
  | 'launcher'
  | 'calendar'
  | 'system'
  | 'media'
  | 'routines'

export type PowerAction = 'lock' | 'sleep' | 'restart' | 'shutdown'

export type QuickSettingTarget = 'wifi' | 'bluetooth' | 'audio' | 'nightlight'

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  title: string
  time?: string // e.g. "14:30" or "02:30 PM"
  completed?: boolean
  createdAt: number
}

export type ClockFormat = '12h' | '24h'
export type AppearanceMode = 'system' | 'light' | 'dark'

export type AccentThemeMode = 'wallpaper' | 'manual' | 'default'

export interface AccentPalette {
  primary: string
  primaryLight: string
  secondary: string
  highlight: string
  glow: string
  subtle: string
  border: string
  text: string
  sourceWallpaper?: string
}

export interface PerfMilestone {
  name: string
  timestamp: number
  elapsedSinceStartMs: number
  elapsedSincePrevMs: number
  metadata?: Record<string, unknown>
}

export interface AnimationMetrics {
  name: string
  durationMs: number
  totalFrames: number
  avgFps: number
  longFrames: number
  droppedFrames: number
  maxFrameDeltaMs: number
  p95FrameDeltaMs: number
  frameDeltas: number[]
}

export interface WallpaperItem {
  id: string
  name: string
  fileName: string
  filePath: string
  fileSize: number
  modifiedTime: number
}

export interface UserPreferences {
  userName: string
  clockFormat: ClockFormat
  appearance: AppearanceMode
  isPinned: boolean
  accentMode: AccentThemeMode
  manualAccentColor: string
  wallpaperFolderPath?: string
  selectedWallpaperPath?: string
}

export interface BatteryState {
  percent: number | null
  isCharging: boolean | null
  isFullyCharged: boolean | null
  isOnAC?: boolean | null
  /** Whether Windows Energy Saver is active */
  isEnergySaver?: boolean | null
  /** User-configured automatic Energy Saver threshold (e.g. 50), or null if not detected */
  energySaverThreshold?: number | null
  /** Minutes of discharge runtime remaining (only valid when discharging) */
  minutesRemaining: number | null
}

export interface TopAppItem {
  name: string
  ramPercent: number
  cpuPercent: number
  color?: string
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
  // Extended Hitodama metrics
  cpuFreqGhz?: number
  processCount?: number
  diskUsedGb?: number
  diskTotalGb?: number
  diskFreeGb?: number
  netDownloadKbps?: number
  netUploadKbps?: number
  topApps?: TopAppItem[]
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
  | 'previous'
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
  thumbnailUrl?: string
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
  thumbnailUrl?: string
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
  getExtendedStats?: () => Promise<SystemStats>
  onSystemStatsUpdate: (callback: (stats: SystemStats) => void) => () => void

  // Quick Controls & Power Actions
  executePowerAction?: (action: PowerAction) => Promise<ActionResult>
  openQuickSetting?: (target: QuickSettingTarget) => Promise<ActionResult>
  setMasterVolume?: (volume: number) => Promise<boolean>

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

  // Dynamic Wallpaper & Accent Theme
  getAccentPalette: () => Promise<AccentPalette>
  onAccentPaletteChanged: (callback: (palette: AccentPalette) => void) => () => void

  // Wallpaper Gallery
  selectWallpaperFolder: () => Promise<{
    canceled: boolean
    folderPath?: string
    images?: WallpaperItem[]
    error?: string
  }>
  getWallpaperImages: (folderPath?: string) => Promise<{
    success: boolean
    folderPath: string | null
    images: WallpaperItem[]
    error?: string
  }>
  getWallpaperThumbnail: (filePath: string) => Promise<{
    dataUrl: string | null
  }>
  applyDesktopWallpaper: (filePath: string) => Promise<{
    success: boolean
    message?: string
  }>
  getCurrentDesktopWallpaper: () => Promise<string | null>
  getWallpaperTransitionState?: () => Promise<string>

  // Battery & Notification System
  getBatteryState: () => Promise<BatteryState>
  onBatteryStateUpdate: (callback: (state: BatteryState) => void) => () => void
  onChargingTriggered?: (callback: (state: BatteryState) => void) => () => void
  onChargingPriority?: (callback: () => void) => () => void
  onEnergySaverChanged?: (
    callback: (data: { mode: 'on' | 'off'; threshold: number | null }) => void
  ) => () => void
  notifyChargingStarted?: () => Promise<void>
  notifyChargingEnded?: () => Promise<void>
  notifyNotificationStarted?: (type: 'charging' | 'energy_saver' | 'low_battery') => Promise<void>
  notifyNotificationEnded?: () => Promise<void>
  getWelcomeShown?: () => Promise<boolean>
  checkWelcome?: () => Promise<{ shouldWelcome: boolean }>
  markWelcomeShown?: () => Promise<void>
  onStartWelcome?: (callback: () => void) => () => void
  onLifecycleEvent?: (callback: (evt: { type: 'startup' | 'resume' }) => void) => () => void

  // Performance & Handshake
  notifyRendererReady?: () => Promise<void>
  getPerfMilestones?: () => Promise<PerfMilestone[]>
  getMainStartTime?: () => number
  recordAnimationMetrics?: (metrics: AnimationMetrics) => Promise<void>

  // Diagnostics & Debug
  simulateCursor?: (pt: { x: number; y: number } | null) => Promise<boolean>
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
