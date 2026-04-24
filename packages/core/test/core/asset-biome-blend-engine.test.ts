import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  validateBiomeBlendAssetSpec,
  buildBiomeBlendAsset,
  scaffoldBiomeBlendAssetSpec,
} from '../../src/core/asset-biome-blend-engine.js';
import { parseAssetSpec, validateAssetSpec, buildAsset } from '../../src/core/asset-engine.js';
import {
  initProjectStructure,
  writeCanvasJSON,
  ensureCanvasStructure,
  writeLayerFrame,
} from '../../src/io/project-io.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { CanvasData } from '../../src/types/canvas.js';
import type { BiomeBlendAssetSpec } from '../../src/types/asset.js';
import type { RGBA } from '../../src/types/common.js';

// --- Test Helpers ---

function makeValidBiomeBlendSpec(
  overrides: Partial<BiomeBlendAssetSpec> = {},
): BiomeBlendAssetSpec {
  return {
    name: 'grass-to-sand',
    type: 'biome-blend',
    tileSize: { width: 16, height: 16 },
    source: { canvas: 'grass' },
    target: { canvas: 'sand' },
    blend: {
      mode: 'dither',
      strength: 0.5,
      includeInverse: false,
    },
    export: {
      engine: 'generic',
      scale: 1,
      spacing: 0,
    },
    constraints: {},
    ...overrides,
  };
}

function makeBiomeCanvas(name: string, overrides: Partial<CanvasData> = {}): CanvasData {
  return {
    name,
    width: 16,
    height: 16,
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

function paintSolidCanvas(
  projectPath: string,
  canvas: CanvasData,
  color: RGBA,
): void {
  const buf = new PixelBuffer(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      buf.setPixel(x, y, color);
    }
  }
  writeLayerFrame(projectPath, canvas.name, 'layer-001', 'frame-001', buf);
}

const GRASS: RGBA = { r: 60, g: 180, b: 60, a: 255 };
const SAND: RGBA = { r: 230, g: 200, b: 140, a: 255 };

// --- Schema parsing ---

describe('parseAssetSpec (biome-blend variant)', () => {
  it('accepts a valid biome-blend spec', () => {
    const { spec, errors } = parseAssetSpec(makeValidBiomeBlendSpec());
    expect(errors).toHaveLength(0);
    expect(spec).not.toBeNull();
    expect(spec!.type).toBe('biome-blend');
    if (spec && spec.type === 'biome-blend') {
      expect(spec.tileSize).toEqual({ width: 16, height: 16 });
      expect(spec.source.canvas).toBe('grass');
      expect(spec.target.canvas).toBe('sand');
      expect(spec.blend.mode).toBe('dither');
    }
  });

  it('rejects a biome-blend spec missing tileSize', () => {
    const raw = { ...makeValidBiomeBlendSpec() } as Record<string, unknown>;
    delete raw.tileSize;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('tileSize'))).toBe(true);
  });

  it('rejects a biome-blend spec missing source.canvas', () => {
    const raw = {
      ...makeValidBiomeBlendSpec(),
      source: {},
    } as Record<string, unknown>;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('source.canvas'))).toBe(true);
  });

  it('rejects a biome-blend spec missing target.canvas', () => {
    const raw = {
      ...makeValidBiomeBlendSpec(),
      target: {},
    } as Record<string, unknown>;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('target.canvas'))).toBe(true);
  });

  it('accepts the alpha-mask blend mode', () => {
    const raw = {
      ...makeValidBiomeBlendSpec(),
      blend: { mode: 'alpha-mask', strength: 0.5, includeInverse: false },
    };
    const { spec, errors } = parseAssetSpec(raw);
    expect(errors).toHaveLength(0);
    expect(spec).not.toBeNull();
    if (spec && spec.type === 'biome-blend') {
      expect(spec.blend.mode).toBe('alpha-mask');
    }
  });

  it('rejects unknown blend modes', () => {
    const raw = {
      ...makeValidBiomeBlendSpec(),
      blend: { mode: 'not-a-real-mode', strength: 0.5, includeInverse: false },
    };
    const { spec } = parseAssetSpec(raw);
    expect(spec).toBeNull();
  });

  it('rejects blend.strength outside [0,1]', () => {
    const raw = {
      ...makeValidBiomeBlendSpec(),
      blend: { mode: 'dither', strength: 1.5, includeInverse: false },
    };
    const { spec } = parseAssetSpec(raw);
    expect(spec).toBeNull();
  });

  it('applies defaults for optional biome-blend fields', () => {
    const raw = {
      name: 'grass-to-sand',
      type: 'biome-blend',
      tileSize: { width: 16, height: 16 },
      source: { canvas: 'grass' },
      target: { canvas: 'sand' },
      blend: { mode: 'dither' },
      export: {},
      constraints: {},
    };
    const { spec, errors } = parseAssetSpec(raw);
    expect(errors).toHaveLength(0);
    expect(spec!.type).toBe('biome-blend');
    if (spec && spec.type === 'biome-blend') {
      expect(spec.blend.strength).toBeGreaterThanOrEqual(0);
      expect(spec.blend.strength).toBeLessThanOrEqual(1);
      expect(spec.blend.includeInverse).toBe(false);
      expect(spec.export.engine).toBe('generic');
      expect(spec.export.scale).toBe(1);
      expect(spec.export.spacing).toBe(0);
    }
  });
});

