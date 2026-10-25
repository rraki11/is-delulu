# Hitodama Feature Classification Matrix & Visual Reference Analysis

## 1. Visual Reference Analysis & Asset Mapping

Five high-fidelity reference screenshots of Hitodama's live interface were analyzed and cross-referenced with the reverse-engineered React/Next.js bundle (`page-db300acb9a9b99b5.js` and `8-cbac954474445cf0.js`) obtained via REA.

| Reference Image | Corresponding Target Component | Bounding Box Dimensions (`z`) | Active Tab / State | Observable Elements & State Transitions |
| :--- | :--- | :--- | :--- | :--- |
| **Screenshot 1** (`...efb6b256.png`) | `function ef()` (Apps View) | `720px × 638px` | `Apps` (Pill width: `58px`) | • Top centered tab bar with `Apps` active in warm accent pill.<br>• Search bar: Magnifier icon, `"Search apps, files and snippets…"`, shortcut hint `Win+A`.<br>• Frequent app chips: `[⚡ gmail]`, `[⚡ Gta 5]` with rounded border and subtle dark translucent background.<br>• Grouped sections: `STARRED`, `RECENT`, `APPLICATIONS`.<br>• `Spotify` is hovered/focused with high-contrast highlight row, `↵ Open` badge, and filled gold star (`★`).<br>• Other rows display app initial badges, app names, category labels (`Application`, `Game`), and star toggle buttons. |
| **Screenshot 2** (`...0acab616.png`) | `function ej()` (Power View) | `640px × 166px` | `Power` (Pill width: `67px`) | • Ultra-compact 166px height.<br>• 4 horizontal action cards: `Lock` (padlock), `Sleep` (crescent moon), `Restart` (counter-clockwise cycle), `Shut down` (power circle).<br>• Pointer is hovering over `Lock`, demonstrating real-time cursor tracking and luminous background elevation. |
| **Screenshot 3** (`...4deba0c8.png`) | `function el()` (Controls View) | `640px × 390px` | `Controls` (Pill width: `83px`) | • 2-row Quick Tile grid: Row 1 has 3 tiles (`Wi-Fi` [Active, SSID "Home 5G"], `Bluetooth` [Inactive, "Off"], `Audio` [Active, "Speakers"]). Row 2 has 2 tiles (`Night Light` [Inactive], `Dark mode` [Active]). Active tiles turn solid warm sand/gold with dark text/icons.<br>• Volume slider track (`top: 136px`) with speaker icon, warm fill bar, and percentage readout (`28%`). Pointer is actively scrubbing.<br>• Media player card (`top: 184px`): Device tag `"Speakers"`, gradient album artwork, track title `"lofi beats to study and relax"`, artist `"lofi radio"`, prev/next buttons, centered play/pause circular pill, and scrubber bar with elapsed `"0:57"` and duration `"62:15"`. |
| **Screenshot 4** (`...62be331b.png`) | `function eg()`, `function ey()` (Wallpaper View) | `1040px × 314px` | `Wallpaper` (Pill width: `94px`) | • Wide format (`1040px`).<br>• Header controls: `"Recent"` pill active, `"My folder"` pill inactive, `"5 pictures"` count badge, open folder icon.<br>• 3D perspective carousel: Center selected wallpaper is flat, large (`330px × 186px`), full-color landscape. Flanking cards are tilted in 3D perspective with smoothstep depth scaling (`d = min(|e|, 1) * t * (3 - 2t)`), decreasing width, height, and opacity, and overlapping z-index. Hovering over center card. |
| **Screenshot 5** (`...da7a9be5.png`) | `function ei()` (Compact Music Mini Island) | `380px × 150px` | `music` (Floating Mini Mode) | • Dedicated compact island state without navigation tabs.<br>• Centered album art thumbnail, title ticker, artist, playback scrubber, elapsed time (`0:50`), duration (`62:15`), and prev/play-pause/next controls.<br>• Flush with primary monitor top bezel with smooth bottom rounded corners (`~20px`). |

---

## 2. Visual Design & Theme System Analysis

Cross-referencing the screenshots with the CSS extracted from `page-db300acb9a9b99b5.js`:

### Color Tokens
- **Base Glass Surface (`--bg-surface`):** Deep graphite-black `rgba(14, 15, 17, 0.95)` with `backdrop-filter: blur(28px) saturate(180%)`.
- **Card Background (`--bg-card`):** Dark neutral `rgba(28, 29, 33, 0.82)` with subtle 1px border `rgba(255, 255, 255, 0.08)`.
- **Active Accent Theme:**
  - Active Tab Pill & Active Quick Tiles: Warm sand/gold `#D7B56D` (or wallpaper-adaptive accent).
  - Active Tile Text & Icons: Deep espresso `#141310`.
  - Inactive Tile Text: Pure high-contrast `#F3F4F6`; Subtitles `#8E919A`.
