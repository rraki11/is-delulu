import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { spawn } from 'child_process'
import { performance } from 'perf_hooks'

app.whenReady().then(async () => {
  console.log('=== BENCHMARKING REFINED ASYNC TRANSITION PIPELINE ===\n')

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds
  const testWallpaper = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers\\335.png'
  const fileUrl = pathToFileURL(testWallpaper).toString()
  const htmlPath = join(process.cwd(), 'src/main/services/wallpaper-reveal.html')
  const exePath = join(process.cwd(), 'src/main/services/set-wallpaper.exe')

  // Measure main process event loop jitter while transition runs
  const eventLoopGaps = []
  let lastLoopTime = performance.now()
  const jitterTimer = setInterval(() => {
    const now = performance.now()
    const gap = now - lastLoopTime
    lastLoopTime = now
    if (gap > 18) {
      eventLoopGaps.push(gap)
    }
  }, 10)

  // 1. Create transparent overlay WITHOUT forward: true
  const overlayWin = new BrowserWindow({
    x: 0,
    y: 0,
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

  // CRITICAL FIX: setIgnoreMouseEvents(true) WITHOUT { forward: true }
  // This uses WS_EX_TRANSPARENT without installing the lagging WH_MOUSE_LL hook!
  overlayWin.setIgnoreMouseEvents(true)

  await overlayWin.loadFile(htmlPath)
  await overlayWin.webContents.executeJavaScript(`if (window.setImage) window.setImage(${JSON.stringify(fileUrl)});`)
  overlayWin.showInactive()

  // Instrument requestAnimationFrame inside overlay
  const animPromise = overlayWin.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const frameDeltas = [];
      let last = performance.now();
      let active = true;

      function render(now) {
        frameDeltas.push(now - last);
        last = now;
        if (active) requestAnimationFrame(render);
      }

      requestAnimationFrame((now) => {
        last = now;
        requestAnimationFrame(render);
      });

      if (window.startAnimation) window.startAnimation();

      setTimeout(() => {
        active = false;
        resolve(frameDeltas);
      }, 750);
    });
  `)

  // 2. Trigger asynchronous wallpaper update at 180ms
  await new Promise((r) => setTimeout(r, 180))

  const wpT0 = performance.now()
  await new Promise((resolve) => {
    const child = spawn(exePath, [testWallpaper], {
      stdio: ['ignore', 'ignore', 'ignore'],
      windowsHide: true
    })
    child.on('close', resolve)
    child.on('error', resolve)
  })
  const wpDuration = Math.round(performance.now() - wpT0)
  console.log(`Native wallpaper change completed in: ${wpDuration} ms (fully async)`)

  // 3. Await animation completion
  const frameDeltas = await animPromise
  clearInterval(jitterTimer)

  // 4. Fadeout & destroy
  await overlayWin.webContents.executeJavaScript('if (window.startFadeOut) window.startFadeOut();')
  await new Promise((r) => setTimeout(r, 120))
  overlayWin.destroy()

  // Analyze metrics
  const validFrames = frameDeltas.slice(2)
  const avgFrame = (validFrames.reduce((a, b) => a + b, 0) / validFrames.length).toFixed(2)
  const maxFrame = Math.max(...validFrames).toFixed(2)
  const dropped = validFrames.filter((d) => d > 25).length

  console.log('\n--- PERFORMANCE RESULTS ---')
  console.log(`Total animation frames: ${validFrames.length}`)
  console.log(`Average frame time: ${avgFrame} ms (~${(1000 / avgFrame).toFixed(1)} FPS)`)
  console.log(`Max frame time: ${maxFrame} ms`)
  console.log(`Dropped frames (>25ms): ${dropped}`)
  console.log(`Main thread event-loop pauses (>18ms): ${eventLoopGaps.length}`)
  if (eventLoopGaps.length > 0) {
    console.log(`Worst event loop pause: ${Math.max(...eventLoopGaps).toFixed(2)} ms`)
  } else {
    console.log('Event loop ran continuously with ZERO hitches!')
  }

  console.log('\n=== BENCHMARK FINISHED ===')
  app.quit()
})
