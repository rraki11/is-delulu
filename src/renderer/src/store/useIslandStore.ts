import { create } from 'zustand'
import {
  IslandMode,
  ExpandedTab,
  SystemStats,
  ClipboardItem,
  MediaState,
  DesktopRoutine,
  UserPreferences,
  AccentPalette,
  BatteryState,
  DEFAULT_ROUTINES
} from '../shared'

interface IslandState {
  mode: IslandMode
  activeTab: ExpandedTab
  searchQuery: string
  isAlwaysOnTop: boolean
  systemStats: SystemStats | null
  clipboardItems: ClipboardItem[]
  mediaState: MediaState | null
  routines: DesktopRoutine[]
  statusMessage: string | null
  preferences: UserPreferences | null
  theme: 'light' | 'dark'
  accentPalette: AccentPalette | null
  isHovered: boolean
  batteryState: BatteryState | null

  setMode: (mode: IslandMode) => void
  setActiveTab: (tab: ExpandedTab) => void
  setSearchQuery: (query: string) => void
  setIsAlwaysOnTop: (enabled: boolean) => void
  setSystemStats: (stats: SystemStats) => void
  setClipboardItems: (items: ClipboardItem[]) => void
  setMediaState: (state: MediaState) => void
  setRoutines: (routines: DesktopRoutine[]) => void
  setStatusMessage: (msg: string | null) => void
  setPreferences: (prefs: Partial<UserPreferences>) => void
  setTheme: (theme: 'light' | 'dark') => void
  setAccentPalette: (palette: AccentPalette) => void
  setIsHovered: (hovered: boolean) => void
  setBatteryState: (state: BatteryState) => void
}

export const useIslandStore = create<IslandState>((set) => ({
  mode: 'hidden',
  activeTab: 'launcher',
  searchQuery: '',
  isAlwaysOnTop: true,
  systemStats: null,
  clipboardItems: [],
  mediaState: null,
  routines: DEFAULT_ROUTINES,
  statusMessage: null,
  preferences: null,
  theme: 'dark',
  accentPalette: null,
  isHovered: false,
  batteryState: null,

  setMode: (mode) => set({ mode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsAlwaysOnTop: (isAlwaysOnTop) => set({ isAlwaysOnTop }),
  setSystemStats: (systemStats) => set({ systemStats }),
  setClipboardItems: (clipboardItems) => set({ clipboardItems }),
  setMediaState: (mediaState) => set({ mediaState }),
  setRoutines: (routines) => set({ routines }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setPreferences: (newPrefs) =>
    set((state) => ({
      preferences: state.preferences ? { ...state.preferences, ...newPrefs } : ({
        userName: '',
        clockFormat: '12h',
        appearance: 'system',
        isPinned: false,
        accentMode: 'wallpaper',
        manualAccentColor: '#8B5CF6',
        ...newPrefs
      } as UserPreferences)
    })),
  setTheme: (theme) => set({ theme }),
  setAccentPalette: (accentPalette) => set({ accentPalette }),
  setIsHovered: (isHovered) => set({ isHovered }),
  setBatteryState: (batteryState) => set({ batteryState })
}))

if (typeof window !== 'undefined') {
  ;(window as any).__islandStore = useIslandStore
}