- **Borders & Edge Highlight:** Ultra-fine `1px` translucent edge `rgba(255, 255, 255, 0.10)` on container; top edge flush with `0px` margin.
- **Corner Radii:**
  - Expanded Panel: `0px 0px 22px 22px` (flush top, rounded bottom).
  - Compact Pill / Mini Island: `0px 0px 18px 18px` (or `20px`).
  - Internal Cards: `14px` to `16px`.
  - Quick Tiles & Buttons: `12px` to `14px`.
  - Filter Pills & Badges: `9999px` (fully rounded capsule).

---

## 3. Complete Feature Classification Matrix

### Category A: Non-AI Features to Reconstruct

#### A. Floating Island & Window Behavior
| ID | Feature | Description | State Transitions | Windows 11 Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **A1** | **Adaptive Morphology Engine** | Window container bounds smoothly morph between tab-specific bounding dimensions: `music` (380×150), `controls` (640×390), `today` (880×442), `stats` (880×338), `clipboard` (880×446), `apps` (720×638), `wallpaper` (1040×314), `power` (640×166). | `collapsed` ↔ `expanded[tab]` with dynamic layout animation. | Expand transparent Electron window bounds to `1080px × 700px` in `window.ts`; animate `targetWidth` and `targetHeight` in `MorphingIsland.tsx`. |
| **A2** | **Scroll-Down-to-Expand Gesture** | Mouse wheel down (`deltaY > 0`) over collapsed island immediately expands into `Controls` view. | `collapsed` → `expanded` (`activeTab = 'controls'`). | Add `onWheel` listener on `IslandPill` container. |
| **A3** | **Interactive Click & Hotkey Summon** | Click on collapsed pill or press global summon shortcut (`Ctrl+Shift+Space`) expands island. Pressing `Esc` or clicking outside collapses it. | `collapsed` ↔ `expanded`. | Integrate existing hotkey and add outside-click listener in `MorphingIsland.tsx`. |
| **A4** | **Hardware Accelerated Glassmorphism** | Translucent backdrop blur with high opacity dark tone and subtle luminous perimeter stroke. | Constant styling with CSS variables. | Hardware accelerated CSS `backdrop-filter: blur(28px) saturate(180%)`. |
| **A5** | **Always-On-Top with Pass-Through Click Area** | Window stays on top (`screen-saver` level); areas outside the active island pass mouse events directly to underlying desktop applications. | `setIgnoreMouseEvents(true, { forward: true })` outside island geometry; `false` over island. | Pointer enter/leave bounds tracking on the island DOM element. |

#### B. UI & Visual Design
| ID | Feature | Description | Visual Details | Windows 11 Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **B1** | **Seven-Tab Centered Navigation Bar (`et`)** | Auto-centered tab bar with tabs: `Controls`, `Today`, `Stats`, `Clipboard`, `Apps`, `Wallpaper`, `Power`. | Widths: 83px, 64px, 60px, 90px, 58px, 94px, 67px. 6px gap. Centered: `left = 18 + (width - 36 - totalW)/2`. Active pill in accent gold. | Update `NavigationTabBar.tsx` with verified layout and dimensions. |
| **B2** | **Fluid Spring & Cubic Transitions (`V`)** | Cubic-bezier curve `V = [0.33, 1, 0.68, 1]` for all morphology and tab switching transitions. | Duration: `0.22s`–`0.26s` for tab switches; `0.32s`–`0.42s` for expand/collapse. | Configure `Transition` curve in `motion/react`. |
| **B3** | **High-Density Typography & Hierarchy** | Sans-serif system font (Segoe UI Variable / Inter), crisp weights (400, 500, 600, 700), monospaced tabular digits for clocks/timers/metrics. | Header labels (12px uppercase tracking), body copy (14px), large clock digits (56px). | Updated font family tokens in `design-tokens.css`. |

#### C. Controls & Media Utility
| ID | Feature | Description | Data Sources & Interactivity | Windows 11 Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **C1** | **Quick Control Tiles Grid** | 5 system tiles: Wi-Fi, Bluetooth, Audio, Night Light, Dark Mode. | Wi-Fi SSID from Windows WLAN; Bluetooth status; Audio default device name; Dark mode toggle. | Reconstruct `ControlsWidget.tsx` integrating with `audio-session.ts` and system preferences. |
| **C2** | **Smooth Volume Slider** | Full-width interactive scrubber with speaker icon, live percentage indicator, and drag/click adjustment. | Windows Core Audio API / PowerShell audio session daemon. | Connect slider events to `window.isDelulu.setMasterVolume()`. |
| **C3** | **Integrated Media Controller** | Media card with album artwork, title, artist, audio device tag, progress scrubber, elapsed/total time, and prev/play-pause/next controls. | Windows Global System Media Transport Controls (GSMTC daemon). | Connect to `media.ts` GSMTC state listener and playback dispatchers. |
| **C4** | **Floating Mini Music Island (`ei`)** | When collapsed or switched to mini mode during active audio playback, island shrinks to `380px × 150px` music card. | Active track info and scrubber. | Support `mini-media` mode in `MorphingIsland.tsx`. |

