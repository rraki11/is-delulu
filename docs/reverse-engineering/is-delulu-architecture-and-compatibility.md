# is-delulu Architecture Investigation & Compatibility Analysis

## 1. Executive Summary

This document presents a comprehensive audit of the current `is-delulu` codebase, mapping every subsystem, lifecycle stage, and IPC boundary against the reverse-engineered requirements of Hitodama.

The core finding is that **`is-delulu` already possesses an exceptional foundation**:
- High-performance transparent Electron architecture with DirectComposition hardware acceleration.
- Phased background initialization avoiding startup frame drops.
- Native Windows 11 PowerShell/C# daemons for GSMTC media, battery telemetry, and atomic wallpaper changes.
- Robust Zustand state store coupled with a formal finite state machine (`useIslandStateMachine`).
- `motion/react` spring physics engine and dynamic theme palette extractor.

Rather than rebuilding features from scratch, the reconstruction strategy **reuses, improves, and harmonizes** existing components into Hitodama's verified 7-tab layout, adaptive morphology engine, and gesture model while strictly preserving all existing behavior (welcome greeting, charging/battery notifications, wallpaper-accent extraction, and light/dark theme support).

---

## 2. Deep Investigation of Relevant Code Paths

### 2.1 Electron Main Process Lifecycle
- **Entry Point:** `src/main/index.ts`
- **Single Instance Enforcement:** `app.requestSingleInstanceLock()` prevents duplicate windows; `second-instance` restores and focuses the primary window.
- **Hardware Acceleration Flags:** Explicitly retains hardware acceleration (required for Windows DirectComposition alpha blending) while appending `--disable-renderer-backgrounding` and `--disable-backgrounding-occluded-windows` so background timers remain accurate.
- **Startup Sequencing:**
  - *Stage 0 (Synchronous):* `initPreferences()`, `createMainWindow()`, system tray initialization.
  - *Stage 1 (Immediate on window creation):* Battery daemon (`startBatteryMonitor`), Desktop wallpaper monitor (`startWallpaperMonitor`).
  - *Stage 2 (Deferred by 1400ms):* GSMTC media daemon (`startMediaMonitor`), clipboard history monitor (`startClipboardMonitor`), periodic system metrics stream (`getSystemStats()`, 3000ms interval).
- **Power Management Hooks:** Subscribes to `powerMonitor.on('suspend')` and `powerMonitor.on('resume')`. On system resume, triggers `resetWelcomeShownForResume()`, `showIslandWindowForWelcome()`, and `requestBatteryRefresh()`.
- **Graceful Teardown:** `app.on('before-quit')` systematically terminates all PowerShell daemon subprocesses, clears intervals, unregisters global shortcuts, and cleans up wallpaper transition overlays.

### 2.2 BrowserWindow Creation & Window Positioning
- **File:** `src/main/window.ts`
- **Window Specs:**
  - `frame: false`, `transparent: true`, `backgroundColor: '#00000000'`, `hasShadow: false`, `resizable: false`, `thickFrame: false`, `type: 'toolbar'`, `skipTaskbar: true`, `alwaysOnTop: true`.
  - Floating Level: `mainWindow.setAlwaysOnTop(true, 'screen-saver')` guarantees positioning above standard Windows desktop windows.
- **Display Topology & Centering:**
  - Caches primary monitor work area: `updateCachedDisplayMetrics()` calculates `x`, `y`, `width`, `height`.
  - Centers horizontally: `targetX = Math.round(workX + (workW - targetWidth) / 2)`.
  - Anchors flush at top bezel: `targetY = workY + WINDOW_CONFIG.topOffset`.
  - Dynamic listener: `screen.on('display-metrics-changed')` recalculates metrics and re-centers window on DPI or resolution change.
- **Transparent Click-Through & Pass-Through Coordination:**
  - Uses `mainWindow.setIgnoreMouseEvents(true, { forward: true })` when pointer is outside the active island pill/panel, permitting underlying desktop apps to receive all clicks.
  - Switches to `setIgnoreMouseEvents(false)` when hovering or interacting with the island surface.

