import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  validateTilesetAssetSpec,
  buildTilesetAsset,
  scaffoldTilesetAssetSpec,
} from '../../src/core/asset-tileset-engine.js';
import { parseAssetSpec, validateAssetSpec, buildAsset } from '../../src/core/asset-engine.js';
import {
  initProjectStructure,
  writeCanvasJSON,
  ensureCanvasStructure,
  writeLayerFrame,
} from '../../src/io/project-io.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { CanvasData } from '../../src/types/canvas.js';
import type { TilesetAssetSpec } from '../../src/types/asset.js';

// --- Test Helpers ---

function makeTilesetCanvas(overrides: Partial<CanvasData> = {}): CanvasData {
  return {
    name: 'terrain',
    width: 32,
    height: 32,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    palette: null,
    layers: [
      {
        id: 'layer-001',
        name: 'base',
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
    ...overrides,
  };
}

function makeValidTilesetSpec(
  overrides: Partial<TilesetAssetSpec> = {},
): TilesetAssetSpec {
  return {
    name: 'terrain',
    type: 'tileset',
    canvas: 'terrain',
    tileSize: { width: 16, height: 16 },
    export: {
      engine: 'generic',
      scale: 1,
      spacing: 0,
    },
    constraints: {
      requireAllTilesUnique: false,
    },
    ...overrides,
  };
}

// Fill the canvas with 4 distinct 16x16 tiles arranged in a 2x2 grid.
function paintFourUniqueTiles(
  projectPath: string,
  canvas: CanvasData,
): void {
  const buf = new PixelBuffer(canvas.width, canvas.height);
  const colors = [
    { r: 255, g: 0, b: 0, a: 255 },
    { r: 0, g: 255, b: 0, a: 255 },
    { r: 0, g: 0, b: 255, a: 255 },
    { r: 255, g: 255, b: 0, a: 255 },
  ];
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      const color = colors[ty * 2 + tx];
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          buf.setPixel(tx * 16 + x, ty * 16 + y, color);
        }
      }
    }
  }
  writeLayerFrame(projectPath, canvas.name, 'layer-001', 'frame-001', buf);
}

// --- Schema parsing ---

describe('parseAssetSpec (tileset variant)', () => {
  it('accepts a valid tileset spec', () => {
    const { spec, errors } = parseAssetSpec(makeValidTilesetSpec());
    expect(errors).toHaveLength(0);
    expect(spec).not.toBeNull();
    expect(spec!.type).toBe('tileset');
    if (spec && spec.type === 'tileset') {
      expect(spec.tileSize).toEqual({ width: 16, height: 16 });
    }
  });

  it('rejects a tileset spec missing tileSize', () => {
    const raw = { ...makeValidTilesetSpec() } as Record<string, unknown>;
    delete raw.tileSize;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('tileSize'))).toBe(true);
  });

  it('applies defaults for optional tileset fields', () => {
    const raw = {
      name: 'terrain',
      type: 'tileset',
      canvas: 'terrain',
      tileSize: { width: 16, height: 16 },
      export: {},
      constraints: {},
    };
    const { spec, errors } = parseAssetSpec(raw);
    expect(errors).toHaveLength(0);
    expect(spec!.export.engine).toBe('generic');
    expect(spec!.export.scale).toBe(1);
    if (spec && spec.type === 'tileset') {
      expect(spec.export.spacing).toBe(0);
      expect(spec.constraints.requireAllTilesUnique).toBe(false);
    }
  });
});

// --- Validation ---

describe('validateTilesetAssetSpec', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tileset-asset-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');

    const canvas = makeTilesetCanvas();
    writeCanvasJSON(projectPath, 'terrain', canvas);
    ensureCanvasStructure(projectPath, 'terrain', canvas);
    paintFourUniqueTiles(projectPath, canvas);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes for a valid tileset spec', () => {
    const result = validateTilesetAssetSpec(makeValidTilesetSpec(), projectPath);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('fails when canvas does not exist', () => {
    const spec = makeValidTilesetSpec({ canvas: 'missing' });
    const result = validateTilesetAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain('not found');
  });

  it('fails when canvas is not divisible by tileSize', () => {
    const spec = makeValidTilesetSpec({ tileSize: { width: 15, height: 15 } });
    const result = validateTilesetAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'tileSize')).toBe(true);
  });

  it('fails when tileSizeMultipleOf is violated', () => {
    const spec = makeValidTilesetSpec({
      tileSize: { width: 8, height: 8 },
      constraints: { tileSizeMultipleOf: 16, requireAllTilesUnique: false },
    });
    const result = validateTilesetAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((i) => i.field === 'constraints.tileSizeMultipleOf'),
    ).toBe(true);
  });

  it('fails when requireAllTilesUnique is set but duplicates exist', () => {
    // Re-paint the canvas with identical tiles
    const buf = new PixelBuffer(32, 32);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        buf.setPixel(x, y, { r: 100, g: 100, b: 100, a: 255 });
      }
    }
    writeLayerFrame(projectPath, 'terrain', 'layer-001', 'frame-001', buf);

    const spec = makeValidTilesetSpec({
      constraints: { requireAllTilesUnique: true },
    });
    const result = validateTilesetAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((i) => i.field === 'constraints.requireAllTilesUnique'),
    ).toBe(true);
  });

  it('passes requireAllTilesUnique when all tiles differ', () => {
    const spec = makeValidTilesetSpec({
      constraints: { requireAllTilesUnique: true },
    });
    const result = validateTilesetAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
  });

  it('enforces maxColors constraint', () => {
    const spec = makeValidTilesetSpec({
      constraints: { requireAllTilesUnique: false, maxColors: 2 },
    });
    const result = validateTilesetAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((i) => i.field === 'constraints.maxColors'),
    ).toBe(true);
  });

  it('rejects tile metadata with out-of-range index', () => {
    const spec = makeValidTilesetSpec({
      tiles: [{ index: 99, label: 'ghost' }],
    });
    const result = validateTilesetAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'tiles')).toBe(true);
  });
});

