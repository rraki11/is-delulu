import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'
import { WINDOW_CONFIG } from '../shared/constants'
import { IslandMode } from '../shared/types'
import { getPreferences, updatePreferences } from './services/preferences'
import { perfTracker } from '../shared/perf'

let mainWindow: BrowserWindow | null = null
let currentMode: IslandMode = 'hidden'
let activationTimer: NodeJS.Timeout | null = null
let isHoverInWindowOrZone = false
let forceVisibleDebug = process.argv.includes('--force-visible') || process.env.DEBUG_ISLAND === '1'
let isChargingNotificationActive = false
let hasShownWelcomeInSession = false
let isWelcomeOngoing = false

let isRendererReady = false
let isWindowReadyToShow = false
let initialWindowShown = false

// Cached primary display work area to avoid expensive continuous native OS display enumeration
let cachedPrimaryWorkArea = { x: 0, y: 0, width: 1920, height: 1080 }
let cachedCenterX = 960

export function updateCachedDisplayMetrics(): void {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    cachedPrimaryWorkArea = primaryDisplay.workArea
    cachedCenterX = cachedPrimaryWorkArea.x + cachedPrimaryWorkArea.width / 2
  } catch {}
}

export function handleRendererReady(): void {
  perfTracker.record('renderer_ready')
  isRendererReady = true
  maybeShowInitialWindow()
}

function maybeShowInitialWindow(): void {
  if (initialWindowShown || !mainWindow || mainWindow.isDestroyed()) return
  if (!isRendererReady || !isWindowReadyToShow) return

  initialWindowShown = true
  perfTracker.record('first_interactive_frame')

  const prefs = getPreferences()
  if (!hasShownWelcomeInSession) {
    showIslandWindowForWelcome()
    console.log('[is-delulu:window] Showing window on startup for welcome sequence (renderer ready handshake)')
  } else if (prefs.isPinned || forceVisibleDebug) {
    currentMode = 'collapsed'
    enforceCenteredPosition('collapsed')
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
    console.log('[is-delulu:window] Showing window on startup (pinned or debug)')
  } else {
    currentMode = 'hidden'
    enforceCenteredPosition('hidden')
    mainWindow.hide()
    mainWindow.webContents.send('island:mode-changed', 'hidden')
    console.log('[is-delulu:window] Window initialized in hidden state on startup')
  }
}

export function getHasShownWelcome(): boolean {
  return hasShownWelcomeInSession
}

export function markWelcomeShown(): void {
  hasShownWelcomeInSession = true
  perfTracker.record('welcome_animation_complete')
  // Only mark welcome ongoing false if no charging/power notification has taken over
  if (!isChargingNotificationActive && activeNotificationType === null) {
    isWelcomeOngoing = false
  }
  console.log(`[WINDOW ${Date.now()}] [is-delulu:lifecycle] Welcome greeting marked completed in session. isWelcomeOngoing=${isWelcomeOngoing}`)
}

export function resetWelcomeShownForResume(): void {
  hasShownWelcomeInSession = false
  isWelcomeOngoing = false
  console.log(`[WINDOW ${Date.now()}] [is-delulu:lifecycle] Welcome state reset for system resume.`)
}

export function showIslandWindowForWelcome(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  perfTracker.record('welcome_animation_start')
  isWelcomeOngoing = true
  currentMode = 'collapsed'
  enforceCenteredPosition('collapsed')
  if (!mainWindow.isVisible()) {
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
  }
  mainWindow.webContents.send('island:mode-changed', 'collapsed')
  mainWindow.webContents.send('island:start-welcome')
  console.log(`[WINDOW ${Date.now()}] [is-delulu:window] Native window revealed and island:start-welcome emitted.`)
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
  updateCachedDisplayMetrics()
  const { x: workX, y: workY, width: workW, height: workH } = cachedPrimaryWorkArea

  console.log('[is-delulu:display] Primary Display WorkArea:', cachedPrimaryWorkArea)

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

  perfTracker.record('main_window_created')

  // Set window floating level above standard desktop windows
  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  mainWindow.on('ready-to-show', () => {
    perfTracker.record('window_ready_to_show')
    console.log('[is-delulu:window] ready-to-show event fired')
    isWindowReadyToShow = true
    maybeShowInitialWindow()

    // Safety fallback: if renderer handshake does not arrive within 1200ms, proceed
    setTimeout(() => {
      if (!initialWindowShown) {
        console.warn('[is-delulu:window] Renderer ready timeout, falling back to showing window')
        isRendererReady = true
        maybeShowInitialWindow()
      }
    }, 1200)
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
    perfTracker.record('renderer_did_finish_load')
    console.log('[is-delulu:window] Renderer web contents loaded successfully')
    if (!hasShownWelcomeInSession) {
      mainWindow?.webContents.send('island:lifecycle-event', { type: 'startup' })
    }
  })

  // Re-center window when screen resolution or DPI scaling changes
  screen.on('display-metrics-changed', () => {
    console.log('[is-delulu:display] Display metrics changed, updating metrics and re-centering window')
    updateCachedDisplayMetrics()
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

  if (cachedPrimaryWorkArea.width === 0) {
    updateCachedDisplayMetrics()
  }

  const { x: workX, y: workY, width: workW } = cachedPrimaryWorkArea

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
  // Transfer from welcome ongoing to charging notification ongoing
  isWelcomeOngoing = false
  isHoverInWindowOrZone = false
  enforceCenteredPosition('collapsed')
  if (!mainWindow.isVisible()) {
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
    console.log(`[WINDOW ${Date.now()}] [is-delulu:window] Native window revealed for automatic ${type} notification`)
  } else {
    console.log(`[WINDOW ${Date.now()}] [is-delulu:window] Native window already visible for seamless handoff to ${type} notification`)
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
  isWelcomeOngoing = false
  if (!mainWindow || mainWindow.isDestroyed()) return
  const prefs = getPreferences()
  if (prefs.isPinned || forceVisibleDebug) {
    console.log(`[WINDOW ${Date.now()}] [is-delulu:window] hideNotificationWindow skipped: pinned or forceVisible`)
    return
  }

  // Conclude notification: ensure the island is hidden and window is non-interactive
  currentMode = 'hidden'
  isHoverInWindowOrZone = false
  mainWindow.setIgnoreMouseEvents(true, { forward: true })
  mainWindow.webContents.send('island:mode-changed', 'hidden')
  mainWindow.hide()
  console.log(`[WINDOW ${Date.now()}] [is-delulu:window] Native window hidden after notification finished`)
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

  updateCachedDisplayMetrics()

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

    const { x: workX, y: workY } = cachedPrimaryWorkArea
    const centerX = cachedCenterX
    const pt = screen.getCursorScreenPoint()

    // 1. Narrow top-edge activation zone:
    // Physical monitor top ceiling: pt.y >= workY && pt.y <= workY + 2 (only top 2-3 pixels)
    // Horizontally centered matching the collapsed pill width (e.g. 190px -> +/- 95px)
    // This strictly prevents triggering during normal mouse movement over browser tabs.
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