### 2.3 Preload Scripts & IPC Contracts
- **Preload Implementation:** `src/preload/index.ts`
- **Typings Declaration:** `src/preload/index.d.ts` and `src/shared/types.ts`
- **Security Boundaries:** Strictly enforces `contextIsolation: true` and `nodeIntegration: false`. Only safe, typed methods exposed on `window.isDelulu`:
  - Window Mode: `setIslandMode`, `getIslandMode`, `onIslandModeChanged`, `onIslandReveal`, `onIslandHoverState`, `resetPosition`, `setIgnoreMouseEvents`.
  - Telemetry: `getSystemStats`, `onSystemStatsUpdate`.
  - Clipboard: `getClipboardHistory`, `copyText`, `clearClipboard`, `onClipboardUpdate`.
  - Launcher: `launchShortcut`, `runCommand`.
  - Media & Audio: `getMediaState`, `controlMedia`, `onMediaUpdate`.
  - Battery: `getBatteryState`, `onBatteryUpdate`, `onChargingStarted`, `onEnergySaverChanged`.
  - Wallpaper: `selectWallpaperFolder`, `getSavedWallpaperImages`, `getWallpaperThumbnail`, `applyWallpaperAsDesktop`, `getCurrentDesktopWallpaper`.
  - Preferences & Theme: `getPreferences`, `updatePreferences`, `onPreferencesChange`, `getResolvedTheme`, `getAccentPalette`, `onAccentUpdated`.

### 2.4 Renderer Architecture & Island State Machine
- **Mount Point:** `src/renderer/src/main.tsx` -> `src/renderer/src/App.tsx`
- **Handshake:** Double `requestAnimationFrame` before emitting `window.isDelulu.notifyRendererReady()`, ensuring zero blank frames on startup.
- **State Store:** `src/renderer/src/store/useIslandStore.ts` (Zustand) managing global UI state (`mode`, `activeTab`, `systemStats`, `clipboardItems`, `mediaState`, `batteryState`, `accentPalette`, `theme`).
- **Finite State Machine:** `src/renderer/src/hooks/useIslandStateMachine.ts` orchestrates modes (`HIDDEN`, `NORMAL_REVEALING`, `COLLAPSED`, `EXPANDED`), transient notifications (`CHARGING_ACTIVE`, `ENERGY_SAVER_ACTIVE`, `LOW_BATTERY_ACTIVE`), and welcome sequences (`WELCOME`).
- **Island Surface Coordinator:** `src/renderer/src/components/island/MorphingIsland.tsx` handles morphology animations via `motion/react`, wallpaper gradient orbs, and mounts the active tab content.

### 2.5 Animation Orchestration & Design Tokens
- **Animation Framework:** `motion/react` (v12.4.7).
- **Tokens:** `src/renderer/src/styles/design-tokens.css` and `index.css`.
- **Glow & Gradient Engine:** `.island-accent-glow` and `.island-gradient-stage` with dynamic color extraction from current desktop wallpaper (`resolveActivePalette`).

### 2.6 Native System Services
- **Media & GSMTC:** `src/main/services/media.ts` spawns `gsmtc-daemon.ps1`, binding to Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager WinRT APIs. Streams real-time playback state, album art, duration, track titles, and audio output sessions.
- **Battery & Power:** `src/main/services/battery.ts` spawns `battery-daemon.ps1`, querying Win32_Battery and Windows Energy Saver states. Dispatches plug-in, unplug, charging, low battery, and energy saver transitions.
- **Wallpaper Engine:** `src/main/services/wallpaperGallery.ts` manages thumbnail caching and executes `set-wallpaper.exe` (native Win32 `SystemParametersInfo(SPI_SETDESKWALLPAPER)`) with optional smooth circular-reveal transition overlay (`wallpaper-reveal.html`).
- **Telemetry:** `src/main/services/system.ts` calculates CPU tick deltas and OS memory metrics.
- **Clipboard:** `src/main/services/clipboard.ts` monitors clipboard text, classifies type (`url`, `code`, `text`), and maintains 50-item in-memory history.
- **Launcher:** `src/main/services/launcher.ts` validates and executes whitelisted Windows executables and URLs.

---

## 3. Comprehensive Feature Compatibility & Component Decision Table