#### D. Productivity & System Utilities
| ID | Feature | Description | Interactivity & State Transitions | Windows 11 Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **D1** | **Today Overview (`eo`)** | Dual-rail layout: Dual card left (Live Clock with blinking dots + Weather), Dual card right (Weekly Calendar + Interactive To-Do). | Calendar highlights current day (`data-today="true"`). To-Do has animated checkmark (`D.is`), completion strike-through, counter ring (`d/total`), and add item input. | Reconstruct `CalendarWidget.tsx` to match Hitodama's Today layout. |
| **D2** | **Hardware Telemetry & Process Monitor (`ep`)** | Multi-metric cards (CPU load %, freq, procs; RAM used/free; Disk C; Network; Uptime) + Timeframe selector (`1m`–`20m`) + Top apps RAM/CPU sort toggle. | Live CPU ticks, OS memory metrics, active process sampling. | Upgrade `SystemWidget.tsx` with Hitodama stats grid and top processes view. |
| **D3** | **Clipboard History & Inspector (`e_`)** | Search bar + Category filter chips (`All`, `Text`, `Images`, `Links`) + Segmented item list + Side-by-side rich preview & metadata inspector + Keyboard shortcuts legend. | Windows clipboard listener, item copy, pin toggle, item deletion, paste on Enter. | Reconstruct `ClipboardWidget.tsx` with split list/inspector layout. |
| **D4** | **App Launcher & Command Bar (`ef`)** | Search bar with `Win+A` hint + Frequent chips + Categorized list (`STARRED`, `RECENT`, `APPLICATIONS`) with star favorite toggle and Enter to launch. | Whitelisted Windows executables (`launcher.ts`) + user starred apps persistence. | Reconstruct `AppsWidget.tsx` with keyboard navigation and favorite pinning. |
| **D5** | **3D Wallpaper Carousel (`eg`, `ey`)** | Filter pills (`Recent`, `My folder`) + 3D perspective carousel with smoothstep mathematical depth scaling + One-click desktop wallpaper apply. | Local wallpaper directory scanning + Windows wallpaper setter (`set-wallpaper.exe`). | Reconstruct `WallpaperWidget.tsx` implementing exact `ey` carousel math. |
| **D6** | **Power Actions Dock (`ej`)** | 4-card dock: Lock, Sleep, Restart, Shut down with dynamic cursor hover tracking. | Windows native commands (`user32.dll`, `powrprof.dll`, `shutdown.exe`). | Add `PowerWidget.tsx` and native IPC handlers in `src/main/index.ts`. |

---

### Category B: AI-Powered Features to Exclude

| Feature Name | Description Observed on Target | Reason for Exclusion | Clean UI Separation Strategy |
| :--- | :--- | :--- | :--- |
| **Circle to Ask** | Holding `Ctrl+Shift` brings up a lasso tool to crop an area on screen and speak a query. | Calls Google Gemini Vision/Multimodal API to interpret the image. | Fully excluded. `Apps` and `Clipboard` search bars remain standard local text search with zero cloud API dependency. |
| **AI Dictation** | Holding `Ctrl+Win` records speech and uses LLM to remove false starts and hesitations ("Talk badly. Send it clean."). | Uses cloud Gemini LLM for speech re-writing and summarization. | Fully excluded. No mic listening or cloud dictation services added. |
| **Autonomous Voice Agent** | "Say it once. Then forget it." Autonomous background agent scheduling and routine execution via voice. | Requires multi-step LLM planning loop and Gemini API key. | Fully excluded. In-scope local routines and to-dos remain strictly user-authored and stored locally. |
| **Hitodama Soul & API Key Onboarding** | "Shape your Hitodama" (5 slots: Soul, Personality, Voice, Abilities, Dictation) + Google AI Studio key prompt. | Exclusively manages cloud AI personas and Gemini billing tiers. | Fully excluded. Removed completely from settings and UI; no dead buttons or non-functional API inputs. |

---

### Category C: Unknown or Infeasible Features

