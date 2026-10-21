import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { pathToFileURL } from 'url'

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/cae90e89-4173-4a78-aea7-29502144233c/screenshots/verification'
const testWallpaper = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers\\335.png'

app.whenReady().then(async () => {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  // Background window simulating desktop
  const bgWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    show: true,
    skipTaskbar: true
  })
  bgWin.loadURL('data:text/html,<html><body style="margin:0;background:linear-gradient(135deg, #1e293b, #0f172a);display:flex;align-items:center;justify-content:center;color:#64748b;font-family:sans-serif;font-size:24px;">Desktop Behind Reveal Layer</body></html>')

  // Reveal window
  const revealWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    show: true,
    type: 'toolbar',
    webPreferences: {
      webSecurity: false,
      sandbox: false,
      contextIsolation: false
    }
  })
  revealWin.setIgnoreMouseEvents(true)
  await revealWin.loadFile(join(process.cwd(), 'src/main/services/wallpaper-reveal.html'))
  const testUrl = pathToFileURL(testWallpaper).toString()
  await revealWin.webContents.executeJavaScript(`window.setImage(${JSON.stringify(testUrl)})`)

  // Frame 1: Radius at 25%
  await revealWin.webContents.executeJavaScript('drawAtRadius(maxRadius * 0.25)')
  await new Promise((r) => setTimeout(r, 100))
  const shot1 = await revealWin.capturePage()
  writeFileSync(join(outDir, '04_reveal_radius_25pct.png'), shot1.toPNG())

  // Frame 2: Radius at 60%
  await revealWin.webContents.executeJavaScript('drawAtRadius(maxRadius * 0.60)')
  await new Promise((r) => setTimeout(r, 100))
  const shot2 = await revealWin.capturePage()
  writeFileSync(join(outDir, '05_reveal_radius_60pct.png'), shot2.toPNG())

  // Frame 3: Radius at 95%
  await revealWin.webContents.executeJavaScript('drawAtRadius(maxRadius * 0.95)')
  await new Promise((r) => setTimeout(r, 100))
  const shot3 = await revealWin.capturePage()
  writeFileSync(join(outDir, '06_reveal_radius_95pct.png'), shot3.toPNG())

  console.log('Saved reveal radius screenshots!')
  revealWin.destroy()
  bgWin.destroy()
  app.quit()
})
