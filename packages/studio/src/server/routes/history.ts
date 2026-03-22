import { Hono } from 'hono';
import type { HistoryStack } from '../../history/history-stack.js';

export const historyRoutes = new Hono<{ Variables: { projectPath: string; historyStack: HistoryStack } }>();

historyRoutes.post('/history/undo', (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');

  const entry = historyStack.undo(projectPath);
  if (!entry) return c.json({ success: false, error: 'Nothing to undo' }, 400);

  return c.json({
    success: true,
    operation: entry.operation,
    canvas: entry.canvasName,
  });
});

historyRoutes.post('/history/redo', (c) => {
  const projectPath = c.get('projectPath');
  const historyStack = c.get('historyStack');

  const entry = historyStack.redo(projectPath);
  if (!entry) return c.json({ success: false, error: 'Nothing to redo' }, 400);

  return c.json({
    success: true,
    operation: entry.operation,
    canvas: entry.canvasName,
  });
});

historyRoutes.get('/history/status', (c) => {
  const historyStack = c.get('historyStack');
  return c.json(historyStack.status());
});
