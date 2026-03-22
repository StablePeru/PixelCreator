import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  initProjectStructure,
  readProjectJSON,
  writeProjectJSON,
  writeCanvasJSON,
  createEmptyBuffer,
  writeLayerFrame,
  readLayerFrame,
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setupCanvas() {
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
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-history-api-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setupCanvas();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('history API integration', () => {
  it('GET /api/history/status returns initial state', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/history/status');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 });
  });

  it('draw pixel → undo → pixel gone → redo → pixel back', async () => {
    const app = createApp(projectPath);

    // Draw a red pixel
    const drawRes = await app.request('/api/draw/pixel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', x: 4, y: 4, color: '#ff0000' }),
    });
    expect(drawRes.status).toBe(200);

    // Verify pixel exists
    let buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(4, 4).r).toBe(255);

    // Check history status
    const statusRes = await app.request('/api/history/status');
    const status = await statusRes.json();
    expect(status.canUndo).toBe(true);
    expect(status.undoCount).toBe(1);

    // Undo
    const undoRes = await app.request('/api/history/undo', { method: 'POST' });
    expect(undoRes.status).toBe(200);

    // Pixel should be gone
    buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(4, 4).a).toBe(0);

    // Redo
    const redoRes = await app.request('/api/history/redo', { method: 'POST' });
    expect(redoRes.status).toBe(200);

    // Pixel should be back
    buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(4, 4).r).toBe(255);
  });

  it('undo on empty stack returns error', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/history/undo', { method: 'POST' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('multiple draws → sequential undo works', async () => {
    const app = createApp(projectPath);

    // Draw 2 pixels
    await app.request('/api/draw/pixel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', x: 0, y: 0, color: '#ff0000' }),
    });
    await app.request('/api/draw/rect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', x: 2, y: 2, width: 3, height: 3, color: '#00ff00', fill: true }),
    });

    // Status should show 2
    let res = await app.request('/api/history/status');
    let data = await res.json();
    expect(data.undoCount).toBe(2);

    // Undo rect
    await app.request('/api/history/undo', { method: 'POST' });
    let buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(3, 3).g).toBe(0); // rect gone

    // Undo pixel
    await app.request('/api/history/undo', { method: 'POST' });
    buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(0, 0).r).toBe(0); // pixel gone

    res = await app.request('/api/history/status');
    data = await res.json();
    expect(data.undoCount).toBe(0);
    expect(data.redoCount).toBe(2);
  });
});
