import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'
import { WINDOW_CONFIG } from '../shared/constants'
import { IslandMode } from '../shared/types'
import { getPreferences, updatePreferences } from './services/preferences'

let mainWindow: BrowserWindow | null = null
let currentMode: IslandMode = 'hidden'
let activationTimer: NodeJS.Timeout | null = null
let isHoverInWindowOrZone = false
let forceVisibleDebug = process.argv.includes('--force-visible') || process.env.DEBUG_ISLAND === '1'
let isChargingNotificationActive = false
let hasShownWelcomeInSession = false
let isWelcomeOngoing = false

export function getHasShownWelcome(): boolean {
  return hasShownWelcomeInSession
}

export function markWelcomeShown(): void {
  hasShownWelcomeInSession = true
  isWelcomeOngoing = false
  console.log('[is-delulu:lifecycle] Welcome greeting marked completed in session.')
}

export function resetWelcomeShownForResume(): void {
  hasShownWelcomeInSession = false
  isWelcomeOngoing = false
  console.log('[is-delulu:lifecycle] Welcome state reset for system resume.')
}

export function showIslandWindowForWelcome(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  isWelcomeOngoing = true
  currentMode = 'collapsed'
  enforceCenteredPosition('collapsed')
  if (!mainWindow.isVisible()) {
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
  }
  mainWindow.webContents.send('island:mode-changed', 'collapsed')
  console.log('[is-delulu:window] Native window revealed for welcome greeting sequence.')
}

