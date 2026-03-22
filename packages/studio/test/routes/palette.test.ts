import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import { initProjectStructure, readProjectJSON, writeProjectJSON, writePaletteJSON } from '@pixelcreator/core';
import type { PaletteData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-studio-palette-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');

  const palette: PaletteData = {
    name: 'test-palette',
    colors: [
      { hex: '#ff0000', name: 'Red' },
      { hex: '#00ff00', name: 'Green' },
      { hex: '#0000ff', name: 'Blue' },
    ],
    maxColors: 256,
    ramps: [],
    constraints: null,
  };
  writePaletteJSON(projectPath, palette);
  const project = readProjectJSON(projectPath);
  project.palettes.push('test-palette');
  writeProjectJSON(projectPath, project);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('palette routes', () => {
  it('GET /api/palette/:name returns palette data', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/test-palette');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('test-palette');
    expect(data.colors).toHaveLength(3);
  });

  it('GET /api/palette/:name returns 404 for missing palette', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/nonexistent');
    expect(res.status).toBe(404);
  });
});
