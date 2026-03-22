import { Hono } from 'hono';
import {
  readCanvasJSON,
  writeCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  deleteLayerFrame,
  createEmptyBuffer,
  generateSequentialId,
} from '@pixelcreator/core';

export const frameRoutes = new Hono<{ Variables: { projectPath: string } }>();

frameRoutes.post('/canvas/:name/frame', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const body = await c.req.json().catch(() => ({}));
  const { copyFrom, after } = body as { copyFrom?: number; after?: number };

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const insertIndex = after !== undefined ? after + 1 : canvas.frames.length;
    const frameIndex = canvas.frames.length;
    const frameId = generateSequentialId('frame', frameIndex + 1);

    const newFrame = { id: frameId, index: frameIndex, duration: 100 };

    let sourceFrameId: string | null = null;
    if (copyFrom !== undefined) {
      const src = canvas.frames.find((f) => f.index === copyFrom);
      if (src) sourceFrameId = src.id;
    }

    // Create pixel data for each layer
    for (const layer of canvas.layers) {
      if (sourceFrameId) {
        const srcBuf = readLayerFrame(projectPath, canvasName, layer.id, sourceFrameId);
        writeLayerFrame(projectPath, canvasName, layer.id, frameId, srcBuf);
      } else {
        writeLayerFrame(projectPath, canvasName, layer.id, frameId, createEmptyBuffer(canvas.width, canvas.height));
      }
    }

    // Insert and reindex
    canvas.frames.splice(insertIndex, 0, newFrame);
    for (let i = 0; i < canvas.frames.length; i++) canvas.frames[i].index = i;

    // Adjust animation tags
    for (const tag of canvas.animationTags) {
      if (insertIndex <= tag.from) { tag.from++; tag.to++; }
      else if (insertIndex <= tag.to) { tag.to++; }
    }

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json(newFrame, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

frameRoutes.delete('/canvas/:name/frame/:id', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const frameId = c.req.param('id');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    if (canvas.frames.length <= 1) return c.json({ error: 'Cannot delete the last frame' }, 400);

    const idx = canvas.frames.findIndex((f) => f.id === frameId);
    if (idx === -1) return c.json({ error: `Frame "${frameId}" not found` }, 404);

    // Delete pixel data for all layers
    for (const layer of canvas.layers) {
      deleteLayerFrame(projectPath, canvasName, layer.id, frameId);
    }

    canvas.frames.splice(idx, 1);
    for (let i = 0; i < canvas.frames.length; i++) canvas.frames[i].index = i;

    // Adjust animation tags
    for (const tag of canvas.animationTags) {
      if (idx < tag.from) { tag.from--; tag.to--; }
      else if (idx <= tag.to) { tag.to = Math.max(tag.from, tag.to - 1); }
    }
    // Remove invalid tags
    canvas.animationTags = canvas.animationTags.filter((t) => t.from <= t.to);

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json({ success: true, deleted: frameId });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

frameRoutes.post('/canvas/:name/frame/:id/duplicate', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const frameId = c.req.param('id');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const srcFrame = canvas.frames.find((f) => f.id === frameId);
    if (!srcFrame) return c.json({ error: `Frame "${frameId}" not found` }, 404);

    const newIndex = canvas.frames.length;
    const newId = generateSequentialId('frame', newIndex + 1);
    const newFrame = { id: newId, index: newIndex, duration: srcFrame.duration, label: srcFrame.label };

    for (const layer of canvas.layers) {
      const buf = readLayerFrame(projectPath, canvasName, layer.id, frameId);
      writeLayerFrame(projectPath, canvasName, layer.id, newId, buf);
    }

    const insertAt = srcFrame.index + 1;
    canvas.frames.splice(insertAt, 0, newFrame);
    for (let i = 0; i < canvas.frames.length; i++) canvas.frames[i].index = i;

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json(newFrame, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

frameRoutes.put('/canvas/:name/frame/:id', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const frameId = c.req.param('id');
  const body = await c.req.json();
  const { duration, label } = body as { duration?: number; label?: string };

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const frame = canvas.frames.find((f) => f.id === frameId);
    if (!frame) return c.json({ error: `Frame "${frameId}" not found` }, 404);

    if (duration !== undefined) frame.duration = Math.max(1, duration);
    if (label !== undefined) frame.label = label || undefined;

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json(frame);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
