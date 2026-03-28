import * as fs from 'node:fs';
import * as path from 'node:path';
import { Hono } from 'hono';
import {
  readPaletteJSON,
  writePaletteJSON,
  readProjectJSON,
  writeProjectJSON,
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  sortPaletteColors,
  generateRamp,
  generateAdvancedRamp,
  generateHueShiftRamp,
  applyPaletteSwap,
  ditherBufferToPalette,
  colorHarmony,
  hexToRGBA,
  rgbaToHex,
  flattenLayers,
  samplePixelColor,
} from '@pixelcreator/core';
import type {
  PaletteData,
  PaletteColor,
  LayerWithBuffer,
  HarmonyType,
  PaletteSortMode,
  RampInterpolation,
  DitherMode,
} from '@pixelcreator/core';

export const paletteRoutes = new Hono<{ Variables: { projectPath: string } }>();

paletteRoutes.get('/palette/:name', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  try {
    const palette = readPaletteJSON(projectPath, name);
    return c.json(palette);
  } catch {
    return c.json({ error: `Palette "${name}" not found` }, 404);
  }
});

paletteRoutes.post('/palette', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { name, colors } = body as { name: string; colors: string[] };

  if (!name || !colors || !Array.isArray(colors)) {
    return c.json({ error: 'name and colors[] required' }, 400);
  }

  const project = readProjectJSON(projectPath);
  if (project.palettes.includes(name)) {
    return c.json({ error: `Palette "${name}" already exists` }, 409);
  }

  const palette: PaletteData = {
    name,
    description: '',
    colors: colors.map((hex, i) => ({ index: i, hex, name: null, group: null })),
    constraints: { maxColors: 256, locked: false, allowAlpha: false },
    ramps: [],
  };

  writePaletteJSON(projectPath, palette);
  project.palettes.push(name);
  writeProjectJSON(projectPath, project);

  return c.json(palette, 201);
});

paletteRoutes.put('/palette/:name/colors', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const body = await c.req.json();
  const { colors } = body as { colors: PaletteColor[] };

  try {
    const palette = readPaletteJSON(projectPath, name);
    palette.colors = colors;
    writePaletteJSON(projectPath, palette);
    return c.json(palette);
  } catch {
    return c.json({ error: `Palette "${name}" not found` }, 404);
  }
});

paletteRoutes.post('/palette/:name/sort', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const body = await c.req.json();
  const { mode, reverse } = body as { mode: PaletteSortMode; reverse?: boolean };

  try {
    const palette = readPaletteJSON(projectPath, name);
    palette.colors = sortPaletteColors(palette.colors, mode, reverse ?? false);
    writePaletteJSON(projectPath, palette);
    return c.json(palette);
  } catch {
    return c.json({ error: `Palette "${name}" not found` }, 404);
  }
});

