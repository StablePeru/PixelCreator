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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-guide-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  createTestCanvas('canvas1');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Guide API Routes', () => {
  it('GET /api/canvas/:name/guides returns empty config initially', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/guides');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.guides).toEqual([]);
    expect(data.snapEnabled).toBe(true);
  });

  it('POST /api/canvas/:name/guides adds guide', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orientation: 'horizontal', position: 8 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.guide.orientation).toBe('horizontal');
  });

  it('POST /api/canvas/:name/guides validates input', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orientation: 'bad' }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/canvas/:name/guides/:id moves guide', async () => {
    const app = createApp(projectPath);
    const addRes = await app.request('/api/canvas/canvas1/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orientation: 'vertical', position: 4 }),
    });
    const { guide } = await addRes.json();

    const res = await app.request(`/api/canvas/canvas1/guides/${guide.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: 12 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.position).toBe(12);
  });

  it('DELETE /api/canvas/:name/guides/:id removes guide', async () => {
    const app = createApp(projectPath);
    const addRes = await app.request('/api/canvas/canvas1/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orientation: 'horizontal', position: 8 }),
    });
    const { guide } = await addRes.json();

    const res = await app.request(`/api/canvas/canvas1/guides/${guide.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    const listRes = await app.request('/api/canvas/canvas1/guides');
    const config = await listRes.json();
    expect(config.guides).toHaveLength(0);
  });

  it('DELETE /api/canvas/:name/guides/:id returns 404 for missing', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/guides/nonexistent', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('PUT /api/canvas/:name/guides/config updates snap settings', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/guides/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapEnabled: false, snapThreshold: 8 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.config.snapEnabled).toBe(false);
    expect(data.config.snapThreshold).toBe(8);
  });
});

describe('Project Init & Preferences Routes', () => {
  it('GET/PUT /api/project/preferences round-trip', async () => {
    const app = createApp(projectPath);

    const putRes = await app.request('/api/project/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showGrid: false, snapThreshold: 8 }),
    });
    expect(putRes.status).toBe(200);

    const getRes = await app.request('/api/project/preferences');
    const prefs = await getRes.json();
    expect(prefs.showGrid).toBe(false);
    expect(prefs.snapThreshold).toBe(8);
  });
});

describe('Reference Layer Routes', () => {
  it('POST /api/canvas/:name/layer/reference creates reference layer', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/layer/reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ref', width: 16, height: 16, opacity: 100 }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.layer.type).toBe('reference');
    expect(data.layer.opacity).toBe(100);
  });

  it('PUT /api/canvas/:name/layer/:id/reference updates settings', async () => {
    const app = createApp(projectPath);
    const addRes = await app.request('/api/canvas/canvas1/layer/reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ref', width: 16, height: 16 }),
    });
    const { layer } = await addRes.json();

    const res = await app.request(`/api/canvas/canvas1/layer/${layer.id}/reference`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opacity: 64, visible: false }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.layer.opacity).toBe(64);
    expect(data.layer.visible).toBe(false);
  });
});