// --- Build pipeline ---

describe('buildTilesetAsset', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-tileset-build-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');

    const canvas = makeTilesetCanvas();
    writeCanvasJSON(projectPath, 'terrain', canvas);
    ensureCanvasStructure(projectPath, 'terrain', canvas);
    paintFourUniqueTiles(projectPath, canvas);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces PNG atlas + metadata for generic engine', () => {
    const spec = makeValidTilesetSpec();
    const result = buildTilesetAsset(spec, projectPath, path.join(tmpDir, 'out'));

    expect(result.validation.valid).toBe(true);
    const filenames = result.files.map((f) => f.name);
    expect(filenames).toContain('terrain_tileset.png');
    expect(filenames).toContain('terrain.tileset.json');
    expect(filenames).toContain('terrain.asset.json');
  });

  it('produces PNG atlas + .tres for godot engine', () => {
    const spec = makeValidTilesetSpec({
      export: { engine: 'godot', scale: 1, spacing: 0 },
    });
    const result = buildTilesetAsset(spec, projectPath, path.join(tmpDir, 'out'));

    expect(result.validation.valid).toBe(true);
    const filenames = result.files.map((f) => f.name);
    expect(filenames).toContain('terrain_tileset.png');
    expect(filenames).toContain('terrain.tres');

    const tres = result.files.find((f) => f.name === 'terrain.tres')!
      .content as string;
    expect(tres).toContain('[gd_resource type="TileSet" format=3');
    expect(tres).toContain('tile_size = Vector2i(16, 16)');
    expect(tres).toContain('sources/0 = SubResource("TileSetAtlasSource_1")');
  });

  it('returns empty files when validation fails', () => {
    const spec = makeValidTilesetSpec({ canvas: 'missing' });
    const result = buildTilesetAsset(spec, projectPath, path.join(tmpDir, 'out'));
    expect(result.validation.valid).toBe(false);
    expect(result.files).toHaveLength(0);
  });
});

// --- Dispatching entry points ---

describe('validateAssetSpec / buildAsset (dispatch)', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-dispatch-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');

    const canvas = makeTilesetCanvas();
    writeCanvasJSON(projectPath, 'terrain', canvas);
    ensureCanvasStructure(projectPath, 'terrain', canvas);
    paintFourUniqueTiles(projectPath, canvas);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validateAssetSpec dispatches tileset → validateTilesetAssetSpec', () => {
    const result = validateAssetSpec(makeValidTilesetSpec(), projectPath);
    expect(result.valid).toBe(true);
  });

  it('buildAsset dispatches tileset → buildTilesetAsset', () => {
    const result = buildAsset(
      makeValidTilesetSpec(),
      projectPath,
      path.join(tmpDir, 'out'),
    );
    expect(result.validation.valid).toBe(true);
    expect(result.files.map((f) => f.name)).toContain('terrain_tileset.png');
  });
});

// --- Scaffold ---

describe('scaffoldTilesetAssetSpec', () => {
  it('returns a spec with sensible defaults', () => {
    const canvas = makeTilesetCanvas();
    const spec = scaffoldTilesetAssetSpec('terrain', canvas, {
      width: 16,
      height: 16,
    });

    expect(spec.type).toBe('tileset');
    expect(spec.name).toBe('terrain');
    expect(spec.canvas).toBe('terrain');
    expect(spec.tileSize).toEqual({ width: 16, height: 16 });
    expect(spec.export.engine).toBe('generic');
    expect(spec.constraints.requireAllTilesUnique).toBe(false);
  });
});
