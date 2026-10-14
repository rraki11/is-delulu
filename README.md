# is-delulu

A customizable Windows desktop companion featuring a Dynamic Island-inspired floating interface, smooth animations, quick controls, desktop automation, and customizable routines. Built for a modern, seamless desktop experience.

---

## ⚡ Overview

**is-delulu** is a lightweight, futuristic desktop companion for Windows 10 and Windows 11. It rests near the top-center of the primary monitor as a compact floating pill, expanding on demand into a high-density, translucent interactive control center.

### Core Highlights
- **Dynamic Island Floating Window**: Transparent, borderless Electron window with zero OS window decorations, hardware-accelerated translucent glassmorphism (`backdrop-filter: blur`), and subtle neon accents.
- **Physics-Based Spring Animations**: Fluid transitions powered by `motion/react` with spring physics between collapsed pill and expanded control center states.
- **Real Desktop Telemetry**: Live CPU load percentage calculation, RAM utilization, OS platform/architecture info, hostname, and system uptime.
- **Secure Native Clipboard Manager**: In-memory Windows clipboard monitor with auto-detection for URLs, code snippets, and text, with one-click copy and history wiping.
- **Application Launcher & Command Palette**: Searchable command bar with keyboard navigation (`↑`, `↓`, `Enter`), quick app shortcuts (Explorer, Terminal, Notepad, Calculator, Task Manager, Downloads, VS Code, Browser).
- **Media Controller**: Sleek audio player interface with animated waveforms, playback controls, and volume adjustment.
- **Automated Desktop Routines**: Local productivity presets (Deep Focus, Developer Flow, Clean Slate) designed for rapid context switching.
- **Windows System Tray & Hotkeys**: Seamless system tray integration with context menu (recenter, toggle pin, expand/collapse, quit) and global summon hotkey (`Ctrl + Shift + Space`).

---

## 🎨 Visual Design System

The application strictly implements the specified futuristic dark palette and restrained glow aesthetic:

| Token | Hex / Value | Role |
| :--- | :--- | :--- |
| **Primary Background** | `#0A0D0E` | Main glass container base & collapsed pill |
| **Secondary Background** | `#121515` | Internal cards and section tiles |
| **Accent** | `#BBFF00` | Electric lime highlights, active indicators, and focus rings |
| **Muted Accent** | `#8A9669` | Subtle secondary badges and progress gradient starts |
| **Primary Text** | `#F7FBE8` | High-contrast headers, metrics, and readable copy |
| **Secondary Text** | `#8E999B` | Subdued neutral gray descriptions and labels |
| **Surface Translucency** | `rgba(10, 13, 14, 0.92)` | 28px blur with 180% saturation filter |
| **Borders** | `rgba(187, 255, 0, 0.18)` | Ultra-thin luminous outline |

---

## 🏗 Architecture & Security

The project follows strict Electron isolation standards:

```
is-delulu/
├── electron-vite.config.ts    # Dual Electron + Vite bundler setup
├── package.json               # Dependencies & scripts
├── tsconfig.json              # Renderer TypeScript strict config
├── tsconfig.node.json         # Main & preload TypeScript config
├── src/
│   ├── main/                  # Electron Main Process (Node.js runtime)
│   │   ├── index.ts           # App lifecycle, single instance lock, IPC dispatcher
│   │   ├── window.ts          # Transparent always-on-top window manager & bounds
│   │   ├── tray.ts            # Windows system tray integration & menu
│   │   └── services/          # Modular desktop service providers
│   │       ├── system.ts      # Hardware telemetry (CPU delta ticks, RAM, OS info)
│   │       ├── clipboard.ts   # Safe clipboard listener & memory history
│   │       ├── launcher.ts    # Whitelisted app & shell executor
│   │       ├── media.ts       # Media playback state provider
│   │       └── routines.ts    # Desktop automation routine handlers
│   ├── preload/               # Preload scripts (Isolated IPC Bridge)
│   │   ├── index.ts           # contextBridge exposing safe typed window.isDelulu
│   │   └── index.d.ts         # TypeScript window.isDelulu type declarations
│   ├── shared/                # Code shared across all processes
│   │   ├── types.ts           # Shared TypeScript interfaces & IPC contracts
│   │   ├── constants.ts       # Dimensions, default commands, shortcuts, routines
│   │   └── index.ts           # Barrel re-export
│   └── renderer/              # React Renderer Process (Chromium sandbox)
│       ├── index.html         # HTML entry point with Content Security Policy
│       └── src/
│           ├── main.tsx       # React root mount
│           ├── App.tsx        # Top-level floating island coordinator & toast notifications
│           ├── shared.ts      # Local renderer bridge to shared contracts
│           ├── store/         # Zustand shared UI state
│           ├── components/
│           │   ├── island/    # IslandPill, ExpandedPanel, IslandHeader, ActivityPulse
│           │   ├── launcher/  # CommandSearch, ShortcutGrid
│           │   ├── widgets/   # SystemWidget, ClipboardWidget, MediaWidget, RoutinesWidget
│           │   └── common/    # IconBadge, StatusDot
│           └── styles/        # CSS design tokens and glassy styles
```

