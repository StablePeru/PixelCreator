import { serve } from '@hono/node-server';
import { readProjectJSON } from '@pixelcreator/core';
import { createApp } from './app.js';
import { ProjectWatcher } from '../ws/watcher.js';
import { WsBroadcaster } from '../ws/handler.js';

export interface StudioOptions {
  projectPath: string;
  port?: number;
  onReady?: (url: string) => void;
}

export function startStudio(options: StudioOptions) {
  const { projectPath, port = 3000 } = options;

  const app = createApp(projectPath);

  const honoServer = serve({
    fetch: app.fetch,
    port,
  }, (info) => {
    const url = `http://localhost:${info.port}`;
    const project = readProjectJSON(projectPath);
    options.onReady?.(url);
    console.log(`PixelCreator Studio running at ${url}`);
    console.log(`  Project: ${project.name}`);
    console.log(`  Canvases: ${project.canvases.join(', ') || '(none)'}`);
    console.log(`  WebSocket: ws://localhost:${info.port}`);
    console.log('  Press Ctrl+C to stop');
  });

  // Attach WebSocket to the underlying Node.js http server
  const httpServer = honoServer as unknown as import('node:http').Server;
  const broadcaster = new WsBroadcaster(httpServer);

  // File watcher
  const watcher = new ProjectWatcher(projectPath);
  watcher.onEvent((event) => {
    broadcaster.handleWatcherEvent(event);
  });
  watcher.start();

  const cleanup = () => {
    watcher.stop();
    broadcaster.close();
    honoServer.close();
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  return { server: honoServer, watcher, broadcaster, cleanup };
}
