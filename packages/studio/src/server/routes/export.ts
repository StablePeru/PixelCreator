import { Hono } from 'hono';
import {
  readCanvasJSON,
  readLayerFrame,
  flattenLayers,
  scaleBuffer,
  encodePNG,
  encodeGif,
  encodeApng,
  encodeSvg,
  encodeAse,
  composeSpritesheet,
  resolveFrameSequence,
} from '@pixelcreator/core';
import type { LayerWithBuffer, GifFrameInput, ApngFrameInput, SpritesheetOptions, AseExportLayer } from '@pixelcreator/core';

export const exportRoutes = new Hono<{ Variables: { projectPath: string } }>();

function renderFrame(projectPath: string, canvasName: string, canvas: any, frameIndex: number, scale: number) {
  const frame = canvas.frames[frameIndex];
  if (!frame) throw new Error(`Frame ${frameIndex} not found`);
  const layers: LayerWithBuffer[] = canvas.layers
    .filter((l: any) => l.visible)
    .map((l: any) => ({ info: l, buffer: readLayerFrame(projectPath, canvasName, l.id, frame.id) }));
  let buf = flattenLayers(layers, canvas.width, canvas.height);
  if (scale > 1) buf = scaleBuffer(buf, scale);
  return buf;
}

function renderAllFrames(projectPath: string, canvasName: string, canvas: any, scale: number) {
  return canvas.frames.map((_: any, i: number) => renderFrame(projectPath, canvasName, canvas, i, scale));
}

exportRoutes.get('/export/png/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = parseInt(c.req.query('scale') || '1', 10);
  const frameIdx = parseInt(c.req.query('frame') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buf = renderFrame(projectPath, canvasName, canvas, frameIdx, scale);
    const png = encodePNG(buf);
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${canvasName}.png"`,
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/gif/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = parseInt(c.req.query('scale') || '1', 10);
  const loop = parseInt(c.req.query('loop') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buffers = renderAllFrames(projectPath, canvasName, canvas, scale);
    const w = canvas.width * scale;
    const h = canvas.height * scale;

    const frames: GifFrameInput[] = buffers.map((buf: any, i: number) => ({
      buffer: buf,
      delay: canvas.frames[i].duration,
    }));

    const gif = encodeGif(frames, { width: w, height: h, loop });
    return new Response(new Uint8Array(gif), {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': `attachment; filename="${canvasName}.gif"`,
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/apng/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = parseInt(c.req.query('scale') || '1', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buffers = renderAllFrames(projectPath, canvasName, canvas, scale);
    const w = canvas.width * scale;
    const h = canvas.height * scale;

    const frames: ApngFrameInput[] = buffers.map((buf: any, i: number) => ({
      buffer: buf,
      delay: canvas.frames[i].duration,
    }));

    const apng = encodeApng(frames, { width: w, height: h, loop: 0 });
    return new Response(new Uint8Array(apng), {
      headers: {
        'Content-Type': 'image/apng',
        'Content-Disposition': `attachment; filename="${canvasName}.apng"`,
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/spritesheet/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const layout = (c.req.query('layout') || 'grid') as 'horizontal' | 'vertical' | 'grid';
  const columns = parseInt(c.req.query('columns') || '4', 10);
  const spacing = parseInt(c.req.query('spacing') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buffers = renderAllFrames(projectPath, canvasName, canvas, 1);

    const opts: SpritesheetOptions = {
      layout,
      columns,
      spacing,
      margin: 0,
      padding: 0,
    };

    const durations = canvas.frames.map((f: any) => f.duration);
    const result = composeSpritesheet(buffers, canvas.width, canvas.height, durations, canvas.animationTags || [], opts);
    const png = encodePNG(result.buffer);
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${canvasName}-spritesheet.png"`,
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/svg/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = parseInt(c.req.query('scale') || '10', 10);
  const frameIdx = parseInt(c.req.query('frame') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buf = renderFrame(projectPath, canvasName, canvas, frameIdx, 1);
    const svg = encodeSvg(buf, { pixelSize: scale, showGrid: false, gridColor: '#ccc', background: null });
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `attachment; filename="${canvasName}.svg"`,
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// --- Preview endpoints (Content-Disposition: inline for in-browser display) ---

exportRoutes.get('/export/preview/png/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = Math.min(parseInt(c.req.query('scale') || '1', 10), 4);
  const frameIdx = parseInt(c.req.query('frame') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buf = renderFrame(projectPath, canvasName, canvas, frameIdx, scale);
    const png = encodePNG(buf);
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/preview/gif/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = Math.min(parseInt(c.req.query('scale') || '1', 10), 4);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buffers = renderAllFrames(projectPath, canvasName, canvas, scale);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    const frames: GifFrameInput[] = buffers.map((buf: any, i: number) => ({
      buffer: buf, delay: canvas.frames[i].duration,
    }));
    const gif = encodeGif(frames, { width: w, height: h, loop: 0 });
    return new Response(new Uint8Array(gif), {
      headers: { 'Content-Type': 'image/gif', 'Content-Disposition': 'inline', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/preview/apng/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = Math.min(parseInt(c.req.query('scale') || '1', 10), 4);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buffers = renderAllFrames(projectPath, canvasName, canvas, scale);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    const frames: ApngFrameInput[] = buffers.map((buf: any, i: number) => ({
      buffer: buf, delay: canvas.frames[i].duration,
    }));
    const apng = encodeApng(frames, { width: w, height: h, loop: 0 });
    return new Response(new Uint8Array(apng), {
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/preview/spritesheet/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const layout = (c.req.query('layout') || 'grid') as 'horizontal' | 'vertical' | 'grid';
  const columns = parseInt(c.req.query('columns') || '4', 10);
  const spacing = parseInt(c.req.query('spacing') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buffers = renderAllFrames(projectPath, canvasName, canvas, 1);
    const opts: SpritesheetOptions = { layout, columns, spacing, margin: 0, padding: 0 };
    const durations = canvas.frames.map((f: any) => f.duration);
    const result = composeSpritesheet(buffers, canvas.width, canvas.height, durations, canvas.animationTags || [], opts);
    const png = encodePNG(result.buffer);
    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Content-Disposition': 'inline', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

exportRoutes.get('/export/preview/svg/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const scale = parseInt(c.req.query('scale') || '10', 10);
  const frameIdx = parseInt(c.req.query('frame') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const buf = renderFrame(projectPath, canvasName, canvas, frameIdx, 1);
    const svg = encodeSvg(buf, { pixelSize: scale, showGrid: false, gridColor: '#ccc', background: null });
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Content-Disposition': 'inline', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
