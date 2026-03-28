import { Hono } from 'hono';
import {
  readCanvasJSON,
  readLayerFrame,
  readSelection,
  writeSelection,
  deleteSelection,
  createRectSelection,
  createEllipseSelection,
  createColorSelection,
  createAllSelection,
  createLassoSelection,
  createPolygonSelection,
  invertSelection,
  mergeSelections,
  getSelectionBounds,
  getSelectionPixelCount,
  hexToRGBA,
} from '@pixelcreator/core';

export const selectionRoutes = new Hono<{ Variables: { projectPath: string } }>();

selectionRoutes.post('/select/rect', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    x,
    y,
    width,
    height,
    add,
  } = body as {
    canvas: string;
    x: number;
    y: number;
    width: number;
    height: number;
    add?: boolean;
  };

  const canvasData = readCanvasJSON(projectPath, canvasName);
  let mask = createRectSelection(canvasData.width, canvasData.height, x, y, width, height);

  if (add) {
    const existing = readSelection(projectPath, canvasName);
    if (existing) mask = mergeSelections(existing, mask);
  }

  writeSelection(projectPath, canvasName, mask);
  const bounds = getSelectionBounds(mask);
  return c.json({ success: true, bounds, pixelCount: getSelectionPixelCount(mask) });
});

selectionRoutes.post('/select/ellipse', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    cx,
    cy,
    rx,
    ry,
    add,
  } = body as {
    canvas: string;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    add?: boolean;
  };

  const canvasData = readCanvasJSON(projectPath, canvasName);
  let mask = createEllipseSelection(canvasData.width, canvasData.height, cx, cy, rx, ry);

  if (add) {
    const existing = readSelection(projectPath, canvasName);
    if (existing) mask = mergeSelections(existing, mask);
  }

  writeSelection(projectPath, canvasName, mask);
  const bounds = getSelectionBounds(mask);
  return c.json({ success: true, bounds, pixelCount: getSelectionPixelCount(mask) });
});

selectionRoutes.post('/select/color', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    x,
    y,
    tolerance,
    contiguous,
    layer,
    frame,
    add,
  } = body as {
    canvas: string;
    x: number;
    y: number;
    tolerance?: number;
    contiguous?: boolean;
    layer?: string;
    frame?: string;
    add?: boolean;
  };

  const canvasData = readCanvasJSON(projectPath, canvasName);
  const layerId = layer || canvasData.layers[0]?.id;
  const frameId = frame || canvasData.frames[0]?.id;
  if (!layerId || !frameId) return c.json({ error: 'No layers or frames' }, 400);

  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const targetColor = buffer.getPixel(x, y);
  let mask = createColorSelection(buffer, targetColor, tolerance ?? 0, contiguous ?? true, x, y);

  if (add) {
    const existing = readSelection(projectPath, canvasName);
    if (existing) mask = mergeSelections(existing, mask);
  }

  writeSelection(projectPath, canvasName, mask);
  const bounds = getSelectionBounds(mask);
  return c.json({ success: true, bounds, pixelCount: getSelectionPixelCount(mask) });
});

selectionRoutes.post('/select/all', async (c) => {
  const projectPath = c.get('projectPath');
  const { canvas: canvasName } = (await c.req.json()) as { canvas: string };
  const canvasData = readCanvasJSON(projectPath, canvasName);
  const mask = createAllSelection(canvasData.width, canvasData.height);
  writeSelection(projectPath, canvasName, mask);
  return c.json({ success: true, pixelCount: canvasData.width * canvasData.height });
});

selectionRoutes.post('/select/none', async (c) => {
  const projectPath = c.get('projectPath');
  const { canvas: canvasName } = (await c.req.json()) as { canvas: string };
  deleteSelection(projectPath, canvasName);
  return c.json({ success: true });
});

selectionRoutes.post('/select/invert', async (c) => {
  const projectPath = c.get('projectPath');
  const { canvas: canvasName } = (await c.req.json()) as { canvas: string };
  const existing = readSelection(projectPath, canvasName);
  if (!existing) {
    const canvasData = readCanvasJSON(projectPath, canvasName);
    const all = createAllSelection(canvasData.width, canvasData.height);
    writeSelection(projectPath, canvasName, all);
  } else {
    const inverted = invertSelection(existing);
    writeSelection(projectPath, canvasName, inverted);
  }
  return c.json({ success: true });
});

selectionRoutes.post('/select/lasso', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    points,
    add,
  } = body as {
    canvas: string;
    points: Array<{ x: number; y: number }>;
    add?: boolean;
  };

  if (!points || points.length < 3) return c.json({ error: 'At least 3 points required' }, 400);

  const canvasData = readCanvasJSON(projectPath, canvasName);
  let mask = createLassoSelection(canvasData.width, canvasData.height, points);

  if (add) {
    const existing = readSelection(projectPath, canvasName);
    if (existing) mask = mergeSelections(existing, mask);
  }

  writeSelection(projectPath, canvasName, mask);
  const bounds = getSelectionBounds(mask);
  return c.json({ success: true, bounds, pixelCount: getSelectionPixelCount(mask) });
});

selectionRoutes.post('/select/polygon', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    points,
    add,
  } = body as {
    canvas: string;
    points: Array<{ x: number; y: number }>;
    add?: boolean;
  };

  if (!points || points.length < 3) return c.json({ error: 'At least 3 vertices required' }, 400);

  const canvasData = readCanvasJSON(projectPath, canvasName);
  let mask = createPolygonSelection(canvasData.width, canvasData.height, points);

  if (add) {
    const existing = readSelection(projectPath, canvasName);
    if (existing) mask = mergeSelections(existing, mask);
  }

  writeSelection(projectPath, canvasName, mask);
  const bounds = getSelectionBounds(mask);
  return c.json({ success: true, bounds, pixelCount: getSelectionPixelCount(mask) });
});

selectionRoutes.get('/select/:canvas', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('canvas');
  const mask = readSelection(projectPath, canvasName);
  if (!mask) return c.json({ hasSelection: false, bounds: null, pixelCount: 0 });
  return c.json({
    hasSelection: true,
    bounds: getSelectionBounds(mask),
    pixelCount: getSelectionPixelCount(mask),
  });
});
