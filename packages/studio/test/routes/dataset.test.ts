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
  drawRect(buf, 0, 0, 8, 8, { r: 255, g: 0, b: 0, a: 255 }, true);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-dataset-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('dataset API', () => {
  it('POST /dataset/rate creates feedback entry', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/dataset/rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', rating: 'like', reason: 'Good colors', tags: ['colors', 'style'] }),
    });
    expect(res.status).toBe(201);
    const entry = await res.json();
    expect(entry.rating).toBe('like');
    expect(entry.reason).toBe('Good colors');
    expect(entry.tags).toEqual(['colors', 'style']);
    expect(entry.metadata.width).toBe(8);
  });

  it('GET /dataset returns entries', async () => {
    const app = createApp(projectPath);
    await app.request('/api/dataset/rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', rating: 'like' }),
    });
    await app.request('/api/dataset/rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', rating: 'dislike', reason: 'Too bright' }),
    });

    const res = await app.request('/api/dataset');
    expect(res.status).toBe(200);
    const entries = await res.json();
    expect(entries).toHaveLength(2);
  });

  it('GET /dataset filters by rating', async () => {
    const app = createApp(projectPath);
    await app.request('/api/dataset/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite', rating: 'like' }) });
    await app.request('/api/dataset/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite', rating: 'dislike' }) });

    const res = await app.request('/api/dataset?rating=like');
    const entries = await res.json();
    expect(entries).toHaveLength(1);
    expect(entries[0].rating).toBe('like');
  });

  it('GET /dataset/stats returns statistics', async () => {
    const app = createApp(projectPath);
    await app.request('/api/dataset/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite', rating: 'like', tags: ['colors'] }) });
    await app.request('/api/dataset/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite', rating: 'like', tags: ['colors', 'style'] }) });
    await app.request('/api/dataset/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite', rating: 'dislike' }) });

    const res = await app.request('/api/dataset/stats');
    const stats = await res.json();
    expect(stats.total).toBe(3);
    expect(stats.likes).toBe(2);
    expect(stats.dislikes).toBe(1);
    expect(stats.likeRatio).toBe(67);
    expect(stats.tagCounts.colors).toBe(2);
  });

  it('GET /dataset/export returns JSONL', async () => {
    const app = createApp(projectPath);
    await app.request('/api/dataset/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite', rating: 'like' }) });

    const res = await app.request('/api/dataset/export?format=jsonl');
    expect(res.status).toBe(200);
    const text = await res.text();
    const line = JSON.parse(text.split('\n')[0]);
    expect(line.rating).toBe('like');
    expect(line.image.length).toBeGreaterThan(0); // base64 PNG
    expect(line.dimensions).toEqual([8, 8]);
  });

  it('DELETE /dataset/:id removes entry', async () => {
    const app = createApp(projectPath);
    const createRes = await app.request('/api/dataset/rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', rating: 'like' }),
    });
    const entry = await createRes.json();

    const res = await app.request(`/api/dataset/${entry.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    const listRes = await app.request('/api/dataset');
    expect((await listRes.json())).toHaveLength(0);
  });

  it('GET /dataset/:id/snapshot returns PNG', async () => {
    const app = createApp(projectPath);
    const createRes = await app.request('/api/dataset/rate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'sprite', rating: 'like' }),
    });
    const entry = await createRes.json();

    const res = await app.request(`/api/dataset/${entry.id}/snapshot`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('GET /dataset/export CSV format works', async () => {
    const app = createApp(projectPath);
    await app.request('/api/dataset/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canvas: 'sprite', rating: 'like', reason: 'test' }) });

    const res = await app.request('/api/dataset/export?format=csv');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('id,canvas,frame,rating,reason,tags,timestamp');
    expect(text).toContain('sprite');
  });
});
