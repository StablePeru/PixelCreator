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
  drawRect,
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
    layers: [
      { id: 'layer-001', name: 'background', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 },
    ],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  const buf = createEmptyBuffer(8, 8);
  drawRect(buf, 0, 0, 8, 8, { r: 100, g: 100, b: 100, a: 255 }, true);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-layer-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setupCanvas();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('layer API routes', () => {
  it('GET /api/canvas/:name/layers returns layers', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/layers');
    expect(res.status).toBe(200);
    const layers = await res.json();
    expect(layers).toHaveLength(1);
    expect(layers[0].name).toBe('background');
  });

  it('POST /api/canvas/:name/layer adds a new layer', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/layer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'details' }),
    });
    expect(res.status).toBe(201);
    const layer = await res.json();
    expect(layer.name).toBe('details');
    expect(layer.id).toBe('layer-002');

    // Verify canvas has 2 layers now
    const check = await app.request('/api/canvas/sprite/layers');
    const layers = await check.json();
    expect(layers).toHaveLength(2);
  });

  it('PUT /api/canvas/:name/layer/:id updates properties', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/layer/layer-001', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: false, opacity: 128, blendMode: 'multiply' }),
    });
    expect(res.status).toBe(200);
    const layer = await res.json();
    expect(layer.visible).toBe(false);
    expect(layer.opacity).toBe(128);
    expect(layer.blendMode).toBe('multiply');
  });

  it('DELETE /api/canvas/:name/layer/:id deletes layer', async () => {
    const app = createApp(projectPath);
    // First add a second layer
    await app.request('/api/canvas/sprite/layer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'temp' }),
    });

    // Delete it
    const res = await app.request('/api/canvas/sprite/layer/layer-002', { method: 'DELETE' });
    expect(res.status).toBe(200);

    const layers = await (await app.request('/api/canvas/sprite/layers')).json();
    expect(layers).toHaveLength(1);
  });

  it('DELETE last layer returns error', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/layer/layer-001', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });

  it('POST duplicate creates copy', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/layer/layer-001/duplicate', { method: 'POST' });
    expect(res.status).toBe(201);
    const dup = await res.json();
    expect(dup.name).toBe('background copy');

    // Verify pixel data was copied
    const srcBuf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    const dupBuf = readLayerFrame(projectPath, 'sprite', dup.id, 'frame-001');
    expect(srcBuf.getPixel(0, 0).r).toBe(dupBuf.getPixel(0, 0).r);
  });

  it('PUT reorder changes layer order', async () => {
    const app = createApp(projectPath);
    // Add second layer
    await app.request('/api/canvas/sprite/layer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'top' }),
    });

    // Reorder: swap
    const res = await app.request('/api/canvas/sprite/layers/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: ['layer-002', 'layer-001'] }),
    });
    expect(res.status).toBe(200);
    const layers = await res.json();
    expect(layers[0].id).toBe('layer-002');
    expect(layers[0].order).toBe(0);
    expect(layers[1].id).toBe('layer-001');
    expect(layers[1].order).toBe(1);
  });

  it('GET layer thumbnail returns PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/layer/layer-001/frame/0/thumbnail');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes[0]).toBe(0x89); // PNG magic
  });
});
