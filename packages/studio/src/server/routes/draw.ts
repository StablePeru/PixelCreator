import { Hono } from 'hono';
import {
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  hexToRGBA,
  drawPixel,
  drawLine,
  drawThickLine,
  drawRect,
  drawCircle,
  drawEllipse,
  floodFill,
  drawPolygon,
  drawGradient,
  drawRadialGradient,
  drawBezierQuadratic,
  drawBezierCubic,
  generateOutline,
  drawStamp,
} from '@pixelcreator/core';
import type { PixelBuffer } from '@pixelcreator/core';
import type { HistoryStack } from '../../history/history-stack.js';
import {
  drawPixelSchema,
  drawLineSchema,
  drawRectSchema,
  drawCircleSchema,
  drawFillSchema,
  drawEllipseSchema,
  drawPolygonSchema,
  drawGradientSchema,
  drawRadialGradientSchema,
  drawBezierSchema,
  drawOutlineSchema,
  drawStampSchema,
} from '../../utils/validation.js';

export const drawRoutes = new Hono<{ Variables: { projectPath: string; historyStack: HistoryStack } }>();

function resolveLayerAndFrame(
  projectPath: string,
  canvasName: string,
  layerId?: string,
  frameId?: string,
) {
  const canvas = readCanvasJSON(projectPath, canvasName);
  const resolvedLayer = layerId || canvas.layers[0]?.id;
  const resolvedFrame = frameId || canvas.frames[0]?.id;
  if (!resolvedLayer || !resolvedFrame) throw new Error('Canvas has no layers or frames');
  return { canvas, layerId: resolvedLayer, frameId: resolvedFrame };
}

function withHistory(
  historyStack: HistoryStack,
  projectPath: string,
  canvasName: string,
  layerId: string,
  frameId: string,
  operation: string,
  mutate: (buffer: PixelBuffer) => void,
) {
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  mutate(buffer);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, buffer);
  historyStack.push({ operation, canvasName, layerId, frameId, beforeBuffer: before });
}

drawRoutes.post('/draw/pixel', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawPixelSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, x, y, color, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'pixel', (buf) => {
    drawPixel(buf, x, y, hexToRGBA(color));
  });

  return c.json({ success: true, operation: 'pixel', canvas: canvasName });
});

drawRoutes.post('/draw/line', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawLineSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, x1, y1, x2, y2, color, thickness, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'line', (buf) => {
    if (thickness && thickness > 1) {
      drawThickLine(buf, x1, y1, x2, y2, hexToRGBA(color), thickness);
    } else {
      drawLine(buf, x1, y1, x2, y2, hexToRGBA(color));
    }
  });

  return c.json({ success: true, operation: 'line', canvas: canvasName });
});

drawRoutes.post('/draw/rect', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawRectSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, x, y, width, height, color, fill, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'rect', (buf) => {
    drawRect(buf, x, y, width, height, hexToRGBA(color), fill ?? false);
  });

  return c.json({ success: true, operation: 'rect', canvas: canvasName });
});

drawRoutes.post('/draw/circle', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawCircleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, cx, cy, radius, color, fill, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'circle', (buf) => {
    drawCircle(buf, cx, cy, radius, hexToRGBA(color), fill ?? false);
  });

  return c.json({ success: true, operation: 'circle', canvas: canvasName });
});

drawRoutes.post('/draw/fill', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawFillSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, x, y, color, tolerance, contiguous, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'fill', (buf) => {
    floodFill(buf, x, y, hexToRGBA(color), tolerance ?? 0, contiguous ?? true);
  });

  return c.json({ success: true, operation: 'fill', canvas: canvasName });
});

drawRoutes.post('/draw/ellipse', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawEllipseSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, cx, cy, rx, ry, color, fill, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'ellipse', (buf) => {
    drawEllipse(buf, cx, cy, rx, ry, hexToRGBA(color), fill ?? false);
  });

  return c.json({ success: true, operation: 'ellipse', canvas: canvasName });
});

