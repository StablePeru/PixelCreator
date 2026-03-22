import { Hono } from 'hono';
import { readCanvasJSON, writeCanvasJSON, validateTagRange } from '@pixelcreator/core';
import type { AnimationTag } from '@pixelcreator/core';

export const animationRoutes = new Hono<{ Variables: { projectPath: string } }>();

animationRoutes.get('/canvas/:name/tags', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    return c.json(canvas.animationTags);
  } catch {
    return c.json({ error: `Canvas "${canvasName}" not found` }, 404);
  }
});

animationRoutes.post('/canvas/:name/tag', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const body = await c.req.json();
  const { name, from, to, direction, repeat } = body as {
    name: string; from: number; to: number;
    direction?: string; repeat?: number;
  };

  if (!name || from === undefined || to === undefined) {
    return c.json({ error: 'name, from, to required' }, 400);
  }

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);

    if (canvas.animationTags.some((t) => t.name === name)) {
      return c.json({ error: `Tag "${name}" already exists` }, 409);
    }

    const tag: AnimationTag = {
      name,
      from,
      to,
      direction: (direction as AnimationTag['direction']) || 'forward',
      repeat: Math.max(1, repeat ?? 1),
    };

    const err = validateTagRange(tag, canvas.frames.length);
    if (err) return c.json({ error: err }, 400);

    canvas.animationTags.push(tag);
    writeCanvasJSON(projectPath, canvasName, canvas);

    return c.json(tag, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

animationRoutes.put('/canvas/:name/tag/:tagName', async (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const tagName = c.req.param('tagName');
  const body = await c.req.json();
  const updates = body as Partial<{ name: string; from: number; to: number; direction: string; repeat: number }>;

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const tag = canvas.animationTags.find((t) => t.name === tagName);
    if (!tag) return c.json({ error: `Tag "${tagName}" not found` }, 404);

    if (updates.name !== undefined) tag.name = updates.name;
    if (updates.from !== undefined) tag.from = updates.from;
    if (updates.to !== undefined) tag.to = updates.to;
    if (updates.direction !== undefined) tag.direction = updates.direction as AnimationTag['direction'];
    if (updates.repeat !== undefined) tag.repeat = Math.max(1, updates.repeat);

    const err = validateTagRange(tag, canvas.frames.length);
    if (err) return c.json({ error: err }, 400);

    writeCanvasJSON(projectPath, canvasName, canvas);
    return c.json(tag);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

animationRoutes.delete('/canvas/:name/tag/:tagName', (c) => {
  const projectPath = c.get('projectPath');
  const canvasName = c.req.param('name');
  const tagName = c.req.param('tagName');

  try {
    const canvas = readCanvasJSON(projectPath, canvasName);
    const idx = canvas.animationTags.findIndex((t) => t.name === tagName);
    if (idx === -1) return c.json({ error: `Tag "${tagName}" not found` }, 404);

    canvas.animationTags.splice(idx, 1);
    writeCanvasJSON(projectPath, canvasName, canvas);

    return c.json({ success: true, deleted: tagName });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
