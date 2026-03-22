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
    frames: [
      { id: 'frame-001', index: 0, duration: 100 },
      { id: 'frame-002', index: 1, duration: 100 },
    ],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  const buf = createEmptyBuffer(8, 8);
  drawRect(buf, 0, 0, 8, 8, { r: 255, g: 0, b: 0, a: 255 }, true);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', buf);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-002', createEmptyBuffer(8, 8));
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-export-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('export API', () => {
  it('GET /export/png returns PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/png/sprite?scale=2');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89); // PNG magic
    expect(buf[1]).toBe(0x50);
  });

  it('GET /export/gif returns GIF', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/gif/sprite');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/gif');
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(String.fromCharCode(buf[0], buf[1], buf[2])).toBe('GIF');
  });

  it('GET /export/svg returns SVG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/svg/sprite');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    const text = await res.text();
    expect(text).toContain('<svg');
  });

  it('GET /export/spritesheet returns PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/spritesheet/sprite?columns=2');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('export includes Content-Disposition header', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/export/png/sprite');
    expect(res.headers.get('content-disposition')).toContain('sprite.png');
  });
});
