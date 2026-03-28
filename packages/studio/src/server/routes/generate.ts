import { Hono } from 'hono';
import {
  readCanvasJSON, readLayerFrame, writeLayerFrame,
  generateSimplexNoise, generateFbm, generateTurbulence,
  generateCheckerboard, generateStripes, generateGridDots, generateBrick,
  generateNoiseMap, mapNoiseToPixels,
  PixelBuffer, encodePNG,
} from '@pixelcreator/core';
import type { HistoryStack } from '../../history/history-stack.js';

export const generateRoutes = new Hono<{ Variables: { projectPath: string; historyStack: HistoryStack } }>();

function resolveLayerAndFrame(projectPath: string, canvasName: string, layerId?: string, frameId?: string) {
  const canvas = readCanvasJSON(projectPath, canvasName);
  const resolved = layerId || canvas.layers[0]?.id;
  const resolvedFrame = frameId || canvas.frames[0]?.id;
  if (!resolved || !resolvedFrame) throw new Error('Canvas has no layers or frames');
  return { canvas, layerId: resolved, frameId: resolvedFrame };
}

generateRoutes.post('/generate/noise', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { canvas: canvasName, type, seed, scale, octaves, lacunarity, persistence, mapping, layer, frame } = body;

  if (!canvasName) return c.json({ error: 'canvas required' }, 400);

  try {
    const { canvas, layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
    const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
    const noiseOpts = { seed: seed ?? Date.now(), scale: scale ?? 0.1, octaves: octaves ?? 4, lacunarity: lacunarity ?? 2, persistence: persistence ?? 0.5 };
    const mapOpts = mapping ?? { mode: 'grayscale' };

    if (type === 'fbm') generateFbm(buffer, noiseOpts, mapOpts);
    else if (type === 'turbulence') generateTurbulence(buffer, noiseOpts, mapOpts);
    else generateSimplexNoise(buffer, noiseOpts, mapOpts);

    writeLayerFrame(projectPath, canvasName, layerId, frameId, buffer);
    return c.json({ success: true, operation: 'noise', canvas: canvasName, type: type ?? 'simplex' });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

generateRoutes.post('/generate/pattern', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { canvas: canvasName, type, options, layer, frame } = body;

  if (!canvasName || !type) return c.json({ error: 'canvas and type required' }, 400);

  try {
    const { canvas, layerId, frameId } = resolveLayerAndFrame(projectPath, canvasName, layer, frame);
    const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);

    switch (type) {
      case 'checkerboard': generateCheckerboard(buffer, options); break;
      case 'stripes': generateStripes(buffer, options); break;
      case 'grid-dots': generateGridDots(buffer, options); break;
      case 'brick': generateBrick(buffer, options); break;
      default: return c.json({ error: `Unknown pattern type: ${type}` }, 400);
    }

    writeLayerFrame(projectPath, canvasName, layerId, frameId, buffer);
    return c.json({ success: true, operation: 'pattern', canvas: canvasName, type });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

generateRoutes.post('/generate/preview', async (c) => {
  const body = await c.req.json();
  const { width, height, type, seed, scale, octaves, lacunarity, persistence, mapping } = body;
  const w = width ?? 64;
  const h = height ?? 64;

  const buffer = new PixelBuffer(w, h);
  const noiseOpts = { seed: seed ?? 42, scale: scale ?? 0.1, octaves: octaves ?? 4, lacunarity: lacunarity ?? 2, persistence: persistence ?? 0.5 };
  const mapOpts = mapping ?? { mode: 'grayscale' };

  if (type === 'fbm') generateFbm(buffer, noiseOpts, mapOpts);
  else if (type === 'turbulence') generateTurbulence(buffer, noiseOpts, mapOpts);
  else generateSimplexNoise(buffer, noiseOpts, mapOpts);

  const png = encodePNG(buffer);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
});