drawRoutes.post('/draw/polygon', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawPolygonSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, points, color, fill, thickness, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'polygon', (buf) => {
    drawPolygon(buf, points, hexToRGBA(color), fill ?? false, thickness ?? 1);
  });

  return c.json({ success: true, operation: 'polygon', canvas: canvasName });
});

drawRoutes.post('/draw/gradient', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawGradientSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, x1, y1, x2, y2, from: fromColor, to: toColor, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'gradient', (buf) => {
    drawGradient(buf, x1, y1, x2, y2, hexToRGBA(fromColor), hexToRGBA(toColor));
  });

  return c.json({ success: true, operation: 'gradient', canvas: canvasName });
});

drawRoutes.post('/draw/radial-gradient', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawRadialGradientSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, cx, cy, radius, from: fromColor, to: toColor, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'radial-gradient', (buf) => {
    drawRadialGradient(buf, cx, cy, radius, hexToRGBA(fromColor), hexToRGBA(toColor));
  });

  return c.json({ success: true, operation: 'radial-gradient', canvas: canvasName });
});

drawRoutes.post('/draw/bezier', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawBezierSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, points, color, thickness, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'bezier', (buf) => {
    if (points.length === 3) {
      drawBezierQuadratic(buf, points[0], points[1], points[2], hexToRGBA(color), thickness ?? 1);
    } else {
      drawBezierCubic(buf, points[0], points[1], points[2], points[3], hexToRGBA(color), thickness ?? 1);
    }
  });

  return c.json({ success: true, operation: 'bezier', canvas: canvasName });
});

drawRoutes.post('/draw/outline', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawOutlineSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, color, thickness, corners, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);

  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const outlined = generateOutline(buffer, hexToRGBA(color), thickness ?? 1, corners ?? false);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, outlined);
  historyStack.push({ operation: 'outline', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'outline', canvas: canvasName });
});

drawRoutes.post('/draw/stamp', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const parsed = drawStampSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const { canvas: canvasName, x, y, color, size, shape, layer, frame } = parsed.data;
  const { layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
  withHistory(historyStack, projectPath, canvasName, layerId, frameId, 'stamp', (buf) => {
    drawStamp(buf, x, y, hexToRGBA(color), size ?? 1, (shape ?? 'square') as 'square' | 'circle');
  });

  return c.json({ success: true, operation: 'stamp', canvas: canvasName });
});

// Batch endpoint — multiple operations in one call
drawRoutes.post('/draw/batch', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const { operations } = body as { operations: Array<{ type: string; canvas: string; [key: string]: unknown }> };

  if (!Array.isArray(operations) || operations.length === 0) {
    return c.json({ error: 'operations[] required' }, 400);
  }

  // Group by canvas+layer+frame for efficiency
  const canvasName = operations[0].canvas;
  if (!canvasName) return c.json({ error: 'canvas required in operations' }, 400);

  const { layerId, frameId } = resolveLayerAndFrame(
    projectPath, canvasName,
    operations[0].layer as string | undefined,
    operations[0].frame as string | undefined,
  );

  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();

  let applied = 0;
  for (const op of operations) {
    try {
      switch (op.type) {
        case 'pixel':
          drawPixel(buffer, op.x as number, op.y as number, hexToRGBA(op.color as string));
          applied++;
          break;
        case 'line':
          drawLine(buffer, op.x1 as number, op.y1 as number, op.x2 as number, op.y2 as number, hexToRGBA(op.color as string));
          applied++;
          break;
        case 'rect':
          drawRect(buffer, op.x as number, op.y as number, op.width as number, op.height as number, hexToRGBA(op.color as string), (op.fill as boolean) ?? false);
          applied++;
          break;
        case 'circle':
          drawCircle(buffer, op.cx as number, op.cy as number, op.radius as number, hexToRGBA(op.color as string), (op.fill as boolean) ?? false);
          applied++;
          break;
        default:
          break;
      }
    } catch { /* skip invalid ops */ }
  }

  writeLayerFrame(projectPath, canvasName, layerId, frameId, buffer);
  historyStack.push({ operation: 'batch', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'batch', canvas: canvasName, applied, total: operations.length });
});
