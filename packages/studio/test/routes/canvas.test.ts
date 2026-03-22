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
  drawRect,
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function createTestCanvas(name: string, width = 8, height = 8) {
  const canvas: CanvasData = {
    name,
    width,
    height,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, name, canvas);
  writeCanvasJSON(projectPath, name, canvas);
  const buf = createEmptyBuffer(width, height);
  drawRect(buf, 0, 0, width, height, { r: 255, g: 0, b: 0, a: 255 }, true);
  writeLayerFrame(projectPath, name, 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push(name);
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-test-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  createTestCanvas('sprite');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('canvas routes', () => {
  it('GET /api/canvas/:name returns canvas data', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('sprite');
    expect(data.width).toBe(8);
    expect(data.height).toBe(8);
    expect(data.layers).toHaveLength(1);
    expect(data.frames).toHaveLength(1);
  });

  it('GET /api/canvas/:name returns 404 for missing canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/nonexistent');
    expect(res.status).toBe(404);
  });

  it('GET /api/canvas/:name/frame/0 returns PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/frame/0');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
    // PNG magic bytes
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x4e); // N
    expect(bytes[3]).toBe(0x47); // G
  });

  it('GET /api/canvas/:name/frame/0?scale=2 returns scaled PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/frame/0?scale=2');
    expect(res.status).toBe(200);
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it('POST /api/canvas creates new canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'newcanvas', width: 16, height: 16 }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('newcanvas');
    expect(data.width).toBe(16);
  });

  it('POST /api/canvas returns 409 for duplicate name', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'sprite', width: 8, height: 8 }),
    });
    expect(res.status).toBe(409);
  });

  it('POST /api/canvas validates input', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', width: -1 }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/canvas/:name deletes canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const check = await app.request('/api/canvas/sprite');
    expect(check.status).toBe(404);
  });
});
