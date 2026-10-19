import { app, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 600,
    height: 900,
    show: false,
    webPreferences: { offscreen: true }
  })

  await win.loadFile(join(__dirname, 'preview-greetings.html'))
  await new Promise(r => setTimeout(r, 500))
  const image = await win.capturePage()
  const outPath = 'C:/Users/rrake/.gemini/antigravity-ide/brain/10f883e6-ab71-429b-bd77-f0d438e60e3d/preview-allure.png'
  const fs = await import('fs')
  fs.writeFileSync(outPath, image.toPNG())
  console.log('Saved screenshot to:', outPath)
  app.quit()
})
