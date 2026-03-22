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
import { FrameCache } from '../../src/server/frame-cache.js';

let tmpDir: string;
let projectPath: string;

function setup() {
  const canvas: CanvasData = {
    name: 'sprite', width: 16, height: 16,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, 'sprite', canvas);
  writeCanvasJSON(projectPath, 'sprite', canvas);
  writeLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001', createEmptyBuffer(16, 16));
  const project = readProjectJSON(projectPath);
  project.canvases.push('sprite');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-batch-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setup();
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('batch draw endpoint', () => {
  it('POST /draw/batch draws multiple pixels in one call', async () => {
    const app = createApp(projectPath);
    const operations = [
      { type: 'pixel', canvas: 'sprite', x: 0, y: 0, color: '#ff0000' },
      { type: 'pixel', canvas: 'sprite', x: 1, y: 0, color: '#00ff00' },
      { type: 'pixel', canvas: 'sprite', x: 2, y: 0, color: '#0000ff' },
    ];

    const res = await app.request('/api/draw/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.applied).toBe(3);
    expect(data.operation).toBe('batch');

    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(0, 0).r).toBe(255);
    expect(buf.getPixel(1, 0).g).toBe(255);
    expect(buf.getPixel(2, 0).b).toBe(255);
  });

  it('batch creates single history entry for undo', async () => {
    const app = createApp(projectPath);
    const operations = Array.from({ length: 10 }, (_, i) => ({
      type: 'pixel', canvas: 'sprite', x: i, y: 0, color: '#ff0000',
    }));

    await app.request('/api/draw/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });

    // Undo should revert all 10 pixels at once
    await app.request('/api/history/undo', { method: 'POST' });
    const buf = readLayerFrame(projectPath, 'sprite', 'layer-001', 'frame-001');
    expect(buf.getPixel(0, 0).a).toBe(0); // all reverted
    expect(buf.getPixel(5, 0).a).toBe(0);
  });

  it('batch rejects empty operations', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/draw/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations: [] }),
    });
    expect(res.status).toBe(400);
  });
});

describe('FrameCache', () => {
  it('stores and retrieves cached frames', () => {
    const cache = new FrameCache();
    const png = Buffer.from('fake-png-data');
    const etag = cache.set('sprite', 0, 1, png);
    expect(etag).toBeTruthy();

    const result = cache.get('sprite', 0, 1);
    expect(result).not.toBeNull();
    expect(result!.etag).toBe(etag);
  });

  it('invalidates by canvas name', () => {
    const cache = new FrameCache();
    cache.set('sprite', 0, 1, Buffer.from('a'));
    cache.set('sprite', 1, 1, Buffer.from('b'));
    cache.set('other', 0, 1, Buffer.from('c'));

    cache.invalidate('sprite');
    expect(cache.get('sprite', 0, 1)).toBeNull();
    expect(cache.get('sprite', 1, 1)).toBeNull();
    expect(cache.get('other', 0, 1)).not.toBeNull();
  });

  it('respects max size', () => {
    const cache = new FrameCache(3);
    cache.set('a', 0, 1, Buffer.from('1'));
    cache.set('b', 0, 1, Buffer.from('2'));
    cache.set('c', 0, 1, Buffer.from('3'));
    cache.set('d', 0, 1, Buffer.from('4'));
    expect(cache.size).toBeLessThanOrEqual(3);
  });
});
