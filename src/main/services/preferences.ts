import { app, nativeTheme } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { UserPreferences } from '../../shared/types'

const DEFAULT_PREFERENCES: UserPreferences = {
  userName: '',
  clockFormat: '12h',
  appearance: 'system',
  isPinned: false
}

let cachedPreferences: UserPreferences = { ...DEFAULT_PREFERENCES }
let prefsFilePath = ''
const prefsListeners: ((prefs: UserPreferences) => void)[] = []
const themeListeners: ((theme: 'light' | 'dark') => void)[] = []

export function initPreferences(): UserPreferences {
  try {
    const userData = app.getPath('userData')
    prefsFilePath = join(userData, 'preferences.json')

    if (existsSync(prefsFilePath)) {
      const raw = readFileSync(prefsFilePath, 'utf-8')
      const parsed = JSON.parse(raw)
      cachedPreferences = {
        userName: typeof parsed.userName === 'string' ? parsed.userName.trim() : DEFAULT_PREFERENCES.userName,
        clockFormat: parsed.clockFormat === '24h' ? '24h' : '12h',
        appearance: (parsed.appearance === 'light' || parsed.appearance === 'dark' || parsed.appearance === 'system')
          ? parsed.appearance
          : 'system',
        isPinned: Boolean(parsed.isPinned)
      }
    } else {
      savePreferencesToDisk(DEFAULT_PREFERENCES)
    }
  } catch (err) {
    console.warn('[Preferences] Failed to load preferences from disk, using defaults:', err)
    cachedPreferences = { ...DEFAULT_PREFERENCES }
  }

  // Listen to OS theme changes when in 'system' mode
  nativeTheme.on('updated', () => {
    if (cachedPreferences.appearance === 'system') {
      const resolved = getResolvedTheme()
      themeListeners.forEach((fn) => fn(resolved))
    }
  })

  return cachedPreferences
}

export function getPreferences(): UserPreferences {
  return { ...cachedPreferences }
}

export function updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const prevAppearance = cachedPreferences.appearance
  cachedPreferences = {
    ...cachedPreferences,
    ...partial
  }

  // Validate values
  if (typeof cachedPreferences.userName !== 'string') {
    cachedPreferences.userName = ''
  }
  if (cachedPreferences.clockFormat !== '12h' && cachedPreferences.clockFormat !== '24h') {
    cachedPreferences.clockFormat = '12h'
  }
  if (
    cachedPreferences.appearance !== 'system' &&
    cachedPreferences.appearance !== 'light' &&
    cachedPreferences.appearance !== 'dark'
  ) {
    cachedPreferences.appearance = 'system'
  }
  cachedPreferences.isPinned = Boolean(cachedPreferences.isPinned)

  savePreferencesToDisk(cachedPreferences)

  // Notify preference subscribers
  const updatedCopy = { ...cachedPreferences }
  prefsListeners.forEach((fn) => fn(updatedCopy))

  // If appearance changed or switched to/from system, notify theme listeners
  if (prevAppearance !== cachedPreferences.appearance) {
    const resolved = getResolvedTheme()
    themeListeners.forEach((fn) => fn(resolved))
  }

  return updatedCopy
}

function savePreferencesToDisk(prefs: UserPreferences): void {
  try {
    if (prefsFilePath) {
      writeFileSync(prefsFilePath, JSON.stringify(prefs, null, 2), 'utf-8')
    }
  } catch (err) {
    console.error('[Preferences] Failed to save preferences to disk:', err)
  }
}

export function getResolvedTheme(): 'light' | 'dark' {
  if (cachedPreferences.appearance === 'light') return 'light'
  if (cachedPreferences.appearance === 'dark') return 'dark'
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
}

export function onPreferencesChange(callback: (prefs: UserPreferences) => void): () => void {
  prefsListeners.push(callback)
  return () => {
    const idx = prefsListeners.indexOf(callback)
    if (idx !== -1) prefsListeners.splice(idx, 1)
  }
}

export function onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void {
  themeListeners.push(callback)
  return () => {
    const idx = themeListeners.indexOf(callback)
    if (idx !== -1) themeListeners.splice(idx, 1)
  }
}
