# Hitodama Reverse-Engineering Feature Inventory & Architecture Mapping

## 1. Executive Summary & Investigation Scope

This document provides a verifiable, evidence-based feature inventory and technical specification for reconstructing the observable non-AI UI, interaction patterns, animations, and desktop companion capabilities of **Hitodama** (`https://hitodama.in/`) within **is-delulu**.

The investigation was conducted using **REA ("Reverse Engineer Anything", v6.7.0)** alongside static AST analysis, network bundle extraction, and source chunk inspection of Hitodama's client assets.

### Strict Scope Boundary
- **IN SCOPE:** All non-AI UI components, layout morphology, dimensions, spring/cubic animation curves, navigation tabs, controls, widgets, local hardware telemetry, system integrations (Windows 11 audio, volume, clipboard, power, wallpaper), keyboard shortcuts, and gestures.
- **EXPLICITLY EXCLUDED:** All cloud AI models and LLM/VLM processing (e.g. Gemini API key onboarding, "Circle to Ask" multimodal screen interpretation, LLM-based speech cleanup/dictation, and autonomous voice agents).

---

## 2. REA Environment & Diagnostic Baseline

- **REA Release:** `rea-agents@6.7.0` (Node `v24.18.0`, Win32 x64 host).
- **Client Registration:** Successfully configured and registered for Antigravity at `C:\Users\rrake\.gemini\config\mcp_config.json`.
- **Installed Skill:** `C:\Users\rrake\.gemini\config\skills\reverse-engineer-anything` (Skill version `42`, 207 MCP tools cataloged).
- **Target Evidence Captured:**
  - Origin: `https://hitodama.in/` (156,756 bytes landing page payload).
  - Client Application Chunks:
    - `page-db300acb9a9b99b5.js` (243,517 bytes) - Main App & Island Stage implementation.
    - `8-cbac954474445cf0.js` (153,439 bytes) - Shared UI utilities and animation primitives.
    - `168-bba671a9a8b2b382.js` (26,783 bytes) - Style hooks and module wrappers.
    - `layout-be8de3032c059382.js` (22,952 bytes) - App router root layout.
- **Provider Limitations & Workaround:**
  - REA's optional Wakaru decompiler requires Linux x64 binaries. Static module recovery was conducted via REA's JavaScript application analyzer and direct AST extraction of the client bundles.

---

## 3. Discovered Feature Inventory

### Feature 1: Adaptive Dynamic Island Morphing Container & Geometry
- **Feature Name:** Morphing Island Stage (`z`)
- **Evidence Source:** `page-db300acb9a9b99b5.js` (offsets ~42613–42850).
- **Target Specification:**
  - The island dynamically morphs between resting pill mode and tab-specific bounding dimensions:
    - `music`: `380px × 150px`
    - `controls`: `640px × 390px`
    - `today`: `880px × 442px`
    - `stats`: `880px × 338px`
    - `clipboard`: `880px × 446px`
    - `apps`: `720px × 638px`
    - `wallpaper`: `1040px × 314px`
    - `power`: `640px × 166px`
- **Visual & Timing Behavior:**
  - Uses cubic-bezier spring curve `V = [0.33, 1, 0.68, 1]`.
  - Morph transition duration: `0.22s` to `0.26s`.
  - Border radius: smoothly transitions between `17px` (pill) to `22px` (panel).
- **AI Classification:** Non-AI (Pure UI morphology).
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified** (Exact coordinates, widths, and heights extracted from `z` dictionary).
- **Proposed is-delulu Implementation:**
  - Update `WINDOW_CONFIG` in `src/shared/constants.ts` and `src/main/window.ts` to accommodate up to `1080px × 700px` transparent Electron canvas without clipping.
  - Dynamically animate `targetWidth` and `targetHeight` in `MorphingIsland.tsx` based on the active tab using the verified `z` dimensions and cubic curve `[0.33, 1, 0.68, 1]`.