| Feature Name | Observed Detail / Evidence | Technical Limitation on Windows 11 | Proposed Workaround / Decision |
| :--- | :--- | :--- | :--- |
| **Direct Hardware Wi-Fi Switching from Unprivileged App** | Hitodama tile displays connected SSID ("Home 5G"). | In Windows 11, turning Wi-Fi hardware adapter on/off or disconnecting without administrator privileges or native UWP capabilities can be restricted or require elevated PowerShell. | **Supported implementation:** Display real-time connected Wi-Fi SSID and signal via `netsh wlan show interfaces`; clicking tile opens Windows Quick Settings network flyout (`ms-availablenetworks:`) or launches Network Settings. |
| **Bluetooth Hardware Radio Power Toggle** | Tile displays "Bluetooth Off" / device. | Direct toggling of Windows Bluetooth radio requires Windows.Devices.Radios WinRT API (requires packaged app identity) or devcon. | **Supported implementation:** Query Bluetooth device connection status; clicking tile opens Windows Bluetooth Settings (`ms-settings:bluetooth`). |
| **Real-time Per-Process CPU Delta Sampling in Web Worker** | "Top apps · CPU" | Sampling per-process CPU percentage across hundreds of Windows processes at 60fps causes high CPU overhead. | **Supported implementation:** Sample top 5 processes every 3 seconds in the main process via efficient WMI/PowerShell or `tasklist` snapshot to maintain zero UI lag. |
| **Direct Night Light Hardware Color Temperature Setting** | Night Light tile ("Off"/"On"). | Windows Night Light registry keys are binary-encoded Gamma ramp tables under `Software\Microsoft\Windows\CurrentVersion\CloudStore`. | **Supported implementation:** Read Night Light state from Windows CloudStore registry; clicking opens Night Light display settings (`ms-settings:nightlight`). |

---

## 4. Discrepancy Analysis & Runtime Reconciliation

1. **Window Bounding Dimensions:**
   - *Previous is-delulu implementation:* Fixed window canvas of `660px × 520px` caused wider views like Wallpaper (`1040px`) or taller views like Apps (`638px`) to be clipped.
   - *Reconciliation:* Expand the Electron transparent window canvas to `1080px × 700px` centered on the primary monitor with `setIgnoreMouseEvents` active for transparent padding, allowing every tab to render at its native reverse-engineered dimensions.
2. **Tab Bar Navigation:**
   - *Previous is-delulu implementation:* Contained 7 custom tabs (`launcher`, `calendar`, `clipboard`, `system`, `media`, `routines`, `settings`) in a horizontally scrollable bar.
   - *Reconciliation:* Reconstruct the tab bar into Hitodama's verified 7 tabs (`Controls`, `Today`, `Stats`, `Clipboard`, `Apps`, `Wallpaper`, `Power`) auto-centered at the top of the panel, with exact tab widths and high-contrast active capsules matching the screenshots.
3. **Accent Theming:**
   - *Observation from screenshots:* Hitodama uses a refined warm sand/gold accent `#D7B56D` on active elements that harmonizes with the desktop wallpaper.
   - *Reconciliation:* `is-delulu`'s dynamic wallpaper palette engine will adaptively tint the active tab pills, quick tiles, volume fill, and stars, while falling back to `#D7B56D` for the authentic Hitodama look.

---

## 5. Implementation Roadmap

With Phase Two classification complete, implementation proceeds systematically:
1. **Window Canvas & Sizing (`shared/constants.ts`, `main/window.ts`):** Expand canvas to 1080×700 and support per-tab dynamic target dimensions.
2. **Morphology & Sizing State (`useIslandStore.ts`, `MorphingIsland.tsx`):** Implement adaptive morphology dictionary `z`, cubic curve `V = [0.33, 1, 0.68, 1]`, and scroll-down expand gesture.
3. **Tab Bar (`NavigationTabBar.tsx`):** Align with Hitodama's 7 tabs, exact pill widths, and centered layout.
4. **Controls Widget (`ControlsWidget.tsx`):** 5 quick tiles, volume slider, and media player card.
5. **Today Widget (`CalendarWidget.tsx`):** Clock, Weather, Weekly Calendar, and interactive To-Do with SVG check animation.
6. **Stats Widget (`SystemWidget.tsx`):** Multi-card telemetry, timeframe chips, and top apps monitor.
7. **Clipboard Widget (`ClipboardWidget.tsx`):** Chips, split list/preview inspector, and keyboard shortcuts.
8. **Apps Widget (`AppsWidget.tsx`):** Search, chips, categorized apps, star toggle, and keyboard launch.
9. **Wallpaper Widget (`WallpaperWidget.tsx`):** 3D smoothstep perspective carousel with instant apply.
10. **Power Widget (`PowerWidget.tsx`):** 4-button power actions dock with cursor tracking and native execution.
