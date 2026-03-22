import { Hono } from 'hono';
import { readProjectJSON } from '@pixelcreator/core';

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
