import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ProjectWatcher } from '../../src/ws/watcher.js';
import { initProjectStructure, createEmptyBuffer, writeLayerFrame, writeCanvasJSON, ensureCanvasStructure } from '@pixelcreator/core';
import type { CanvasData, WatcherEvent } from '../../src/ws/watcher.js';

let tmpDir: string;
let projectPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-watcher-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');

  // Create a canvas so canvases/ dir exists
  const canvas: CanvasData = {
    name: 'sprite',
    width: 8,
    height: 8,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', createEmptyBuffer(8, 8));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ProjectWatcher', () => {
  it('emits canvas:updated when a layer file changes', async () => {
    const events: WatcherEvent[] = [];
    const watcher = new ProjectWatcher(projectPath, 50);
    watcher.onEvent((e) => events.push(e));
    watcher.start();

    // Modify a layer file
    await new Promise((r) => setTimeout(r, 100));
    writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', createEmptyBuffer(8, 8));

    await new Promise((r) => setTimeout(r, 300));
    watcher.stop();

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.type === 'canvas:updated')).toBe(true);
  });

  it('can be started and stopped without errors', () => {
    const watcher = new ProjectWatcher(projectPath, 50);
    watcher.start();
    watcher.stop();
  });
});
