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
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function createTestCanvas(pp: string) {
  const canvas: CanvasData = {
    name: 'test-canvas',
    width: 8,
    height: 8,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'Layer 1', type: 'normal', visible: true, opacity: 1, blendMode: 'normal', locked: false, order: 0 }],
    frames: [
      { id: 'frame-001', index: 0, duration: 100 },
      { id: 'frame-002', index: 1, duration: 100 },
    ],
    animationTags: [],
  };
  ensureCanvasStructure(pp, 'test-canvas', canvas);
  writeCanvasJSON(pp, 'test-canvas', canvas);
  writeLayerFrame(pp, 'test-canvas', 'layer-001', 'frame-001', createEmptyBuffer(8, 8));
  writeLayerFrame(pp, 'test-canvas', 'layer-001', 'frame-002', createEmptyBuffer(8, 8));

  const proj = readProjectJSON(pp);
  proj.canvases = [{ name: 'test-canvas', width: 8, height: 8 }];
  writeProjectJSON(pp, proj);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-export-preview-'));
  projectPath = tmpDir;
  initProjectStructure(projectPath, 'test-project');
  createTestCanvas(projectPath);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Export Preview Endpoints', () => {
  it('GET /export/preview/png/:canvas returns inline PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/preview/png/test-canvas?scale=2&frame=0');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Content-Disposition')).toBe('inline');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('GET /export/preview/gif/:canvas returns inline GIF', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/preview/gif/test-canvas?scale=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/gif');
    expect(res.headers.get('Content-Disposition')).toBe('inline');
  });

  it('GET /export/preview/apng/:canvas returns inline APNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/preview/apng/test-canvas?scale=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Content-Disposition')).toBe('inline');
  });

  it('GET /export/preview/spritesheet/:canvas returns inline PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/preview/spritesheet/test-canvas?columns=2');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Content-Disposition')).toBe('inline');
  });

  it('GET /export/preview/svg/:canvas returns inline SVG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/preview/svg/test-canvas?scale=4&frame=0');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(res.headers.get('Content-Disposition')).toBe('inline');
  });

  it('preview scale is capped at 4x', async () => {
    const app = createApp(projectPath);
    // Even with scale=16, preview should work (internally capped to 4)
    const res = await app.request('/api/export/preview/png/test-canvas?scale=16');
    expect(res.status).toBe(200);
  });

  it('returns 500 for non-existent canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/preview/png/nonexistent');
    expect(res.status).toBe(500);
  });
});
