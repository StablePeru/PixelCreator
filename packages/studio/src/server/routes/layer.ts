import * as fs from 'node:fs';
import * as path from 'node:path';
import { Hono } from 'hono';
import {
  readCanvasJSON,
  writeCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  deleteLayerDirectory,
  createEmptyBuffer,
  generateSequentialId,
  scaleBuffer,
  encodePNG,
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { LayerInfo, BlendMode } from '@pixelcreator/core';

export const layerRoutes = new Hono<{ Variables: { projectPath: string } }>();

layerRoutes.get('/canvas/:name/layers', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  try {
    const canvas = readCanvasJSON(projectPath, name);
    return c.json(canvas.layers);
  } catch {
    return c.json({ error: `Canvas "${name}" not found` }, 404);
  }
});

layerRoutes.post('/canvas/:name/layer', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const body = await c.req.json();
  const { name: layerName, type } = body as { name?: string; type?: string };

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const nextIndex = canvas.layers.length + 1;
    const layerId = generateSequentialId('layer', nextIndex);

    const newLayer: LayerInfo = {
      id: layerId,
      name: layerName || `Layer ${nextIndex}`,
      type: (type as LayerInfo['type']) || 'normal',
      visible: true,
      opacity: 255,
      blendMode: 'normal',
      locked: false,
      order: canvas.layers.length,
    };

    canvas.layers.push(newLayer);
    ensureCanvasStructure(projectPath, canvasName, canvas);
    writeCanvasJSON(projectPath, canvasName, canvas);

    return c.json(newLayer, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

layerRoutes.put('/canvas/:name/layer/:id', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');
  const body = await c.req.json();
  const updates = body as Partial<{ name: string; visible: boolean; opacity: number; blendMode: BlendMode; locked: boolean; clipping: boolean }>;

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const layer = canvas.layers.find((l) => l.id === layerId);
    if (!layer) return c.json({ error: `Layer "${layerId}" not found` }, 404);

    if (updates.name !== undefined) layer.name = updates.name;
    if (updates.visible !== undefined) layer.visible = updates.visible;
    if (updates.opacity !== undefined) layer.opacity = Math.max(0, Math.min(255, updates.opacity));
    if (updates.blendMode !== undefined) layer.blendMode = updates.blendMode;
    if (updates.locked !== undefined) layer.locked = updates.locked;
    if (updates.clipping !== undefined) layer.clipping = updates.clipping;

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json(layer);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

layerRoutes.delete('/canvas/:name/layer/:id', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const idx = canvas.layers.findIndex((l) => l.id === layerId);
    if (idx === -1) return c.json({ error: `Layer "${layerId}" not found` }, 404);
    if (canvas.layers.length <= 1) return c.json({ error: 'Cannot delete the last layer' }, 400);

    canvas.layers.splice(idx, 1);
    for (let i = 0; i < canvas.layers.length; i++) canvas.layers[i].order = i;

    deleteLayerDirectory(projectPath, canvasName, layerId);
    writeCanvasJSON(projectPath, canvasName, canvas);

    return c.json({ success: true, deleted: layerId });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

layerRoutes.post('/canvas/:name/layer/:id/duplicate', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const source = canvas.layers.find((l) => l.id === layerId);
    if (!source) return c.json({ error: `Layer "${layerId}" not found` }, 404);

    const nextIndex = canvas.layers.length + 1;
    const newId = generateSequentialId('layer', nextIndex);

    const newLayer: LayerInfo = {
      ...source,
      id: newId,
      name: `${source.name} copy`,
      order: canvas.layers.length,
    };

    canvas.layers.push(newLayer);
    ensureCanvasStructure(projectPath, canvasName, canvas);

    // Copy all frame PNGs from source to new layer
    for (const frame of canvas.frames) {
      const srcBuf = readLayerFrame(projectPath, canvasName, layerId, frame.id);
      writeLayerFrame(projectPath, canvasName, newId, frame.id, srcBuf);
    }

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json(newLayer, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

layerRoutes.put('/canvas/:name/layers/reorder', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const body = await c.req.json();
  const { order } = body as { order: string[] };

  if (!Array.isArray(order)) return c.json({ error: 'order[] required' }, 400);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const layerMap = new Map(canvas.layers.map((l) => [l.id, l]));

    const reordered: LayerInfo[] = [];
    for (let i = 0; i < order.length; i++) {
      const layer = layerMap.get(order[i]);
      if (!layer) return c.json({ error: `Layer "${order[i]}" not found` }, 404);
      layer.order = i;
      reordered.push(layer);
    }

    canvas.layers = reordered;
    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json(canvas.layers);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

layerRoutes.get('/canvas/:name/layer/:id/frame/:frameIndex/thumbnail', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');
  const frameIndex = parseInt(c.req.param('frameIndex'), 10);

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const frame = canvas.frames[frameIndex];
    if (!frame) return c.json({ error: 'Frame not found' }, 404);

    const buffer = readLayerFrame(projectPath, canvasName, layerId, frame.id);
    const thumb = scaleBuffer(buffer, 4);
    const png = encodePNG(thumb);

    return new Response(new Uint8Array(png), {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
