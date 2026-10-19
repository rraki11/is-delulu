import { app, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const greetingData = JSON.parse(fs.readFileSync('src/renderer/src/components/island/greetingPaths.json', 'utf8'))

const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/10f883e6-ab71-429b-bd77-f0d438e60e3d/per-stroke-frames'
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

  // In this HTML, each subpath is its own <path>
  const g = greetingData['one step at a time']
  const subpaths = g.d.split(/(?=M)/).filter(Boolean)

  const html = `<!DOCTYPE html><html><head><style>
body { background: #000; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
.pill { width: 190px; height: 33px; background: #0A0D0E; border: 1px solid rgba(255,255,255,0.15); border-radius: 0 0 17px 17px; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
.handwriting-svg { height: 21px; max-width: 156px; overflow: visible; }
path {
  fill: none;
  stroke: rgba(244, 245, 240, 0.95);
  stroke-width: 36;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style></head><body>
<div class="pill">
  <svg class="handwriting-svg" viewBox="${g.viewBox}">
    ${subpaths.map((d, i) => `<path id="sp-${i}" d="${d.trim()}" />`).join('\n')}
  </svg>
</div>
<script>
  const paths = Array.from(document.querySelectorAll('path'));
  const lengths = paths.map(p => p.getTotalLength());
  const totalLength = lengths.reduce((a, b) => a + b, 0);

  // Compute start/end progress for each stroke
  let cum = 0;
  const strokeRanges = lengths.map(len => {
    const start = cum / totalLength;
    cum += len;
    const end = cum / totalLength;
    return { len, start, end };
  });

  paths.forEach((p, i) => {
    p.style.strokeDasharray = lengths[i];
    p.style.strokeDashoffset = lengths[i];
  });

  window.setProgress = (progress) => {
    paths.forEach((p, i) => {
      const { len, start, end } = strokeRanges[i];
      if (progress <= start) {
        p.style.strokeDashoffset = len;
        p.style.visibility = 'hidden';
      } else if (progress >= end) {
        p.style.strokeDashoffset = 0;
        p.style.visibility = 'visible';
      } else {
        const localT = (progress - start) / (end - start);
        p.style.strokeDashoffset = len * (1 - localT);
        p.style.visibility = 'visible';
      }
    });
  };
</script>
</body></html>`

  const htmlPath = join(__dirname, 'per-stroke-test.html')
  fs.writeFileSync(htmlPath, html)
  await win.loadFile(htmlPath)
  await new Promise(r => setTimeout(r, 200))

  const progresses = [0.05, 0.25, 0.50, 0.75, 1.0]
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