| Target Feature (Hitodama) | Existing Implementation in `is-delulu` | Architectural Decision | Required Changes & Enhancements | Dependencies | Verification Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Window Canvas Bounds** | `WINDOW_CONFIG` (`660 × 520`) in `src/shared/constants.ts` | **Improve** | Expand transparent window canvas to `1080px × 700px` centered at primary display top bezel. Ensures widest tab (`Wallpaper`: 1040px) and tallest tab (`Apps`: 638px) render without clipping. | `src/shared/constants.ts`, `src/main/window.ts` | Verify multi-tab switching does not cause bounds overflow or clipping on 1080p, 1440p, 4K displays. |
| **Adaptive Morphology Engine** | Fixed expanded panel (`620 × 490`) in `MorphingIsland.tsx` | **Improve** | Implement tab dimensions map `z = { controls: {w:640,h:390}, today: {w:880,h:442}, stats: {w:880,h:338}, clipboard: {w:880,h:446}, apps: {w:720,h:638}, wallpaper: {w:1040,h:314}, power: {w:640,h:166}, music: {w:380,h:150} }`. Apply cubic bezier `[0.33, 1, 0.68, 1]` with duration `0.22s`–`0.26s`. | `MorphingIsland.tsx`, `useIslandStore.ts` | Test smooth morphing between every tab pair; verify 60fps tracking without layout shift. |
| **Scroll-Down-to-Expand Gesture** | Click-to-expand and hotkey summon | **Improve** | Add `onWheel` listener on collapsed island detecting `e.deltaY > 0` to trigger `onExpand()` with `Controls` active tab. | `MorphingIsland.tsx` | Test mouse wheel downward flick over collapsed pill in both pinned and auto-hide modes. |
| **Seven-Tab Navigation Bar (`et`)** | 7-tab scrollable bar in `NavigationTabBar.tsx` | **Improve** | Update tab items to: `Controls`, `Today`, `Stats`, `Clipboard`, `Apps`, `Wallpaper`, `Power`. Use exact widths `O = { Controls:83, Today:64, Stats:60, Clipboard:90, Apps:58, Wallpaper:94, Power:67 }` and auto-centering formula `left = 18 + (w - 36 - totalW)/2`. | `NavigationTabBar.tsx`, `types.ts` | Measure exact rendered tab widths and horizontal centering across all panel widths. |
| **Controls Tab (`el`)** | Media player widget (`MediaWidget.tsx`) | **Replace** (Upgrade to `ControlsWidget`) | Build `ControlsWidget.tsx`: 5 quick tiles (Wi-Fi, Bluetooth, Audio Output, Night Light, Dark Mode) + Volume Slider with live percentage + Embedded Media Player card with scrubber and playback controls. | `ControlsWidget.tsx`, `audio-session.ts`, `media.ts` | Test volume slider against Windows master volume; test Wi-Fi/Audio info; test media play/pause/prev/next. |
| **Today Tab (`eo`)** | Monthly calendar table (`CalendarWidget.tsx`) | **Replace** (Upgrade to `TodayWidget`) | Build `TodayWidget.tsx`: Dual-card left rail (Large Clock with blinking dots + Weather) + Dual-card right rail (Weekly Calendar with today highlight + Interactive To-Do list with animated SVG checkmark and completion counter ring). | `CalendarWidget.tsx` (or `TodayWidget.tsx`), `calendarStorage.ts` | Test to-do creation, toggle completion, counter ring increment (`d/total`), and day highlighting. |
| **Stats Tab (`ep`)** | 2-column system telemetry (`SystemWidget.tsx`) | **Replace** (Upgrade to `StatsWidget`) | Build `StatsWidget.tsx`: Telemetry cards (CPU load/freq/proc, RAM used/free, Disk C, Network, Uptime) + Timeframe selector (`1m`, `5m`, `10m`, `15m`, `20m`) + Top apps monitor with RAM/CPU sort toggle. | `SystemWidget.tsx`, `system.ts` | Verify live metric updates every 3s; test timeframe switching and process sorting toggle. |
| **Clipboard Tab (`e_`)** | Vertical card list (`ClipboardWidget.tsx`) | **Replace** (Upgrade to `ClipboardWidget`) | Reconstruct `ClipboardWidget.tsx`: Search bar + Filter chips (`All`, `Text`, `Images`, `Links`) + Split list and rich inspector (Type, Size, Copied time) + Keyboard shortcuts legend (`↵ Paste`, `Ctrl C`, `Ctrl P`, `Del`). | `ClipboardWidget.tsx`, `clipboard.ts` | Test filter chips, search filtering, item selection, preview inspection, and copy/paste actions. |
| **Apps Tab (`ef`)** | `CommandSearch.tsx` + `ShortcutGrid.tsx` | **Replace** (Upgrade to `AppsWidget`) | Build unified `AppsWidget.tsx`: Search bar with `Win+A` hint + Frequent app chips + Grouped lists (`STARRED`, `RECENT`, `APPLICATIONS`) + Star/Pin toggle + Keyboard navigation (`↑↓` and `Enter` to launch). | `AppsWidget.tsx`, `launcher.ts` | Test app search filtering, star/unstar pinning, keyboard navigation, and executable launch. |
| **Wallpaper Tab (`eg`, `ey`)** | Static grid gallery (`WallpaperWidget.tsx`) | **Replace** (Upgrade to `WallpaperCarouselWidget`) | Reconstruct `WallpaperWidget.tsx` with Hitodama's verified 3D perspective carousel: smoothstep depth scaling (`d = min(|e|, 1) * t * (3 - 2t)`), dynamic width, height, opacity, zIndex, and one-click desktop wallpaper application. | `WallpaperWidget.tsx`, `wallpaperGallery.ts` | Verify carousel navigation, card hover scaling, and seamless wallpaper application. |
| **Power Tab (`ej`)** | None in expanded panel (only in tray menu) | **Introduce** | Build `PowerWidget.tsx`: 4-button dock (`Lock`, `Sleep`, `Restart`, `Shut down`) with dynamic cursor tracking and native Windows command execution via IPC. | `PowerWidget.tsx`, `src/main/index.ts` | Test hover elevation and verify each power action dispatches its corresponding system call. |
| **Floating Mini Music Island (`ei`)** | Standard collapsed pill clock | **Introduce** | Support compact music mode (`380px × 150px`) in `MorphingIsland.tsx` displaying album art, song title ticker, artist, live progress scrubber, elapsed/total time, and playback controls. | `MorphingIsland.tsx`, `media.ts` | Test transition from collapsed pill to mini music island when music starts playing. |
| **Welcome & Greeting Sequence** | Existing handwritten greeting (`hi`/`hello`) in `HandwrittenGreeting.tsx` | **Preserve** | Keep existing handwriting greeting, entrance slide, and clock dwell sequence intact. Seamlessly hand off to collapsed pill or mini island once complete. | `HandwrittenGreeting.tsx`, `MorphingIsland.tsx` | Verify welcome greeting plays on startup and system resume without regression. |
| **Battery & Charging Notifications** | `ChargingPill.tsx`, `EnergySaverPill.tsx`, `LowBatteryPill.tsx` | **Preserve** | Keep existing transient battery notifications, smooth expanding pill, and automatic dismissal intact. | `useIslandStateMachine.ts`, `ChargingPill.tsx` | Test AC adapter plug-in, Energy Saver toggle, and Low Battery warning. |
| **Wallpaper Accent Extraction** | Existing k-means color extraction in `wallpaper.ts` | **Preserve** | Keep wallpaper color extraction, dynamically feeding the warm accent tokens to Hitodama's active tab capsules and quick tiles. | `src/main/services/wallpaper.ts` | Verify changing desktop wallpaper adaptively tints the active tab capsules and controls. |

