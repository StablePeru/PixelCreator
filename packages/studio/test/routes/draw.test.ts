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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-draw-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  createTestCanvas('canvas1');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function drawViaApi(app: ReturnType<typeof createApp>, endpoint: string, body: object) {
  return app.request(`/api/draw/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('draw routes', () => {
  it('POST /api/draw/pixel draws a pixel', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'pixel', { canvas: 'canvas1', x: 5, y: 5, color: '#ff0000' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.operation).toBe('pixel');

    const buffer = readLayerFrame(projectPath, 'canvas1', 'layer-001', 'frame-001');
    const pixel = buffer.getPixel(5, 5);
    expect(pixel.r).toBe(255);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(0);
    expect(pixel.a).toBe(255);
  });

  it('POST /api/draw/rect draws a filled rect', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'rect', {
      canvas: 'canvas1', x: 2, y: 2, width: 4, height: 4, color: '#00ff00', fill: true,
    });
    expect(res.status).toBe(200);

    const buffer = readLayerFrame(projectPath, 'canvas1', 'layer-001', 'frame-001');
    const pixel = buffer.getPixel(3, 3);
    expect(pixel.g).toBe(255);
  });

  it('POST /api/draw/circle draws a circle', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'circle', {
      canvas: 'canvas1', cx: 8, cy: 8, radius: 3, color: '#0000ff', fill: true,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operation).toBe('circle');
  });

  it('POST /api/draw/line draws a line', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'line', {
      canvas: 'canvas1', x1: 0, y1: 0, x2: 15, y2: 15, color: '#ffffff',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operation).toBe('line');
  });

  it('POST /api/draw/fill performs flood fill', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'fill', {
      canvas: 'canvas1', x: 0, y: 0, color: '#ff00ff',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operation).toBe('fill');
  });

  it('POST /api/draw/ellipse draws an ellipse', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'ellipse', {
      canvas: 'canvas1', cx: 8, cy: 8, rx: 5, ry: 3, color: '#ffff00',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operation).toBe('ellipse');
  });

  it('validates missing required fields', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'pixel', { canvas: 'canvas1' });
    expect(res.status).toBe(400);
  });

  it('validates invalid color format', async () => {
    const app = createApp(projectPath);
    const res = await drawViaApi(app, 'pixel', {
      canvas: 'canvas1', x: 0, y: 0, color: 'red',
    });
    expect(res.status).toBe(400);
  });
});