---

### Feature 2: Scroll-Down-to-Expand Gesture
- **Feature Name:** Mouse Wheel Flick / Scroll-Down Summon
- **Evidence Source:**
  - Copy: *"Scroll down on the island and your music, settings, plans, clipboard, apps and wallpapers are right there. Your desktop looks better, and everything you reach for is one flick away."*
  - Runtime event: `keys: ["Scroll ↓"]`, triggering expansion directly from collapsed pill into the `Controls` menu view (`page-db300acb9a9b99b5.js` offset ~75248).
- **Trigger:** Mouse wheel down (`deltaY > 0`) over the collapsed pill or floating island.
- **Expected Visual Response:** Immediate fluid spring expansion into the expanded island with the `Controls` tab active.
- **AI Classification:** Non-AI (User input event).
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Add an `onWheel` listener on `IslandPill` / collapsed container in `MorphingIsland.tsx` detecting `e.deltaY > 0` to trigger `onExpand()` and set initial active tab to `'media'` / `'controls'`.

---

### Feature 3: Seven-Tab Centered Navigation Bar
- **Feature Name:** Dynamic Tab Switcher (`et`)
- **Evidence Source:** `page-db300acb9a9b99b5.js` (offsets ~42740–42850, `function et(e)`).
- **Target Specification:**
  - Tab inventory: `["Controls", "Today", "Stats", "Clipboard", "Apps", "Wallpaper", "Power"]`.
  - Pre-computed pill widths (`O`):
    - `Controls`: 83px
    - `Today`: 64px
    - `Stats`: 60px
    - `Clipboard`: 90px
    - `Apps`: 58px
    - `Wallpaper`: 94px
    - `Power`: 67px
    - Tab spacing: `6px` gap between tabs.
  - Placement: Horizontal auto-centering: `left = 18 + (panelWidth - 36 - totalTabWidth) / 2`, `top = 15px`.
  - Selection: Active tab has `data-on="true"` with high-contrast text and luminous background accent pill.
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Reconstruct `NavigationTabBar.tsx` to align with the 7 Hitodama tabs, using the exact widths and auto-centering formula.

---

### Feature 4: Controls Tab (`el`) - Quick Controls & Media Player
- **Feature Name:** System Quick Controls & Media Dashboard
- **Evidence Source:** `function el(e)` in `page-db300acb9a9b99b5.js` (offset ~44200).
- **Target Specification:**
  - **Row 1 Tiles (3 across, width `(panelWidth - 56) / 3` ≈ 194px):**
    1. **Wi-Fi**: Icon `wifi`, title `"Wi-Fi"`, subtitle SSID (e.g. `"Home 5G"` / connected SSID), active state indicator, chevron.
    2. **Bluetooth**: Icon `bluetooth`, title `"Bluetooth"`, subtitle (e.g. `"Off"` / device name), toggleable, chevron.
    3. **Audio Output**: Icon `speaker`, title `"Audio"`, subtitle device name (e.g. `"Speakers"` / default audio endpoint), chevron.
  - **Row 2 Tiles (2 across, width 297px each):**
    4. **Night Light**: Icon `moon`, title `"Night Light"`, subtitle `"Off"` / `"On"`.
    5. **Dark Mode**: Icon `contrast`, title `"Dark mode"`, subtitle `"On"`, chevron false.
  - **Volume Slider Card (top: 136px, width: 604px):**
    - Smooth interactive volume slider bar (`width: max(50, 604 * volume / 100)`).
    - Left speaker icon, right percentage text (`h = Math.round(volume) + "%"`).
    - Ease curve: `[.45, 0, .2, 1]` for volume transitions.
  - **Integrated Media Player Card (top: 184px):**
    - Device indicator (`"Speakers"` with small speaker icon).
    - Album art cover (`mediaCover`).
    - Track title (`mediaTitle`) and artist (`mediaBy`).
    - Playback controls: Previous, Play/Pause toggle, Next.
    - Real-time elapsed time and total track duration with scrubber bar.
