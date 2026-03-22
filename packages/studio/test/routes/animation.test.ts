import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON,
  createEmptyBuffer, writeLayerFrame, ensureCanvasStructure, readCanvasJSON,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setupCanvas() {
  const canvas: CanvasData = {
    name: 'sprite',
    width: 8, height: 8,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: Array.from({ length: 4 }, (_, i) => ({ id: `frame-00${i + 1}`, index: i, duration: 100 })),
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  for (let i = 0; i < 4; i++) {
    writeLayerFrame(projectPath, 'sprite', 'layer-001', `frame-00${i + 1}`, createEmptyBuffer(8, 8));
  }
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-anim-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setupCanvas();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('animation tag API routes', () => {
  it('GET /tags returns empty initially', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/tags');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('POST creates tag', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/tag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'walk', from: 0, to: 3, direction: 'forward' }),
    });
    expect(res.status).toBe(201);
    const tag = await res.json();
    expect(tag.name).toBe('walk');
    expect(tag.from).toBe(0);
    expect(tag.to).toBe(3);
  });

  it('POST rejects duplicate name', async () => {
    const app = createApp(projectPath);
    await app.request('/api/canvas/sprite/tag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'walk', from: 0, to: 3 }),
    });
    const res = await app.request('/api/canvas/sprite/tag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'walk', from: 0, to: 1 }),
    });
    expect(res.status).toBe(409);
  });

  it('POST validates range', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/sprite/tag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'bad', from: 3, to: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT edits tag', async () => {
    const app = createApp(projectPath);
    await app.request('/api/canvas/sprite/tag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'idle', from: 0, to: 1 }),
    });
    const res = await app.request('/api/canvas/sprite/tag/idle', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: 'pingpong', repeat: 3 }),
    });
    expect(res.status).toBe(200);
    const tag = await res.json();
    expect(tag.direction).toBe('pingpong');
    expect(tag.repeat).toBe(3);
  });

  it('DELETE removes tag', async () => {
    const app = createApp(projectPath);
    await app.request('/api/canvas/sprite/tag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'temp', from: 0, to: 1 }),
    });
    const res = await app.request('/api/canvas/sprite/tag/temp', { method: 'DELETE' });
    expect(res.status).toBe(200);

    const tags = await (await app.request('/api/canvas/sprite/tags')).json();
    expect(tags).toEqual([]);
  });
});
