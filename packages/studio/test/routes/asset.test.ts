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
  ensureCanvasStructure,
  writeLayerFrame,
  writeAssetSpec,
  PixelBuffer,
} from '@pixelcreator/core';
import type {
  CanvasData,
  BiomeBlendAssetSpec,
  CharacterSpritesheetAssetSpec,
  RGBA,
} from '@pixelcreator/core';

let tmpDir: string;
let projectPath: string;

function seedSolidCanvas(name: string, color: RGBA): void {
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
  const buf = new PixelBuffer(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) buf.setPixel(x, y, color);
  }
  writeLayerFrame(projectPath, name, 'layer-001', 'frame-001', buf);
  const project = readProjectJSON(projectPath);
  project.canvases.push(name);
  writeProjectJSON(projectPath, project);
}

function makeBlendSpec(
  overrides: Partial<BiomeBlendAssetSpec> = {},
): BiomeBlendAssetSpec {
  return {
    name: 'grass-to-sand',
    type: 'biome-blend',
    tileSize: { width: 16, height: 16 },
    source: { canvas: 'grass' },
    target: { canvas: 'sand' },
    blend: { mode: 'dither', strength: 0.5, includeInverse: false },
    export: { engine: 'generic', scale: 1, spacing: 0 },
    constraints: {},
    ...overrides,
  };
}

function makeCharSpec(): CharacterSpritesheetAssetSpec {
  return {
    name: 'hero',
    type: 'character-spritesheet',
    canvas: 'grass',
    frameSize: { width: 16, height: 16 },
    animations: [
      { name: 'idle', from: 0, to: 0, fps: 10, direction: 'forward', loop: true },
    ],
    export: { engine: 'generic', scale: 1, layout: 'horizontal', padding: 0 },
    constraints: { requireAllFramesFilled: true },
  };
}

describe('asset API', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-asset-api-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test-project');
    seedSolidCanvas('grass', { r: 60, g: 180, b: 60, a: 255 });
    seedSolidCanvas('sand', { r: 230, g: 200, b: 140, a: 255 });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /api/asset returns an empty list when no specs exist', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/asset');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { assets: unknown[] };
    expect(body.assets).toEqual([]);
  });

  it('GET /api/asset summarizes biome-blend specs with source/target/mode', async () => {
    writeAssetSpec(projectPath, makeBlendSpec());
    writeAssetSpec(projectPath, makeCharSpec());

    const app = createApp(projectPath);
    const res = await app.request('/api/asset');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      assets: Array<Record<string, unknown>>;
    };
    expect(body.assets).toHaveLength(2);
    const blend = body.assets.find((a) => a.name === 'grass-to-sand');
    expect(blend).toMatchObject({
      type: 'biome-blend',
      sourceCanvas: 'grass',
      targetCanvas: 'sand',
      blendMode: 'dither',
      includeInverse: false,
    });
    const char = body.assets.find((a) => a.name === 'hero');
    expect(char).toMatchObject({ type: 'character-spritesheet' });
  });

  it('GET /api/asset/:name/biome-blend/preview.png returns a PNG', async () => {
    writeAssetSpec(projectPath, makeBlendSpec());
    const app = createApp(projectPath);
    const res = await app.request(
      '/api/asset/grass-to-sand/biome-blend/preview.png',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
  });

  it('GET /api/asset/:name/biome-blend/preview.png 400s for non-biome-blend asset', async () => {
    writeAssetSpec(projectPath, makeCharSpec());
    const app = createApp(projectPath);
    const res = await app.request('/api/asset/hero/biome-blend/preview.png');
    expect(res.status).toBe(400);
  });

  it('GET /api/asset/:name/biome-blend/preview.png 404s for missing asset', async () => {
    const app = createApp(projectPath);
    const res = await app.request('/api/asset/ghost/biome-blend/preview.png');
    expect(res.status).toBe(404);
  });

  it('alpha-mask preview is also served', async () => {
    writeAssetSpec(
      projectPath,
      makeBlendSpec({
        blend: { mode: 'alpha-mask', strength: 1, includeInverse: false },
      }),
    );
    const app = createApp(projectPath);
    const res = await app.request(
      '/api/asset/grass-to-sand/biome-blend/preview.png?scale=2',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });
});
