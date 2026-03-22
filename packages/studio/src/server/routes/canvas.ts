import { Hono } from 'hono';
import {
  readCanvasJSON,
  readLayerFrame,
  readProjectJSON,
  writeProjectJSON,
  writeCanvasJSON,
  writeLayerFrame,
  deleteCanvasDirectory,
  flattenLayers,
  scaleBuffer,
  encodePNG,
  createEmptyBuffer,
  drawRect,
  hexToRGBA,
  generateSequentialId,
} from '@pixelcreator/core';
import type { CanvasData, LayerWithBuffer } from '@pixelcreator/core';
import { createCanvasSchema } from '../../utils/validation.js';

export const canvasRoutes = new Hono<{ Variables: { projectPath: string } }>();

canvasRoutes.get('/canvas/:name', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  try {
    const canvas = readCanvasJSON(projectPath, name);
    return c.json(canvas);
  } catch {
    return c.json({ error: `Canvas "${name}" not found` }, 404);
  }
});

canvasRoutes.get('/canvas/:name/frame/:index', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const frameIndex = parseInt(c.req.param('index'), 10);
  const scale = parseInt(c.req.query('scale') || '1', 10);

  try {
    const canvas = readCanvasJSON(projectPath, name);
    const frame = canvas.frames[frameIndex];
    if (!frame) return c.json({ error: `Frame index ${frameIndex} not found` }, 404);

    const layersWithBuffers: LayerWithBuffer[] = canvas.layers
      .filter((l) => l.visible)
      .map((l) => ({
        info: l,
        buffer: readLayerFrame(projectPath, name, l.id, frame.id),
      }));

    let flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
    if (scale > 1) flattened = scaleBuffer(flattened, scale);

    const png = encodePNG(flattened);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

canvasRoutes.post('/canvas', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const parsed = createCanvasSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { name, width, height, background } = parsed.data;
  const project = readProjectJSON(projectPath);

  if (project.canvases.includes(name)) {
    return c.json({ error: `Canvas "${name}" already exists` }, 409);
  }

  const now = new Date().toISOString();
  const canvas: CanvasData = {
    name,
    width,
    height,
    created: now,
    modified: now,
    palette: null,
    layers: [
      {
        id: 'layer-001',
        name: 'background',
        type: 'normal',
        visible: true,
        opacity: 255,
        blendMode: 'normal',
        locked: false,
        order: 0,
      },
    ],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };

  const { ensureCanvasStructure } = await import('@pixelcreator/core');
  ensureCanvasStructure(projectPath, name, canvas);
  writeCanvasJSON(projectPath, name, canvas);

  if (background) {
    const color = hexToRGBA(background);
    const buffer = createEmptyBuffer(width, height);
    drawRect(buffer, 0, 0, width, height, color, true);
    writeLayerFrame(projectPath, name, 'layer-001', 'frame-001', buffer);
  }

  project.canvases.push(name);
  writeProjectJSON(projectPath, project);

  return c.json(canvas, 201);
});

canvasRoutes.get('/canvas/:name/sample/:x/:y', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const x = parseInt(c.req.param('x'), 10);
  const y = parseInt(c.req.param('y'), 10);
  const frameIndex = parseInt(c.req.query('frame') || '0', 10);

  try {
    const canvas = readCanvasJSON(projectPath, name);
    const frame = canvas.frames[frameIndex];
    if (!frame) return c.json({ error: 'Frame not found' }, 404);

    const layersWithBuffers: LayerWithBuffer[] = canvas.layers
      .filter((l) => l.visible)
      .map((l) => ({
        info: l,
        buffer: readLayerFrame(projectPath, name, l.id, frame.id),
      }));

    const flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
    const pixel = flattened.getPixel(x, y);
    const hex = `#${pixel.r.toString(16).padStart(2, '0')}${pixel.g.toString(16).padStart(2, '0')}${pixel.b.toString(16).padStart(2, '0')}`;

    return c.json({ x, y, color: { r: pixel.r, g: pixel.g, b: pixel.b, a: pixel.a }, hex });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

canvasRoutes.delete('/canvas/:name', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');

  try {
    const project = readProjectJSON(projectPath);
    const idx = project.canvases.indexOf(name);
    if (idx === -1) return c.json({ error: `Canvas "${name}" not found` }, 404);

    deleteCanvasDirectory(projectPath, name);
    project.canvases.splice(idx, 1);
    writeProjectJSON(projectPath, project);

    return c.json({ success: true, deleted: name });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
