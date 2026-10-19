import { contextBridge, ipcRenderer } from 'electron'
import {
  IsDeluluAPI,
  IslandMode,
  SystemStats,
  ClipboardItem,
  ActionResult,
  MediaState,
  MediaControlAction,
  DesktopRoutine,
  UserPreferences,
  DebugStatus,
  AccentPalette,
  BatteryState,
  WallpaperItem
} from '../shared/types'

const isDeluluAPI: IsDeluluAPI = {
  // Window management
  setIslandMode: (mode: IslandMode): Promise<void> => {
    return ipcRenderer.invoke('island:set-mode', mode)
  },
  getIslandMode: (): Promise<IslandMode> => {
    return ipcRenderer.invoke('island:get-mode')
  },
  onIslandModeChanged: (callback: (mode: IslandMode) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, mode: IslandMode): void => {
      callback(mode)
    }
    ipcRenderer.on('island:mode-changed', handler)
    return () => {
      ipcRenderer.removeListener('island:mode-changed', handler)
    }
  },
  onIslandReveal: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('island:reveal', handler)
    return () => {
      ipcRenderer.removeListener('island:reveal', handler)
    }
  },
  onIslandHoverState: (callback: (isHovered: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isHovered: boolean): void => {
      callback(isHovered)
    }
    ipcRenderer.on('island:hover-state', handler)
    return () => {
      ipcRenderer.removeListener('island:hover-state', handler)
    }
  },
  resetPosition: (): Promise<void> => {
    return ipcRenderer.invoke('island:reset-position')
  },
  minimizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke('island:minimize')
  },
  closeWindow: (): Promise<void> => {
    return ipcRenderer.invoke('island:close')
  },
  isAlwaysOnTop: (): Promise<boolean> => {
    return ipcRenderer.invoke('island:is-always-on-top')
  },
  setAlwaysOnTop: (enabled: boolean): Promise<void> => {
    return ipcRenderer.invoke('island:set-always-on-top', enabled)
  },
  setIgnoreMouseEvents: (ignore: boolean, forward = true): Promise<void> => {
    return ipcRenderer.invoke('window:set-ignore-mouse-events', ignore, forward)
  },

  // System stats
  getSystemStats: (): Promise<SystemStats> => {
    return ipcRenderer.invoke('system:get-stats')
  },
  onSystemStatsUpdate: (callback: (stats: SystemStats) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, stats: SystemStats): void => {
      callback(stats)
    }
    ipcRenderer.on('system:update', handler)
    return () => {
      ipcRenderer.removeListener('system:update', handler)
    }
  },

  // Clipboard operations
  getClipboardHistory: (): Promise<ClipboardItem[]> => {
    return ipcRenderer.invoke('clipboard:get-history')
  },
  copyText: (text: string): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:copy', text)
  },
  clearClipboard: (): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:clear')
  },
  onClipboardUpdate: (callback: (items: ClipboardItem[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, items: ClipboardItem[]): void => {
      callback(items)
    }
    ipcRenderer.on('clipboard:update', handler)
    return () => {
      ipcRenderer.removeListener('clipboard:update', handler)
    }
  },

  // Launcher & desktop integration
  launchShortcut: (shortcutId: string, target?: string): Promise<ActionResult> => {
    return ipcRenderer.invoke('launcher:open-target', target || shortcutId)
  },
  runCommand: (commandId: string): Promise<ActionResult> => {
    return ipcRenderer.invoke('launcher:run-command', commandId)
  },

  // Media
  getMediaState: (): Promise<MediaState> => {
    return ipcRenderer.invoke('media:get-state')
  },
  controlMedia: (
    action: MediaControlAction,
    value?: number | boolean,
    sessionId?: string,
    processId?: number
  ): Promise<MediaState> => {
    return ipcRenderer.invoke('media:control', action, value, sessionId, processId)
  },
  onMediaStateUpdate: (callback: (media: MediaState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, media: MediaState): void => {
      callback(media)
    }
    ipcRenderer.on('media:update', handler)
    return () => {
      ipcRenderer.removeListener('media:update', handler)
    }
  },

  // Routines
  getRoutines: (): Promise<DesktopRoutine[]> => {
    return ipcRenderer.invoke('routines:get')
  },
  toggleRoutine: (routineId: string): Promise<DesktopRoutine[]> => {
    return ipcRenderer.invoke('routines:toggle', routineId)
  },

  // Preferences & personalization
  getPreferences: (): Promise<UserPreferences> => {
    return ipcRenderer.invoke('preferences:get')
  },
  updatePreferences: (prefs: Partial<UserPreferences>): Promise<UserPreferences> => {
    return ipcRenderer.invoke('preferences:update', prefs)
  },
  onPreferencesChanged: (callback: (prefs: UserPreferences) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, prefs: UserPreferences): void => {
      callback(prefs)
    }
    ipcRenderer.on('preferences:changed', handler)
    return () => {
      ipcRenderer.removeListener('preferences:changed', handler)
    }
  },
  getResolvedTheme: (): Promise<'light' | 'dark'> => {
    return ipcRenderer.invoke('theme:get-resolved')
  },
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, theme: 'light' | 'dark'): void => {
      callback(theme)
    }
    ipcRenderer.on('theme:changed', handler)
    return () => {
      ipcRenderer.removeListener('theme:changed', handler)
    }
  },

  // Dynamic Wallpaper & Accent Theme
  getAccentPalette: (): Promise<AccentPalette> => {
    return ipcRenderer.invoke('theme:get-accent-palette')
  },
  onAccentPaletteChanged: (callback: (palette: AccentPalette) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, palette: AccentPalette): void => {
      callback(palette)
    }
    ipcRenderer.on('theme:accent-updated', handler)
    return () => {
      ipcRenderer.removeListener('theme:accent-updated', handler)
    }
  },

  // Wallpaper Gallery
  selectWallpaperFolder: (): Promise<{
    canceled: boolean
    folderPath?: string
    images?: WallpaperItem[]
    error?: string
  }> => {
    return ipcRenderer.invoke('wallpaper:select-folder')
  },
  getWallpaperImages: (
    folderPath?: string
  ): Promise<{
    success: boolean
    folderPath: string | null
    images: WallpaperItem[]
    error?: string
  }> => {
    return ipcRenderer.invoke('wallpaper:get-images', folderPath)
  },
  getWallpaperThumbnail: (
    filePath: string
  ): Promise<{
    dataUrl: string | null
  }> => {
    return ipcRenderer.invoke('wallpaper:get-thumbnail', filePath)
  },
  applyDesktopWallpaper: (
    filePath: string
  ): Promise<{
    success: boolean
    message?: string
  }> => {
    return ipcRenderer.invoke('wallpaper:apply-desktop', filePath)
  },
  getCurrentDesktopWallpaper: (): Promise<string | null> => {
    return ipcRenderer.invoke('wallpaper:get-current-desktop')
  },

  // Battery & Charging Notification
  getBatteryState: (): Promise<BatteryState> => {
    return ipcRenderer.invoke('battery:get-state')
  },
  onBatteryStateUpdate: (callback: (state: BatteryState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: BatteryState): void => {
      callback(state)
    }
    ipcRenderer.on('battery:update', handler)
    return () => {
      ipcRenderer.removeListener('battery:update', handler)
    }
  },
  onChargingTriggered: (callback: (state: BatteryState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: BatteryState): void => {
      callback(state)
    }
    ipcRenderer.on('battery:charging-started', handler)
    return () => {
      ipcRenderer.removeListener('battery:charging-started', handler)
    }
  },
  onChargingPriority: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('island:charging-priority', handler)
    return () => {
      ipcRenderer.removeListener('island:charging-priority', handler)
    }
  },
  onEnergySaverChanged: (
    callback: (data: { mode: 'on' | 'off'; threshold: number | null }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { mode: 'on' | 'off'; threshold: number | null }
    ): void => {
      callback(data)
    }
    ipcRenderer.on('battery:energy-saver-changed', handler)
    return () => {
      ipcRenderer.removeListener('battery:energy-saver-changed', handler)
    }
  },
  notifyChargingStarted: (): Promise<void> => {
    return ipcRenderer.invoke('battery:charging-started')
  },
  notifyChargingEnded: (): Promise<void> => {
    return ipcRenderer.invoke('battery:charging-ended')
  },
  notifyNotificationStarted: (type: 'charging' | 'energy_saver' | 'low_battery'): Promise<void> => {
    return ipcRenderer.invoke('battery:notification-started', type)
  },
  notifyNotificationEnded: (): Promise<void> => {
    return ipcRenderer.invoke('battery:notification-ended')
  },

  getWelcomeShown: (): Promise<boolean> => {
    return ipcRenderer.invoke('island:get-welcome-shown')
  },
  checkWelcome: (): Promise<{ shouldWelcome: boolean }> => {
    return ipcRenderer.invoke('island:check-welcome')
  },
  markWelcomeShown: (): Promise<void> => {
    return ipcRenderer.invoke('island:mark-welcome-shown')
  },
  onStartWelcome: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('island:start-welcome', handler)
    return () => {
      ipcRenderer.removeListener('island:start-welcome', handler)
    }
  },
  onLifecycleEvent: (callback: (evt: { type: 'startup' | 'resume' }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, evt: { type: 'startup' | 'resume' }): void => {
      callback(evt)
    }
    ipcRenderer.on('island:lifecycle-event', handler)
    return () => {
      ipcRenderer.removeListener('island:lifecycle-event', handler)
    }
  },

  // Diagnostics & Debug
  toggleForceVisibleDebug: (): Promise<boolean> => {
    return ipcRenderer.invoke('debug:toggle-force-visible')
  },
  getDebugStatus: (): Promise<DebugStatus> => {
    return ipcRenderer.invoke('debug:get-status')
  },
  onForceVisibleChanged: (callback: (isForced: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isForced: boolean): void => {
      callback(isForced)
    }
    ipcRenderer.on('debug:force-visible-changed', handler)
    return () => {
      ipcRenderer.removeListener('debug:force-visible-changed', handler)
    }
  }
}

try {
  contextBridge.exposeInMainWorld('isDelulu', isDeluluAPI)
} catch (error) {
  console.error('Failed to expose isDelulu API in main world:', error)
}