// --- Validation ---

describe('validateBiomeBlendAssetSpec', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-biome-blend-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');

    const grass = makeBiomeCanvas('grass');
    const sand = makeBiomeCanvas('sand');
    writeCanvasJSON(projectPath, 'grass', grass);
    ensureCanvasStructure(projectPath, 'grass', grass);
    paintSolidCanvas(projectPath, grass, GRASS);

    writeCanvasJSON(projectPath, 'sand', sand);
    ensureCanvasStructure(projectPath, 'sand', sand);
    paintSolidCanvas(projectPath, sand, SAND);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes for a valid spec', () => {
    const result = validateBiomeBlendAssetSpec(makeValidBiomeBlendSpec(), projectPath);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('fails when source canvas does not exist', () => {
    const spec = makeValidBiomeBlendSpec({ source: { canvas: 'missing' } });
    const result = validateBiomeBlendAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'source.canvas')).toBe(true);
  });

  it('fails when target canvas does not exist', () => {
    const spec = makeValidBiomeBlendSpec({ target: { canvas: 'missing' } });
    const result = validateBiomeBlendAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'target.canvas')).toBe(true);
  });

  it('fails when tileSize does not evenly divide source canvas', () => {
    const spec = makeValidBiomeBlendSpec({ tileSize: { width: 7, height: 7 } });
    const result = validateBiomeBlendAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'tileSize')).toBe(true);
  });

  it('fails when tileSizeMultipleOf is violated', () => {
    const spec = makeValidBiomeBlendSpec({
      tileSize: { width: 8, height: 8 },
      constraints: { tileSizeMultipleOf: 16 },
    });
    const result = validateBiomeBlendAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some((i) => i.field === 'constraints.tileSizeMultipleOf'),
    ).toBe(true);
  });

  it('enforces maxColors with an actionable palette hint', () => {
    const spec = makeValidBiomeBlendSpec({
      constraints: { maxColors: 1 },
    });
    const result = validateBiomeBlendAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const issue = result.issues.find((i) => i.field === 'constraints.maxColors');
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('palette:generate');
  });

  it('alpha-mask mode enforces maxColors on the generated atlas, not just biomas', () => {
    // Source + target = 2 unique colors. In dither mode, maxColors=2 passes.
    // In alpha-mask mode the interpolation creates intermediate shades, so
    // maxColors=2 must fail with the same actionable palette hint.
    const spec = makeValidBiomeBlendSpec({
      blend: { mode: 'alpha-mask', strength: 1, includeInverse: false },
      constraints: { maxColors: 2 },
    });
    const result = validateBiomeBlendAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const issue = result.issues.find((i) => i.field === 'constraints.maxColors');
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('palette:generate');
  });

  it('alpha-mask mode passes when maxColors is large enough for the atlas', () => {
    const spec = makeValidBiomeBlendSpec({
      blend: { mode: 'alpha-mask', strength: 1, includeInverse: false },
      constraints: { maxColors: 256 },
    });
    const result = validateBiomeBlendAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
  });
});

// --- Build pipeline ---