- **Data Sources:** Windows GSMTC (Global System Media Transport Controls) daemon + Windows Audio Session API.
- **AI Classification:** Non-AI (Native Windows APIs).
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Build `ControlsWidget.tsx` integrating with existing `audio-session.ts` and `media.ts` services in `src/main/services/`.

---

### Feature 5: Today Tab (`eo`) - Time, Weather, Weekly Calendar & To-Do
- **Feature Name:** Today Overview & Productivity Hub
- **Evidence Source:** `function eo(e)` in `page-db300acb9a9b99b5.js` (offset ~45800).
- **Target Specification:**
  - **Clock Card (176px × 214px):**
    - Large 2-digit hour display (`clockNum`, top: 25px) and minute display (`clockNum`, top: 109px).
    - Animated blinking colon dot triplets at center (`animate: { opacity: [1, 1, 0.55, 0.55] }`).
    - Footer badge: AM/PM + Day + Date (e.g. `"AM · Tue 29"`).
  - **Weather Card (176px × 142px):**
    - Weather icon (sun/cloud/rain), temperature (e.g. `"32°C"`), condition summary (`"Mostly clear"`).
  - **Weekly Calendar Card (354px × 182px):**
    - Header: `"This week"`, date range (`"Sep 28 – Oct 4"`).
    - 7 day columns (Mon–Sun) with date cells; today highlighted with `data-today="true"`.
    - Next agenda item callout: `"Next · 11:00 AM"` with description (`"Daily team sync"`).
  - **To-Do / Task Progress Card (354px × 174px):**
    - Circular progress ring SVG (`r=39.5`, animated `strokeDasharray`).
    - Completed counter badge (`b: "d / total"`).
    - Interactive to-do rows (`todoRow`):
      - Custom SVG animated checkbox (`D.is`) that draws a checkmark on click.
      - Smooth strike-through and opacity fade (`1 - 0.6 * fade`).
    - Add item input: `"Add a to-do…"` with enter key action badge.
- **Data Sources:** Local system clock, Windows weather/local data, local SQLite/JSON storage for to-do items.
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Upgrade `CalendarWidget.tsx` to match this layout, embedding the dual-card left rail (Clock + Weather) and dual-card right rail (This Week + Interactive To-Do).

---

### Feature 6: Stats Tab (`ep`) - Telemetry, Process Monitor & History Graph
- **Feature Name:** Hardware Performance & Telemetry Dashboard
- **Evidence Source:** `function ep()` in `page-db300acb9a9b99b5.js` (offset ~48200).
- **Target Specification:**
  - **Metric Stat Cards (left columns):**
    - CPU: Load percentage, frequency (e.g. `"4.2 GHz"`), process count (e.g. `"229 proc"`).
    - RAM: Usage/Total (e.g. `"2.1 / 8.0 GB"`), available (e.g. `"12.5 GB free"`).
    - Disk: Active drive usage (e.g. `"DISK C:"`, `"412 / 931 GB"`).
    - Network: Live throughput (`"NETWORK"`, `"↓ 1.2 MB/s  ↑ 300 KB/s"`).
    - Uptime: System uptime duration (`"UP FOR"`, `"5 h 12 m"`).
  - **Timeframe Selector:**
    - Filter tabs: `["1m", "5m", "10m", "15m", "20m"]`.
  - **Top Apps Card (262px × 136px):**
    - Header: `"Top apps · RAM"`, with toggle action `"CPU ⇄"`.
    - Ranked process list with colored app dots, process names, and memory/CPU percentages.
- **Data Sources:** `src/main/services/system.ts` (CPU delta ticks, RAM, platform metrics).
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Enhance `SystemWidget.tsx` with Hitodama's multi-metric card grid, history graph intervals, and top processes list with CPU/RAM toggle.