---

## 4. Preservation of Existing Working Behavior & Conflict Resolution

### 4.1 Requirement Preservation Checklist
1. **Windows 11 Only:** No platform polyfills for macOS, Linux, or Windows 10 are introduced. All shell scripts and WinRT calls target Windows 11 APIs.
2. **Floating Island Interaction Model:** Preserves always-on-top, click-outside-to-collapse (when unpinned), global hotkey summon (`Ctrl+Shift+Space`), and transparent click-through outside the active island.
3. **Welcome Greeting:** `HandwrittenGreeting.tsx` and the random 50/50 `hi`/`hello` handwriting animation are preserved on cold start and power resume.
4. **Battery & Power Telemetry:** The real-time battery daemon, charging pill animation, Energy Saver pill, and low battery notifications continue to operate seamlessly.
5. **Multi-Source GSMTC Media:** Windows GSMTC daemon continues to stream active sessions and audio device outputs.
6. **Wallpaper Gallery & Accent Extraction:** The existing wallpaper gallery directory scanner and k-means color extraction continue to power dynamic UI theming.
7. **Light & Dark Themes:** Preserved and mapped to Hitodama's dark glass and high-contrast tokens.
8. **User Preferences & Persistence:** `preferences.ts` schema preserves user name, clock format (12h/24h), appearance mode, pinned state, and wallpaper folders.
9. **No-Branding Preference:** Preserves the minimal, clean floating island without decorative watermarks or extraneous logos.

