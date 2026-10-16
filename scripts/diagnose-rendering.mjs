import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.whenReady().then(async () => {
  const primaryDisplay = screen.getPrimaryDisplay()
  console.log('PRIMARY DISPLAY:', {
    bounds: primaryDisplay.bounds,
    scaleFactor: primaryDisplay.scaleFactor,
    workArea: primaryDisplay.workArea
  })

  const win = new BrowserWindow({
    width: 540,
    height: 560,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../out/preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  ipcMain.handle('preferences:get', () => ({ userName: 'Shubham', appearance: 'dark', accentMode: 'wallpaper', clockFormat: '12h', isPinned: false }))
  ipcMain.handle('theme:get-resolved', () => 'dark')
  ipcMain.handle('theme:get-accent-palette', () => ({}))
  ipcMain.handle('island:set-mode', () => 'expanded')
  ipcMain.handle('system:get-stats', () => ({}))
  ipcMain.handle('media:get-state', () => ({ isPlaying: false, sources: [] }))
  ipcMain.handle('clipboard:get-history', () => [])
  ipcMain.handle('routines:get', () => [])

  await win.loadFile(join(__dirname, '../out/renderer/index.html'))
  await new Promise(r => setTimeout(r, 1000))

  await win.webContents.executeJavaScript(`
    document.getElementById('island-surface')?.click();
  `)
  await new Promise(r => setTimeout(r, 1000))

  const diag = await win.webContents.executeJavaScript(`
    (() => {
      // 1. Font Faces Loaded
      const fontFaces = Array.from(document.fonts).map(f => ({
        family: f.family,
        weight: f.weight,
        style: f.style,
        status: f.status
      }));

      // 2. Window & Zoom Metrics
      const devicePixelRatio = window.devicePixelRatio;
      const innerWidth = window.innerWidth;
      const innerHeight = window.innerHeight;

      // 3. Island Surface Metrics
      const surface = document.getElementById('island-surface');
      const surfaceRect = surface ? surface.getBoundingClientRect() : null;
      const surfaceComputed = surface ? window.getComputedStyle(surface) : null;

      // 4. Greeting element styles
      const greeting = document.querySelector('.font-display');
      const greetingRect = greeting ? greeting.getBoundingClientRect() : null;
      const greetingComputed = greeting ? window.getComputedStyle(greeting) : null;

      return {
        fontFaces,
        devicePixelRatio,
        innerWidth,
        innerHeight,
        surface: {
          rect: surfaceRect,
          transform: surfaceComputed?.transform,
          opacity: surfaceComputed?.opacity,
          filter: surfaceComputed?.filter,
          backdropFilter: surfaceComputed?.backdropFilter,
          backgroundColor: surfaceComputed?.backgroundColor
        },
        greeting: {
          text: greeting?.textContent,
          rect: greetingRect,
          fontFamily: greetingComputed?.fontFamily,
          fontSize: greetingComputed?.fontSize,
          fontWeight: greetingComputed?.fontWeight,
          lineHeight: greetingComputed?.lineHeight,
          letterSpacing: greetingComputed?.letterSpacing,
          transform: greetingComputed?.transform,
          webkitFontSmoothing: greetingComputed?.webkitFontSmoothing
        }
      };
    })()
  `)

  console.log('--- DIAGNOSTIC RESULTS ---')
  console.log('DEVICE PIXEL RATIO:', diag.devicePixelRatio)
  console.log('INNER DIMENSIONS:', diag.innerWidth, 'x', diag.innerHeight)
  console.log('FONT FACES:', diag.fontFaces)
  console.log('SURFACE:', diag.surface)
  console.log('GREETING:', diag.greeting)

  app.quit()
})
