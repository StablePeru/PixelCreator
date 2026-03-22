import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON,
  createEmptyBuffer, writeLayerFrame, drawRect, ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setup() {
  const canvas: CanvasData = {
    name: 'sprite', width: 16, height: 16,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  const buf = createEmptyBuffer(16, 16);
  drawRect(buf, 0, 0, 16, 16, { r: 255, g: 0, b: 0, a: 255 }, true);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-sel-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('selection API', () => {
  it('POST /select/rect creates selection', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/select/rect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', x: 2, y: 2, width: 8, height: 8 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bounds).toEqual({ x: 2, y: 2, width: 8, height: 8 });
    expect(data.pixelCount).toBe(64);
  });

  it('POST /select/all selects entire canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/select/all', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).pixelCount).toBe(256);
  });

  it('POST /select/none clears selection', async () => {
    const app = createApp(projectPath);
    await app.request('/api/select/all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite' }) });
    await app.request('/api/select/none', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite' }) });
    const info = await (await app.request('/api/select/sprite')).json();
    expect(info.hasSelection).toBe(false);
  });

  it('POST /select/invert inverts selection', async () => {
    const app = createApp(projectPath);
    await app.request('/api/select/rect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', x: 0, y: 0, width: 4, height: 4 }),
    });
    await app.request('/api/select/invert', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });
    const info = await (await app.request('/api/select/sprite')).json();
    expect(info.pixelCount).toBe(256 - 16);
  });

  it('GET /select/:canvas returns selection info', async () => {
    const app = createApp(projectPath);
    const noSel = await (await app.request('/api/select/sprite')).json();
    expect(noSel.hasSelection).toBe(false);
  });
});
