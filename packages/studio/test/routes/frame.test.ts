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
    name: 'anim',
    width: 8, height: 8,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [
      { id: 'frame-001', index: 0, duration: 100 },
      { id: 'frame-002', index: 1, duration: 100 },
    ],
    animationTags: [{ name: 'idle', from: 0, to: 1, direction: 'forward', repeat: 1 }],
  };
  ensureCanvasStructure(projectPath, 'anim', canvas);
  writeCanvasJSON(projectPath, 'anim', canvas);
  writeLayerFrame(projectPath, 'anim', 'layer-001', 'frame-001', createEmptyBuffer(8, 8));
  writeLayerFrame(projectPath, 'anim', 'layer-001', 'frame-002', createEmptyBuffer(8, 8));
  const project = readProjectJSON(projectPath);
  project.canvases.push('anim');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-frame-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setupCanvas();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('frame API routes', () => {
  it('POST adds a new frame', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/anim/frame', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const canvas = readCanvasJSON(projectPath, 'anim');
    expect(canvas.frames).toHaveLength(3);
  });

  it('POST with copyFrom copies frame data', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/anim/frame', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copyFrom: 0 }),
    });
    expect(res.status).toBe(201);
  });

  it('DELETE removes a frame', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/anim/frame/frame-002', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const canvas = readCanvasJSON(projectPath, 'anim');
    expect(canvas.frames).toHaveLength(1);
  });

  it('DELETE last frame returns error', async () => {
    const app = createApp(projectPath);
    await app.request('/api/canvas/anim/frame/frame-002', { method: 'DELETE' });
    const res = await app.request('/api/canvas/anim/frame/frame-001', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });

  it('POST duplicate copies frame', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/anim/frame/frame-001/duplicate', { method: 'POST' });
    expect(res.status).toBe(201);
    const canvas = readCanvasJSON(projectPath, 'anim');
    expect(canvas.frames).toHaveLength(3);
  });

  it('PUT updates timing', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/anim/frame/frame-001', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: 200, label: 'start' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.duration).toBe(200);
    expect(data.label).toBe('start');
  });
});
