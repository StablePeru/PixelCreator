import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import { initProjectStructure, writePaletteJSON, readProjectJSON, writeProjectJSON } from '@pixelcreator/core';
import type { PaletteData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function setupPalette(name: string, colors: string[]) {
  const palette: PaletteData = {
    name,
    description: '',
    colors: colors.map((hex, i) => ({ index: i, hex, name: null, group: null })),
    constraints: { maxColors: 256, locked: false, allowAlpha: false },
    ramps: [],
  };
  writePaletteJSON(projectPath, palette);
  const project = readProjectJSON(projectPath);
  project.palettes.push(name);
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-palette-crud-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  setupPalette('primary', ['#ff0000', '#00ff00', '#0000ff']);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('palette CRUD routes', () => {
  it('GET /api/palette/:name returns existing palette', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/primary');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('primary');
    expect(data.colors).toHaveLength(3);
  });

  it('POST /api/palette creates new palette', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'secondary', colors: ['#ffff00', '#ff00ff'] }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('secondary');
    expect(data.colors).toHaveLength(2);

    // Verify it's in project
    const proj = await app.request('/api/project/palettes');
    const palettes = await proj.json();
    expect(palettes).toContain('secondary');
  });

  it('POST /api/palette returns 409 for duplicate', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'primary', colors: ['#000000'] }),
    });
    expect(res.status).toBe(409);
  });

  it('PUT /api/palette/:name/colors updates colors', async () => {
    const app = createApp(projectPath);
    const newColors = [
      { index: 0, hex: '#111111', name: 'dark', group: null },
      { index: 1, hex: '#eeeeee', name: 'light', group: null },
    ];
    const res = await app.request('/api/palette/primary/colors', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colors: newColors }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colors).toHaveLength(2);
    expect(data.colors[0].hex).toBe('#111111');
  });

  it('POST /api/palette/:name/sort sorts colors', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/primary/sort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'hue' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colors).toHaveLength(3);
  });

  it('POST /api/palette/:name/ramp generates ramp', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/primary/ramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startHex: '#000000', endHex: '#ffffff', steps: 5 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colors).toHaveLength(5);
  });

  it('GET /api/palette/:name/harmony returns harmonies', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/primary/harmony?base=%23ff0000&type=complementary');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe('complementary');
    expect(data.colors.length).toBeGreaterThan(0);
  });

  it('DELETE /api/palette/:name deletes palette', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/primary', { method: 'DELETE' });
    expect(res.status).toBe(200);

    const check = await app.request('/api/palette/primary');
    expect(check.status).toBe(404);
  });
});