paletteRoutes.post('/palette/:name/ramp', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const body = await c.req.json();
  const { startHex, endHex, steps } = body as { startHex: string; endHex: string; steps: number };

  try {
    const rampColors = generateRamp(startHex, endHex, steps);
    return c.json({ colors: rampColors });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

paletteRoutes.get('/palette/:name/harmony', (c) => {
  const base = c.req.query('base');
  const type = (c.req.query('type') || 'complementary') as HarmonyType;

  if (!base) return c.json({ error: 'base query param required' }, 400);

  try {
    const rgba = hexToRGBA(base);
    const harmonies = colorHarmony(rgba, type);
    return c.json({ base, type, colors: harmonies.map(rgbaToHex) });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

paletteRoutes.delete('/palette/:name', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');

  try {
    const project = readProjectJSON(projectPath);
    const idx = project.palettes.indexOf(name);
    if (idx === -1) return c.json({ error: `Palette "${name}" not found` }, 404);

    const filePath = path.join(projectPath, 'palettes', `${name}.palette.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    project.palettes.splice(idx, 1);
    writeProjectJSON(projectPath, project);

    return c.json({ success: true, deleted: name });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

paletteRoutes.post('/palette/:name/ramp-advanced', async (c) => {
  const name = c.req.param('name');
  const body = await c.req.json();
  const {
    startHex,
    endHex,
    baseHex,
    steps,
    interpolation,
    hueShift,
    saturationShift,
    lightnessStart,
    lightnessEnd,
  } = body as {
    startHex?: string;
    endHex?: string;
    baseHex?: string;
    steps: number;
    interpolation: RampInterpolation;
    hueShift?: number;
    saturationShift?: number;
    lightnessStart?: number;
    lightnessEnd?: number;
  };

  try {
    if (!steps || steps <= 0) {
      return c.json({ error: 'steps must be a positive number' }, 400);
    }

    if (interpolation === 'hue-shift') {
      if (!baseHex) {
        return c.json({ error: 'baseHex is required for hue-shift interpolation' }, 400);
      }
      const colors = generateHueShiftRamp(baseHex, steps, {
        hueShift: hueShift ?? 60,
        saturationShift: saturationShift ?? 0.2,
        lightnessStart: lightnessStart ?? 0.2,
        lightnessEnd: lightnessEnd ?? 0.9,
      });
      return c.json({ colors });
    }

    if (!startHex || !endHex) {
      return c.json(
        { error: 'startHex and endHex are required for rgb/hsl/oklch interpolation' },
        400,
      );
    }
    const colors = generateAdvancedRamp(startHex, endHex, steps, interpolation);
    return c.json({ colors });
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

paletteRoutes.post('/palette/:name/swap', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const body = await c.req.json();
  const { canvasName, fromPalette, toPalette, layer, frame } = body as {
    canvasName: string;
    fromPalette: string;
    toPalette: string;
    layer?: string;
    frame?: string;
  };

  try {
    if (!canvasName || !fromPalette || !toPalette) {
      return c.json({ error: 'canvasName, fromPalette, and toPalette are required' }, 400);
    }

    const fromPaletteData = readPaletteJSON(projectPath, fromPalette);
    const toPaletteData = readPaletteJSON(projectPath, toPalette);
    const fromRGBA = fromPaletteData.colors.map((pc) => hexToRGBA(pc.hex));
    const toRGBA = toPaletteData.colors.map((pc) => hexToRGBA(pc.hex));

    const canvas = readCanvasJSON(projectPath, canvasName);
    const layers = layer
      ? canvas.layers.filter((l) => l.id === layer)
      : canvas.layers.filter((l) => l.type === 'normal');
    const frames = frame ? canvas.frames.filter((f) => f.id === frame) : canvas.frames;

    let framesUpdated = 0;
    for (const lay of layers) {
      for (const fr of frames) {
        const buffer = readLayerFrame(projectPath, canvasName, lay.id, fr.id);
        const swapped = applyPaletteSwap(buffer, fromRGBA, toRGBA);
        writeLayerFrame(projectPath, canvasName, lay.id, fr.id, swapped);
        framesUpdated++;
      }
    }

    return c.json({ success: true, framesUpdated });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

paletteRoutes.post('/palette/:name/dither', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const body = await c.req.json();
  const {
    canvasName,
    layer: layerId,
    frame: frameId,
    mode,
  } = body as {
    canvasName: string;
    layer: string;
    frame: string;
    mode: DitherMode;
  };

  try {
    if (!canvasName || !layerId || !frameId || !mode) {
      return c.json({ error: 'canvasName, layer, frame, and mode are required' }, 400);
    }

    const palette = readPaletteJSON(projectPath, name);
    const paletteRGBA = palette.colors.map((pc) => hexToRGBA(pc.hex));

    const buffer = readLayerFrame(projectPath, canvasName, layerId, frameId);
    const dithered = ditherBufferToPalette(buffer, paletteRGBA, mode);
    writeLayerFrame(projectPath, canvasName, layerId, frameId, dithered);

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
