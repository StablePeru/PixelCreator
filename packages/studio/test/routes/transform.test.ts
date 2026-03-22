import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON,
  createEmptyBuffer, writeLayerFrame, readLayerFrame, drawPixel, ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setup() {
  const canvas: CanvasData = {
    name: 'sprite', width: 8, height: 8,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  const buf = createEmptyBuffer(8, 8);
  drawPixel(buf, 0, 0, { r: 255, g: 0, b: 0, a: 255 });
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-transform-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('transform API', () => {
  it('POST /transform/flip horizontal moves pixel', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/transform/flip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', direction: 'h' }),
    });
    expect(res.status).toBe(200);
    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(7, 0).r).toBe(255); // moved from (0,0) to (7,0)
    expect(buf.getPixel(0, 0).a).toBe(0);   // original position cleared
  });

  it('POST /transform/invert inverts colors', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/transform/invert', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite' }),
    });
    expect(res.status).toBe(200);
    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    const p = buf.getPixel(0, 0);
    expect(p.r).toBe(0);   // 255 inverted
    expect(p.g).toBe(255); // 0 inverted
  });

  it('POST /transform/brightness adjusts brightness', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/transform/brightness', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', amount: -50 }),
    });
    expect(res.status).toBe(200);
    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(0, 0).r).toBe(205); // 255 - 50
  });

  it('transform + undo restores original', async () => {
    const app = createApp(projectPath);
    await app.request('/api/transform/flip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', direction: 'h' }),
    });

    await app.request('/api/history/undo', { method: 'POST' });
    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(0, 0).r).toBe(255); // back to original
  });
});
