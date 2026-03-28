import { Hono } from 'hono';
import {
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  flipBufferH,
  flipBufferV,
  rotateBuffer90,
  adjustBrightness,
  adjustContrast,
  invertColors,
  desaturate,
  hueShift,
  posterize,
  scaleBufferNearest,
  scaleBufferBilinear,
  ditherBuffer,
  hexToRGBA,
} from '@pixelcreator/core';
import type { HistoryStack } from '../../history/history-stack.js';

export const transformRoutes = new Hono<{
  Variables: { projectPath: string; historyStack: HistoryStack };
}>();

function resolveTarget(projectPath: string, canvasName: string, layer?: string, frame?: string) {
  const canvas = readCanvasJSON(projectPath, canvasName);
  const layerId = layer || canvas.layers[0]?.id;
  const frameId = frame || canvas.frames[0]?.id;
  if (!layerId || !frameId) throw new Error('No layers or frames');
  return { layerId, frameId };
}

function applyTransform(
  c: any,
  operation: string,
  transform: (
    projectPath: string,
    canvasName: string,
    layerId: string,
    frameId: string,
    historyStack: HistoryStack,
  ) => void,
) {
  return async (ctx: any) => {
    const projectPath = ctx.get('projectPath');
    const historyStack = ctx.get('historyStack');
    const body = await ctx.req.json();
    const { canvas: canvasName, layer, frame } = body;

    try {
      const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
      transform(projectPath, canvasName, layerId, frameId, historyStack);
      return ctx.json({ success: true, operation, canvas: canvasName });
    } catch (err) {
      return ctx.json({ error: String(err) }, 500);
    }
  };
}

transformRoutes.post('/transform/flip', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    direction,
    layer,
    frame,
  } = body as {
    canvas: string;
    direction: 'h' | 'v';
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = direction === 'h' ? flipBufferH(buffer) : flipBufferV(buffer);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({
    operation: `flip-${direction}`,
    canvasName,
    layerId,
    frameId,
    beforeBuffer: before,
  });

  return c.json({ success: true, operation: `flip-${direction}`, canvas: canvasName });
});

transformRoutes.post('/transform/rotate', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    turns,
    layer,
    frame,
  } = body as {
    canvas: string;
    turns: 1 | 2 | 3;
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = rotateBuffer90(buffer, turns);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({ operation: 'rotate', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'rotate', canvas: canvasName });
});

transformRoutes.post('/transform/brightness', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    amount,
    layer,
    frame,
  } = body as {
    canvas: string;
    amount: number;
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = adjustBrightness(buffer, amount);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({
    operation: 'brightness',
    canvasName,
    layerId,
    frameId,
    beforeBuffer: before,
  });

  return c.json({ success: true, operation: 'brightness', canvas: canvasName });
});

transformRoutes.post('/transform/contrast', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    amount,
    layer,
    frame,
  } = body as {
    canvas: string;
    amount: number;
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = adjustContrast(buffer, amount);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({ operation: 'contrast', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'contrast', canvas: canvasName });
});

transformRoutes.post('/transform/invert', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    layer,
    frame,
  } = body as { canvas: string; layer?: string; frame?: string };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = invertColors(buffer);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({ operation: 'invert', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'invert', canvas: canvasName });
});

transformRoutes.post('/transform/desaturate', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    amount,
    layer,
    frame,
  } = body as {
    canvas: string;
    amount: number;
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = desaturate(buffer, amount);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({
    operation: 'desaturate',
    canvasName,
    layerId,
    frameId,
    beforeBuffer: before,
  });

  return c.json({ success: true, operation: 'desaturate', canvas: canvasName });
});

transformRoutes.post('/transform/hue-shift', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    degrees,
    layer,
    frame,
  } = body as {
    canvas: string;
    degrees: number;
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = hueShift(buffer, degrees);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({ operation: 'hue-shift', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'hue-shift', canvas: canvasName });
});

transformRoutes.post('/transform/posterize', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    levels,
    layer,
    frame,
  } = body as {
    canvas: string;
    levels: number;
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result = posterize(buffer, levels);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({ operation: 'posterize', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'posterize', canvas: canvasName });
});

transformRoutes.post('/transform/scale', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    width,
    height,
    method,
    layer,
    frame,
  } = body as {
    canvas: string;
    width: number;
    height: number;
    method: 'nearest' | 'bilinear';
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const result =
    method === 'bilinear'
      ? scaleBufferBilinear(buffer, width, height)
      : scaleBufferNearest(buffer, width, height);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({ operation: 'scale', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'scale', canvas: canvasName, width, height });
});

transformRoutes.post('/transform/dither', async (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');
  const body = await c.req.json();
  const {
    canvas: canvasName,
    palette,
    method,
    matrixSize,
    layer,
    frame,
  } = body as {
    canvas: string;
    palette: string[];
    method: 'ordered' | 'floyd-steinberg';
    matrixSize?: 2 | 4 | 8;
    layer?: string;
    frame?: string;
  };

  const { layerId, frameId } = resolveTarget(projectPath, canvasName, layer, frame);
  const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
  const before = buffer.clone();
  const paletteRGBA = palette.map((hex) => hexToRGBA(hex));
  const result = ditherBuffer(buffer, paletteRGBA, method, matrixSize);
  writeLayerFrame(projectPath, canvasName, layerId, frameId, result);
  historyStack.push({ operation: 'dither', canvasName, layerId, frameId, beforeBuffer: before });

  return c.json({ success: true, operation: 'dither', canvas: canvasName });
});
