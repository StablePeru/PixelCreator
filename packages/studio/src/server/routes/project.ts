import { Hono } from 'hono';
import { readProjectJSON, writeProjectJSON, initProjectStructure } from '@pixelcreator/core';

export const projectRoutes = new Hono<{ Variables: { projectPath: string } }>();

projectRoutes.get('/project', (c) => {
  const projectPath = c.get('projectPath');
  const project = readProjectJSON(projectPath);
  return c.json(project);
});

projectRoutes.get('/project/canvases', (c) => {
  const projectPath = c.get('projectPath');
  const project = readProjectJSON(projectPath);
  return c.json(project.canvases);
});

projectRoutes.get('/project/palettes', (c) => {
  const projectPath = c.get('projectPath');
  const project = readProjectJSON(projectPath);
  return c.json(project.palettes);
});

projectRoutes.post('/project/init', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { name } = body as { name?: string };
  if (!name) return c.json({ error: 'name required' }, 400);

  try {
    initProjectStructure(projectPath, name);
    const project = readProjectJSON(projectPath);
    return c.json({ success: true, project }, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

projectRoutes.get('/project/preferences', (c) => {
  const projectPath = c.get('projectPath');
  const project = readProjectJSON(projectPath);
  return c.json(project.settings?.preferences ?? {});
});

projectRoutes.put('/project/preferences', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();

  const project = readProjectJSON(projectPath);
  if (!project.settings.preferences) {
    project.settings.preferences = {
      showGrid: true, gridSize: 1, showGuides: true, snapToGuide: true,
      snapThreshold: 4, defaultCanvasWidth: 32, defaultCanvasHeight: 32, defaultBackground: null,
    };
  }
  Object.assign(project.settings.preferences, body);
  writeProjectJSON(projectPath, project);

  return c.json({ success: true, preferences: project.settings.preferences });
});
