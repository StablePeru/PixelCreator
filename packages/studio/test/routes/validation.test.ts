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
  writePaletteJSON,
  ensureCanvasStructure,
} from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function seedCanvas(name: string): void {
  const canvas: CanvasData = {
    name,
    width: 16,
    height: 16,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: null,
    layers: [
      {
        id: 'layer-001',
        name: 'bg',
        type: 'normal',
        visible: true,
        opacity: 255,
        blendMode: 'normal',
        locked: false,
        order: 0,
      },
    ],
    frames: [{ id: 'frame-001', index: 0, duration: 100 }],
    animationTags: [],
  };
  ensureCanvasStructure(projectPath, name, canvas);
  writeCanvasJSON(projectPath, name, canvas);
  const project = readProjectJSON(projectPath);
  project.canvases.push(name);
  writeProjectJSON(projectPath, project);
}

async function postFlag(app: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  return app.request('/api/validation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('validation API', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-validation-api-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test-project');
    seedCanvas('hero');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /validation on fresh canvas returns empty flags', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/validation?canvas=hero');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canvas).toBe('hero');
    expect(body.flags).toEqual([]);
  });

  it('POST /validation creates a flag and returns 201', async () => {
    const app = createApp(projectPath);
    const res = await postFlag(app, {
      canvas: 'hero',
      severity: 'warning',
      category: 'palette',
      note: 'out of palette',
      tags: ['body'],
    });
    expect(res.status).toBe(201);
    const flag = await res.json();
    expect(flag.id).toBe('flag-001');
    expect(flag.note).toBe('out of palette');
  });

  it('POST /validation rejects missing fields', async () => {
    const app = createApp(projectPath);
    const res = await postFlag(app, { canvas: 'hero', severity: 'warning' });
    expect(res.status).toBe(400);
  });

  it('POST /validation rejects unknown canvas', async () => {
    const app = createApp(projectPath);
    const res = await postFlag(app, {
      canvas: 'ghost',
      severity: 'warning',
      category: 'palette',
      note: 'x',
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /validation/:canvas/:id/resolve stamps resolution', async () => {
    const app = createApp(projectPath);
    await postFlag(app, { canvas: 'hero', severity: 'info', category: 'other', note: 'n' });
    const res = await app.request('/api/validation/hero/flag-001/resolve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: 'fixed' }),
    });
    expect(res.status).toBe(200);
    const flag = await res.json();
    expect(flag.resolution).toBe('fixed');
    expect(flag.resolvedAt).toBeTypeOf('number');
  });

  it('DELETE /validation/:canvas/:id removes a flag', async () => {
    const app = createApp(projectPath);
    await postFlag(app, { canvas: 'hero', severity: 'info', category: 'other', note: 'n' });
    const res = await app.request('/api/validation/hero/flag-001', { method: 'DELETE' });
    expect(res.status).toBe(200);

    const list = await app.request('/api/validation?canvas=hero');
    const body = await list.json();
    expect(body.flags).toHaveLength(0);
  });

  it('GET /validation/report returns manual flags + size issues', async () => {
    const app = createApp(projectPath);
    await postFlag(app, {
      canvas: 'hero',
      severity: 'warning',
      category: 'palette',
      note: 'drift',
    });
    const res = await app.request('/api/validation/report?canvas=hero');
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(report.canvas).toBe('hero');
    expect(report.manual).toHaveLength(1);
    expect(Array.isArray(report.automatic.size)).toBe(true);
    expect(report.automatic.palette).toBeUndefined();
    expect(report.automatic.accessibility).toBeUndefined();
    expect(report.automatic.asset).toBeUndefined();
  });

  it('GET /validation/report?include=all populates palette, accessibility and asset sections', async () => {
    writePaletteJSON(projectPath, {
      name: 'p8',
      description: '',
      colors: [
        { index: 0, hex: '#000000', name: 'black', group: null },
        { index: 1, hex: '#ffffff', name: 'white', group: null },
      ],
      constraints: { maxColors: 8, locked: false, allowAlpha: true },
      ramps: [],
    });

    const app = createApp(projectPath);
    const res = await app.request('/api/validation/report?canvas=hero&include=all&palette=p8');
    expect(res.status).toBe(200);
    const report = await res.json();
    expect(Array.isArray(report.automatic.palette)).toBe(true);
    expect(report.automatic.accessibility).toBeDefined();
    expect(report.automatic.accessibility.paletteName).toBe('p8');
    expect(Array.isArray(report.automatic.asset)).toBe(true);
  });

  it('GET /validation/report?include=palette,accessibility includes just those sections', async () => {
    writePaletteJSON(projectPath, {
      name: 'p8',
      description: '',
      colors: [{ index: 0, hex: '#000000', name: 'black', group: null }],
      constraints: { maxColors: 8, locked: false, allowAlpha: true },
      ramps: [],
    });

    const app = createApp(projectPath);
    const res = await app.request(
      '/api/validation/report?canvas=hero&include=palette,accessibility&palette=p8',
    );
    const report = await res.json();
    expect(Array.isArray(report.automatic.palette)).toBe(true);
    expect(report.automatic.accessibility).toBeDefined();
    expect(report.automatic.asset).toBeUndefined();
  });

  it('GET /validation?openOnly=true filters resolved flags', async () => {
    const app = createApp(projectPath);
    await postFlag(app, { canvas: 'hero', severity: 'info', category: 'other', note: 'n1' });
    await postFlag(app, { canvas: 'hero', severity: 'info', category: 'other', note: 'n2' });
    await app.request('/api/validation/hero/flag-001/resolve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: 'done' }),
    });

    const all = await (await app.request('/api/validation?canvas=hero')).json();
    expect(all.flags).toHaveLength(2);

    const open = await (await app.request('/api/validation?canvas=hero&openOnly=true')).json();
    expect(open.flags).toHaveLength(1);
    expect(open.flags[0].id).toBe('flag-002');
  });
});
