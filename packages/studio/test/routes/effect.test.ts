import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import { initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON, createEmptyBuffer, writeLayerFrame, ensureCanvasStructure } from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function createTestCanvas(name: string) {
  const canvas: CanvasData = {
    name, width: 16, height: 16,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, name, canvas);
  writeCanvasJSON(projectPath, name, canvas);
  writeLayerFrame(projectPath, name, 'layer-001', 'frame-001', createEmptyBuffer(16, 16));
  const project = readProjectJSON(projectPath);
  project.canvases.push(name);
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-effect-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  createTestCanvas('canvas1');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Effect API Routes', () => {
  it('GET /effects returns empty array initially', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/layer/layer-001/effects');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.effects).toEqual([]);
  });

  it('POST /effect adds drop-shadow', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'drop-shadow', params: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, opacity: 128 } }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.effect.type).toBe('drop-shadow');
  });

  it('POST /effect adds outline', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'outline', params: { color: '#ff0000', thickness: 1, position: 'outside' } }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.effect.type).toBe('outline');
  });

  it('GET /effects returns added effects', async () => {
    const app = createApp(projectPath);
    await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'drop-shadow', params: { offsetX: 1, offsetY: 1, color: '#000', blur: 0, opacity: 200 } }),
    });
    const res = await app.request('/api/canvas/canvas1/layer/layer-001/effects');
    const data = await res.json();
    expect(data.effects).toHaveLength(1);
  });

  it('PUT /effect/:id updates params', async () => {
    const app = createApp(projectPath);
    const addRes = await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'drop-shadow', params: { offsetX: 2, offsetY: 2, color: '#000', blur: 0, opacity: 128 } }),
    });
    const { effect } = await addRes.json();

    const res = await app.request(`/api/canvas/canvas1/layer/layer-001/effect/${effect.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: { offsetX: 5 } }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.effect.params.offsetX).toBe(5);
  });

  it('PUT /effect/:id/toggle toggles enabled', async () => {
    const app = createApp(projectPath);
    const addRes = await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'outline', params: { color: '#000', thickness: 1, position: 'outside' } }),
    });
    const { effect } = await addRes.json();

    const res = await app.request(`/api/canvas/canvas1/layer/layer-001/effect/${effect.id}/toggle`, { method: 'PUT' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.effect.enabled).toBe(false);
  });

  it('DELETE /effect/:id removes effect', async () => {
    const app = createApp(projectPath);
    const addRes = await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'outer-glow', params: { color: '#fff', radius: 2, intensity: 200 } }),
    });
    const { effect } = await addRes.json();

    const res = await app.request(`/api/canvas/canvas1/layer/layer-001/effect/${effect.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    const listRes = await app.request('/api/canvas/canvas1/layer/layer-001/effects');
    const list = await listRes.json();
    expect(list.effects).toHaveLength(0);
  });

  it('404 for non-existent layer', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/layer/nonexistent/effects');
    expect(res.status).toBe(404);
  });

  it('404 for non-existent effect', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/layer/layer-001/effect/nonexistent', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('effect IDs are sequential', async () => {
    const app = createApp(projectPath);
    const res1 = await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'drop-shadow', params: { offsetX: 1, offsetY: 1, color: '#000', blur: 0, opacity: 128 } }),
    });
    const res2 = await app.request('/api/canvas/canvas1/layer/layer-001/effect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'outline', params: { color: '#000', thickness: 1, position: 'outside' } }),
    });
    const e1 = await res1.json();
    const e2 = await res2.json();
    expect(e1.effect.id).not.toBe(e2.effect.id);
  });
});
