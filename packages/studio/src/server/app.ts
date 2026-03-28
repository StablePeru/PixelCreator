import * as fs from 'node:fs';
import * as path from 'node:path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { projectRoutes } from './routes/project.js';
import { canvasRoutes } from './routes/canvas.js';
import { drawRoutes } from './routes/draw.js';
import { paletteRoutes } from './routes/palette.js';
import { historyRoutes } from './routes/history.js';
import { layerRoutes } from './routes/layer.js';
import { frameRoutes } from './routes/frame.js';
import { animationRoutes } from './routes/animation.js';
import { selectionRoutes } from './routes/selection.js';
import { clipboardRoutes } from './routes/clipboard.js';
import { transformRoutes } from './routes/transform.js';
import { exportRoutes } from './routes/export.js';
import { importRoutes } from './routes/import.js';
import { tilesetRoutes } from './routes/tileset.js';
import { agentRoutes } from './routes/agent.js';
import { datasetRoutes } from './routes/dataset.js';
import { brushRoutes } from './routes/brush.js';
import { guideRoutes } from './routes/guide.js';
import { effectRoutes } from './routes/effect.js';
import { accessibilityRoutes } from './routes/accessibility.js';
import { generateRoutes } from './routes/generate.js';
import { gamedevRoutes } from './routes/gamedev.js';
import { HistoryStack } from '../history/history-stack.js';
import { AgentBridge } from './agent-bridge.js';
import { FrameCache } from './frame-cache.js';

export interface AppOptions {
  historyStack?: HistoryStack;
  agentBridge?: AgentBridge;
  frameCache?: FrameCache;
}

export function createApp(projectPath: string, options: AppOptions = {}) {
  const historyStack = options.historyStack ?? new HistoryStack();
  const agentBridge = options.agentBridge ?? new AgentBridge();
  const frameCache = options.frameCache ?? new FrameCache();

  const app = new Hono<{ Variables: { projectPath: string; historyStack: HistoryStack; agentBridge: AgentBridge } }>();

  app.use('*', cors());

  app.use('/api/*', async (c, next) => {
    c.set('projectPath', projectPath);
    c.set('historyStack', historyStack);
    c.set('agentBridge', agentBridge);
    await next();
  });

  // Command logging middleware for draw/transform operations.
  // When an agent session is paused, draw operations are queued for approval.
  app.use('/api/draw/*', async (c, next) => {
    const start = Date.now();
    const command = `draw:${c.req.path.split('/').pop()}`;

    // If agent session is paused, register and wait for approval
    if (agentBridge.getSessionStatus() === 'paused' && c.req.method === 'POST') {
      let args: Record<string, unknown> = {};
      try { args = await c.req.json(); } catch { /* empty */ }

      const approved = await agentBridge.registerOperation(command, args);
      if (!approved) {
        return c.json({ blocked: true, reason: 'Operation rejected by user' }, 403);
      }
      // Re-create request body since it was consumed
      const newReq = new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers: c.req.raw.headers,
        body: JSON.stringify(args),
      });
      Object.defineProperty(c, 'req', { value: c.newRequest(newReq) });
    } else if (agentBridge.isSessionActive() && c.req.method === 'POST') {
      // Running mode — register as auto-approved
      let args: Record<string, unknown> = {};
      try {
        const cloned = c.req.raw.clone();
        args = await cloned.json();
      } catch { /* empty */ }
      await agentBridge.registerOperation(command, args);
    }

    await next();
    agentBridge.logCommand({
      operation: command,
      success: c.res.status < 400,
      source: 'api',
      duration: Date.now() - start,
    });
  });

  app.use('/api/transform/*', async (c, next) => {
    const start = Date.now();
    const command = `transform:${c.req.path.split('/').pop()}`;

    if (agentBridge.getSessionStatus() === 'paused' && c.req.method === 'POST') {
      let args: Record<string, unknown> = {};
      try { args = await c.req.json(); } catch { /* empty */ }

      const approved = await agentBridge.registerOperation(command, args);
      if (!approved) {
        return c.json({ blocked: true, reason: 'Operation rejected by user' }, 403);
      }
      const newReq = new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers: c.req.raw.headers,
        body: JSON.stringify(args),
      });
      Object.defineProperty(c, 'req', { value: c.newRequest(newReq) });
    } else if (agentBridge.isSessionActive() && c.req.method === 'POST') {
      let args: Record<string, unknown> = {};
      try {
        const cloned = c.req.raw.clone();
        args = await cloned.json();
      } catch { /* empty */ }
      await agentBridge.registerOperation(command, args);
    }

    await next();
    agentBridge.logCommand({
      operation: command,
      success: c.res.status < 400,
      source: 'api',
      duration: Date.now() - start,
    });
  });

  app.route('/api', projectRoutes);
  app.route('/api', canvasRoutes);
  app.route('/api', drawRoutes);
  app.route('/api', paletteRoutes);
  app.route('/api', historyRoutes);
  app.route('/api', layerRoutes);
  app.route('/api', frameRoutes);
  app.route('/api', animationRoutes);
  app.route('/api', selectionRoutes);
  app.route('/api', clipboardRoutes);
  app.route('/api', transformRoutes);
  app.route('/api', exportRoutes);
  app.route('/api', importRoutes);
  app.route('/api', tilesetRoutes);
  app.route('/api', agentRoutes);
  app.route('/api', datasetRoutes);
  app.route('/api', brushRoutes);
  app.route('/api', guideRoutes);
  app.route('/api', effectRoutes);
  app.route('/api', accessibilityRoutes);
  app.route('/api', generateRoutes);
  app.route('/api', gamedevRoutes);

  app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

  // Serve frontend static files in production
  const baseDir = import.meta.dirname || '.';
  const publicCandidates = [
    path.resolve(baseDir, '..', 'public'),
    path.resolve(baseDir, 'public'),
    path.resolve(baseDir, '..', 'dist', 'public'),
  ];
  const publicDir = publicCandidates.find(d => fs.existsSync(d)) || publicCandidates[0];
  if (fs.existsSync(publicDir)) {
    app.use('/*', serveStatic({ root: path.relative(process.cwd(), publicDir) }));

    app.get('*', (c) => {
      const indexPath = path.join(publicDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf-8');
        return c.html(html);
      }
      return c.text('PixelCreator Studio — run "pnpm build:web" to build the frontend', 404);
    });
  }

  return app;
}
