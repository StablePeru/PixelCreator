import { Hono } from 'hono';
import {
  readCanvasJSON,
  readPaletteJSON,
  readLayerFrame,
  flattenLayers,
  simulateBufferColorBlindness,
  checkContrast,
  hexToRGBA,
  analyzePaletteAccessibility,
  encodePNG,
} from '@pixelcreator/core';
import type { LayerWithBuffer, VisionDeficiency } from '@pixelcreator/core';

const VALID_DEFICIENCIES = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

export const accessibilityRoutes = new Hono<{ Variables: { projectPath: string } }>();

accessibilityRoutes.post('/accessibility/simulate', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { canvas: canvasName, deficiency, frame } = body as { canvas: string; deficiency: string; frame?: number };

  if (!canvasName) return c.json({ error: 'canvas required' }, 400);
  if (!deficiency || !VALID_DEFICIENCIES.includes(deficiency)) {
    return c.json({ error: 'Invalid deficiency. Use: protanopia, deuteranopia, tritanopia, achromatopsia' }, 400);
  }

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const frameIdx = frame ?? 0;
    const frameInfo = canvas.frames[frameIdx];
    if (!frameInfo) return c.json({ error: 'Frame not found' }, 404);

    const layersWithBuffers: LayerWithBuffer[] = canvas.layers
      .filter(l => l.type !== 'reference')
      .map(l => ({
        info: l,
        buffer: readLayerFrame(projectPath, canvasName, l.id, frameInfo.id),
      }));

    const flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
    const simulated = simulateBufferColorBlindness(flattened, deficiency as VisionDeficiency);
    const png = encodePNG(simulated);
    const base64 = Buffer.from(png).toString('base64');

    return c.json({ success: true, width: canvas.width, height: canvas.height, deficiency, imageData: base64 });
  } catch {
    return c.json({ error: 'Canvas not found' }, 404);
  }
});

accessibilityRoutes.post('/accessibility/contrast', async (c) => {
  const body = await c.req.json();
  const { foreground, background } = body as { foreground: string; background: string };

  if (!foreground || !background) return c.json({ error: 'foreground and background required' }, 400);

  try {
    const fg = hexToRGBA(foreground);
    const bg = hexToRGBA(background);
    const result = checkContrast(fg, bg);
    return c.json(result);
  } catch {
    return c.json({ error: 'Invalid hex color' }, 400);
  }
});

accessibilityRoutes.get('/palette/:name/accessibility', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const defFilter = c.req.query('deficiencies');

  try {
    const palette = readPaletteJSON(projectPath, name);
    const deficiencies = defFilter
      ? defFilter.split(',').filter(d => VALID_DEFICIENCIES.includes(d)) as VisionDeficiency[]
      : undefined;
    const report = analyzePaletteAccessibility(palette, deficiencies);
    return c.json(report);
  } catch {
    return c.json({ error: `Palette "${name}" not found` }, 404);
  }
});