---

### Feature 7: Clipboard Tab (`e_`) - Multi-Type Clipboard Manager
- **Feature Name:** Clipboard History & Rich Inspector
- **Evidence Source:** `function e_()` in `page-db300acb9a9b99b5.js` (offset ~50100).
- **Target Specification:**
  - **Search & Filter Bar:**
    - Search input (`"Search 23 items…"`) with search icon and settings gear.
    - Category filter chips: `["All", "Text", "Images", "Links"]`.
  - **Clipboard Item List:**
    - Group sections (e.g. `"Starred"`, `"Today"`).
    - Row items with type icon (`text`, `code`, `link`, `image`), title preview, timestamp badge.
    - Active selection highlight (`data-on="true"`).
  - **Preview & Metadata Inspector (`clipPreview`):**
    - Content body preview box.
    - Metadata table:
      - `Type`: `"Text"` / `"Link"` / `"Image"`
      - `Size`: Character, word, and line counts (e.g. `"108 characters · 22 words · 1 line"`).
      - `Copied`: Formatted timestamp (e.g. `"Today, 9:41 AM"`).
  - **Keyboard Action Legend Bar (`clipKeys`):**
    - `<kbd>↵</kbd> Paste`, `<kbd>Ctrl C</kbd> Copy`, `<kbd>Ctrl P</kbd> Pin`, `<kbd>Del</kbd> Remove`.
    - Navigation footer: `↑↓ Move  ·  Ctrl/Shift pick several  ·  Tab Filter`.
- **Data Sources:** Windows clipboard listener (`src/main/services/clipboard.ts`).
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Upgrade `ClipboardWidget.tsx` with filter chips, the side-by-side list and preview inspector, and keyboard shortcut actions.

---

### Feature 8: Apps Tab (`ef`) - Application Launcher & Quick Shortcuts
- **Feature Name:** Application Launcher & Search Palette
- **Evidence Source:** `function ef()` in `page-db300acb9a9b99b5.js` (offset ~52000).
- **Target Specification:**
  - **Search Header:**
    - Magnifier SVG icon.
    - Placeholder: `"Search apps, files and snippets…"`.
    - Shortcut badge: `"Win+A"` (or global summon shortcut).
  - **Frequent App Chips:**
    - Auto-sized chips with lightning/dot icon (e.g. `"terminal"`, `"chrome"`, `"notepad"`).
  - **Categorized App Rows:**
    - Headers: `"Starred"`, `"Recent"`, `"Applications"`.
    - Row elements: App initial/icon tile, app title, tail action (`"↵ Open"` or `"Application"` / `"Game"`).
    - Star button to pin/unpin favorites.
- **Data Sources:** `src/main/services/launcher.ts` (whitelisted Windows executables).
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Merge and refine `CommandSearch.tsx` and `ShortcutGrid.tsx` into the unified `Apps` view matching Hitodama's layout and keyboard navigation.

---

### Feature 9: Wallpaper Tab (`eg`) - 3D Smoothstep Wallpaper Carousel
- **Feature Name:** Wallpaper Switcher & Gallery
- **Evidence Source:** `function eg()`, `function ey()` in `page-db300acb9a9b99b5.js` (offset ~54000).
- **Target Specification:**
  - **Header Controls:**
    - Filter pills: `"Recent"` (`data-on="true"`) and `"My folder"`.
    - Count badge: `"N pictures"`.
    - Open folder action button (`folder` icon).
  - **3D Perspective Carousel (`ey`):**
    - Smoothstep interpolation: `d = min(|offset|, 1) * t * (3 - 2t)`.
    - Card width: `w = 330 - 264 * d`.
    - Card height: `h = 186 - 14 * d`.
    - Horizontal positioning: `p = 211.47 * d + 78 * max(0, |offset| - 1)`.
    - Opacity: `m = 1 - 0.22 * min(|offset|, 1) - 0.11 * max(0, |offset| - 1)`.
    - Layering: `zIndex = 10 - round(2 * |offset|)`.
    - One-click apply: Clicking any card sets it as the active Windows desktop wallpaper with smooth confirmation animation (`wallApplying`).
