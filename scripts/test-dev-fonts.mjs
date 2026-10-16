import { app, BrowserWindow } from 'electron'

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 540,
    height: 560,
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  await win.loadURL('http://localhost:5173')
  await new Promise(r => setTimeout(r, 1500))

  const devDiag = await win.webContents.executeJavaScript(`
    (() => {
      const fontList = Array.from(document.fonts).map(f => ({
        family: f.family,
        weight: f.weight,
        style: f.style,
        status: f.status
      }));

      const checkDisplay = document.fonts.check('16px "SF Pro Display"');
      const checkText = document.fonts.check('16px "SF Pro Text"');

      // Test width of text with SF Pro vs fallback
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = '16px "SF Pro Display"';
      const wSF = ctx.measureText('Good morning, Shubham • 6:01:49 AM').width;
      ctx.font = '16px "Segoe UI"';
      const wSegoe = ctx.measureText('Good morning, Shubham • 6:01:49 AM').width;
      ctx.font = '16px Arial';
      const wArial = ctx.measureText('Good morning, Shubham • 6:01:49 AM').width;

      return {
        fontList,
        checkDisplay,
        checkText,
        wSF,
        wSegoe,
        wArial,
        isSameAsSegoe: wSF === wSegoe
      };
    })()
  `)

  console.log('DEV SERVER TYPOGRAPHY DIAGNOSTIC:', devDiag)
  app.quit()
})
