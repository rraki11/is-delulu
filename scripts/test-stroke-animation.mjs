import { app, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const greetingData = JSON.parse(fs.readFileSync('src/renderer/src/components/island/greetingPaths.json', 'utf8'))

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/10f883e6-ab71-429b-bd77-f0d438e60e3d/animation-frames'
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 600,
    height: 600,
    show: false,
    webPreferences: { offscreen: true }
  })

  // Create an HTML page with SVG pathLength animation
  const html = `<!DOCTYPE html><html><head><style>
body { background: #000; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
.pill { width: 190px; height: 33px; background: #0A0D0E; border: 1px solid rgba(255,255,255,0.15); border-radius: 0 0 17px 17px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.handwriting-svg { height: 21px; max-width: 156px; overflow: visible; }
.stroke-path {
  fill: none;
  stroke: rgba(244, 245, 240, 0.95);
  stroke-width: 36;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: var(--path-len);
  stroke-dashoffset: var(--path-offset);
}
</style></head><body>
<div class="pill">
  <svg class="handwriting-svg" viewBox="${greetingData['one step at a time'].viewBox}">
    <path id="hw-path" class="stroke-path" d="${greetingData['one step at a time'].d}" />
  </svg>
</div>
<script>
  const path = document.getElementById('hw-path');
  const len = path.getTotalLength();
  path.style.setProperty('--path-len', len);
  path.style.setProperty('--path-offset', len);

  window.setProgress = (p) => {
    path.style.setProperty('--path-offset', len * (1 - p));
  };
</script>
</body></html>`

  const htmlPath = join(__dirname, 'anim-test.html')
  fs.writeFileSync(htmlPath, html)
  await win.loadFile(htmlPath)
  await new Promise(r => setTimeout(r, 200))

  // Capture at progress 0, 0.25, 0.5, 0.75, 1.0
  const progresses = [0.1, 0.35, 0.65, 0.85, 1.0]
  for (let i = 0; i < progresses.length; i++) {
    const p = progresses[i]
    await win.webContents.executeJavaScript(`window.setProgress(${p})`)
    await new Promise(r => setTimeout(r, 100))
    const img = await win.capturePage()
    const frameFile = `${outDir}/frame-${i}-${Math.round(p * 100)}pct.png`
    fs.writeFileSync(frameFile, img.toPNG())
    console.log(`Saved frame ${frameFile} at ${p * 100}%`)
  }

  app.quit()
})
