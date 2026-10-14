import { create } from 'zustand'
import {
  IslandMode,
  ExpandedTab,
  SystemStats,
  ClipboardItem,
  MediaState,
  DesktopRoutine,
  UserPreferences,
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
  isHovered: boolean

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
  setIsHovered: (hovered: boolean) => void
}

export const useIslandStore = create<IslandState>((set) => ({
  mode: 'collapsed',
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
  isHovered: false,

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
        ...newPrefs
      } as UserPreferences)
    })),
  setTheme: (theme) => set({ theme }),
  setIsHovered: (isHovered) => set({ isHovered })
}))
