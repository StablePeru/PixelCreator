import { Hono } from 'hono';
import {
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  readSelection,
  readClipboard,
  writeClipboard,
  extractSelection,
  clearSelection,
  pasteBuffer,
} from '@pixelcreator/core';
import type { HistoryStack } from '../../history/history-stack.js';

export const clipboardRoutes = new Hono<{ Variables: { projectPath: string; historyStack: HistoryStack } }>();

clipboardRoutes.post('/clipboard/copy', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { canvas: canvasName, layer, frame } = body as { canvas: string; layer?: string; frame?: string };

  const canvasData = readCanvasJSON(projectPath, canvasName);
  const layerId = layer || canvasData.layers[0]?.id;
  const frameId = frame || canvasData.frames[0]?.id;
  if (!layerId || !frameId) return c.json({ error: 'No layers or frames' }, 400);

  const mask = readSelection(projectPath, canvasName);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const extracted = mask ? extractSelection(buffer, mask) : buffer.clone();

  writeClipboard(projectPath, {
    width: canvasData.width,
    height: canvasData.height,
    source: canvasName,
    offsetX: 0,
    offsetY: 0,
    created: new Date().toISOString(),
  }, extracted);

  return c.json({ success: true, operation: 'copy' });
});

clipboardRoutes.post('/clipboard/cut', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const { canvas: canvasName, layer, frame } = body as { canvas: string; layer?: string; frame?: string };

  const canvasData = readCanvasJSON(projectPath, canvasName);
  const layerId = layer || canvasData.layers[0]?.id;
  const frameId = frame || canvasData.frames[0]?.id;
  if (!layerId || !frameId) return c.json({ error: 'No layers or frames' }, 400);

  const mask = readSelection(projectPath, canvasName);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();

  const extracted = mask ? extractSelection(buffer, mask) : buffer.clone();
  writeClipboard(projectPath, {
    width: canvasData.width,
    height: canvasData.height,
    source: canvasName,
    offsetX: 0,
    offsetY: 0,
    created: new Date().toISOString(),
  }, extracted);

  if (mask) clearSelection(buffer, mask);
  else buffer.clear();

  writeLayerFrame(projectPath, canvasName, layerId, frameId, buffer);
  historyStack.push({ operation: 'cut', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'cut' });
});

clipboardRoutes.post('/clipboard/paste', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const { canvas: canvasName, x, y, layer, frame } = body as {
    canvas: string; x?: number; y?: number; layer?: string; frame?: string;
  };

  const clip = readClipboard(projectPath);
  if (!clip) return c.json({ error: 'Clipboard is empty' }, 400);

  const canvasData = readCanvasJSON(projectPath, canvasName);
  const layerId = layer || canvasData.layers[0]?.id;
  const frameId = frame || canvasData.frames[0]?.id;
  if (!layerId || !frameId) return c.json({ error: 'No layers or frames' }, 400);

  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();

  pasteBuffer(buffer, clip.buffer, x ?? 0, y ?? 0);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, buffer);
  historyStack.push({ operation: 'paste', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'paste' });
});