describe('buildBiomeBlendAsset', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-biome-blend-build-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');

    const grass = makeBiomeCanvas('grass');
    const sand = makeBiomeCanvas('sand');
    writeCanvasJSON(projectPath, 'grass', grass);
    ensureCanvasStructure(projectPath, 'grass', grass);
    paintSolidCanvas(projectPath, grass, GRASS);

    writeCanvasJSON(projectPath, 'sand', sand);
    ensureCanvasStructure(projectPath, 'sand', sand);
    paintSolidCanvas(projectPath, sand, SAND);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces PNG atlas + metadata for generic engine', () => {
    const spec = makeValidBiomeBlendSpec();
    const result = buildBiomeBlendAsset(spec, projectPath, path.join(tmpDir, 'out'));

    expect(result.validation.valid).toBe(true);
    const filenames = result.files.map((f) => f.name);
    expect(filenames).toContain('grass-to-sand_blend.png');
    expect(filenames).toContain('grass-to-sand.blend.json');
    expect(filenames).toContain('grass-to-sand.asset.json');
  });

  it('produces PNG atlas + .tres for godot engine', () => {
    const spec = makeValidBiomeBlendSpec({
      export: { engine: 'godot', scale: 1, spacing: 0 },
    });
    const result = buildBiomeBlendAsset(spec, projectPath, path.join(tmpDir, 'out'));

    expect(result.validation.valid).toBe(true);
    const filenames = result.files.map((f) => f.name);
    expect(filenames).toContain('grass-to-sand_blend.png');
    expect(filenames).toContain('grass-to-sand.tres');

    const tres = result.files.find((f) => f.name === 'grass-to-sand.tres')!
      .content as string;
    expect(tres).toContain('[gd_resource type="TileSet" format=3');
    expect(tres).toContain('tile_size = Vector2i(16, 16)');
    expect(tres).toContain('sources/0 = SubResource("TileSetAtlasSource_1")');
  });

  it('doubles the tile count when includeInverse is set', () => {
    const spec = makeValidBiomeBlendSpec({
      blend: { mode: 'dither', strength: 0.5, includeInverse: true },
      export: { engine: 'generic', scale: 1, spacing: 0 },
    });
    const result = buildBiomeBlendAsset(spec, projectPath, path.join(tmpDir, 'out'));
    expect(result.validation.valid).toBe(true);

    const metadata = JSON.parse(
      result.files.find((f) => f.name === 'grass-to-sand.blend.json')!.content as string,
    );
    expect(metadata.tileCount).toBe(94);
  });

  it('returns empty files when validation fails', () => {
    const spec = makeValidBiomeBlendSpec({ source: { canvas: 'missing' } });
    const result = buildBiomeBlendAsset(spec, projectPath, path.join(tmpDir, 'out'));
    expect(result.validation.valid).toBe(false);
    expect(result.files).toHaveLength(0);
  });

  it('alpha-mask build records the blend mode in metadata', () => {
    const spec = makeValidBiomeBlendSpec({
      blend: { mode: 'alpha-mask', strength: 1, includeInverse: false },
    });
    const result = buildBiomeBlendAsset(spec, projectPath, path.join(tmpDir, 'out'));
    expect(result.validation.valid).toBe(true);
    const metadata = JSON.parse(
      result.files.find((f) => f.name === 'grass-to-sand.blend.json')!.content as string,
    );
    expect(metadata.blend.mode).toBe('alpha-mask');
  });
});

// --- Dispatching entry points ---

describe('validateAssetSpec / buildAsset (dispatch)', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-biome-blend-dispatch-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');

    const grass = makeBiomeCanvas('grass');
    const sand = makeBiomeCanvas('sand');
    writeCanvasJSON(projectPath, 'grass', grass);
    ensureCanvasStructure(projectPath, 'grass', grass);
    paintSolidCanvas(projectPath, grass, GRASS);

    writeCanvasJSON(projectPath, 'sand', sand);
    ensureCanvasStructure(projectPath, 'sand', sand);
    paintSolidCanvas(projectPath, sand, SAND);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validateAssetSpec dispatches biome-blend → validateBiomeBlendAssetSpec', () => {
    const result = validateAssetSpec(makeValidBiomeBlendSpec(), projectPath);
    expect(result.valid).toBe(true);
  });

  it('buildAsset dispatches biome-blend → buildBiomeBlendAsset', () => {
    const result = buildAsset(
      makeValidBiomeBlendSpec(),
      projectPath,
      path.join(tmpDir, 'out'),
    );
    expect(result.validation.valid).toBe(true);
    expect(result.files.map((f) => f.name)).toContain('grass-to-sand_blend.png');
  });
});

// --- Scaffold ---

describe('scaffoldBiomeBlendAssetSpec', () => {
  it('returns a spec with sensible defaults', () => {
    const spec = scaffoldBiomeBlendAssetSpec('grass-to-sand', 'grass', 'sand', {
      width: 16,
      height: 16,
    });

    expect(spec.type).toBe('biome-blend');
    expect(spec.name).toBe('grass-to-sand');
    expect(spec.source.canvas).toBe('grass');
    expect(spec.target.canvas).toBe('sand');
    expect(spec.tileSize).toEqual({ width: 16, height: 16 });
    expect(spec.blend.mode).toBe('dither');
    expect(spec.blend.includeInverse).toBe(false);
    expect(spec.export.engine).toBe('generic');
  });
});
