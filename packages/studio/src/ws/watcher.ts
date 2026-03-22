import * as fs from 'node:fs';
import * as path from 'node:path';

export type WatcherEvent =
  | { type: 'canvas:updated'; canvasName: string }
  | { type: 'project:changed' };

export class ProjectWatcher {
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private watchers: fs.FSWatcher[] = [];
  private listener: ((event: WatcherEvent) => void) | null = null;

  constructor(
    private projectPath: string,
    private debounceMs = 200,
  ) {}

  onEvent(listener: (event: WatcherEvent) => void): void {
    this.listener = listener;
  }

  start(): void {
    const canvasesDir = path.join(this.projectPath, 'canvases');
    const projectFile = path.join(this.projectPath, 'project.json');

    if (fs.existsSync(canvasesDir)) {
      const watcher = fs.watch(canvasesDir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        const canvasName = filename.split(/[/\\]/)[0];
        if (!canvasName) return;

        const key = `canvas:${canvasName}`;
        const existing = this.debounceTimers.get(key);
        if (existing) clearTimeout(existing);

        this.debounceTimers.set(
          key,
          setTimeout(() => {
            this.debounceTimers.delete(key);
            this.listener?.({ type: 'canvas:updated', canvasName });
          }, this.debounceMs),
        );
      });
      this.watchers.push(watcher);
    }

    if (fs.existsSync(projectFile)) {
      const watcher = fs.watch(projectFile, () => {
        const key = 'project';
        const existing = this.debounceTimers.get(key);
        if (existing) clearTimeout(existing);

        this.debounceTimers.set(
          key,
          setTimeout(() => {
            this.debounceTimers.delete(key);
            this.listener?.({ type: 'project:changed' });
          }, this.debounceMs),
        );
      });
      this.watchers.push(watcher);
    }
  }

  stop(): void {
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();
  }
}
