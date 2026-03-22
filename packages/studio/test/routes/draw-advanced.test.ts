import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON,
  createEmptyBuffer, writeLayerFrame, readLayerFrame, ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setup() {
  const canvas: CanvasData = {
    name: 'sprite', width: 32, height: 32,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', createEmptyBuffer(32, 32));
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-adv-draw-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

async function draw(app: ReturnType<typeof createApp>, endpoint: string, body: object) {
  return app.request(`/api/draw/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('advanced draw API', () => {
  it('POST /draw/polygon draws filled polygon', async () => {
    const app = createApp(projectPath);
    const res = await draw(app, 'polygon', {
      canvas: 'sprite',
      points: [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 10, y: 15 }],
      color: '#ff0000', fill: true,
    });
    expect(res.status).toBe(200);
    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(10, 10).r).toBe(255); // inside triangle
  });

  it('POST /draw/gradient draws linear gradient', async () => {
    const app = createApp(projectPath);
    const res = await draw(app, 'gradient', {
      canvas: 'sprite', x1: 0, y1: 0, x2: 0, y2: 31,
      from: '#000000', to: '#ffffff',
    });
    expect(res.status).toBe(200);
    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    const top = buf.getPixel(0, 0);
    const bottom = buf.getPixel(0, 31);
    expect(top.r).toBeLessThan(bottom.r); // gradient from dark to light
  });

  it('POST /draw/radial-gradient draws radial gradient', async () => {
    const app = createApp(projectPath);
    const res = await draw(app, 'radial-gradient', {
      canvas: 'sprite', cx: 16, cy: 16, radius: 10,
      from: '#ff0000', to: '#0000ff',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).operation).toBe('radial-gradient');
  });

  it('POST /draw/bezier draws quadratic curve', async () => {
    const app = createApp(projectPath);
    const res = await draw(app, 'bezier', {
      canvas: 'sprite',
      points: [{ x: 0, y: 16 }, { x: 16, y: 0 }, { x: 31, y: 16 }],
      color: '#00ff00',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).operation).toBe('bezier');
  });

  it('POST /draw/bezier draws cubic curve', async () => {
    const app = createApp(projectPath);
    const res = await draw(app, 'bezier', {
      canvas: 'sprite',
      points: [{ x: 0, y: 16 }, { x: 8, y: 0 }, { x: 24, y: 31 }, { x: 31, y: 16 }],
      color: '#ff00ff',
    });
    expect(res.status).toBe(200);
  });

  it('POST /draw/stamp draws stamp', async () => {
    const app = createApp(projectPath);
    const res = await draw(app, 'stamp', {
      canvas: 'sprite', x: 10, y: 10, color: '#ffff00', size: 3, shape: 'circle',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).operation).toBe('stamp');
  });

  it('POST /draw/outline generates outline', async () => {
    const app = createApp(projectPath);
    // First draw something to outline
    await draw(app, 'rect', { canvas: 'sprite', x: 10, y: 10, width: 5, height: 5, color: '#ff0000', fill: true });
    const res = await draw(app, 'outline', { canvas: 'sprite', color: '#000000', thickness: 1 });
    expect(res.status).toBe(200);
  });

  it('polygon validates minimum 3 points', async () => {
    const app = createApp(projectPath);
    const res = await draw(app, 'polygon', {
      canvas: 'sprite', points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], color: '#ff0000',
    });
    expect(res.status).toBe(400);
  });
});
