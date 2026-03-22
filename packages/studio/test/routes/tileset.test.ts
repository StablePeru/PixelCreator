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
  // Create a 16x16 canvas with 4 colored 8x8 quadrants (makes 4 unique tiles)
  const canvas: CanvasData = {
    name: 'tilemap-src', width: 16, height: 16,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'tilemap-src', canvas);
  writeCanvasJSON(projectPath, 'tilemap-src', canvas);
  const buf = createEmptyBuffer(16, 16);
  drawRect(buf, 0, 0, 8, 8, { r: 255, g: 0, b: 0, a: 255 }, true);
  drawRect(buf, 8, 0, 8, 8, { r: 0, g: 255, b: 0, a: 255 }, true);
  drawRect(buf, 0, 8, 8, 8, { r: 0, g: 0, b: 255, a: 255 }, true);
  drawRect(buf, 8, 8, 8, 8, { r: 255, g: 255, b: 0, a: 255 }, true);
  writeLayerFrame(projectPath, 'tilemap-src', 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push('tilemap-src');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tileset-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('tileset & tilemap API', () => {
  it('POST /tileset creates tileset from canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/tileset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'terrain', canvas: 'tilemap-src', tileWidth: 8, tileHeight: 8 }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('terrain');
    expect(data.tiles.length).toBe(4); // 4 unique colored tiles
    expect(data.tileWidth).toBe(8);
  });

  it('GET /tileset/:name returns tileset', async () => {
    const app = createApp(projectPath);
    await app.request('/api/tileset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ts', canvas: 'tilemap-src', tileWidth: 8, tileHeight: 8 }),
    });
    const res = await app.request('/api/tileset/ts');
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe('ts');
  });

  it('GET /tileset/:name/image returns PNG', async () => {
    const app = createApp(projectPath);
    await app.request('/api/tileset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ts', canvas: 'tilemap-src', tileWidth: 8, tileHeight: 8 }),
    });
    const res = await app.request('/api/tileset/ts/image');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('POST tilemap + set cell + render works', async () => {
    const app = createApp(projectPath);
    // Create tileset
    await app.request('/api/tileset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ts', canvas: 'tilemap-src', tileWidth: 8, tileHeight: 8 }),
    });

    // Create tilemap
    const mapRes = await app.request('/api/tileset/ts/tilemap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'level1', width: 4, height: 4 }),
    });
    expect(mapRes.status).toBe(201);

    // Set a cell
    const cellRes = await app.request('/api/tileset/ts/tilemap/level1/cell', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: 0, y: 0, tileIndex: 0 }),
    });
    expect(cellRes.status).toBe(200);

    // Render tilemap
    const renderRes = await app.request('/api/tileset/ts/tilemap/level1/render');
    expect(renderRes.status).toBe(200);
    expect(renderRes.headers.get('content-type')).toBe('image/png');
  });

  it('DELETE tileset removes it', async () => {
    const app = createApp(projectPath);
    await app.request('/api/tileset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ts', canvas: 'tilemap-src', tileWidth: 8, tileHeight: 8 }),
    });
    const res = await app.request('/api/tileset/ts', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const check = await app.request('/api/tileset/ts');
    expect(check.status).toBe(404);
  });

  it('DELETE tilemap removes it', async () => {
    const app = createApp(projectPath);
    await app.request('/api/tileset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ts', canvas: 'tilemap-src', tileWidth: 8, tileHeight: 8 }),
    });
    await app.request('/api/tileset/ts/tilemap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'map1', width: 2, height: 2 }),
    });
    const res = await app.request('/api/tileset/ts/tilemap/map1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});