export function isChargingNotificationOngoing(): boolean {
  return isChargingNotificationActive
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getCurrentIslandMode(): IslandMode {
  return currentMode
}

export function isForceVisibleActive(): boolean {
  return forceVisibleDebug
}

export function toggleForceVisibleDebug(): boolean {
  forceVisibleDebug = !forceVisibleDebug
  console.log(`[is-delulu:debug] Force-Visible mode toggled: ${forceVisibleDebug ? 'ENABLED' : 'DISABLED'}`)
  if (forceVisibleDebug) {
    showIslandWindow('collapsed')
  } else {
    // Return to normal preference-based behavior
    const prefs = getPreferences()
    if (!prefs.isPinned) {
      hideIslandWindow()
    }
  }
  return forceVisibleDebug
}

export function createMainWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW, height: workH } = primaryDisplay.workArea

  console.log('[is-delulu:display] Primary Display:', {
    bounds: primaryDisplay.bounds,
    workArea: primaryDisplay.workArea,
    scaleFactor: primaryDisplay.scaleFactor
  })

  const initialWidth = WINDOW_CONFIG.width
  const initialHeight = WINDOW_CONFIG.height
  const initialX = Math.round(workX + (workW - initialWidth) / 2)
  const initialY = workY + WINDOW_CONFIG.topOffset

  console.log('[is-delulu:window] Initial window bounds:', {
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight
  })

  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    x: initialX,
    y: initialY,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    thickFrame: false,
    type: 'toolbar',
    skipTaskbar: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Set window floating level above standard desktop windows
  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  mainWindow.on('ready-to-show', () => {
    console.log('[is-delulu:window] ready-to-show event fired')
    const prefs = getPreferences()
    if (!hasShownWelcomeInSession) {
      showIslandWindowForWelcome()
      console.log('[is-delulu:window] Showing window on startup for welcome sequence')
    } else if (prefs.isPinned || forceVisibleDebug) {
      currentMode = 'collapsed'
      enforceCenteredPosition('collapsed')
      mainWindow?.showInactive()
      mainWindow?.setIgnoreMouseEvents(true, { forward: true })
      console.log('[is-delulu:window] Showing window on startup (pinned or debug)')
    } else {
      // Start in hidden state until user reaches the actual top-center edge
      currentMode = 'hidden'
      enforceCenteredPosition('hidden')
      mainWindow?.hide()
      mainWindow?.webContents.send('island:mode-changed', 'hidden')
      console.log('[is-delulu:window] Window initialized in hidden state on startup')
    }
  })

  mainWindow.on('show', () => {
    console.log('[is-delulu:window] Native window SHOW event. Bounds:', mainWindow?.getBounds())
  })

  mainWindow.on('hide', () => {
    console.log('[is-delulu:window] Native window HIDE event')
  })

  // Prevent opening new native windows directly
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // Startup and runtime diagnostics
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelTag = level === 3 ? 'ERROR' : level === 2 ? 'WARN' : 'INFO'
    console.log(`[Renderer ${levelTag}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[Renderer Load Error] Failed to load ${validatedURL}: [${errorCode}] ${errorDescription}`
    )
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Renderer Crash] Render process exited: ${details.reason} (code: ${details.exitCode})`)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[is-delulu:window] Renderer web contents loaded successfully')
    if (!hasShownWelcomeInSession) {
      mainWindow?.webContents.send('island:lifecycle-event', { type: 'startup' })
    }
  })

  // Re-center window when screen resolution or DPI scaling changes
  screen.on('display-metrics-changed', () => {
    console.log('[is-delulu:display] Display metrics changed, re-centering window')
    enforceCenteredPosition(currentMode)
  })

  // Load renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    console.log('[is-delulu:window] Loading Vite development server:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const targetFile = join(__dirname, '../renderer/index.html')
    console.log('[is-delulu:window] Loading production bundle:', targetFile)
    mainWindow.loadFile(targetFile)
  }

  // Start background hover activation zone monitor
  startActivationMonitor()

  return mainWindow
}

export function enforceCenteredPosition(_mode: IslandMode = currentMode): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x: workX, y: workY, width: workW } = primaryDisplay.workArea

  const targetWidth = WINDOW_CONFIG.width
  const targetHeight = WINDOW_CONFIG.height
  const targetX = Math.round(workX + (workW - targetWidth) / 2)
  const targetY = workY + WINDOW_CONFIG.topOffset

  const currentBounds = mainWindow.getBounds()
  if (
    currentBounds.x !== targetX ||
    currentBounds.y !== targetY ||
    currentBounds.width !== targetWidth ||
    currentBounds.height !== targetHeight
  ) {
    mainWindow.setBounds(
      {
        x: targetX,
        y: targetY,
        width: targetWidth,
        height: targetHeight
      },
      false
    )
  }
}

export const resetIslandPosition = enforceCenteredPosition

export function setIslandWindowMode(mode: IslandMode): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  currentMode = mode

  console.log(`[is-delulu:window] Mode set to '${mode}'. Current visible: ${mainWindow.isVisible()}`)

  if (mode === 'hidden') {
    if (!forceVisibleDebug && !isNotificationOngoing()) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
      // Allow the smooth collapse animation into the top border to finish before native hide
      setTimeout(() => {
        if (
          currentMode === 'hidden' &&
          mainWindow &&
          !mainWindow.isDestroyed() &&
          !forceVisibleDebug &&
          !isNotificationOngoing()
        ) {
          mainWindow.hide()
        }
      }, 650)
    }
    return
  }

  enforceCenteredPosition(mode)

  if (!mainWindow.isVisible()) {
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
  }
}

let activeNotificationType: 'charging' | 'energy_saver' | 'low_battery' | null = null

export function isNotificationOngoing(): boolean {
  return activeNotificationType !== null || isChargingNotificationActive || isWelcomeOngoing
}

/**
 * Automatically reveals the native window for transient notifications (Charging, Energy Saver, Low Battery).
 * Ensures the window is visible immediately without requiring hover or user input,
 * but keeps it completely non-activating (showInactive) and click-through (setIgnoreMouseEvents).
 */
export function showNotificationWindow(
  type: 'charging' | 'energy_saver' | 'low_battery' = 'charging'
): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  activeNotificationType = type
  isChargingNotificationActive = type === 'charging'
  isHoverInWindowOrZone = false
  enforceCenteredPosition('collapsed')
  if (!mainWindow.isVisible()) {
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
    console.log(`[is-delulu:window] Native window revealed for automatic ${type} notification`)
  }
  if (type === 'charging') {
    mainWindow.webContents.send('island:charging-priority', true)
  }
}

/**
 * Concludes the notification lifecycle on the native window.
 * If the island is unpinned and the user is not actively hovering over the island,
 * the window is smoothly hidden again without intercepting any user clicks.
 */
export function hideNotificationWindow(): void {
  activeNotificationType = null
  isChargingNotificationActive = false
  if (!mainWindow || mainWindow.isDestroyed()) return
  const prefs = getPreferences()
  if (prefs.isPinned || forceVisibleDebug) return

  // Conclude notification: ensure the island is hidden and window is non-interactive
  currentMode = 'hidden'
  isHoverInWindowOrZone = false
  mainWindow.setIgnoreMouseEvents(true, { forward: true })
  mainWindow.webContents.send('island:mode-changed', 'hidden')
  mainWindow.hide()
  console.log('[is-delulu:window] Native window hidden after notification finished')
}

export function showChargingNotificationWindow(): void {
  showNotificationWindow('charging')
}

export function hideChargingNotificationWindow(): void {
  hideNotificationWindow()
}

export function showIslandWindow(targetMode: IslandMode = 'collapsed'): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  currentMode = targetMode
  enforceCenteredPosition(targetMode)
  if (!mainWindow.isVisible()) {
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
  }
  mainWindow.webContents.send('island:mode-changed', targetMode)
  mainWindow.webContents.send('island:reveal')
  console.log(`[is-delulu:window] showIslandWindow executed for mode: ${targetMode}`)
}

export function hideIslandWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (forceVisibleDebug || isNotificationOngoing()) return
  const prefs = getPreferences()
  if (prefs.isPinned) return // Respect pinned state

  currentMode = 'hidden'
  mainWindow.setIgnoreMouseEvents(true, { forward: true })
  mainWindow.webContents.send('island:mode-changed', 'hidden')
  setTimeout(() => {
    if (
      currentMode === 'hidden' &&
      mainWindow &&
      !mainWindow.isDestroyed() &&
      !forceVisibleDebug &&
      !isNotificationOngoing()
    ) {
      mainWindow.hide()
    }
  }, 400)
  console.log('[is-delulu:window] hideIslandWindow executed with smooth transition')
}

/**
 * Monitors cursor position on the primary monitor.
 * Detects pointer strictly at the actual top-center edge (minimal practical height 2-3px).
 * When the pointer reaches the actual top edge near center while hidden, it reveals the pill.
 * Once visible, it tracks whether the pointer remains over the active island surface.
 */
export function startActivationMonitor(): void {
  if (activationTimer) clearInterval(activationTimer)

  activationTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    const prefs = getPreferences()
    if (isNotificationOngoing()) {
      // While a notification is playing, the native window must remain visible
      // and click-through, but we must NOT trigger normal hover activation or surface tracking.
      if (!mainWindow.isVisible()) {
        mainWindow.showInactive()
        mainWindow.setIgnoreMouseEvents(true, { forward: true })
      }
      return
    }

    if (prefs.isPinned || forceVisibleDebug) {
      // Pinned/Debug: keep visible
      if (!mainWindow.isVisible()) {
        mainWindow.showInactive()
        mainWindow.setIgnoreMouseEvents(true, { forward: true })
      }
      return
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const { x: workX, y: workY, width: workW } = primaryDisplay.workArea
    const centerX = workX + workW / 2
    const pt = screen.getCursorScreenPoint()

    // 1. Narrow top-edge activation zone:
    // Physical monitor top ceiling: pt.y >= workY && pt.y <= workY + 2 (only top 2-3 pixels)
    // Horizontally centered matching the collapsed pill width (e.g. 190px -> +/- 95px)
    // This strictly prevents triggering during normal mouse movement over Brave browser tabs.
    const inTopEdgeActivationZone =
      pt.y >= workY &&
      pt.y <= workY + 2 &&
      Math.abs(pt.x - centerX) <= Math.ceil(WINDOW_CONFIG.pill.width / 2)

    if (inTopEdgeActivationZone) {
      if (!mainWindow.isVisible() || currentMode === 'hidden') {
        console.log(`[is-delulu:hover] Pointer touched top-center edge at (${pt.x}, ${pt.y}). Revealing pill!`)
        currentMode = 'collapsed'
        enforceCenteredPosition('collapsed')
        mainWindow.showInactive()
        mainWindow.setIgnoreMouseEvents(true, { forward: true })
        mainWindow.webContents.send('island:mode-changed', 'collapsed')
        mainWindow.webContents.send('island:reveal')
        mainWindow.webContents.send('island:hover-state', true)
        isHoverInWindowOrZone = true
      }
      return
    }

    // 2. Active surface hit-testing when window is visible
    if (mainWindow.isVisible() && currentMode !== 'hidden') {
      const surfaceWidth =
        currentMode === 'expanded' ? WINDOW_CONFIG.panel.width : WINDOW_CONFIG.pill.width
      const surfaceHeight =
        currentMode === 'expanded' ? WINDOW_CONFIG.panel.height : WINDOW_CONFIG.pill.height
      const surfaceLeft = centerX - surfaceWidth / 2
      const surfaceRight = centerX + surfaceWidth / 2
      const surfaceTop = workY
      const surfaceBottom = workY + surfaceHeight

      const inSurface =
        pt.x >= surfaceLeft &&
        pt.x <= surfaceRight &&
        pt.y >= surfaceTop &&
        pt.y <= surfaceBottom

      if (inSurface !== isHoverInWindowOrZone) {
        isHoverInWindowOrZone = inSurface
        console.log(`[is-delulu:hover] Island hover state changed: ${inSurface} at (${pt.x}, ${pt.y})`)
        mainWindow.webContents.send('island:hover-state', inSurface)
      }
    } else {
      isHoverInWindowOrZone = false
    }
  }, 60)
}

export function stopActivationMonitor(): void {
  if (activationTimer) {
    clearInterval(activationTimer)
    activationTimer = null
  }
}
