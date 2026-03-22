import { Hono } from 'hono';
import type { AgentBridge } from '../agent-bridge.js';

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

export const agentRoutes = new Hono<{ Variables: { agentBridge: AgentBridge } }>();

agentRoutes.get('/agent/log', (c) => {
  const bridge = c.get('agentBridge');
  return c.json(bridge.getLog());
});

agentRoutes.get('/agent/commands', (c) => {
  return c.json(AVAILABLE_COMMANDS);
});

// Note: Command execution is done directly via the existing API endpoints
// The CommandPalette frontend calls POST /api/draw/*, /api/transform/*, etc. directly
