import { PixelBuffer, encodePNG } from './png-codec.js';

export interface HtmlRenderOptions {
  scale: number;
  grid: boolean;
  title: string;
}

export function renderToHtml(buffer: PixelBuffer, options: HtmlRenderOptions): string {
  const pngData = encodePNG(buffer);
  const dataUrl = `data:image/png;base64,${pngData.toString('base64')}`;
  const canvasW = buffer.width * options.scale;
  const canvasH = buffer.height * options.scale;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${options.title}</title>
<style>
body{margin:0;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;color:#eee}
canvas{image-rendering:pixelated;border:1px solid #333;cursor:crosshair}
.info{margin:10px;font-size:14px}
</style></head><body>
<div class="info">${options.title} — ${buffer.width}x${buffer.height} (${options.scale}x zoom)</div>
<canvas id="c" width="${canvasW}" height="${canvasH}"></canvas>
<div class="info" id="coords"></div>
<script>
const img=new Image();const cv=document.getElementById('c');const ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;
img.onload=()=>{ctx.drawImage(img,0,0,${canvasW},${canvasH});${options.grid ? `drawGrid();` : ''}};
img.src='${dataUrl}';
${options.grid ? `function drawGrid(){ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;for(let x=0;x<=${buffer.width};x++){ctx.beginPath();ctx.moveTo(x*${options.scale},0);ctx.lineTo(x*${options.scale},${canvasH});ctx.stroke();}for(let y=0;y<=${buffer.height};y++){ctx.beginPath();ctx.moveTo(0,y*${options.scale});ctx.lineTo(${canvasW},y*${options.scale});ctx.stroke();}}` : ''}
cv.onmousemove=(e)=>{const r=cv.getBoundingClientRect();const x=Math.floor((e.clientX-r.left)/${options.scale});const y=Math.floor((e.clientY-r.top)/${options.scale});document.getElementById('coords').textContent='Pixel: ('+x+', '+y+')';};
</script></body></html>`;
}

export function renderAnimationHtml(
  frames: PixelBuffer[],
  durations: number[],
  options: HtmlRenderOptions,
): string {
  const dataUrls = frames.map((f) => {
    const png = encodePNG(f);
    return `data:image/png;base64,${png.toString('base64')}`;
  });
  const canvasW = frames[0].width * options.scale;
  const canvasH = frames[0].height * options.scale;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${options.title}</title>
<style>
body{margin:0;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;color:#eee}
canvas{image-rendering:pixelated;border:1px solid #333}
.controls{margin:10px;display:flex;gap:10px;align-items:center}
button{background:#333;color:#eee;border:1px solid #555;padding:5px 15px;cursor:pointer;font-family:monospace}
</style></head><body>
<div class="controls">
<button onclick="togglePlay()" id="btn">Pause</button>
<span id="info">Frame 1/${frames.length}</span>
</div>
<canvas id="c" width="${canvasW}" height="${canvasH}"></canvas>
<script>
const frames=${JSON.stringify(dataUrls)};
const durations=${JSON.stringify(durations)};
const cv=document.getElementById('c');const ctx=cv.getContext('2d');
ctx.imageSmoothingEnabled=false;
let current=0;let playing=true;let timer;
const imgs=frames.map(src=>{const i=new Image();i.src=src;return i;});
function show(idx){ctx.clearRect(0,0,${canvasW},${canvasH});ctx.drawImage(imgs[idx],0,0,${canvasW},${canvasH});document.getElementById('info').textContent='Frame '+(idx+1)+'/'+frames.length;}
function next(){show(current);current=(current+1)%frames.length;if(playing)timer=setTimeout(next,durations[current]||100);}
function togglePlay(){playing=!playing;document.getElementById('btn').textContent=playing?'Pause':'Play';if(playing)next();else clearTimeout(timer);}
imgs[0].onload=()=>next();
</script></body></html>`;
}