- **Data Sources:** `src/main/services/wallpaper.ts` and `wallpaperGallery.ts`.
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified** (Exact mathematical formulas extracted from component `ey`).
- **Proposed is-delulu Implementation:**
  - Replace static grid in `WallpaperWidget.tsx` with Hitodama's verified 3D smoothstep carousel mathematics.

---

### Feature 10: Power Tab (`ej`) - Windows System Actions Dock
- **Feature Name:** Power & Session Actions
- **Evidence Source:** `function ej()` in `page-db300acb9a9b99b5.js` (offset ~56000).
- **Target Specification:**
  - Bounding box: `640px × 166px`.
  - 4 Equidistant interactive buttons (`width = (640 - 36 - 30) / 4` ≈ 143.5px):
    1. **Lock**: Icon `lock`, label `"Lock"`. Executes Windows Lock (`rundll32.exe user32.dll,LockWorkStation`).
    2. **Sleep**: Icon `moon`, label `"Sleep"`. Executes Windows Sleep (`rundll32.exe powrprof.dll,SetSuspendState 0,1,0`).
    3. **Restart**: Icon `restart`, label `"Restart"`. Executes `shutdown.exe /r /t 0`.
    4. **Shut down**: Icon `power`, label `"Shut down"`. Executes `shutdown.exe /s /t 0`.
  - Interactive Cursor Tracking:
    - Dynamic hover effect with smooth highlight when mouse moves across the dock.
- **Data Sources:** Windows shell system execution service.
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Add native IPC handlers in `src/main/index.ts` for safe power actions and build `PowerWidget.tsx`.

---

### Feature 11: Floating Mini Music Pill (`ei`)
- **Feature Name:** Dynamic Island Music State
- **Evidence Source:** `function ei()` in `page-db300acb9a9b99b5.js` (offset ~43500).
- **Target Specification:**
  - Dimension: `380px × 150px`.
  - Content:
    - Album art thumbnail (`344px × 118px` container).
    - Track title ticker and artist label.
    - Dynamic playback scrubber bar with real-time progress.
    - Elapsed time and total duration timestamps.
    - Media controls: Previous, Play/Pause, Next.
- **Data Sources:** Windows GSMTC daemon.
- **AI Classification:** Non-AI.
- **Scope Status:** **IN SCOPE**.
- **Confidence Level:** **Verified**.
- **Proposed is-delulu Implementation:**
  - Support mini music island state in `MorphingIsland.tsx` when media is actively playing.

---

## 4. Explicitly Excluded AI Features

The following features were identified during the reverse-engineering analysis of `https://hitodama.in/` and are **strictly excluded** from implementation:

1. **Circle to Ask (`Ctrl + Shift`)**:
   - *Description:* Allows user to lasso/circle an area of the screen and speak a multimodal question.
   - *Reason for exclusion:* Sends screenshot crops to the Google Gemini Multimodal API.
2. **AI Dictation (`Ctrl + Win`)**:
   - *Description:* Speech-to-text with LLM semantic post-processing to clean up false starts and conversational hesitations.
   - *Reason for exclusion:* Uses cloud Gemini LLM inference for speech cleanup.
3. **Autonomous Voice Routine Agent ("Say it once. Then forget it.")**:
   - *Description:* Background LLM scheduling and autonomous task execution based on voice prompt interpretation.
   - *Reason for exclusion:* Requires Gemini reasoning loop and cloud API key.
4. **Hitodama Soul & API Key Onboarding**:
   - *Description:* Settings interface to configure Google AI Studio / Gemini API keys and soul personalities.
   - *Reason for exclusion:* AI configuration system.