### Security Guardrails
1. **Context Isolation**: `contextIsolation: true` is strictly enforced.
2. **No Node Integration in Renderer**: `nodeIntegration: false`. The renderer cannot access arbitrary Node.js APIs or native modules.
3. **Controlled IPC Bridge**: Only strongly-typed methods declared in `IsDeluluAPI` are exposed over `contextBridge`.
4. **Whitelisted Execution**: The launcher service validates all executable targets (e.g. `explorer.exe`, `calc.exe`, `notepad.exe`, `taskmgr.exe`) and prohibits arbitrary command injection.
5. **No Cloud Dependency**: Local-first operation with zero external telemetry or mandatory API keys.

---

## ⌨️ Controls & Interactions

- **Expand Island**: Click on the collapsed pill.
- **Collapse Island**: Click the collapse button or press <kbd>Esc</kbd>.
- **Reposition / Drag**: Click and drag the pill or the panel header. Native Windows drag regions ensure 60fps tracking without mouse jitter.
- **Global Summon Hotkey**: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd> toggles the island from any desktop application.
- **Navigate Search**: Use <kbd>↑</kbd> and <kbd>↓</kbd> in the search field, then press <kbd>Enter</kbd> to execute.
- **System Tray**: Right-click the tray icon to recenter the island to top-center, toggle always-on-top, or quit.

---

## 🚀 Getting Started

### Prerequisites
- Windows 10 or Windows 11 (64-bit recommended)
- Node.js `v18.0.0` or higher (tested on Node `v24.x`)
- npm `v9.x` or higher

### Installation
```powershell
# Clone repository
git clone https://github.com/rraki11/is-delulu.git
cd is-delulu

# Install dependencies
npm install
```

### Development
Launch the live development server with hot-module reloading:
```powershell
npm run dev
```

### Type Checking
Run strict TypeScript verification across renderer and node processes:
```powershell
npm run typecheck
```

### Production Build
Compile optimized production bundles for main, preload, and renderer:
```powershell
npm run build
```

---

## 🗺 Roadmap

- [x] **Milestone 1: Dynamic Island Foundation**
  - [x] Transparent, frame-less, always-on-top Electron window
  - [x] Compact collapsed pill with status pulse & live clock
  - [x] Spring-based expandable control center (`motion/react`)
  - [x] Native system metrics (CPU load %, RAM, Uptime)
  - [x] Real-time desktop clipboard history with one-click copy
  - [x] Whitelisted app launcher (Explorer, Terminal, Notepad, Calculator, Task Manager)
  - [x] System tray menu & global hotkey
- [ ] **Milestone 2: Enhanced Desktop Automation**
  - [ ] Custom user-defined PowerShell routine scripts
  - [ ] Window tiling & focus workspace layout presets
  - [ ] Windows SMTC (System Media Transport Controls) native integration
  - [ ] Custom keybinding configurator in Preferences
