import { clipboard } from 'electron'
import { ClipboardItem } from '../../shared/types'

let clipboardHistory: ClipboardItem[] = []
let lastText = ''
let pollInterval: NodeJS.Timeout | null = null
let changeListeners: ((items: ClipboardItem[]) => void)[] = []

function detectType(text: string): 'url' | 'code' | 'text' {
  const trimmed = text.trim()
  if (/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
    return 'url'
  }
  if (
    /(?:function|const|let|var|class|import|export|def |return |=>|[{}\[\];]|<\/?[a-z][\s\S]*>)/.test(
      trimmed
    ) &&
    (trimmed.includes('\n') || trimmed.includes('{') || trimmed.includes(';'))
  ) {
    return 'code'
  }
  return 'text'
}

function createClipboardItem(text: string): ClipboardItem {
  const trimmed = text.trim()
  const preview = trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed

  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    text,
    preview,
    timestamp: Date.now(),
    type: detectType(trimmed),
    charCount: text.length
  }
}

let currentPollIntervalMs = 1500

function checkClipboard(): void {
  try {
    const current = clipboard.readText()
    if (current && current !== lastText && current.trim().length > 0) {
      lastText = current
      const newItem = createClipboardItem(current)
      // Deduplicate
      clipboardHistory = [
        newItem,
        ...clipboardHistory.filter((item) => item.text !== current)
      ].slice(0, 50)

      // Notify listeners
      changeListeners.forEach((fn) => fn(clipboardHistory))
    }
  } catch {
    // Ignore polling errors
  }
}

export function setClipboardPollInterval(intervalMs: number): void {
  const safeMs = Math.max(300, intervalMs)
  if (currentPollIntervalMs === safeMs) return
  currentPollIntervalMs = safeMs
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = setInterval(checkClipboard, currentPollIntervalMs)
  }
}

export function startClipboardMonitor(): void {
  try {
    const current = clipboard.readText()
    if (current && current.trim()) {
      lastText = current
      clipboardHistory.push(createClipboardItem(current))
    }
  } catch {
    // Ignore initial read error
  }

  // Poll clipboard gently when idle/collapsed, fast when viewing
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(checkClipboard, currentPollIntervalMs)
}

export function stopClipboardMonitor(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

export function getClipboardHistory(): ClipboardItem[] {
  return clipboardHistory
}

export function copyText(text: string): boolean {
  try {
    clipboard.writeText(text)
    lastText = text
    return true
  } catch {
    return false
  }
}

export function clearClipboard(): boolean {
  try {
    clipboard.clear()
    lastText = ''
    clipboardHistory = []
    changeListeners.forEach((fn) => fn(clipboardHistory))
    return true
  } catch {
    return false
  }
}

export function onClipboardChange(listener: (items: ClipboardItem[]) => void): () => void {
  changeListeners.push(listener)
  return () => {
    changeListeners = changeListeners.filter((l) => l !== listener)
  }
}
