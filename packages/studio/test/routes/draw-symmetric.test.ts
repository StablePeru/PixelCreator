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
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function createTestCanvas(name: string, width = 16, height = 16) {
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
  writeLayerFrame(projectPath, name, 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push(name);
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-sym-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  createTestCanvas('canvas1');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function postDraw(app: ReturnType<typeof createApp>, endpoint: string, body: object) {
  return app.request(`/api/draw/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Draw Stroke & Symmetric Routes', () => {
  it('POST /api/draw/stroke applies a basic stroke', async () => {
    const app = createApp(projectPath);
    const res = await postDraw(app, 'stroke', {
      canvas: 'canvas1',
      points: [{ x: 4, y: 4 }, { x: 8, y: 4 }],
      color: '#ff0000',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pointCount).toBe(2);

    const buf = readLayerFrame(projectPath, 'canvas1', 'layer-001', 'frame-001');
    expect(buf.getPixel(4, 4).r).toBe(255);
  });

  it('POST /api/draw/stroke with symmetry mirrors', async () => {
    const app = createApp(projectPath);
    const res = await postDraw(app, 'stroke', {
      canvas: 'canvas1',
      points: [{ x: 2, y: 8 }],
      color: '#ff0000',
      symmetry: { mode: 'horizontal', axisX: 8 },
    });
    expect(res.status).toBe(200);

    const buf = readLayerFrame(projectPath, 'canvas1', 'layer-001', 'frame-001');
    expect(buf.getPixel(2, 8).r).toBe(255);
    expect(buf.getPixel(13, 8).r).toBe(255);
  });

  it('POST /api/draw/symmetric pixel works', async () => {
    const app = createApp(projectPath);
    const res = await postDraw(app, 'symmetric', {
      canvas: 'canvas1',
      type: 'pixel',
      x: 2,
      y: 8,
      color: '#00ff00',
      symmetry: { mode: 'horizontal', axisX: 8 },
    });
    expect(res.status).toBe(200);

    const buf = readLayerFrame(projectPath, 'canvas1', 'layer-001', 'frame-001');
    expect(buf.getPixel(2, 8).g).toBe(255);
    expect(buf.getPixel(13, 8).g).toBe(255);
  });

  it('POST /api/draw/stroke validates input', async () => {
    const app = createApp(projectPath);
    const res = await postDraw(app, 'stroke', { canvas: '', points: [], color: 'bad' });
    expect(res.status).toBe(400);
  });

  it('PUT /api/canvas/:name/symmetry saves config', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/canvas/canvas1/symmetry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'horizontal', axisX: 8 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.symmetry.mode).toBe('horizontal');
    expect(data.symmetry.axisX).toBe(8);
  });

  it('GET /api/canvas/:name/symmetry retrieves config', async () => {
    const app = createApp(projectPath);
    // Set first
    await app.request('/api/canvas/canvas1/symmetry', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vertical', axisY: 4 }),
    });

    const res = await app.request('/api/canvas/canvas1/symmetry');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.symmetry.mode).toBe('vertical');
    expect(data.symmetry.axisY).toBe(4);
  });
});