### 4.2 Conflict Analysis & Resolutions
- **Conflict 1: Window Dimensions for Wide/Tall Tabs vs Fixed Window.**
  - *Conflict:* Hitodama's `Wallpaper` tab is `1040px` wide and `Apps` tab is `638px` high, whereas `WINDOW_CONFIG` was previously fixed at `660px × 520px`.
  - *Resolution:* Expand the transparent window bounds to `1080px × 700px` centered on the primary display. Because the Electron window has `transparent: true`, `backgroundColor: '#00000000'`, and `setIgnoreMouseEvents(true, { forward: true })` outside the active island, the larger window canvas is completely invisible and non-blocking, allowing every tab to render at its native dimensions.
- **Conflict 2: Tab Set Alignment (`is-delulu` 7 tabs vs Hitodama 7 tabs).**
  - *Conflict:* `is-delulu` had `['launcher', 'calendar', 'system', 'clipboard', 'media', 'routines', 'settings']`, whereas Hitodama has `['Controls', 'Today', 'Stats', 'Clipboard', 'Apps', 'Wallpaper', 'Power']`.
  - *Resolution:* Update `ExpandedTab` type in `src/shared/types.ts` to support both sets. Map Hitodama's 7 tabs directly to the navigation bar. Provide access to Settings via a clean gear icon in `IslandHeader` or within the Controls/Clipboard tabs so settings functionality remains 100% accessible.
- **Conflict 3: Scroll Down on Collapsed Island.**
  - *Conflict:* Previously, scrolling over the collapsed island was unhandled.
  - *Resolution:* Add an `onWheel` listener on `IslandPill` detecting `e.deltaY > 0` to trigger `onExpand()` and switch to `controls`. This matches Hitodama's verified gesture without disrupting click-to-expand.

---

## 5. Implementation Sequence for Phase Four

1. **Step 1: Core Geometry & Types (`types.ts`, `constants.ts`, `window.ts`)**
   - Update `WINDOW_CONFIG` to 1080×700.
   - Add tab dimension dictionary `TAB_DIMENSIONS` matching `z`.
   - Update `ExpandedTab` type union.
2. **Step 2: Morphology & State (`useIslandStore.ts`, `MorphingIsland.tsx`, `NavigationTabBar.tsx`)**
   - Bind container width/height to active tab dimensions with cubic curve `[0.33, 1, 0.68, 1]`.
   - Add scroll-down gesture listener.
   - Reconstruct centered 7-tab navigation bar with exact widths.
3. **Step 3: Native IPC & Power Services (`src/main/index.ts`)**
   - Register native power action handlers (`lock`, `sleep`, `restart`, `shutdown`).
   - Register extended system telemetry handler (process count, disk usage, top apps).
4. **Step 4: Tab Component Upgrades**
   - `ControlsWidget.tsx`: Quick tiles, volume slider, media player card.
   - `CalendarWidget.tsx` / `TodayWidget.tsx`: Dual-rail Clock/Weather + Weekly Calendar/To-Do.
   - `SystemWidget.tsx` / `StatsWidget.tsx`: Telemetry grid + Timeframe filter + Top apps.
   - `ClipboardWidget.tsx`: Chips + Split list/inspector + Keyboard legend.
   - `AppsWidget.tsx`: Search + Frequent chips + Categorized app list + Star pinning.
   - `WallpaperWidget.tsx`: 3D smoothstep perspective carousel with instant apply.
   - `PowerWidget.tsx`: 4-button dock with cursor tracking.
5. **Step 5: Strict Type Checking & Verification**
   - Run `npm run typecheck` and `npm run build`.
   - Run verification scripts to ensure zero regressions across greeting, battery, and media.
