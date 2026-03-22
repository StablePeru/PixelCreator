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

  // Command logging middleware for draw/transform/select/clipboard operations
  app.use('/api/draw/*', async (c, next) => {
    const start = Date.now();
    await next();
    agentBridge.logCommand({
      operation: `draw:${c.req.path.split('/').pop()}`,
      success: c.res.status < 400,
      source: 'api',
      duration: Date.now() - start,
    });
  });

  app.use('/api/transform/*', async (c, next) => {
    const start = Date.now();
    await next();
    agentBridge.logCommand({
      operation: `transform:${c.req.path.split('/').pop()}`,
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

  app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

  // Serve frontend static files in production
  const publicDir = path.resolve(import.meta.dirname || '.', '..', 'public');
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
