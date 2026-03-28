import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  initProjectStructure,
  readProjectJSON,
  writeProjectJSON,
} from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-brush-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Brush API Routes', () => {
  it('GET /api/brush/presets returns defaults', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/brush/presets');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.defaultCount).toBe(8);
    expect(data.presets).toHaveLength(8);
  });

  it('POST /api/brush/presets creates custom preset', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/brush/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Custom', size: 5, shape: 'circle' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.preset.name).toBe('Custom');

    // Verify it's in the list
    const listRes = await app.request('/api/brush/presets');
    const listData = await listRes.json();
    expect(listData.customCount).toBe(1);
  });

  it('POST /api/brush/presets validates input', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/brush/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', size: 0 }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/brush/presets/:id removes custom preset', async () => {
    const app = createApp(projectPath);
    // Create first
    const createRes = await app.request('/api/brush/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ToDelete', size: 3, shape: 'square' }),
    });
    const created = await createRes.json();
    const id = created.preset.id;

    const res = await app.request(`/api/brush/presets/${id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('DELETE /api/brush/presets/:id rejects built-in', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/brush/presets/brush-001', { method: 'DELETE' });
    expect(res.status).toBe(400);
  });

  it('GET /api/brush/presets/:id/mask returns PNG', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/brush/presets/brush-002/mask');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
