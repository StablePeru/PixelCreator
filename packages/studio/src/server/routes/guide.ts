import { Hono } from 'hono';
import {
  readCanvasJSON,
  writeCanvasJSON,
  createDefaultGuideConfig,
  createGuide,
  removeGuide,
  moveGuide,
} from '@pixelcreator/core';
import type { GuideOrientation } from '@pixelcreator/core';

export const guideRoutes = new Hono<{ Variables: { projectPath: string } }>();

guideRoutes.get('/canvas/:name/guides', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  try {
    const canvas = readCanvasJSON(projectPath, name);
    const config = canvas.guides ?? createDefaultGuideConfig();
    return c.json(config);
  } catch {
    return c.json({ error: `Canvas "${name}" not found` }, 404);
  }
});

guideRoutes.post('/canvas/:name/guides', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const body = await c.req.json();
  const { orientation, position, color } = body as { orientation: string; position: number; color?: string };

  if (!orientation || !['horizontal', 'vertical'].includes(orientation)) {
    return c.json({ error: 'orientation must be "horizontal" or "vertical"' }, 400);
  }
  if (typeof position !== 'number') {
    return c.json({ error: 'position must be a number' }, 400);
  }

  try {
    const canvas = readCanvasJSON(projectPath, name);
    const config = canvas.guides ?? createDefaultGuideConfig();
    const updated = createGuide(config, orientation as GuideOrientation, position, color);
    canvas.guides = updated;
    writeCanvasJSON(projectPath, name, canvas);
    const newGuide = updated.guides[updated.guides.length - 1];
    return c.json({ success: true, guide: newGuide });
  } catch {
    return c.json({ error: `Canvas "${name}" not found` }, 404);
  }
});

// Config endpoint MUST be before :id to avoid "config" being captured as an ID
guideRoutes.put('/canvas/:name/guides/config', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const body = await c.req.json();

  try {
    const canvas = readCanvasJSON(projectPath, name);
    const config = canvas.guides ?? createDefaultGuideConfig();
    if (body.snapEnabled !== undefined) config.snapEnabled = body.snapEnabled;
    if (body.snapThreshold !== undefined) config.snapThreshold = body.snapThreshold;
    if (body.visible !== undefined) config.visible = body.visible;
    canvas.guides = config;
    writeCanvasJSON(projectPath, name, canvas);
    return c.json({ success: true, config });
  } catch {
    return c.json({ error: `Canvas "${name}" not found` }, 404);
  }
});

guideRoutes.put('/canvas/:name/guides/:id', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const guideId = c.req.param('id');
  const body = await c.req.json();
  const { position } = body as { position: number };

  try {
    const canvas = readCanvasJSON(projectPath, name);
    const config = canvas.guides ?? createDefaultGuideConfig();
    if (!config.guides.some(g => g.id === guideId)) {
      return c.json({ error: 'Guide not found' }, 404);
    }
    canvas.guides = moveGuide(config, guideId, position);
    writeCanvasJSON(projectPath, name, canvas);
    return c.json({ success: true, id: guideId, position });
  } catch {
    return c.json({ error: `Canvas "${name}" not found` }, 404);
  }
});

guideRoutes.delete('/canvas/:name/guides/:id', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const guideId = c.req.param('id');

  try {
    const canvas = readCanvasJSON(projectPath, name);
    const config = canvas.guides ?? createDefaultGuideConfig();
    if (!config.guides.some(g => g.id === guideId)) {
      return c.json({ error: 'Guide not found' }, 404);
    }
    canvas.guides = removeGuide(config, guideId);
    writeCanvasJSON(projectPath, name, canvas);
    return c.json({ success: true, id: guideId });
  } catch {
    return c.json({ error: `Canvas "${name}" not found` }, 404);
  }
});
