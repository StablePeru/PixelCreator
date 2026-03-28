import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  extractFrameMetadata,
  extractAnimations,
  exportGodotSpriteFrames,
  exportGodotTileset,
  exportGodotScene,
  exportUnitySpriteSheet,
  exportGenericMetadata,
  exportToGameEngine,
  writeExportFiles,
} from '../../src/core/gamedev-engine.js';
import { initProjectStructure, readProjectJSON, writeProjectJSON, writeCanvasJSON, writeLayerFrame, ensureCanvasStructure } from '../../src/io/project-io.js';
import { PixelBuffer, createEmptyBuffer } from '../../src/io/png-codec.js';
import type { CanvasData } from '../../src/types/canvas.js';
import type { SpriteFrameExport, AnimationExport } from '../../src/types/gamedev.js';

let tmpDir: string;
let projectPath: string;

function createTestCanvas(name: string, frameCount: number = 2): CanvasData {
  const canvas: CanvasData = {
    name, width: 16, height: 16,
    created: new Date().toISOString(), modified: new Date().toISOString(),
    palette: null,
    layers: [{ id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 }],
    frames: Array.from({ length: frameCount }, (_, i) => ({ id: `frame-${String(i + 1).padStart(3, '0')}`, index: i, duration: 100 })),
    animationTags: [{ name: 'idle', from: 0, to: frameCount - 1, direction: 'forward' as const, repeat: 0 }],
  };
  ensureCanvasStructure(projectPath, name, canvas);
  writeCanvasJSON(projectPath, name, canvas);
  for (const frame of canvas.frames) {
    writeLayerFrame(projectPath, name, 'layer-001', frame.id, createEmptyBuffer(16, 16));
  }
  const project = readProjectJSON(projectPath);
  project.canvases.push(name);
  writeProjectJSON(projectPath, project);
  return canvas;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-gamedev-'));
  projectPath = path.join(tmpDir, 'test.pxc');
  initProjectStructure(projectPath, 'test-project');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('extractFrameMetadata', () => {
  it('extracts correct frame positions', () => {
    const canvas = createTestCanvas('sprite', 3);
    const frames = extractFrameMetadata(canvas, 16, 16);
    expect(frames).toHaveLength(3);
    expect(frames[0].x).toBe(0);
    expect(frames[1].x).toBe(16);
    expect(frames[2].x).toBe(32);
    expect(frames[0].width).toBe(16);
  });

  it('uses frame labels when available', () => {
    const canvas = createTestCanvas('sprite', 2);
    canvas.frames[0].label = 'idle_0';
    const frames = extractFrameMetadata(canvas, 16, 16);
    expect(frames[0].name).toBe('idle_0');
  });
});

describe('extractAnimations', () => {
  it('creates animation from tags', () => {
    const canvas = createTestCanvas('sprite', 4);
    const frames = extractFrameMetadata(canvas, 16, 16);
    const anims = extractAnimations(canvas, frames);
    expect(anims).toHaveLength(1);
    expect(anims[0].name).toBe('idle');
    expect(anims[0].frames).toHaveLength(4);
  });

  it('creates default animation when no tags', () => {
    const canvas = createTestCanvas('sprite', 2);
    canvas.animationTags = [];
    const frames = extractFrameMetadata(canvas, 16, 16);
    const anims = extractAnimations(canvas, frames);
    expect(anims[0].name).toBe('default');
  });
});

describe('exportGodotSpriteFrames', () => {
  it('generates valid .tres format', () => {
    const anims: AnimationExport[] = [{
      name: 'idle', fps: 10, loop: true, direction: 'forward',
      frames: [{ name: 'f0', x: 0, y: 0, width: 16, height: 16, duration: 100 }],
    }];
    const tres = exportGodotSpriteFrames('sheet.png', anims);
    expect(tres).toContain('[gd_resource type="SpriteFrames"');
    expect(tres).toContain('AtlasTexture');
    expect(tres).toContain('"idle"');
    expect(tres).toContain('animations = [');
  });

  it('creates unique atlas sub-resources', () => {
    const anims: AnimationExport[] = [{
      name: 'walk', fps: 10, loop: true, direction: 'forward',
      frames: [
        { name: 'f0', x: 0, y: 0, width: 16, height: 16, duration: 100 },
        { name: 'f1', x: 16, y: 0, width: 16, height: 16, duration: 100 },
      ],
    }];
    const tres = exportGodotSpriteFrames('sheet.png', anims);
    expect(tres).toContain('atlas_1');
    expect(tres).toContain('atlas_2');
  });
});

describe('exportGodotTileset', () => {
  it('generates TileSet resource', () => {
    const tileset = { name: 'tiles', width: 64, height: 32, tileWidth: 16, tileHeight: 16, tiles: [{}, {}, {}, {}] } as any;
    const tres = exportGodotTileset(tileset, 'tileset.png');
    expect(tres).toContain('[gd_resource type="TileSet"');
    expect(tres).toContain('tile_size = Vector2i(16, 16)');
  });
});

describe('exportUnitySpriteSheet', () => {
  it('generates Unity sprite metadata', () => {
    const frames: SpriteFrameExport[] = [
      { name: 'idle_0', x: 0, y: 0, width: 16, height: 16, duration: 100 },
    ];
    const anims: AnimationExport[] = [
      { name: 'idle', fps: 10, loop: true, direction: 'forward', frames },
    ];
    const unity = exportUnitySpriteSheet('player', 'player_sheet.png', frames, anims);
    expect(unity.name).toBe('player');
    expect(unity.sprites).toHaveLength(1);
    expect(unity.sprites[0].pivot).toEqual({ x: 0.5, y: 0.5 });
    expect(unity.animations).toHaveLength(1);
    expect(unity.animations[0].sprites).toEqual(['idle_0']);
  });
});

describe('exportGenericMetadata', () => {
  it('includes all canvas info', () => {
    const canvas = createTestCanvas('sprite', 2);
    const frames = extractFrameMetadata(canvas, 16, 16);
    const anims = extractAnimations(canvas, frames);
    const meta = exportGenericMetadata('sprite', canvas, frames, anims);
    expect(meta.generator).toBe('PixelCreator');
    expect(meta.canvas).toBe('sprite');
    expect((meta.size as any).width).toBe(16);
    expect((meta.frames as any[]).length).toBe(2);
  });
});

describe('exportToGameEngine', () => {
  it('generates Godot files', () => {
    createTestCanvas('player', 2);
    const result = exportToGameEngine(projectPath, {
      engine: 'godot', canvas: 'player', includeAnimations: true,
      includeTileset: false, scale: 1, outputDir: '',
    });
    expect(result.files.length).toBeGreaterThanOrEqual(2);
    const names = result.files.map(f => f.name);
    expect(names.some(n => n.endsWith('.tres'))).toBe(true);
    expect(names.some(n => n.endsWith('.png'))).toBe(true);
  });

  it('generates Unity files', () => {
    createTestCanvas('player', 2);
    const result = exportToGameEngine(projectPath, {
      engine: 'unity', canvas: 'player', includeAnimations: true,
      includeTileset: false, scale: 1, outputDir: '',
    });
    const names = result.files.map(f => f.name);
    expect(names.some(n => n.endsWith('.json'))).toBe(true);
    expect(names.some(n => n.endsWith('.png'))).toBe(true);
  });

  it('generates generic files', () => {
    createTestCanvas('player', 2);
    const result = exportToGameEngine(projectPath, {
      engine: 'generic', canvas: 'player', includeAnimations: true,
      includeTileset: false, scale: 1, outputDir: '',
    });
    const names = result.files.map(f => f.name);
    expect(names.some(n => n.includes('metadata'))).toBe(true);
  });
});

describe('writeExportFiles', () => {
  it('writes files to output directory', () => {
    const outDir = path.join(tmpDir, 'export-out');
    createTestCanvas('player', 2);
    const result = exportToGameEngine(projectPath, {
      engine: 'godot', canvas: 'player', includeAnimations: true,
      includeTileset: false, scale: 1, outputDir: outDir,
    });
    const written = writeExportFiles(outDir, result.files);
    expect(written.length).toBeGreaterThan(0);
    for (const f of written) {
      expect(fs.existsSync(f)).toBe(true);
    }
  });
});
