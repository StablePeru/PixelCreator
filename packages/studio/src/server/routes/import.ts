import { Hono } from 'hono';
import {
  readProjectJSON,
  writeProjectJSON,
  writeCanvasJSON,
  writeLayerFrame,
  ensureCanvasStructure,
  decodePNG,
  decodeGif,
  PixelBuffer,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

export const importRoutes = new Hono<{ Variables: { projectPath: string } }>();

importRoutes.post('/import/png', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.parseBody();
  const file = body['file'];
  const name = (body['name'] as string) || 'imported';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'file required (multipart form-data)' }, 400);
  }

  try {
    const arrayBuf = await file.arrayBuffer();
    const buffer = decodePNG(Buffer.from(arrayBuf));

    const project = readProjectJSON(projectPath);
    if (project.canvases.includes(name)) {
      return c.json({ error: `Canvas "${name}" already exists` }, 409);
    }

    const now = new Date().toISOString();
    const canvas: CanvasData = {
      name,
      width: buffer.width,
      height: buffer.height,
      created: now,
      modified: now,
      palette: null,
      layers: [{ id: 'layer-001', name: 'imported', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
      frames: [{ id: 'frame-001', index: 0, duration: 100 }],
      animationTags: [],
    };

    ensureCanvasStructure(projectPath, name, canvas);
    writeCanvasJSON(projectPath, name, canvas);
    writeLayerFrame(projectPath, name, 'layer-001', 'frame-001', buffer);

    project.canvases.push(name);
    writeProjectJSON(projectPath, project);

    return c.json({ success: true, canvas: name, width: buffer.width, height: buffer.height }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

importRoutes.post('/import/gif', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.parseBody();
  const file = body['file'];
  const name = (body['name'] as string) || 'imported-gif';

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'file required' }, 400);
  }

  try {
    const arrayBuf = await file.arrayBuffer();
    const gifFrames = decodeGif(Buffer.from(arrayBuf));

    if (gifFrames.length === 0) return c.json({ error: 'No frames in GIF' }, 400);

    const project = readProjectJSON(projectPath);
    if (project.canvases.includes(name)) {
      return c.json({ error: `Canvas "${name}" already exists` }, 409);
    }

    const width = gifFrames[0].buffer.width;
    const height = gifFrames[0].buffer.height;
    const now = new Date().toISOString();

    const frames = gifFrames.map((f, i) => ({
      id: `frame-${String(i + 1).padStart(3, '0')}`,
      index: i,
      duration: f.duration || 100,
    }));

    const canvas: CanvasData = {
      name,
      width,
      height,
      created: now,
      modified: now,
      palette: null,
      layers: [{ id: 'layer-001', name: 'imported', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
      frames,
      animationTags: frames.length > 1
        ? [{ name: 'all', from: 0, to: frames.length - 1, direction: 'forward' as const, repeat: 1 }]
        : [],
    };

    ensureCanvasStructure(projectPath, name, canvas);
    writeCanvasJSON(projectPath, name, canvas);

    for (let i = 0; i < gifFrames.length; i++) {
      writeLayerFrame(projectPath, name, 'layer-001', frames[i].id, gifFrames[i].buffer);
    }

    project.canvases.push(name);
    writeProjectJSON(projectPath, project);

    return c.json({ success: true, canvas: name, width, height, frames: frames.length }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
