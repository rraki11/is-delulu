import { app, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const outDir = 'C:/Users/rrake/.gemini/antigravity-ide/brain/be58ac70-0368-49be-9fcb-151bda3b0d46/scratch'
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

app.whenReady().then(async () => {
  console.log('[Test] Starting iridescent visual test harness v5 (docked pill + expanded panel)...')

  const win = new BrowserWindow({
    width: 600,
    height: 650,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    :root {
      --bg-pill: #000000;
      --bg-panel: rgba(10, 13, 14, 0.98);
      --font-display: 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif;
      --text-primary: #F7FBE8;
      --text-secondary: #8E999B;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 600px;
      height: 650px;
      margin: 0;
      padding: 0;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: var(--font-display);
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    .preview-backdrop {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 15%, #181d22 0%, #0d1013 60%, #050708 100%);
      z-index: -1;
    }

    /* Precision Iridescent Rim - Strictly 1.25px along outer border */
    .island-iridescent-rim {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      z-index: 10;
      padding: 0 1.25px 1.25px 1.25px;
      background:
        /* Primary Specular Hotspot 1: White core + rainbow dispersion */
        radial-gradient(
          circle 60px at var(--h1-pos, calc(100% - 14px) 20px),
          #FFFFFF 0%,
          #FFFFFF 8%,
          #FFF1A8 15%,
          #FFA834 24%,
          #FF4834 35%,
          #E62480 47%,
          #8630FF 58%,
          #007BFF 70%,
          #00E5FF 82%,
          #00FFA3 91%,
          transparent 100%
        ),
        /* Secondary Specular Hotspot 2: Cyan-white core + electric blue/violet dispersion */
        radial-gradient(
          circle 54px at var(--h2-pos, 16px calc(100% - 10px)),
          #FFFFFF 0%,
          #D9F8FF 12%,
          #00F0FF 25%,
          #0088FF 42%,
          #7433FF 58%,
          #D936B0 74%,
          #FFA52E 88%,
          transparent 100%
        ),
        /* Subtle tertiary ambient glint */
        radial-gradient(
          circle 40px at var(--h3-pos, 65% 100%),
          rgba(255, 210, 100, 0.45) 0%,
          rgba(255, 80, 50, 0.3) 40%,
          rgba(130, 40, 255, 0.2) 70%,
          transparent 100%
        ),
        /* Base polished dark titanium metallic rim */
        linear-gradient(
          140deg,
          rgba(255, 255, 255, 0.22) 0%,
          rgba(45, 55, 68, 0.65) 25%,
          rgba(18, 24, 30, 0.75) 50%,
          rgba(35, 45, 55, 0.6) 75%,
          rgba(255, 255, 255, 0.16) 100%
        );
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask:
        linear-gradient(#fff 0 0) content-box exclude,
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
      animation: metallicShimmer 12s ease-in-out infinite alternate;
    }

    /* Inner chamfer depth separator */
    .island-inner-bevel {
      position: absolute;
      inset: 0 1px 1px 1px;
      border-radius: inherit;
      pointer-events: none;
      z-index: 9;
      box-shadow:
        inset 0 0 0 1px rgba(0, 0, 0, 0.75);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Collapsed Pill */
    .pill-preview {
      position: absolute;
      top: 0;
      left: calc(50% - 92px);
      width: 184px;
      height: 32px;
      border-radius: 0 0 16px 16px;
      background-color: var(--bg-pill);
      box-shadow:
        0 10px 28px rgba(0, 0, 0, 0.8),
        0 2px 6px rgba(0, 0, 0, 0.5),
        0 0 3px 0.5px rgba(255, 255, 255, 0.22),
        0 0 8px 1px rgba(0, 215, 255, 0.16),
        0 0 12px 1.5px rgba(255, 175, 45, 0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      --h1-pos: calc(100% - 14px) 18px;
      --h2-pos: 16px calc(100% - 8px);
      --h3-pos: 62% 100%;
    }

    .pill-clock {
      font-size: 12px;
      font-weight: 500;
      color: #F4F5F0;
      letter-spacing: 0;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      z-index: 2;
    }

    /* Expanded Panel */
    .panel-preview {
      position: absolute;
      top: 70px;
      left: calc(50% - 260px);
      width: 520px;
      height: 520px;
      border-radius: 0 0 22px 22px;
      background-color: var(--bg-panel);
      box-shadow:
        0 20px 48px rgba(0, 0, 0, 0.85),
        0 4px 16px rgba(0, 0, 0, 0.6),
        0 0 3px 0.5px rgba(255, 255, 255, 0.18),
        0 0 10px 1.5px rgba(0, 215, 255, 0.14),
        0 0 14px 2px rgba(255, 175, 45, 0.12);
      display: flex;
      flex-direction: column;
      padding: 16px;
      gap: 14px;
      --h1-pos: calc(100% - 24px) 40px;
      --h2-pos: 24px calc(100% - 24px);
      --h3-pos: 70% 100%;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 2;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .panel-content {
      color: var(--text-secondary);
      font-size: 12px;
      line-height: 1.5;
      z-index: 2;
    }

    @keyframes metallicShimmer {
      0% {
        opacity: 0.94;
        filter: brightness(0.98);
      }
      50% {
        opacity: 1;
        filter: brightness(1.08);
      }
      100% {
        opacity: 0.92;
        filter: brightness(0.96);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .island-iridescent-rim {
        animation: none;
      }
    }
  </style>
</head>
<body>
  <div class="preview-backdrop"></div>

  <!-- Collapsed Island Pill -->
  <div class="pill-preview" id="test-pill">
    <div class="island-iridescent-rim"></div>
    <div class="island-inner-bevel"></div>
    <span class="pill-clock">9:41 AM</span>
  </div>

  <!-- Expanded Island Panel -->
  <div class="panel-preview" id="test-panel">
    <div class="island-iridescent-rim"></div>
    <div class="island-inner-bevel"></div>
    <div class="panel-header">
      <span class="panel-title">Expanded Island Surface</span>
      <span style="font-size: 11px; color: var(--text-secondary);">Minimal &amp; Restrained</span>
    </div>
    <div class="panel-content">
      <p>Interior remains completely clean, uniformly near-black.</p>
      <p style="margin-top: 8px;">The iridescent rainbow reflection stays strictly along the 1.25px outer rim perimeter.</p>
    </div>
  </div>
</body>
</html>
  `

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
  await new Promise(r => setTimeout(r, 600))

  const image = await win.webContents.capturePage()
  const outPath = join(outDir, 'iridescent_test_preview_v5.png')
  writeFileSync(outPath, image.toPNG())
  console.log(`[Test] Saved visual test preview v5 to: ${outPath}`)

  win.close()
  app.quit()
})
