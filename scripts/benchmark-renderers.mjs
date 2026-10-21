import { app, BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'

const testWallpaper = 'C:\\Users\\rrake\\OneDrive\\Desktop\\H\\Wallpapers\\335.png'

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

async function testTechnique(name, htmlContent) {
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
  await overlayWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
  overlayWin.showInactive()

  const deltas = await overlayWin.webContents.executeJavaScript(`
    new Promise(async (resolve) => {
      if (window.init) await window.init(${JSON.stringify(pathToFileURL(testWallpaper).toString())});
      const frameDeltas = [];
      let lastTime = performance.now();
      let frameCount = 0;

      function onFrame(now) {
        const delta = now - lastTime;
        lastTime = now;
        frameDeltas.push(delta);
        frameCount++;
        if (window.drawFrame) window.drawFrame(frameCount / 60);

        if (frameCount < 70) {
          requestAnimationFrame(onFrame);
        } else {
          resolve(frameDeltas);
        }
      }
      requestAnimationFrame(onFrame);
    });
  `)

  const validDeltas = deltas.slice(2)
  const avg = validDeltas.reduce((a, b) => a + b, 0) / validDeltas.length
  const max = Math.max(...validDeltas)
  const hitches = validDeltas.filter((d) => d > 20)

  console.log(`\n=== [${name}] ===`)
  console.log(`Avg frame time: ${avg.toFixed(2)}ms (~${(1000 / avg).toFixed(1)} FPS)`)
  console.log(`Max frame time: ${max.toFixed(2)}ms`)
  console.log(`Hitches (>20ms): ${hitches.length} (values: ${hitches.map((h) => h.toFixed(1)).join(', ')} ms)`)

  overlayWin.destroy()
}

const webglHtml = `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;overflow:hidden;}html,body,canvas{width:100vw;height:100vh;display:block;background:transparent;pointer-events:none;}
</style></head><body>
<canvas id="c"></canvas>
<script>
let gl, prog, uRadius, uRes, texture, img;
let maxRadius = 0;

window.init = async function(src) {
  const canvas = document.getElementById('c');
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  maxRadius = Math.hypot(canvas.width / 2, canvas.height / 2) + 20;

  gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, powerPreference: 'high-performance' }) 
    || canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });

  const vsSrc = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
  const fsSrc = 'precision highp float;' +
    'uniform sampler2D u_tex;' +
    'uniform vec2 u_res;' +
    'uniform float u_rad;' +
    'void main() {' +
    '  vec2 st = gl_FragCoord.xy;' +
    '  vec2 center = u_res * 0.5;' +
    '  float dist = distance(st, center);' +
    '  float edge = clamp(u_rad - dist, 0.0, 1.0);' +
    '  if (edge <= 0.0) { gl_FragColor = vec4(0.0); return; }' +
    '  vec2 uv = vec2(st.x / u_res.x, 1.0 - (st.y / u_res.y));' +
    '  vec4 color = texture2D(u_tex, uv);' +
    '  gl_FragColor = vec4(color.rgb, color.a * edge);' +
    '}';

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const pLoc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  uRadius = gl.getUniformLocation(prog, 'u_rad');
  uRes = gl.getUniformLocation(prog, 'u_res');
  gl.uniform2f(uRes, canvas.width, canvas.height);

  img = new Image();
  img.src = src;
  await img.decode();

  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
};

window.drawFrame = function(progress) {
  // Cubic ease out: 1 - pow(1 - p, 3)
  const p = Math.min(1.0, progress);
  const eased = 1.0 - Math.pow(1.0 - p, 3);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(uRadius, eased * maxRadius);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
};
</script></body></html>`

const canvas2dHtml = `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;overflow:hidden;}html,body,canvas{width:100vw;height:100vh;display:block;background:transparent;pointer-events:none;}
</style></head><body>
<canvas id="c"></canvas>
<script>
let ctx, img, maxRadius = 0, w, h;
window.init = async function(src) {
  const canvas = document.getElementById('c');
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  maxRadius = Math.hypot(w / 2, h / 2) + 20;
  ctx = canvas.getContext('2d');
  img = new Image();
  img.src = src;
  await img.decode();
};
window.drawFrame = function(progress) {
  const p = Math.min(1.0, progress);
  const eased = 1.0 - Math.pow(1.0 - p, 3);
  const r = eased * maxRadius;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
};
</script></body></html>`

app.whenReady().then(async () => {
  await testTechnique('WebGL Shader Reveal', webglHtml)
  await testTechnique('Canvas 2D Clip Reveal', canvas2dHtml)
  app.quit()
})
