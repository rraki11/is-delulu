import { app, BrowserWindow, ipcMain, globalShortcut, screen, powerMonitor } from 'electron'
import {
  createMainWindow,
  getMainWindow,
  getCurrentIslandMode,
  setIslandWindowMode,
  enforceCenteredPosition,
  stopActivationMonitor,
  toggleForceVisibleDebug,
  isForceVisibleActive,
  showChargingNotificationWindow,
  hideChargingNotificationWindow,
  showNotificationWindow,
  hideNotificationWindow,
  getHasShownWelcome,
  markWelcomeShown,
  resetWelcomeShownForResume,
  showIslandWindowForWelcome,
  handleRendererReady
} from './window'
import { setupTray } from './tray'
import { getSystemStats } from './services/system'
import {
  startClipboardMonitor,
  stopClipboardMonitor,
  setClipboardPollInterval,
  getClipboardHistory,
  copyText,
  clearClipboard,
  onClipboardChange
} from './services/clipboard'
import { launchTarget } from './services/launcher'
import {
  getMediaState,
  controlMedia,
  startMediaMonitor,
  stopMediaMonitor,
  onMediaChange
} from './services/media'
import { getRoutines, toggleRoutine } from './services/routines'
import {
  initPreferences,
  getPreferences,
  updatePreferences,
  getResolvedTheme,
  onPreferencesChange,
  onThemeChange
} from './services/preferences'
import {
  resolveActivePalette,
  startWallpaperMonitor,
  stopWallpaperMonitor
} from './services/wallpaper'
import {
  startBatteryMonitor,
  stopBatteryMonitor,
  getBatteryState,
  requestBatteryRefresh
} from './services/battery'
import {
  selectWallpaperFolder,
  getSavedWallpaperImages,
  getWallpaperThumbnail,
  applyWallpaperAsDesktop,
  getCurrentDesktopWallpaper,
  cleanUpWallpaperTransition,
  getWallpaperTransitionState
} from './services/wallpaperGallery'
import { IslandMode, UserPreferences, MediaControlAction } from '../shared/types'
import { perfTracker } from '../shared/perf'

