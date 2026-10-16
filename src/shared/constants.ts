import { AppShortcut, CommandItem, DesktopRoutine } from './types'

export const WINDOW_CONFIG = {
  width: 540,
  height: 560,
  collapsed: {
    width: 540,
    height: 560
  },
  expanded: {
    width: 540,
    height: 560
  },
  pill: {
    width: 190,
    height: 33
  },
  panel: {
    width: 520,
    height: 536
  },
  topOffset: 0
} as const

export const DEFAULT_SHORTCUTS: AppShortcut[] = [
  {
    id: 'explorer',
    title: 'File Explorer',
    category: 'system',
    icon: 'Folder',
    description: 'Open Windows File Explorer',
    target: 'explorer.exe'
  },
  {
    id: 'terminal',
    title: 'Terminal',
    category: 'dev',
    icon: 'Terminal',
    description: 'Open Windows Terminal or PowerShell',
    target: 'powershell.exe'
  },
  {
    id: 'notepad',
    title: 'Notepad',
    category: 'productivity',
    icon: 'FileText',
    description: 'Quick notes in Notepad',
    target: 'notepad.exe'
  },
  {
    id: 'calculator',
    title: 'Calculator',
    category: 'productivity',
    icon: 'Calculator',
    description: 'Windows Calculator app',
    target: 'calc.exe'
  },
  {
    id: 'taskmgr',
    title: 'Task Manager',
    category: 'system',
    icon: 'Activity',
    description: 'Inspect processes and performance',
    target: 'taskmgr.exe'
  },
  {
    id: 'downloads',
    title: 'Downloads',
    category: 'system',
    icon: 'Download',
    description: 'Open user Downloads folder',
    target: 'downloads'
  },
  {
    id: 'code',
    title: 'VS Code',
    category: 'dev',
    icon: 'Code2',
    description: 'Launch Visual Studio Code',
    target: 'code',
    isInstalledMock: true
  },
  {
    id: 'calendar',
    title: 'Calendar',
    category: 'productivity',
    icon: 'Calendar',
    description: 'Open real-time interactive calendar',
    target: 'calendar'
  },
  {
    id: 'browser',
    title: 'Web Browser',
    category: 'productivity',
    icon: 'Globe',
    description: 'Open default web browser',
    target: 'https://google.com'
  }
]

export const DEFAULT_COMMANDS: CommandItem[] = [
  {
    id: 'cmd-open-calendar',
    title: 'Open Interactive Calendar',
    category: 'navigation',
    icon: 'Calendar',
    description: 'View month calendar, events, and schedules',
    keywords: ['calendar', 'date', 'month', 'schedule', 'agenda', 'events']
  },
  {
    id: 'cmd-top',
    title: 'Pin / Keep Always on Top',
    category: 'setting',
    icon: 'Pin',
    description: 'Toggle always-on-top window float state',
    keywords: ['pin', 'top', 'float', 'window', 'stay']
  },
  {
    id: 'cmd-clear-clip',
    title: 'Clear Clipboard History',
    category: 'action',
    icon: 'Trash2',
    description: 'Wipe all stored clipboard entries and OS clipboard',
    keywords: ['clear', 'clipboard', 'wipe', 'history']
  },
  {
    id: 'cmd-open-downloads',
    title: 'Open Downloads Folder',
    category: 'action',
    icon: 'Download',
    description: 'Jump to Windows Downloads folder',
    keywords: ['downloads', 'folder', 'files']
  },
  {
    id: 'cmd-open-calc',
    title: 'Open Calculator',
    category: 'action',
    icon: 'Calculator',
    description: 'Launch native Windows Calculator',
    keywords: ['calc', 'calculator', 'math']
  },
  {
    id: 'cmd-open-taskmgr',
    title: 'Open Task Manager',
    category: 'action',
    icon: 'Cpu',
    description: 'Launch Windows Task Manager',
    keywords: ['task', 'manager', 'performance', 'cpu', 'ram']
  },
  {
    id: 'cmd-copy-sysinfo',
    title: 'Copy System Diagnostics',
    category: 'action',
    icon: 'Copy',
    description: 'Copy hardware and OS summary to clipboard',
    keywords: ['sysinfo', 'system', 'diagnostics', 'specs', 'copy']
  },
  {
    id: 'cmd-collapse',
    title: 'Collapse Island',
    category: 'navigation',
    icon: 'Minimize2',
    description: 'Return to compact pill mode',
    keywords: ['collapse', 'minimize', 'pill', 'close'],
    shortcut: 'Esc'
  }
]

export const DEFAULT_ROUTINES: DesktopRoutine[] = [
  {
    id: 'focus-mode',
    name: 'Deep Focus',
    description: 'Minimize distractions, mute notifications, and activate focus state',
    icon: 'Sparkles',
    isActive: false,
    tags: ['Productivity', 'Audio'],
    steps: ['Mute audio channels', 'Collapse external overlays', 'Set status: In the Zone']
  },
  {
    id: 'dev-flow',
    name: 'Developer Flow',
    description: 'Preps workspace for development and tracks system telemetry',
    icon: 'Terminal',
    isActive: true,
    tags: ['Workspace', 'Code'],
    steps: ['Open Terminal instance', 'Monitor CPU & RAM spikes', 'Clipboard auto-detect code']
  },
  {
    id: 'clean-slate',
    name: 'Clean Slate',
    description: 'Clear transient clipboard artifacts and reset active state',
    icon: 'RotateCcw',
    isActive: false,
    tags: ['Maintenance'],
    steps: ['Wipe clipboard memory', 'Reset active transient state', 'Flush cache']
  }
]
