import { Hono } from 'hono';
import { readCanvasJSON, writeCanvasJSON, generateSequentialId } from '@pixelcreator/core';
import type { EffectType, EffectParams } from '@pixelcreator/core';

export const effectRoutes = new Hono<{ Variables: { projectPath: string } }>();

effectRoutes.get('/canvas/:name/layer/:id/effects', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const layer = canvas.layers.find(l => l.id === layerId);
    if (!layer) return c.json({ error: 'Layer not found' }, 404);
    return c.json({ effects: layer.effects ?? [] });
  } catch {
    return c.json({ error: 'Canvas not found' }, 404);
  }
});

effectRoutes.post('/canvas/:name/layer/:id/effect', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');
  const body = await c.req.json();
  const { type, params, enabled } = body as { type: string; params: Record<string, unknown>; enabled?: boolean };

  if (!type || !['drop-shadow', 'outer-glow', 'outline', 'color-overlay'].includes(type)) {
    return c.json({ error: 'Invalid effect type' }, 400);
  }

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const layer = canvas.layers.find(l => l.id === layerId);
    if (!layer) return c.json({ error: 'Layer not found' }, 404);

    if (!layer.effects) layer.effects = [];
    const effectId = generateSequentialId('effect', layer.effects.length + 1);
    const effect = {
      id: effectId,
      type: type as EffectType,
      enabled: enabled ?? true,
      params: params as unknown as EffectParams,
    };
    layer.effects.push(effect);
    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json({ success: true, effect });
  } catch {
    return c.json({ error: 'Canvas not found' }, 404);
  }
});

effectRoutes.put('/canvas/:name/layer/:id/effect/:effectId', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');
  const effectId = c.req.param('effectId');
  const body = await c.req.json();

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const layer = canvas.layers.find(l => l.id === layerId);
    if (!layer) return c.json({ error: 'Layer not found' }, 404);

    const effect = layer.effects?.find(e => e.id === effectId);
    if (!effect) return c.json({ error: 'Effect not found' }, 404);

    if (body.params) Object.assign(effect.params, body.params);
    if (body.enabled !== undefined) effect.enabled = body.enabled;

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json({ success: true, effect });
  } catch {
    return c.json({ error: 'Canvas not found' }, 404);
  }
});

effectRoutes.delete('/canvas/:name/layer/:id/effect/:effectId', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');
  const effectId = c.req.param('effectId');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const layer = canvas.layers.find(l => l.id === layerId);
    if (!layer) return c.json({ error: 'Layer not found' }, 404);

    const idx = layer.effects?.findIndex(e => e.id === effectId) ?? -1;
    if (idx === -1) return c.json({ error: 'Effect not found' }, 404);

    layer.effects!.splice(idx, 1);
    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json({ success: true, id: effectId });
  } catch {
    return c.json({ error: 'Canvas not found' }, 404);
  }
});

effectRoutes.put('/canvas/:name/layer/:id/effect/:effectId/toggle', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const layerId = c.req.param('id');
  const effectId = c.req.param('effectId');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const layer = canvas.layers.find(l => l.id === layerId);
    if (!layer) return c.json({ error: 'Layer not found' }, 404);

    const effect = layer.effects?.find(e => e.id === effectId);
    if (!effect) return c.json({ error: 'Effect not found' }, 404);

    effect.enabled = !effect.enabled;
    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json({ success: true, effect });
  } catch {
    return c.json({ error: 'Canvas not found' }, 404);
  }
});
