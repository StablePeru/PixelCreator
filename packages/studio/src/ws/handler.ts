import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'node:http';
import type { WatcherEvent } from './watcher.js';

export interface WsMessage {
  event: string;
  data: unknown;
  timestamp: number;
}

export class WsBroadcaster {
  private clients = new Set<WebSocket>();
  private wss: WebSocketServer;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });
  }

  get clientCount(): number {
    return this.clients.size;
  }

  broadcast(event: string, data: unknown): void {
    const msg: WsMessage = { event, data, timestamp: Date.now() };
    const json = JSON.stringify(msg);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    }
  }

  sendTo(ws: WebSocket, event: string, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data, timestamp: Date.now() }));
    }
  }

  handleWatcherEvent(event: WatcherEvent): void {
    if (event.type === 'canvas:updated' || event.type === 'validation:updated') {
      this.broadcast(event.type, { canvasName: event.canvasName });
    } else {
      this.broadcast(event.type, {});
    }
  }

  close(): void {
    for (const client of this.clients) client.close();
    this.clients.clear();
    this.wss.close();
  }
}
