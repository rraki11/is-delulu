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
  DebugStatus
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
