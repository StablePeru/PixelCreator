import { Hono } from 'hono';
import {
  readProjectJSON,
  writeProjectJSON,
  createDefaultPresets,
  createBrushMask,
  generateSequentialId,
  PixelBuffer,
  encodePNG,
} from '@pixelcreator/core';
import type { BrushPreset, BrushShape } from '@pixelcreator/core';
import { brushPresetCreateSchema } from '../../utils/validation.js';

export const brushRoutes = new Hono<{ Variables: { projectPath: string } }>();

brushRoutes.get('/brush/presets', (c) => {
  const projectPath = c.get('projectPath');
  const project = readProjectJSON(projectPath);
  const defaults = createDefaultPresets();
  const custom = project.settings?.brushPresets ?? [];
  return c.json({ presets: [...defaults, ...custom], defaultCount: defaults.length, customCount: custom.length });
});

brushRoutes.post('/brush/presets', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const parsed = brushPresetCreateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const project = readProjectJSON(projectPath);
  if (!project.settings.brushPresets) {
    project.settings.brushPresets = [];
  }

  const id = generateSequentialId('brush', project.settings.brushPresets.length + 9);
  const preset: BrushPreset = {
    id,
    name: parsed.data.name,
    size: parsed.data.size,
    shape: parsed.data.shape as BrushShape,
    pattern: parsed.data.pattern,
    spacing: parsed.data.spacing ?? 1,
    opacity: parsed.data.opacity ?? 255,
    pixelPerfect: parsed.data.pixelPerfect ?? false,
  };

  project.settings.brushPresets.push(preset);
  writeProjectJSON(projectPath, project);

  return c.json({ success: true, preset });
});

brushRoutes.delete('/brush/presets/:id', (c) => {
  const projectPath = c.get('projectPath');
  const id = c.req.param('id');

  const defaults = createDefaultPresets();
  if (defaults.some(d => d.id === id)) {
    return c.json({ error: 'Cannot delete built-in preset' }, 400);
  }

  const project = readProjectJSON(projectPath);
  const presets = project.settings?.brushPresets ?? [];
  const idx = presets.findIndex(p => p.id === id);
  if (idx === -1) return c.json({ error: 'Preset not found' }, 404);

  presets.splice(idx, 1);
  project.settings.brushPresets = presets;
  writeProjectJSON(projectPath, project);

  return c.json({ success: true, id });
});

brushRoutes.get('/brush/presets/:id/mask', (c) => {
  const projectPath = c.get('projectPath');
  const id = c.req.param('id');

  const project = readProjectJSON(projectPath);
  const defaults = createDefaultPresets();
  const custom = project.settings?.brushPresets ?? [];
  const preset = [...defaults, ...custom].find(p => p.id === id);
  if (!preset) return c.json({ error: 'Preset not found' }, 404);

  const mask = createBrushMask(preset);
  const h = mask.length;
  const w = mask[0]?.length ?? 0;
  const buffer = new PixelBuffer(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y][x]) {
        buffer.setPixel(x, y, { r: 255, g: 255, b: 255, a: 255 });
      }
    }
  }

  const png = encodePNG(buffer);
  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
});
