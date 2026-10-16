import { app, BrowserWindow } from 'electron'

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 540,
    height: 560,
    show: false
  })

  const failedRequests = []
  const consoleMessages = []

  win.webContents.session.webRequest.onErrorOccurred((details) => {
    failedRequests.push({ url: details.url, error: details.error })
  })

  win.webContents.on('console-message', (_e, level, msg) => {
    consoleMessages.push({ level, msg })
  })

  await win.loadURL('http://localhost:5173')
  await new Promise(r => setTimeout(r, 2000))

  console.log('FAILED REQUESTS:', failedRequests)
  console.log('CONSOLE MESSAGES (errors/warns):', consoleMessages.filter(m => m.level > 1))

  const loadedFonts = await win.webContents.executeJavaScript(`
    (async () => {
      // Trigger load on all fonts
      await document.fonts.ready;
      const results = [];
      for (const f of document.fonts) {
        try {
          await f.load();
          results.push({ family: f.family, weight: f.weight, status: f.status });
        } catch (err) {
          results.push({ family: f.family, weight: f.weight, status: 'ERROR', error: err.message });
        }
      }
      return results;
    })()
  `)

  console.log('LOADED FONTS STATUS:', loadedFonts)
  app.quit()
})
