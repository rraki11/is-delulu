import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { spawn, execSync } from 'child_process'

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

function getRainmeterStatus() {
  try {
    const out = execSync('powershell -Command "Get-Process Rainmeter -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"', { encoding: 'utf-8' })
    return parseInt(out.trim(), 10) > 0
  } catch {
    return false
  }
}

async function runTransitionTest(rendererType) {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds

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

  let htmlPath
  if (rendererType === 'css') {
    htmlPath = join(process.cwd(), 'src/main/services/wallpaper-reveal.html')
    await overlayWin.loadFile(htmlPath)
    await overlayWin.webContents.executeJavaScript(`window.setImage(${JSON.stringify(pathToFileURL(testWallpaper).toString())})`)
  } else {
    htmlPath = join(process.cwd(), 'src/main/services/wallpaper-reveal-webgl.html')
    await overlayWin.loadFile(htmlPath)
    await overlayWin.webContents.executeJavaScript(`window.initReveal(${JSON.stringify(pathToFileURL(testWallpaper).toString())}, ${width}, ${height})`)
  }

  overlayWin.showInactive()

  // Track frames for ~800ms
  const metrics = await overlayWin.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const frameDeltas = [];
      let lastTime = performance.now();
      let frameCount = 0;
      if (window.startAnimation) window.startAnimation();

      function onFrame(now) {
        const delta = now - lastTime;
        lastTime = now;
        frameDeltas.push(delta);
        frameCount++;
        if (frameCount < 60) {
          requestAnimationFrame(onFrame);
        } else {
          resolve(frameDeltas);
        }
      }
      requestAnimationFrame(onFrame);
    });
  `)

  overlayWin.destroy()

  const validDeltas = metrics.slice(2)
  const avg = validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length
  const max = Math.max(...validDeltas)
  const hitches = validDeltas.filter((d) => d > 20)
  return { avg, max, hitches: hitches.length, hitchValues: hitches }
}

app.whenReady().then(async () => {
  console.log('=== RAINMETER & TRANSITION INVESTIGATION ===')
  const rainmeterInitial = getRainmeterStatus()
  console.log(`Rainmeter running initially: ${rainmeterInitial}`)

  // Create WebGL reveal HTML first if not exists
  // 1. Test CSS Clip Path with Rainmeter
  console.log('\n--- 1. CSS Clip-Path with Rainmeter Active ---')
  const cssWithRainmeter = await runTransitionTest('css')
  console.log(`CSS with Rainmeter: Avg ${cssWithRainmeter.avg.toFixed(2)}ms, Max: ${cssWithRainmeter.max.toFixed(2)}ms, Hitches: ${cssWithRainmeter.hitches}`)

  // 2. Temporarily stop Rainmeter for 5s comparison
  console.log('\n--- Stopping Rainmeter for comparison test ---')
  try {
    execSync('powershell -Command "Stop-Process -Name Rainmeter -Force -ErrorAction SilentlyContinue"')
  } catch {}
  await new Promise((r) => setTimeout(r, 1000))
  console.log(`Rainmeter running now: ${getRainmeterStatus()}`)

  // 3. Test CSS Clip Path WITHOUT Rainmeter
  console.log('\n--- 2. CSS Clip-Path with Rainmeter Inactive ---')
  const cssWithoutRainmeter = await runTransitionTest('css')
  console.log(`CSS without Rainmeter: Avg ${cssWithoutRainmeter.avg.toFixed(2)}ms, Max: ${cssWithoutRainmeter.max.toFixed(2)}ms, Hitches: ${cssWithoutRainmeter.hitches}`)

  // 4. Restart Rainmeter immediately
  console.log('\n--- Restarting Rainmeter immediately ---')
  spawn('C:\\Program Files\\Rainmeter\\Rainmeter.exe', [], { detached: true, stdio: 'ignore' }).unref()
  await new Promise((r) => setTimeout(r, 1500))
  console.log(`Rainmeter running restored: ${getRainmeterStatus()}`)

  console.log('\n=== INVESTIGATION COMPARISON SUMMARY ===')
  console.log(`CSS with Rainmeter:    Avg: ${cssWithRainmeter.avg.toFixed(2)}ms, Max: ${cssWithRainmeter.max.toFixed(2)}ms, Hitches >20ms: ${cssWithRainmeter.hitches}`)
  console.log(`CSS without Rainmeter: Avg: ${cssWithoutRainmeter.avg.toFixed(2)}ms, Max: ${cssWithoutRainmeter.max.toFixed(2)}ms, Hitches >20ms: ${cssWithoutRainmeter.hitches}`)

  app.quit()
})
