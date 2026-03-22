import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  initProjectStructure, readProjectJSON, readCanvasJSON,
  createEmptyBuffer, encodePNG, drawRect,
} from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-import-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
});

afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

describe('import API', () => {
  it('POST /import/png creates canvas from PNG', async () => {
    const app = createApp(projectPath);

    // Create a PNG in memory
    const buf = createEmptyBuffer(16, 16);
    drawRect(buf, 0, 0, 16, 16, { r: 0, g: 255, b: 0, a: 255 }, true);
    const pngData = encodePNG(buf);

    const formData = new FormData();
    formData.append('file', new Blob([pngData], { type: 'image/png' }), 'test.png');
    formData.append('name', 'imported-test');

    const res = await app.request('/api/import/png', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.canvas).toBe('imported-test');
    expect(data.width).toBe(16);
    expect(data.height).toBe(16);

    // Verify canvas exists
    const project = readProjectJSON(projectPath);
    expect(project.canvases).toContain('imported-test');

    const canvas = readCanvasJSON(projectPath, 'imported-test');
    expect(canvas.width).toBe(16);
    expect(canvas.layers).toHaveLength(1);
  });

  it('POST /import/png rejects duplicate name', async () => {
    const app = createApp(projectPath);

    const buf = createEmptyBuffer(8, 8);
    const pngData = encodePNG(buf);

    const formData1 = new FormData();
    formData1.append('file', new Blob([pngData]), 'test.png');
    formData1.append('name', 'dup');
    await app.request('/api/import/png', { method: 'POST', body: formData1 });

    const formData2 = new FormData();
    formData2.append('file', new Blob([pngData]), 'test.png');
    formData2.append('name', 'dup');
    const res = await app.request('/api/import/png', { method: 'POST', body: formData2 });
    expect(res.status).toBe(409);
  });
});