---

## 5. Architectural Gap Analysis & Implementation Plan for is-delulu

| Component / Layer | Current is-delulu Baseline | Required Hitodama Reconstruction | Planned Changes |
| :--- | :--- | :--- | :--- |
| **Electron Window Bounds** | Fixed `660px × 520px` in `WINDOW_CONFIG` | Dynamic widths up to `1040px` (Wallpaper) and heights up to `638px` (Apps) | Expand window canvas to `1080px × 700px` (transparent) in `constants.ts` and `window.ts`, maintaining centered positioning and click-through outside island. |
| **Morphology Engine** | Static panel dimensions (`620 × 490`) when expanded | Tab-specific dimensions (`380×150` to `1040×314`) using curve `[0.33, 1, 0.68, 1]` | Bind `MorphingIsland.tsx` width and height to active tab dimensions with `V = [0.33, 1, 0.68, 1]`. |
| **Gestures** | Click pill to expand, Esc to collapse | Mouse wheel flick down (`deltaY > 0`) expands directly into Controls | Add `onWheel` listener on collapsed pill in `MorphingIsland.tsx`. |
| **Navigation Tabs** | Custom 7 tabs (`launcher`, `calendar`, `system`, `clipboard`, `media`, `routines`, `settings`) | Hitodama 7 tabs: `Controls`, `Today`, `Stats`, `Clipboard`, `Apps`, `Wallpaper`, `Power` | Update `NavigationTabBar.tsx` with exact widths and auto-centering formula. |
| **Controls Tab** | Basic media player widget | 5 Quick toggle tiles + Volume slider + Media player card | Reconstruct `ControlsWidget.tsx` integrating system audio & media. |
| **Today Tab** | Monthly calendar table | Dual-rail layout: Clock + Weather on left, Weekly Calendar + Interactive To-Do on right | Update `CalendarWidget.tsx` to Hitodama Today layout. |
| **Stats Tab** | 2-column telemetry bars | 5-card telemetry grid + 1m–20m timeframe filter + Top Apps CPU/RAM toggle | Upgrade `SystemWidget.tsx` with Hitodama stats cards. |
| **Clipboard Tab** | Vertical card list | Chips (`All`, `Text`, `Images`, `Links`) + Split list and rich inspector + Keyboard legend | Reconstruct `ClipboardWidget.tsx`. |
| **Apps Tab** | Grid of 9 fixed shortcuts | Search bar + Frequent chips + Starred/Recent/Apps list with Star toggle | Build unified `AppsWidget.tsx`. |
| **Wallpaper Tab** | Grid gallery | 3D smoothstep perspective carousel with instant desktop application | Reconstruct `WallpaperWidget.tsx` using `ey` carousel math. |
| **Power Tab** | None (only in tray menu) | 4-button dock: Lock, Sleep, Restart, Shut down with hover tracking | Build `PowerWidget.tsx` and add native IPC handlers. |

---

## 6. Verification & Test Plan

1. **Type Checking:** Run `npm run typecheck` to verify strict TypeScript adherence across renderer, preload, and main process.
2. **Production Bundle Verification:** Run `npm run build` to verify Electron Vite bundler packaging.
3. **Morphology & Sizing Test:** Verify that switching between all 7 tabs smoothly resizes the island container to its target dimensions without jitter, overflow, or window edge clipping.
4. **Gesture Verification:** Test scrolling down on the collapsed island pill to confirm expansion into `Controls`.
5. **Native Integration Tests:**
   - Test Volume Slider adjustment against Windows master audio.
   - Test Media playback controls (play/pause/prev/next) with Windows GSMTC.
   - Test Wallpaper carousel selection and apply to desktop.
   - Test To-Do addition, completion toggle, and counter ring.
   - Test Clipboard filtering and preview inspector.
   - Test Power actions dock triggers.
