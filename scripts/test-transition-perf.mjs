import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { spawn } from 'child_process'

const testWallpaper = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers\\335.png'

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

function executeSetWallpaper(filePath) {
  const exePath = join(process.cwd(), 'src/main/services/set-wallpaper.exe')
  return new Promise((resolve) => {
    const start = performance.now()
    const child = spawn(exePath, [filePath], {
      stdio: ['ignore', 'ignore', 'ignore'],
      windowsHide: true
    })
    child.on('close', (code) => {
      resolve({ success: code === 0, durationMs: performance.now() - start })
    })
    child.on('error', (err) => {
      resolve({ success: false, error: err, durationMs: performance.now() - start })
    })
  })
}

async function runBenchmark(testName, triggerWallpaperAtMs = null) {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds
  const fileUrl = pathToFileURL(testWallpaper).toString()

  const overlayWin = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    type: 'toolbar',
    webPreferences: {
      webSecurity: false,
      sandbox: false,
      contextIsolation: false
    }
  })

  overlayWin.setIgnoreMouseEvents(true)
  const htmlPath = join(process.cwd(), 'src/main/services/wallpaper-reveal.html')
  await overlayWin.loadFile(htmlPath)
  await overlayWin.webContents.executeJavaScript(`window.setImage(${JSON.stringify(fileUrl)})`)
  overlayWin.showInactive()

  // Track frames in renderer
  const animPromise = overlayWin.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const frameDeltas = [];
      let lastTime = performance.now();
      let frameCount = 0;
      window.startAnimation();

      function onFrame(now) {
        const delta = now - lastTime;
        lastTime = now;
        frameDeltas.push(delta);
        frameCount++;
        if (frameCount < 90) { // ~90 frames (~1.5s)
          requestAnimationFrame(onFrame);
        } else {
          resolve(frameDeltas);
        }
      }
      requestAnimationFrame(onFrame);
    });
  `)

  let wpResult = null
  if (triggerWallpaperAtMs !== null) {
    await new Promise((r) => setTimeout(r, triggerWallpaperAtMs))
    wpResult = await executeSetWallpaper(testWallpaper)
  }

  const rawDeltas = await animPromise
  const deltas = rawDeltas.slice(1)
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length
  const maxDelta = Math.max(...deltas)
  const hitches = deltas.filter((d) => d > 32)

  console.log(`\n=== RESULTS FOR: ${testName} ===`)
  console.log(`Avg frame time: ${avgDelta.toFixed(2)}ms (~${(1000 / avgDelta).toFixed(1)} FPS)`)
  console.log(`Max frame time: ${maxDelta.toFixed(2)}ms`)
  console.log(`Hitches (>32ms): ${hitches.length} (values: ${hitches.map(h => h.toFixed(1)).join(', ')} ms)`)
  if (wpResult) {
    console.log(`SetWallpaper took: ${wpResult.durationMs.toFixed(1)}ms`)
  }

  overlayWin.destroy()
}

app.whenReady().then(async () => {
  console.log('=== TEST 1: ANIMATION ALONE (NO set-wallpaper during animation) ===')
  await runBenchmark('Animation Alone', null)

  console.log('\n=== TEST 2: OLD BEHAVIOR (set-wallpaper triggered at 160ms) ===')
  await runBenchmark('Concurrent Set-Wallpaper @ 160ms', 160)

  app.quit()
})
