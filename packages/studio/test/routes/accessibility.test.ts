import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createApp } from '../../src/server/app.js';
import { initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON, createEmptyBuffer, writeLayerFrame, ensureCanvasStructure, drawPixel, hexToRGBA } from '@pixelcreator/core';
import type { CanvasData, PaletteData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function createTestCanvas(name: string) {
  const canvas: CanvasData = {
    name, width: 8, height: 8,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: 'testpal',
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, name, canvas);
  writeCanvasJSON(projectPath, name, canvas);
  const buf = createEmptyBuffer(8, 8);
  drawPixel(buf, 0, 0, hexToRGBA('#ff0000'));
  writeLayerFrame(projectPath, name, 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push(name);
  writeProjectJSON(projectPath, project);
}

function createTestPalette() {
  const palette: PaletteData = {
    name: 'testpal',
    colors: [
      { index: 0, hex: '#ff0000', name: 'red', group: null },
      { index: 1, hex: '#00ff00', name: 'green', group: null },
      { index: 2, hex: '#0000ff', name: 'blue', group: null },
      { index: 3, hex: '#ffffff', name: 'white', group: null },
      { index: 4, hex: '#000000', name: 'black', group: null },
    ],
  };
  const palDir = path.join(projectPath, 'palettes');
  if (!fs.existsSync(palDir)) fs.mkdirSync(palDir, { recursive: true });
  fs.writeFileSync(path.join(palDir, 'testpal.palette.json'), JSON.stringify(palette, null, 2));
  const project = readProjectJSON(projectPath);
  project.palettes.push('testpal');
  writeProjectJSON(projectPath, project);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-a11y-studio-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
  createTestPalette();
  createTestCanvas('canvas1');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Accessibility API Routes', () => {
  it('POST /accessibility/simulate returns simulated image', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/accessibility/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'canvas1', deficiency: 'deuteranopia' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.imageData).toBeDefined();
    expect(data.deficiency).toBe('deuteranopia');
  });

  it('POST /accessibility/simulate rejects invalid deficiency', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/accessibility/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'canvas1', deficiency: 'invalid' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /accessibility/simulate rejects missing canvas', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/accessibility/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas: 'nonexistent', deficiency: 'protanopia' }),
    });
    expect(res.status).toBe(404);
  });

  it('POST /accessibility/contrast returns correct ratio', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/accessibility/contrast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foreground: '#000000', background: '#ffffff' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ratio).toBeGreaterThan(20);
    expect(data.passAA).toBe(true);
  });

  it('POST /accessibility/contrast with missing fields returns 400', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/accessibility/contrast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foreground: '#000000' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /palette/:name/accessibility returns report', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/testpal/accessibility');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.paletteName).toBe('testpal');
    expect(data.totalColors).toBe(5);
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
  });

  it('GET /palette/:name/accessibility with filter', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/testpal/accessibility?deficiencies=tritanopia');
    expect(res.status).toBe(200);
    const data = await res.json();
    for (const issue of data.issues) {
      expect(issue.deficiency).toBe('tritanopia');
    }
  });

  it('GET /palette/:name/accessibility for nonexistent returns 404', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/nonexistent/accessibility');
    expect(res.status).toBe(404);
  });

  it('GET /palette/:name/accessibility score is between 0-100', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/palette/testpal/accessibility');
    const data = await res.json();
    expect(data.score).toBeGreaterThanOrEqual(0);
    expect(data.score).toBeLessThanOrEqual(100);
  });
});
