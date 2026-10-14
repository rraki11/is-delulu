import { Tray, Menu, nativeImage, app } from 'electron'
import {
  getMainWindow,
  setIslandWindowMode,
  getCurrentIslandMode,
  resetIslandPosition
} from './window'

let tray: Tray | null = null

// Minimal 16x16 neon green icon in base64 PNG
// Generated 16x16 PNG with a rounded cyan/lime glowing dot
const ICON_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZ0lEQVR42mNkQAO/f/9G1vgfxTAwYFBE52PQ0NAAkjBA5jP//PkTRTFMAV4D0B3BAA3Qvfsfi4PAGoihGBuAqYFkAzB9gGQDyALoGkF8kAZsGoCBGBvQNcDEyZk0wHj6YwR74A8GAABpgy5qDphnAAAAAABJRU5ErkJggg=='

export function setupTray(): Tray | null {
  try {
    const icon = nativeImage.createFromDataURL(ICON_BASE64)
    if (icon.isEmpty()) {
      return null
    }
    tray = new Tray(icon)
    tray.setToolTip('is-delulu - Desktop Companion')

  const updateMenu = (): void => {
    const mode = getCurrentIslandMode()
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'is-delulu Companion',
        enabled: false
      },
      { type: 'separator' },
      {
        label: mode === 'collapsed' ? 'Expand Island' : 'Collapse Island',
        click: () => {
          const next = mode === 'collapsed' ? 'expanded' : 'collapsed'
          setIslandWindowMode(next)
          const win = getMainWindow()
          win?.webContents.send('island:mode-changed', next)
          updateMenu()
        }
      },
      {
        label: 'Reset Position (Top Center)',
        click: () => {
          resetIslandPosition()
        }
      },
      {
        label: 'Toggle Always on Top',
        type: 'checkbox',
        checked: true,
        click: (item) => {
          const win = getMainWindow()
          if (win) {
            win.setAlwaysOnTop(item.checked, 'screen-saver')
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit is-delulu',
        click: () => {
          app.quit()
        }
      }
    ])

    tray?.setContextMenu(contextMenu)
  }

  updateMenu()

  tray.on('click', () => {
    const win = getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

    return tray
  } catch (err) {
    console.warn('[is-delulu] Tray creation warning:', err)
    return null
  }
}
