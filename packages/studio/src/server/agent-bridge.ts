import type { WsBroadcaster } from '../ws/handler.js';

export interface CommandLogEntry {
  id: string;
  timestamp: number;
  operation: string;
  canvas?: string;
  args?: Record<string, unknown>;
  success: boolean;
  source: 'api' | 'external';
  duration?: number;
}

export class AgentBridge {
  private log: CommandLogEntry[] = [];
  private maxLog = 200;
  private broadcaster: WsBroadcaster | null = null;

  setBroadcaster(broadcaster: WsBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  logCommand(entry: Omit<CommandLogEntry, 'id' | 'timestamp'>): CommandLogEntry {
    const full: CommandLogEntry = {
      ...entry,
      id: `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    this.log.push(full);
    if (this.log.length > this.maxLog) this.log.shift();

    this.broadcaster?.broadcast('agent:command-complete', full);
    return full;
  }

  logExternalChange(canvasName: string): void {
    this.logCommand({
      operation: 'canvas:updated',
      canvas: canvasName,
      success: true,
      source: 'external',
    });
  }

  getLog(): CommandLogEntry[] {
    return [...this.log];
  }

  clear(): void {
    this.log.length = 0;
  }
}
