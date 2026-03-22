import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import { initProjectStructure } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-test-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('project routes', () => {
  it('GET /api/health returns ok', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('GET /api/project returns project data', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/project');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('test-project');
    expect(data.canvases).toEqual([]);
    expect(data.palettes).toEqual([]);
  });

  it('GET /api/project/canvases returns canvas list', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/project/canvases');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/project/palettes returns palette list', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/project/palettes');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
