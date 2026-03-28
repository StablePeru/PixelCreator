import { Hono } from 'hono';
import type { AgentBridge } from '../agent-bridge.js';
import type { HistoryStack } from '../../history/history-stack.js';
import type { OperationFeedback } from '@pixelcreator/core';

const AVAILABLE_COMMANDS = [
  { method: 'POST', path: '/api/draw/pixel', description: 'Draw single pixel', fields: ['canvas', 'x', 'y', 'color'] },
  { method: 'POST', path: '/api/draw/line', description: 'Draw line', fields: ['canvas', 'x1', 'y1', 'x2', 'y2', 'color'] },
  { method: 'POST', path: '/api/draw/rect', description: 'Draw rectangle', fields: ['canvas', 'x', 'y', 'width', 'height', 'color', 'fill'] },
  { method: 'POST', path: '/api/draw/circle', description: 'Draw circle', fields: ['canvas', 'cx', 'cy', 'radius', 'color', 'fill'] },
  { method: 'POST', path: '/api/draw/ellipse', description: 'Draw ellipse', fields: ['canvas', 'cx', 'cy', 'rx', 'ry', 'color', 'fill'] },
  { method: 'POST', path: '/api/draw/fill', description: 'Flood fill', fields: ['canvas', 'x', 'y', 'color'] },
  { method: 'POST', path: '/api/draw/polygon', description: 'Draw polygon', fields: ['canvas', 'points', 'color', 'fill'] },
  { method: 'POST', path: '/api/draw/gradient', description: 'Linear gradient', fields: ['canvas', 'x1', 'y1', 'x2', 'y2', 'from', 'to'] },
  { method: 'POST', path: '/api/draw/radial-gradient', description: 'Radial gradient', fields: ['canvas', 'cx', 'cy', 'radius', 'from', 'to'] },
  { method: 'POST', path: '/api/draw/bezier', description: 'Bezier curve', fields: ['canvas', 'points', 'color'] },
  { method: 'POST', path: '/api/draw/outline', description: 'Auto outline', fields: ['canvas', 'color'] },
  { method: 'POST', path: '/api/draw/stamp', description: 'Stamp brush', fields: ['canvas', 'x', 'y', 'color', 'size'] },
  { method: 'POST', path: '/api/transform/flip', description: 'Flip H/V', fields: ['canvas', 'direction'] },
  { method: 'POST', path: '/api/transform/rotate', description: 'Rotate 90/180/270', fields: ['canvas', 'turns'] },
  { method: 'POST', path: '/api/transform/brightness', description: 'Adjust brightness', fields: ['canvas', 'amount'] },
  { method: 'POST', path: '/api/transform/contrast', description: 'Adjust contrast', fields: ['canvas', 'amount'] },
  { method: 'POST', path: '/api/transform/invert', description: 'Invert colors', fields: ['canvas'] },
  { method: 'POST', path: '/api/transform/desaturate', description: 'Desaturate', fields: ['canvas', 'amount'] },
  { method: 'POST', path: '/api/transform/hue-shift', description: 'Hue shift', fields: ['canvas', 'degrees'] },
  { method: 'POST', path: '/api/select/rect', description: 'Select rectangle', fields: ['canvas', 'x', 'y', 'width', 'height'] },
  { method: 'POST', path: '/api/select/color', description: 'Select by color', fields: ['canvas', 'x', 'y'] },
  { method: 'POST', path: '/api/select/all', description: 'Select all', fields: ['canvas'] },
  { method: 'POST', path: '/api/select/none', description: 'Deselect', fields: ['canvas'] },
  { method: 'POST', path: '/api/clipboard/copy', description: 'Copy selection', fields: ['canvas'] },
  { method: 'POST', path: '/api/clipboard/cut', description: 'Cut selection', fields: ['canvas'] },
  { method: 'POST', path: '/api/clipboard/paste', description: 'Paste', fields: ['canvas'] },
  { method: 'POST', path: '/api/history/undo', description: 'Undo', fields: [] },
  { method: 'POST', path: '/api/history/redo', description: 'Redo', fields: [] },
];

export const agentRoutes = new Hono<{ Variables: { agentBridge: AgentBridge; projectPath: string; historyStack: HistoryStack } }>();

agentRoutes.get('/agent/log', (c) => {
  const bridge = c.get('agentBridge');
  return c.json(bridge.getLog());
});

agentRoutes.get('/agent/commands', (c) => {
  return c.json(AVAILABLE_COMMANDS);
});

// --- Agent Session endpoints ---

agentRoutes.get('/agent/session', (c) => {
  const bridge = c.get('agentBridge');
  const session = bridge.getSession();
  if (!session) return c.json({ status: 'idle', session: null });
  return c.json({ status: session.status, session });
});

agentRoutes.post('/agent/session/start', async (c) => {
  const bridge = c.get('agentBridge');
  const body = await c.req.json();
  const { canvas } = body as { canvas: string };

  if (!canvas) return c.json({ error: 'canvas name required' }, 400);

  try {
    const session = bridge.startSession(canvas);
    return c.json(session, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 409);
  }
});

agentRoutes.post('/agent/session/pause', (c) => {
  const bridge = c.get('agentBridge');
  try {
    const session = bridge.pauseSession();
    return c.json(session);
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

agentRoutes.post('/agent/session/resume', (c) => {
  const bridge = c.get('agentBridge');
  try {
    const session = bridge.resumeSession();
    return c.json(session);
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

agentRoutes.post('/agent/session/end', (c) => {
  const bridge = c.get('agentBridge');
  try {
    const summary = bridge.endSession();
    return c.json(summary);
  } catch (err) {
    return c.json({ error: String(err) }, 400);
  }
});

agentRoutes.post('/agent/session/approve/:operationId', (c) => {
  const bridge = c.get('agentBridge');
  const operationId = c.req.param('operationId');
  const ok = bridge.approveOperation(operationId);
  if (!ok) return c.json({ error: 'No pending operation with that ID' }, 404);
  return c.json({ approved: true, operationId });
});

agentRoutes.post('/agent/session/reject/:operationId', (c) => {
  const bridge = c.get('agentBridge');
  const historyStack = c.get('historyStack');
  const projectPath = c.get('projectPath');
  const operationId = c.req.param('operationId');

  const ok = bridge.rejectOperation(operationId);
  if (!ok) return c.json({ error: 'No pending operation with that ID' }, 404);

  // Auto-undo the last operation
  const undone = historyStack.undo(projectPath);
  return c.json({ rejected: true, operationId, undone: !!undone });
});

agentRoutes.post('/agent/session/feedback/:operationId', async (c) => {
  const bridge = c.get('agentBridge');
  const operationId = c.req.param('operationId');
  const body = await c.req.json();
  const { comment, tags, rating } = body as OperationFeedback;

  if (!rating || !['approve', 'reject'].includes(rating)) {
    return c.json({ error: 'rating (approve|reject) required' }, 400);
  }

  const ok = bridge.addOperationFeedback(operationId, { rating, comment, tags });
  if (!ok) return c.json({ error: 'Operation not found' }, 404);
  return c.json({ success: true, operationId });
});

agentRoutes.get('/agent/session/timeline', (c) => {
  const bridge = c.get('agentBridge');
  const session = bridge.getSession();
  if (!session) return c.json({ operations: [] });
  return c.json({ operations: session.operations });
});

agentRoutes.get('/agent/session/pending', (c) => {
  const bridge = c.get('agentBridge');
  const pending = bridge.getPendingOperation();
  return c.json({ pending });
});