app.setName('is-delulu')

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  // NOTE: Do NOT call app.disableHardwareAcceleration().
  // Disabling hardware acceleration on Windows disables DirectComposition alpha blending,
  // which causes transparent windows to render with a solid default gray background brush.
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

  // App lifecycle
  app.whenReady().then(() => {
    perfTracker.record('main_process_ready')

    // Initialize persistent user preferences
    initPreferences()

    const mainWindow = createMainWindow()

    try {
      setupTray()
    } catch (trayErr) {
      console.warn('[is-delulu] Tray icon setup deferred:', trayErr)
    }

    // Handshake: renderer signals ready when React root has mounted and drawn the initial frame
    ipcMain.handle('app:renderer-ready', () => {
      handleRendererReady()
    })

    ipcMain.handle('debug:get-perf-milestones', () => {
      return perfTracker.getMilestones()
    })

    ipcMain.on('debug:get-main-start-time', (event) => {
      event.returnValue = perfTracker.getStartTime()
    })

    ipcMain.handle('debug:record-animation-metrics', (_event, metrics) => {
      console.log('[MAIN ANIMATION LOG]', JSON.stringify(metrics))
    })

    // Start background services in phased stages so cold-start and Windows startup
    // remain completely responsive without CPU or disk contention.
    let sysTimer: NodeJS.Timeout | null = null

    // Stage 1 (150ms after window creation): Real-time battery and wallpaper monitor
    setTimeout(() => {
      let previousPowerConnected: boolean | null = null
      let previousEnergySaver: boolean | null = null
      let isInitialBatteryCheck = true

      startBatteryMonitor((batteryState) => {
        if (!mainWindow || mainWindow.isDestroyed()) return

        const isConnected = batteryState.isOnAC === true || batteryState.isCharging === true
        const wasConnected = previousPowerConnected
        const isNowConnected = isConnected

        const currentEnergySaver = batteryState.isEnergySaver
        const wasEnergySaver = previousEnergySaver

        if (isInitialBatteryCheck) {
          isInitialBatteryCheck = false
          previousPowerConnected = isNowConnected
          if (currentEnergySaver !== null && currentEnergySaver !== undefined) {
            previousEnergySaver = currentEnergySaver
          }
          console.log(
            `[is-delulu:battery] Initial battery sync: pct=${batteryState.percent}%, AC=${batteryState.isOnAC}, charging=${batteryState.isCharging}, energySaver=${currentEnergySaver}`
          )
          mainWindow.webContents.send('battery:update', batteryState)
          return
        }

        // Genuine plug-in transition: false -> true, strictly excluding startup state
        const isNewPlugIn = wasConnected === false && isNowConnected === true
        previousPowerConnected = isNowConnected

        if (isNewPlugIn) {
          console.log('[is-delulu:battery] Genuine charger connection detected! Automatically revealing window.')
          showChargingNotificationWindow()
        }

        // Energy Saver state transitions: OFF -> ON and ON -> OFF
        let energySaverTransition: 'on' | 'off' | null = null
        if (
          currentEnergySaver !== null &&
          currentEnergySaver !== undefined &&
          wasEnergySaver !== null &&
          wasEnergySaver !== undefined
        ) {
          if (!wasEnergySaver && currentEnergySaver === true) {
            energySaverTransition = 'on'
          } else if (wasEnergySaver === true && currentEnergySaver === false) {
            energySaverTransition = 'off'
          }
        }

        if (currentEnergySaver !== null && currentEnergySaver !== undefined) {
          previousEnergySaver = currentEnergySaver
        }

        if (energySaverTransition === 'on') {
          console.log(
            `[is-delulu:battery] Energy Saver transition OFF -> ON detected! Revealing window for notification (thresh=${batteryState.energySaverThreshold})`
          )
          showNotificationWindow('energy_saver')
        } else if (energySaverTransition === 'off') {
          console.log(
            `[is-delulu:battery] Energy Saver transition ON -> OFF detected! Revealing window for notification (thresh=${batteryState.energySaverThreshold})`
          )
          showNotificationWindow('energy_saver')
        }

        mainWindow.webContents.send('battery:update', batteryState)
        if (isNewPlugIn) {
          mainWindow.webContents.send('battery:charging-started', batteryState)
        }
        if (energySaverTransition) {
          mainWindow.webContents.send('battery:energy-saver-changed', {
            mode: energySaverTransition,
            threshold: batteryState.energySaverThreshold
          })
        }
      })

      // Start real-time desktop wallpaper change monitor
      startWallpaperMonitor((palette) => {
        const prefs = getPreferences()
        if (prefs.accentMode === 'wallpaper' && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('theme:accent-updated', palette)
        }
      })
    }, 150)

    // Stage 2 (1400ms after window creation): GSMTC media daemon, clipboard history, telemetry
    // Deferred until entrance slide settles so child process creation doesn't drop animation frames.
    setTimeout(() => {
      startClipboardMonitor()
      startMediaMonitor()

      // Stream periodic system metrics gently (every 3s)
      sysTimer = setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const stats = getSystemStats()
          mainWindow.webContents.send('system:update', stats)
        }
      }, 3000)

      perfTracker.record('background_services_ready')
    }, 1400)

    // Windows power suspend and resume lifecycle monitoring
    try {
      powerMonitor.on('suspend', () => {
        console.log('[is-delulu:lifecycle] Windows suspend event detected: system entering sleep/hibernation.')
      })

      powerMonitor.on('resume', () => {
        console.log('[is-delulu:lifecycle] Windows resume event detected: system resumed from sleep.')
        // Reset welcome tracking so the resume greeting can play once
        resetWelcomeShownForResume()
        showIslandWindowForWelcome()
        // Immediately refresh battery status to reconcile state changes during sleep
        requestBatteryRefresh()
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('island:lifecycle-event', { type: 'resume' })
        }
      })
    } catch (err) {
      console.warn('[is-delulu:lifecycle] powerMonitor suspend/resume hooks unavailable:', err)
    }

    // Register global hotkey to toggle / summon island
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      const current = getCurrentIslandMode()
      const next: IslandMode = current === 'expanded' ? 'collapsed' : 'expanded'
      setIslandWindowMode(next)
      mainWindow.webContents.send('island:mode-changed', next)
      mainWindow.show()
      mainWindow.focus()
    })

    // Register development debug hotkey to force island visible
    globalShortcut.register('CommandOrControl+Shift+D', () => {
      const isForced = toggleForceVisibleDebug()
      mainWindow.webContents.send('debug:force-visible-changed', isForced)
    })

    // Stream clipboard changes to renderer
    onClipboardChange((items) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard:update', items)
      }
    })

    // Stream real GSMTC media changes to renderer
    onMediaChange((media) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media:update', media)
      }
    })

    // Stream preference changes to renderer
    onPreferencesChange((prefs) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('preferences:changed', prefs)
      }
    })

    // Stream theme changes to renderer
    onThemeChange((theme) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('theme:changed', theme)
      }
    })

    app.on('before-quit', () => {
      if (sysTimer) clearInterval(sysTimer)
      stopActivationMonitor()
      stopClipboardMonitor()
      stopMediaMonitor()
      stopBatteryMonitor()
      stopWallpaperMonitor()
      cleanUpWallpaperTransition()
      globalShortcut.unregisterAll()
    })

    // IPC Handlers - Window & Island Mode
    ipcMain.handle('island:set-mode', (_event, mode: IslandMode) => {
      setIslandWindowMode(mode)
      if (mode === 'expanded') {
        setClipboardPollInterval(600)
      } else {
        setClipboardPollInterval(2000)
      }
    })

  ipcMain.handle('island:get-mode', () => {
    return getCurrentIslandMode()
  })

  ipcMain.handle('island:reset-position', () => {
    enforceCenteredPosition()
  })

  ipcMain.handle('island:minimize', () => {
    setIslandWindowMode('collapsed')
    mainWindow.webContents.send('island:mode-changed', 'collapsed')
  })

  ipcMain.handle('island:close', () => {
    const prefs = getPreferences()
    if (prefs.isPinned) {
      setIslandWindowMode('collapsed')
      mainWindow.webContents.send('island:mode-changed', 'collapsed')
    } else {
      setIslandWindowMode('hidden')
      mainWindow.webContents.send('island:mode-changed', 'hidden')
    }
  })

  ipcMain.handle('island:is-always-on-top', () => {
    return mainWindow.isAlwaysOnTop()
  })

  ipcMain.handle('island:set-always-on-top', (_event, enabled: boolean) => {
    mainWindow.setAlwaysOnTop(Boolean(enabled), 'screen-saver')
    updatePreferences({ isPinned: Boolean(enabled) })
  })

  // Set click-through for transparent window regions
  ipcMain.handle('window:set-ignore-mouse-events', (_event, ignore: boolean, forward = true) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(Boolean(ignore), { forward: Boolean(forward) })
    }
  })

  // Auto-collapse when clicking outside into another app (unless pinned)
  mainWindow.on('blur', () => {
    const prefs = getPreferences()
    if (!prefs.isPinned && getCurrentIslandMode() === 'expanded') {
      mainWindow.webContents.send('island:mode-changed', 'collapsed')
    }
  })

  // Preferences IPC Handlers
  ipcMain.handle('preferences:get', () => {
    return getPreferences()
  })

  ipcMain.handle('preferences:update', (_event, partial: Partial<UserPreferences>) => {
    const updated = updatePreferences(partial)
    if (partial.isPinned !== undefined) {
      mainWindow.setAlwaysOnTop(Boolean(partial.isPinned), 'screen-saver')
    }
    if (partial.accentMode !== undefined || partial.manualAccentColor !== undefined) {
      const palette = resolveActivePalette(updated)
      mainWindow.webContents.send('theme:accent-updated', palette)
    }
    return updated
  })

  ipcMain.handle('theme:get-resolved', () => {
    return getResolvedTheme()
  })

  ipcMain.handle('theme:get-accent-palette', () => {
    return resolveActivePalette(getPreferences())
  })

  // System stats
  ipcMain.handle('system:get-stats', () => {
    return getSystemStats()
  })

  // Clipboard operations
  ipcMain.handle('clipboard:get-history', () => {
    return getClipboardHistory()
  })

  ipcMain.handle('clipboard:copy', (_event, text: string) => {
    if (typeof text !== 'string') return false
    return copyText(text)
  })

  ipcMain.handle('clipboard:clear', () => {
    return clearClipboard()
  })

  // Launcher actions
  ipcMain.handle('launcher:open-target', async (_event, target: string) => {
    if (typeof target !== 'string') {
      return { success: false, message: 'Invalid target parameter' }
    }
    return launchTarget(target)
  })

  ipcMain.handle('launcher:run-command', async (_event, commandId: string) => {
    switch (commandId) {
      case 'cmd-top': {
        const prefs = getPreferences()
        const next = !prefs.isPinned
        updatePreferences({ isPinned: next })
        return { success: true, message: `Pinned on top: ${next ? 'Enabled' : 'Disabled'}` }
      }
      case 'cmd-clear-clip': {
        clearClipboard()
        return { success: true, message: 'Clipboard cleared' }
      }
      case 'cmd-open-downloads': {
        return launchTarget('downloads')
      }
      case 'cmd-open-calc': {
        return launchTarget('calc.exe')
      }
      case 'cmd-open-taskmgr': {
        return launchTarget('taskmgr.exe')
      }
      case 'cmd-copy-sysinfo': {
        const stats = getSystemStats()
        const summary = `is-delulu Telemetry:\nOS: ${stats.platform} (${stats.arch})\nCPU: ${stats.cpuModel} (${stats.cpuUsage}%)\nMemory: ${stats.memoryUsedGb} GB / ${stats.memoryTotalGb} GB (${stats.memoryPercent}%)\nUptime: ${stats.uptimeFormatted}`
        copyText(summary)
        return { success: true, message: 'System summary copied to clipboard' }
      }
      case 'cmd-collapse': {
        setIslandWindowMode('collapsed')
        mainWindow.webContents.send('island:mode-changed', 'collapsed')
        return { success: true, message: 'Island collapsed' }
      }
      default:
        return { success: false, message: `Unknown command: ${commandId}` }
    }
  })

  // Media
  ipcMain.handle('media:get-state', () => {
    return getMediaState()
  })

  ipcMain.handle(
    'media:control',
    (
      _event,
      action: MediaControlAction,
      value?: number | boolean,
      sessionId?: string,
      processId?: number
    ) => {
      return controlMedia(action, value, sessionId, processId)
    }
  )

  // Battery IPC handlers
  ipcMain.handle('battery:get-state', () => {
    return getBatteryState()
  })

  ipcMain.handle('battery:charging-started', () => {
    showChargingNotificationWindow()
  })

  ipcMain.handle('battery:charging-ended', () => {
    hideChargingNotificationWindow()
  })

  ipcMain.handle(
    'battery:notification-started',
    (_event, type: 'charging' | 'energy_saver' | 'low_battery') => {
      showNotificationWindow(type)
    }
  )

  ipcMain.handle('battery:notification-ended', () => {
    hideNotificationWindow()
  })

  // Routines
  ipcMain.handle('routines:get', () => {
    return getRoutines()
  })

  ipcMain.handle('routines:toggle', (_event, routineId: string) => {
    return toggleRoutine(routineId)
  })

  // Wallpaper Gallery
  ipcMain.handle('wallpaper:select-folder', async () => {
    return selectWallpaperFolder(mainWindow)
  })

  ipcMain.handle('wallpaper:get-images', async (_event, folderPath?: string) => {
    return getSavedWallpaperImages(folderPath)
  })

  ipcMain.handle('wallpaper:get-thumbnail', async (_event, filePath: string) => {
    const dataUrl = getWallpaperThumbnail(filePath)
    return { dataUrl }
  })

  ipcMain.handle('wallpaper:apply-desktop', async (_event, filePath: string) => {
    return applyWallpaperAsDesktop(filePath)
  })

  ipcMain.handle('wallpaper:get-current-desktop', () => {
    return getCurrentDesktopWallpaper()
  })

  ipcMain.handle('wallpaper:get-transition-state', () => {
    return getWallpaperTransitionState()
  })

  // Welcome Lifecycle
  ipcMain.handle('island:get-welcome-shown', () => {
    return getHasShownWelcome()
  })

  ipcMain.handle('island:check-welcome', () => {
    const hasShown = getHasShownWelcome()
    console.log(`[MAIN ${Date.now()}] [is-delulu:lifecycle] island:check-welcome called. hasShown=${hasShown}`)
    if (!hasShown) {
      showIslandWindowForWelcome()
      return { shouldWelcome: true }
    }
    return { shouldWelcome: false }
  })

  ipcMain.handle('island:mark-welcome-shown', () => {
    markWelcomeShown()
  })

  // Development diagnostics
  ipcMain.handle('debug:toggle-force-visible', () => {
    return toggleForceVisibleDebug()
  })

  ipcMain.handle('debug:get-status', () => {
    return {
      forceVisible: isForceVisibleActive(),
      mode: getCurrentIslandMode(),
      bounds: mainWindow.getBounds(),
      cursor: screen.getCursorScreenPoint()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'win32') {
    app.quit()
  }
})

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
}

