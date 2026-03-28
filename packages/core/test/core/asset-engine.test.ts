import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { parseAssetSpec, validateAssetSpec, scaffoldAssetSpec, countAssetColors, computeFrameBoundingBox, resolveAnimationPivot, computeAnimationSpatialMetrics, validateCrossAnimationConsistency } from '../../src/core/asset-engine.js';
import { initProjectStructure, writeCanvasJSON, ensureCanvasStructure, writeLayerFrame } from '../../src/io/project-io.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { CanvasData } from '../../src/types/canvas.js';
import type { AssetSpec } from '../../src/types/asset.js';

// --- Test Helpers ---

function makeCanvas(overrides: Partial<CanvasData> = {}): CanvasData {
  return {
    name: 'hero',
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
    frames: [
      { id: 'frame-001', index: 0, duration: 100 },
      { id: 'frame-002', index: 1, duration: 100 },
      { id: 'frame-003', index: 2, duration: 100 },
      { id: 'frame-004', index: 3, duration: 100 },
      { id: 'frame-005', index: 4, duration: 100 },
      { id: 'frame-006', index: 5, duration: 100 },
      { id: 'frame-007', index: 6, duration: 100 },
      { id: 'frame-008', index: 7, duration: 100 },
    ],
    animationTags: [
      { name: 'idle', from: 0, to: 3, direction: 'forward', repeat: 0 },
      { name: 'walk', from: 4, to: 7, direction: 'forward', repeat: 0 },
    ],
    ...overrides,
  };
}

function makeValidSpec(overrides: Partial<AssetSpec> = {}): AssetSpec {
  return {
    name: 'hero',
    type: 'character-spritesheet',
    canvas: 'hero',
    frameSize: { width: 32, height: 32 },
    animations: [
      { name: 'idle', from: 0, to: 3, fps: 10, direction: 'forward', loop: true },
      { name: 'walk', from: 4, to: 7, fps: 12, direction: 'forward', loop: true },
    ],
    export: {
      engine: 'generic',
      scale: 1,
      layout: 'horizontal',
      padding: 0,
    },
    constraints: {
      requireAllFramesFilled: true,
    },
    ...overrides,
  };
}

// --- parseAssetSpec ---

describe('parseAssetSpec', () => {
  it('accepts a valid spec', () => {
    const { spec, errors } = parseAssetSpec(makeValidSpec());
    expect(errors).toHaveLength(0);
    expect(spec).not.toBeNull();
    expect(spec!.name).toBe('hero');
    expect(spec!.type).toBe('character-spritesheet');
  });

  it('rejects missing name', () => {
    const raw = makeValidSpec();
    delete (raw as Record<string, unknown>).name;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid asset name format', () => {
    const { spec, errors } = parseAssetSpec({ ...makeValidSpec(), name: 'My Hero!' });
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('rejects empty animations array', () => {
    const { spec, errors } = parseAssetSpec({ ...makeValidSpec(), animations: [] });
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('animations'))).toBe(true);
  });

  it('rejects fps out of range', () => {
    const raw = makeValidSpec();
    raw.animations[0].fps = 0;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('fps'))).toBe(true);
  });

  it('rejects scale > 8', () => {
    const raw = makeValidSpec();
    raw.export.scale = 16;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.some((e) => e.includes('scale'))).toBe(true);
  });

  it('rejects invalid type', () => {
    const raw = { ...makeValidSpec(), type: 'tileset' };
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('applies defaults for optional fields', () => {
    const raw = {
      name: 'hero',
      type: 'character-spritesheet',
      canvas: 'hero',
      frameSize: { width: 32, height: 32 },
      animations: [{ name: 'idle', from: 0, to: 3, fps: 10 }],
      export: {},
      constraints: {},
    };
    const { spec, errors } = parseAssetSpec(raw);
    expect(errors).toHaveLength(0);
    expect(spec!.export.engine).toBe('generic');
    expect(spec!.export.scale).toBe(1);
    expect(spec!.export.layout).toBe('horizontal');
    expect(spec!.animations[0].direction).toBe('forward');
    expect(spec!.animations[0].loop).toBe(true);
    expect(spec!.constraints.requireAllFramesFilled).toBe(true);
  });

  it('rejects negative from', () => {
    const raw = makeValidSpec();
    raw.animations[0].from = -1;
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts animation name with hyphens and underscores', () => {
    const raw = makeValidSpec();
    raw.animations = [{ name: 'walk-left_fast', from: 0, to: 3, fps: 10, direction: 'forward', loop: true }];
    const { spec, errors } = parseAssetSpec(raw);
    expect(errors).toHaveLength(0);
    expect(spec!.animations[0].name).toBe('walk-left_fast');
  });
});

// --- validateAssetSpec (requires project on disk) ---

describe('validateAssetSpec', () => {
  let tmpDir: string;
  let projectPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-asset-test-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');

    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    // Write a pixel to each frame so spatial validation doesn't flag empty frames
    for (const frame of canvas.frames) {
      const buf = new PixelBuffer(32, 32);
      buf.setPixel(16, 16, { r: 255, g: 0, b: 0, a: 255 });
      writeLayerFrame(projectPath, 'hero', 'layer-001', frame.id, buf);
    }
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes for a valid spec', () => {
    const result = validateAssetSpec(makeValidSpec(), projectPath);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('fails when canvas does not exist', () => {
    const spec = makeValidSpec({ canvas: 'nonexistent' });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toContain('not found');
  });

  it('fails when frameSize does not match canvas', () => {
    const spec = makeValidSpec({ frameSize: { width: 64, height: 64 } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'frameSize')).toBe(true);
  });

  it('fails when animation from > to', () => {
    const spec = makeValidSpec({
      animations: [{ name: 'broken', from: 5, to: 2, fps: 10, direction: 'forward', loop: true }],
    });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('from'))).toBe(true);
  });

  it('fails when animation references out-of-bounds frame', () => {
    const spec = makeValidSpec({
      animations: [{ name: 'oob', from: 0, to: 99, fps: 10, direction: 'forward', loop: true }],
    });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('only has'))).toBe(true);
  });

  it('fails when animations overlap', () => {
    const spec = makeValidSpec({
      animations: [
        { name: 'idle', from: 0, to: 4, fps: 10, direction: 'forward', loop: true },
        { name: 'walk', from: 3, to: 7, fps: 12, direction: 'forward', loop: true },
      ],
    });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('claimed by both'))).toBe(true);
  });

  it('warns when frames are not covered by any animation', () => {
    const spec = makeValidSpec({
      animations: [
        { name: 'idle', from: 0, to: 2, fps: 10, direction: 'forward', loop: true },
      ],
    });
    const result = validateAssetSpec(spec, projectPath);
    // Still valid (warnings don't block)
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.severity === 'warning' && i.message.includes('not assigned'))).toBe(true);
  });

  it('fails frameSizeMultipleOf constraint', () => {
    const spec = makeValidSpec({
      constraints: { frameSizeMultipleOf: 16, requireAllFramesFilled: true },
    });
    // 32x32 IS a multiple of 16, so this should pass
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);

    // Now test with a bad multiple
    const spec2 = makeValidSpec({
      constraints: { frameSizeMultipleOf: 24, requireAllFramesFilled: true },
    });
    const result2 = validateAssetSpec(spec2, projectPath);
    expect(result2.valid).toBe(false);
    expect(result2.issues.some((i) => i.field === 'constraints.frameSizeMultipleOf')).toBe(true);
  });
});

// --- scaffoldAssetSpec ---

describe('scaffoldAssetSpec', () => {
  it('creates spec from canvas with animation tags', () => {
    const canvas = makeCanvas();
    const spec = scaffoldAssetSpec('hero', canvas);

    expect(spec.name).toBe('hero');
    expect(spec.type).toBe('character-spritesheet');
    expect(spec.canvas).toBe('hero');
    expect(spec.frameSize).toEqual({ width: 32, height: 32 });
    expect(spec.animations).toHaveLength(2);
    expect(spec.animations[0].name).toBe('idle');
    expect(spec.animations[1].name).toBe('walk');
  });

  it('creates default idle animation when canvas has no tags', () => {
    const canvas = makeCanvas({ animationTags: [] });
    const spec = scaffoldAssetSpec('goblin', canvas);

    expect(spec.animations).toHaveLength(1);
    expect(spec.animations[0].name).toBe('idle');
    expect(spec.animations[0].from).toBe(0);
    expect(spec.animations[0].to).toBe(7); // 8 frames, 0-indexed
  });

  it('produces a spec that passes schema validation', () => {
    const canvas = makeCanvas();
    const spec = scaffoldAssetSpec('hero', canvas);
    const { errors } = parseAssetSpec(spec);
    expect(errors).toHaveLength(0);
  });
});

// --- maxColors enforcement (pixel-level) ---

describe('maxColors enforcement', () => {
  let tmpDir: string;
  let projectPath: string;

  /**
   * Creates a project with a canvas that has pixel data painted with specific colors.
   * Each frame gets the same colors painted onto layer-001.
   */
  function setupCanvasWithColors(colors: Array<{ r: number; g: number; b: number; a: number }>): void {
    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    // Paint colors onto each frame's layer
    for (const frame of canvas.frames) {
      const buf = new PixelBuffer(32, 32);
      // Paint each color on a different pixel
      for (let i = 0; i < colors.length; i++) {
        buf.setPixel(i % 32, Math.floor(i / 32), colors[i]);
      }
      writeLayerFrame(projectPath, 'hero', 'layer-001', frame.id, buf);
    }
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-maxcolors-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when color count is under maxColors limit', () => {
    // 3 colors, limit 8
    setupCanvasWithColors([
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 0, g: 0, b: 255, a: 255 },
    ]);

    const spec = makeValidSpec({ constraints: { maxColors: 8, requireAllFramesFilled: true } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.field === 'constraints.maxColors')).toHaveLength(0);
  });

  it('passes when color count exactly equals maxColors limit', () => {
    // 4 colors, limit 4
    setupCanvasWithColors([
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 0, g: 0, b: 255, a: 255 },
      { r: 255, g: 255, b: 0, a: 255 },
    ]);

    const spec = makeValidSpec({ constraints: { maxColors: 4, requireAllFramesFilled: true } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
  });

  it('fails when color count exceeds maxColors limit', () => {
    // 5 colors, limit 3
    setupCanvasWithColors([
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 0, g: 0, b: 255, a: 255 },
      { r: 255, g: 255, b: 0, a: 255 },
      { r: 128, g: 0, b: 128, a: 255 },
    ]);

    const spec = makeValidSpec({ constraints: { maxColors: 3, requireAllFramesFilled: true } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const maxColorsIssue = result.issues.find((i) => i.field === 'constraints.maxColors');
    expect(maxColorsIssue).toBeDefined();
    expect(maxColorsIssue!.severity).toBe('error');
    expect(maxColorsIssue!.message).toContain('5 unique colors');
    expect(maxColorsIssue!.message).toContain('maxColors is 3');
    expect(maxColorsIssue!.message).toContain('excess: 2');
  });

  it('ignores fully transparent pixels when counting colors', () => {
    // 2 opaque colors + 1 transparent = should count as 2
    setupCanvasWithColors([
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 100, g: 100, b: 100, a: 0 },  // transparent — ignored
    ]);

    const spec = makeValidSpec({ constraints: { maxColors: 2, requireAllFramesFilled: true } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
  });

  it('counts semi-transparent pixels as distinct colors', () => {
    // Same RGB but different alpha → different colors
    setupCanvasWithColors([
      { r: 255, g: 0, b: 0, a: 255 },
      { r: 255, g: 0, b: 0, a: 128 },  // same RGB, different alpha
    ]);

    const spec = makeValidSpec({ constraints: { maxColors: 2, requireAllFramesFilled: true } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);

    // But with limit 1, it should fail
    const spec2 = makeValidSpec({ constraints: { maxColors: 1, requireAllFramesFilled: true } });
    // maxColors min is 2 in schema, so use the countAssetColors directly
    const canvas = makeCanvas();
    const colors = countAssetColors(projectPath, 'hero', canvas);
    expect(colors.size).toBe(2);
  });

  it('skips maxColors check when constraint is not set', () => {
    // Many colors but no constraint → should pass
    const manyColors = Array.from({ length: 20 }, (_, i) => ({
      r: i * 10, g: 0, b: 0, a: 255,
    }));
    setupCanvasWithColors(manyColors);

    const spec = makeValidSpec({ constraints: { requireAllFramesFilled: true } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.field === 'constraints.maxColors')).toHaveLength(0);
  });

  it('counts colors across all frames, not just one', () => {
    // Frame 1 has red, Frame 2 has blue — total should be 2
    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    // Frame 1: only red
    const buf1 = new PixelBuffer(32, 32);
    buf1.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    writeLayerFrame(projectPath, 'hero', 'layer-001', canvas.frames[0].id, buf1);

    // Frame 2: only blue
    const buf2 = new PixelBuffer(32, 32);
    buf2.setPixel(0, 0, { r: 0, g: 0, b: 255, a: 255 });
    writeLayerFrame(projectPath, 'hero', 'layer-001', canvas.frames[1].id, buf2);

    // Remaining frames: one pixel (red) to satisfy requireAllFramesFilled
    for (let i = 2; i < canvas.frames.length; i++) {
      const buf = new PixelBuffer(32, 32);
      buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
      writeLayerFrame(projectPath, 'hero', 'layer-001', canvas.frames[i].id, buf);
    }

    const colors = countAssetColors(projectPath, 'hero', canvas);
    expect(colors.size).toBe(2);

    // With limit 2, should pass
    const spec = makeValidSpec({ constraints: { maxColors: 2, requireAllFramesFilled: true } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
  });
});

// --- computeFrameBoundingBox ---

describe('computeFrameBoundingBox', () => {
  it('returns null for an empty buffer', () => {
    const buf = new PixelBuffer(32, 32);
    expect(computeFrameBoundingBox(buf)).toBeNull();
  });

  it('returns correct box for a single pixel', () => {
    const buf = new PixelBuffer(32, 32);
    buf.setPixel(10, 15, { r: 255, g: 0, b: 0, a: 255 });
    const box = computeFrameBoundingBox(buf);
    expect(box).not.toBeNull();
    expect(box!.minX).toBe(10);
    expect(box!.minY).toBe(15);
    expect(box!.maxX).toBe(10);
    expect(box!.maxY).toBe(15);
    expect(box!.width).toBe(1);
    expect(box!.height).toBe(1);
    expect(box!.centerX).toBe(10.5);
    expect(box!.centerY).toBe(15.5);
  });

  it('returns correct box for a rectangular region', () => {
    const buf = new PixelBuffer(32, 32);
    // Draw a 4x6 block at (5, 10)
    for (let y = 10; y < 16; y++) {
      for (let x = 5; x < 9; x++) {
        buf.setPixel(x, y, { r: 0, g: 255, b: 0, a: 255 });
      }
    }
    const box = computeFrameBoundingBox(buf);
    expect(box).not.toBeNull();
    expect(box!.minX).toBe(5);
    expect(box!.minY).toBe(10);
    expect(box!.maxX).toBe(8);
    expect(box!.maxY).toBe(15);
    expect(box!.width).toBe(4);
    expect(box!.height).toBe(6);
    expect(box!.centerX).toBe(7);   // 5 + 4/2
    expect(box!.centerY).toBe(13);  // 10 + 6/2
  });

  it('ignores fully transparent pixels', () => {
    const buf = new PixelBuffer(32, 32);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 0 }); // transparent
    buf.setPixel(16, 16, { r: 0, g: 255, b: 0, a: 1 }); // barely visible
    const box = computeFrameBoundingBox(buf);
    expect(box).not.toBeNull();
    expect(box!.minX).toBe(16);
    expect(box!.minY).toBe(16);
  });
});

// --- Spatial consistency validation ---

describe('spatial consistency validation', () => {
  let tmpDir: string;
  let projectPath: string;

  function setupFramesWithContent(
    framePixels: Array<Array<{ x: number; y: number }>>,
    constraintOverrides: Partial<AssetSpec['constraints']> = {},
  ): AssetSpec {
    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    // Paint specified pixels on each frame
    for (let fi = 0; fi < canvas.frames.length; fi++) {
      const buf = new PixelBuffer(32, 32);
      const pixels = framePixels[fi] || [];
      for (const { x, y } of pixels) {
        buf.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
      }
      writeLayerFrame(projectPath, 'hero', 'layer-001', canvas.frames[fi].id, buf);
    }

    return makeValidSpec({
      constraints: {
        requireAllFramesFilled: true,
        ...constraintOverrides,
      },
    });
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-spatial-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when all frames have content and no drift check', () => {
    // All 8 frames with a pixel at center
    const pixels = Array.from({ length: 8 }, () => [{ x: 16, y: 16 }]);
    const spec = setupFramesWithContent(pixels);
    const result = validateAssetSpec(spec, projectPath);
    expect(result.issues.filter((i) => i.field.startsWith('spatial'))).toHaveLength(0);
  });

  it('fails when a frame in an animation is empty', () => {
    // Frame 0,1,3 have content; frame 2 is empty (in idle animation 0-3)
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [], // empty frame!
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels);
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const emptyIssue = result.issues.find((i) => i.message.includes('empty'));
    expect(emptyIssue).toBeDefined();
    expect(emptyIssue!.severity).toBe('error');
    expect(emptyIssue!.message).toContain('Frame 2');
    expect(emptyIssue!.message).toContain('idle');
  });

  it('skips empty frame check when requireAllFramesFilled is false', () => {
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [], // empty but allowed
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels, { requireAllFramesFilled: false });
    const result = validateAssetSpec(spec, projectPath);
    const emptyIssues = result.issues.filter((i) => i.message.includes('empty'));
    expect(emptyIssues).toHaveLength(0);
  });

  it('detects excessive drift between consecutive frames', () => {
    // idle animation (frames 0-3): frame 0 at x=5, frame 1 at x=20 → drift=15
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 5, y: 16 }],   // center at (5.5, 16.5)
      [{ x: 20, y: 16 }],  // center at (20.5, 16.5) → dx=15
      [{ x: 5, y: 16 }],
      [{ x: 5, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels, { maxFrameDrift: 4 });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const driftIssue = result.issues.find((i) => i.message.includes('drifts'));
    expect(driftIssue).toBeDefined();
    expect(driftIssue!.severity).toBe('error');
    expect(driftIssue!.message).toContain('Frame 1');
    expect(driftIssue!.message).toContain('idle');
    expect(driftIssue!.message).toContain('max: 4px');
  });

  it('passes when drift is exactly at the threshold', () => {
    // Single-pixel frames: center at (10.5, 16.5) and (14.5, 16.5) → dx=4.0
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 10, y: 16 }],
      [{ x: 14, y: 16 }],
      [{ x: 10, y: 16 }],
      [{ x: 10, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels, { maxFrameDrift: 4 });
    const result = validateAssetSpec(spec, projectPath);
    const driftIssues = result.issues.filter((i) => i.message.includes('drifts'));
    expect(driftIssues).toHaveLength(0);
  });

  it('fails when drift exceeds threshold by 1px', () => {
    // center at (10.5, 16.5) and (15.5, 16.5) → dx=5.0, threshold=4
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 10, y: 16 }],
      [{ x: 15, y: 16 }],
      [{ x: 10, y: 16 }],
      [{ x: 10, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels, { maxFrameDrift: 4 });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const driftIssues = result.issues.filter((i) => i.message.includes('drifts'));
    expect(driftIssues.length).toBeGreaterThan(0);
  });

  it('checks drift per-animation independently', () => {
    // idle (0-3): stable; walk (4-7): has drift
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 5, y: 16 }],   // walk starts
      [{ x: 25, y: 16 }],  // big drift in walk
      [{ x: 5, y: 16 }],
      [{ x: 5, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels, { maxFrameDrift: 2 });
    const result = validateAssetSpec(spec, projectPath);
    const driftIssues = result.issues.filter((i) => i.message.includes('drifts'));
    // Only walk animation should have drift issues
    expect(driftIssues.every((i) => i.message.includes('walk'))).toBe(true);
    expect(driftIssues.length).toBeGreaterThan(0);
  });

  it('skips drift check when maxFrameDrift is not set', () => {
    // Large jumps but no maxFrameDrift → no errors
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 0, y: 0 }],
      [{ x: 31, y: 31 }],
      [{ x: 0, y: 0 }],
      [{ x: 31, y: 31 }],
      [{ x: 0, y: 0 }],
      [{ x: 31, y: 31 }],
      [{ x: 0, y: 0 }],
      [{ x: 31, y: 31 }],
    ];
    const spec = setupFramesWithContent(pixels);
    const result = validateAssetSpec(spec, projectPath);
    const driftIssues = result.issues.filter((i) => i.message.includes('drifts'));
    expect(driftIssues).toHaveLength(0);
  });

  it('handles maxFrameDrift=0 (no movement allowed)', () => {
    // Even 1px drift should fail
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 16, y: 16 }],
      [{ x: 17, y: 16 }],  // 1px drift
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels, { maxFrameDrift: 0 });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('drifts'))).toBe(true);
  });

  it('skips drift comparison when previous frame was empty', () => {
    // Frame 1 is empty, frame 2 has content — no drift error for frame 2
    const pixels: Array<Array<{ x: number; y: number }>> = [
      [{ x: 16, y: 16 }],
      [], // empty
      [{ x: 5, y: 5 }],   // far from frame 0 but prev was empty
      [{ x: 5, y: 5 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
      [{ x: 16, y: 16 }],
    ];
    const spec = setupFramesWithContent(pixels, { maxFrameDrift: 1 });
    const result = validateAssetSpec(spec, projectPath);
    // Should have empty frame error but NOT a drift error for frame 2
    const driftIssues = result.issues.filter((i) => i.message.includes('drifts'));
    expect(driftIssues).toHaveLength(0);
    const emptyIssues = result.issues.filter((i) => i.message.includes('empty'));
    expect(emptyIssues).toHaveLength(1);
  });
});

// --- Pivot validation ---

describe('pivot validation', () => {
  let tmpDir: string;
  let projectPath: string;

  function setupFramesWithPixels(
    framePixels: Array<Array<{ x: number; y: number }>>,
  ): void {
    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    for (let fi = 0; fi < canvas.frames.length; fi++) {
      const buf = new PixelBuffer(32, 32);
      const pixels = framePixels[fi] || [];
      for (const { x, y } of pixels) {
        buf.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
      }
      writeLayerFrame(projectPath, 'hero', 'layer-001', canvas.frames[fi].id, buf);
    }
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-pivot-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes with a valid pivot inside content area', () => {
    // All frames have a 10x10 block at (10,10)→(19,19), pivot at (15,15)
    const block = [];
    for (let y = 10; y < 20; y++) {
      for (let x = 10; x < 20; x++) {
        block.push({ x, y });
      }
    }
    const pixels = Array.from({ length: 8 }, () => [...block]);
    setupFramesWithPixels(pixels);

    const spec = makeValidSpec({ pivot: { x: 15, y: 15 } });
    const result = validateAssetSpec(spec, projectPath);
    const pivotIssues = result.issues.filter((i) => i.field.startsWith('pivot'));
    expect(pivotIssues).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('fails when pivot is outside frame bounds', () => {
    const pixels = Array.from({ length: 8 }, () => [{ x: 16, y: 16 }]);
    setupFramesWithPixels(pixels);

    const spec = makeValidSpec({ pivot: { x: 32, y: 31 } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const pivotError = result.issues.find((i) => i.field === 'pivot' && i.severity === 'error');
    expect(pivotError).toBeDefined();
    expect(pivotError!.message).toContain('outside frame bounds');
  });

  it('fails when animation pivot is outside frame bounds', () => {
    const pixels = Array.from({ length: 8 }, () => [{ x: 16, y: 16 }]);
    setupFramesWithPixels(pixels);

    const spec = makeValidSpec({
      animations: [
        { name: 'idle', from: 0, to: 3, fps: 10, direction: 'forward', loop: true, pivot: { x: 16, y: 40 } },
        { name: 'walk', from: 4, to: 7, fps: 12, direction: 'forward', loop: true },
      ],
    });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(false);
    const pivotError = result.issues.find((i) => i.field === 'animations.idle.pivot');
    expect(pivotError).toBeDefined();
    expect(pivotError!.message).toContain('outside frame bounds');
  });

  it('warns when pivot is outside content bbox of a frame', () => {
    // Content at (5,5)→(10,10) but pivot at (25,25) — valid position but outside content
    const block = [];
    for (let y = 5; y <= 10; y++) {
      for (let x = 5; x <= 10; x++) {
        block.push({ x, y });
      }
    }
    const pixels = Array.from({ length: 8 }, () => [...block]);
    setupFramesWithPixels(pixels);

    const spec = makeValidSpec({ pivot: { x: 25, y: 25 } });
    const result = validateAssetSpec(spec, projectPath);
    // Still valid (warnings don't block)
    expect(result.valid).toBe(true);
    const pivotWarnings = result.issues.filter(
      (i) => i.field.startsWith('pivot.') && i.severity === 'warning',
    );
    expect(pivotWarnings.length).toBeGreaterThan(0);
    expect(pivotWarnings[0].message).toContain('outside content bbox');
  });

  it('resolves animation pivot override over asset pivot', () => {
    const spec = makeValidSpec({
      pivot: { x: 16, y: 31 },
      animations: [
        { name: 'idle', from: 0, to: 3, fps: 10, direction: 'forward', loop: true },
        { name: 'walk', from: 4, to: 7, fps: 12, direction: 'forward', loop: true, pivot: { x: 16, y: 28 } },
      ],
    });

    // idle uses asset pivot
    expect(resolveAnimationPivot(spec, 'idle')).toEqual({ x: 16, y: 31 });
    // walk uses its own pivot
    expect(resolveAnimationPivot(spec, 'walk')).toEqual({ x: 16, y: 28 });
  });

  it('returns undefined when no pivot is defined', () => {
    const spec = makeValidSpec();
    expect(resolveAnimationPivot(spec, 'idle')).toBeUndefined();
  });

  it('passes schema validation with pivot at (0,0)', () => {
    const raw = { ...makeValidSpec(), pivot: { x: 0, y: 0 } };
    const { spec, errors } = parseAssetSpec(raw);
    expect(errors).toHaveLength(0);
    expect(spec!.pivot).toEqual({ x: 0, y: 0 });
  });

  it('rejects negative pivot coordinates in schema', () => {
    const raw = { ...makeValidSpec(), pivot: { x: -1, y: 10 } };
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-integer pivot coordinates in schema', () => {
    const raw = { ...makeValidSpec(), pivot: { x: 16.5, y: 31 } };
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('scaffold generates bottom-center pivot', () => {
    const canvas = makeCanvas();
    const spec = scaffoldAssetSpec('hero', canvas);
    expect(spec.pivot).toEqual({ x: 16, y: 31 });
  });

  it('no warnings when pivot is at edge of content bbox', () => {
    // Content at (10,10)→(20,20), pivot at exactly (10,20) — on the edge
    const block = [];
    for (let y = 10; y <= 20; y++) {
      for (let x = 10; x <= 20; x++) {
        block.push({ x, y });
      }
    }
    const pixels = Array.from({ length: 8 }, () => [...block]);
    setupFramesWithPixels(pixels);

    const spec = makeValidSpec({ pivot: { x: 10, y: 20 } });
    const result = validateAssetSpec(spec, projectPath);
    expect(result.valid).toBe(true);
    const pivotWarnings = result.issues.filter(
      (i) => i.field.startsWith('pivot.') && i.severity === 'warning',
    );
    expect(pivotWarnings).toHaveLength(0);
  });
});

// --- Cross-animation spatial consistency ---

describe('cross-animation spatial consistency', () => {
  let tmpDir: string;
  let projectPath: string;

  /**
   * Setup frames with per-animation pixel regions.
   * idleRegion and walkRegion are {x, y, w, h} rectangles painted on their respective frames.
   */
  function setupAnimationsWithRegions(
    idleRegion: { x: number; y: number; w: number; h: number },
    walkRegion: { x: number; y: number; w: number; h: number },
    specOverrides: Partial<AssetSpec> = {},
  ): AssetSpec {
    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    // Paint idle frames (0-3) with idleRegion
    for (let fi = 0; fi <= 3; fi++) {
      const buf = new PixelBuffer(32, 32);
      for (let y = idleRegion.y; y < idleRegion.y + idleRegion.h; y++) {
        for (let x = idleRegion.x; x < idleRegion.x + idleRegion.w; x++) {
          buf.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
        }
      }
      writeLayerFrame(projectPath, 'hero', 'layer-001', canvas.frames[fi].id, buf);
    }

    // Paint walk frames (4-7) with walkRegion
    for (let fi = 4; fi <= 7; fi++) {
      const buf = new PixelBuffer(32, 32);
      for (let y = walkRegion.y; y < walkRegion.y + walkRegion.h; y++) {
        for (let x = walkRegion.x; x < walkRegion.x + walkRegion.w; x++) {
          buf.setPixel(x, y, { r: 0, g: 255, b: 0, a: 255 });
        }
      }
      writeLayerFrame(projectPath, 'hero', 'layer-001', canvas.frames[fi].id, buf);
    }

    return makeValidSpec({
      pivot: { x: 16, y: 31 },
      ...specOverrides,
    });
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-cross-anim-'));
    projectPath = path.join(tmpDir, 'test.pxc');
    initProjectStructure(projectPath, 'test');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when animations are spatially coherent', () => {
    // Both animations: 10x16 block centered at x=11-20, reaching y=15-30
    // Same baseline (maxY=30), same horizontal center
    const spec = setupAnimationsWithRegions(
      { x: 11, y: 15, w: 10, h: 16 },
      { x: 11, y: 15, w: 10, h: 16 },
    );
    const result = validateAssetSpec(spec, projectPath);
    const crossIssues = result.issues.filter((i) => i.field.startsWith('crossAnimation'));
    expect(crossIssues).toHaveLength(0);
  });

  it('detects baseline inconsistency between animations (error)', () => {
    // idle: block at y=15-30 → maxY=29, baselineOffset = 29 - 31 = -2
    // walk: block at y=10-22 → maxY=21, baselineOffset = 21 - 31 = -10
    // diff = 8px > 2px tolerance
    const spec = setupAnimationsWithRegions(
      { x: 11, y: 15, w: 10, h: 15 }, // maxY=29
      { x: 11, y: 10, w: 10, h: 12 }, // maxY=21
    );
    const result = validateAssetSpec(spec, projectPath);
    const baselineIssue = result.issues.find((i) => i.field === 'crossAnimation.baseline');
    expect(baselineIssue).toBeDefined();
    expect(baselineIssue!.severity).toBe('error');
    expect(baselineIssue!.message).toContain('Baseline inconsistency');
    expect(result.valid).toBe(false);
  });

  it('detects horizontal shift between animations (error)', () => {
    // idle: block at x=5-14 → centerX=9.5, centerOffsetX = 9.5 - 16 = -6.5
    // walk: block at x=20-29 → centerX=24.5, centerOffsetX = 24.5 - 16 = 8.5
    // diff = 15px > 2px tolerance
    const spec = setupAnimationsWithRegions(
      { x: 5, y: 15, w: 10, h: 16 },  // same baseline (y=30)
      { x: 20, y: 15, w: 10, h: 16 }, // same baseline but shifted right
    );
    const result = validateAssetSpec(spec, projectPath);
    const horizIssue = result.issues.find((i) => i.field === 'crossAnimation.horizontal');
    expect(horizIssue).toBeDefined();
    expect(horizIssue!.severity).toBe('error');
    expect(horizIssue!.message).toContain('Horizontal shift');
    expect(result.valid).toBe(false);
  });

  it('warns on extreme top extent ratio (not error)', () => {
    // idle: block at y=25-30 → topExtent = 31 - 25 = 6px
    // walk: block at y=5-30  → topExtent = 31 - 5 = 26px
    // ratio = 26/6 = 4.3x > 2.0x threshold
    // Same baseline (y=30) and same center → no baseline/horizontal error
    const spec = setupAnimationsWithRegions(
      { x: 11, y: 25, w: 10, h: 6 },  // short, near bottom
      { x: 11, y: 5, w: 10, h: 26 },  // tall, same bottom (maxY=30)
    );
    const result = validateAssetSpec(spec, projectPath);
    const topIssue = result.issues.find((i) => i.field === 'crossAnimation.topExtent');
    expect(topIssue).toBeDefined();
    expect(topIssue!.severity).toBe('warning');
    expect(topIssue!.message).toContain('Top extent varies');
    // Warnings don't block validity
    expect(result.valid).toBe(true);
  });

  it('respects custom tolerances from spec', () => {
    // idle: maxY=29, walk: maxY=25 → diff=4px
    // With baselineTolerance=5 → should pass
    const spec = setupAnimationsWithRegions(
      { x: 11, y: 15, w: 10, h: 15 }, // maxY=29
      { x: 11, y: 15, w: 10, h: 11 }, // maxY=25
      {
        constraints: {
          requireAllFramesFilled: true,
          spatialConsistency: {
            enabled: true,
            baselineTolerance: 5,
            horizontalTolerance: 5,
            topExtentRatio: 3.0,
            lateralExtentRatio: 3.0,
          },
        },
      },
    );
    const result = validateAssetSpec(spec, projectPath);
    const baselineIssue = result.issues.find((i) => i.field === 'crossAnimation.baseline');
    expect(baselineIssue).toBeUndefined();
  });

  it('skips cross-animation check when disabled', () => {
    // Big inconsistency but disabled
    const spec = setupAnimationsWithRegions(
      { x: 5, y: 5, w: 5, h: 5 },
      { x: 25, y: 25, w: 5, h: 5 },
      {
        constraints: {
          requireAllFramesFilled: true,
          spatialConsistency: { enabled: false },
        },
      },
    );
    const result = validateAssetSpec(spec, projectPath);
    const crossIssues = result.issues.filter((i) => i.field.startsWith('crossAnimation'));
    expect(crossIssues).toHaveLength(0);
  });

  it('skips when only one animation exists', () => {
    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    for (const frame of canvas.frames) {
      const buf = new PixelBuffer(32, 32);
      buf.setPixel(16, 16, { r: 255, g: 0, b: 0, a: 255 });
      writeLayerFrame(projectPath, 'hero', 'layer-001', frame.id, buf);
    }

    const spec = makeValidSpec({
      pivot: { x: 16, y: 31 },
      animations: [
        { name: 'idle', from: 0, to: 7, fps: 10, direction: 'forward', loop: true },
      ],
    });
    const result = validateAssetSpec(spec, projectPath);
    const crossIssues = result.issues.filter((i) => i.field.startsWith('crossAnimation'));
    expect(crossIssues).toHaveLength(0);
  });

  it('skips when no pivot is defined', () => {
    const canvas = makeCanvas();
    writeCanvasJSON(projectPath, 'hero', canvas);
    ensureCanvasStructure(projectPath, 'hero', canvas);

    for (const frame of canvas.frames) {
      const buf = new PixelBuffer(32, 32);
      buf.setPixel(16, 16, { r: 255, g: 0, b: 0, a: 255 });
      writeLayerFrame(projectPath, 'hero', 'layer-001', frame.id, buf);
    }

    const spec = makeValidSpec(); // no pivot
    const result = validateAssetSpec(spec, projectPath);
    const crossIssues = result.issues.filter((i) => i.field.startsWith('crossAnimation'));
    expect(crossIssues).toHaveLength(0);
  });

  it('detects lateral extent warning for attack animation', () => {
    // idle: 6x16 block (narrow)
    // walk: 24x16 block (wide, like swinging a weapon)
    // ratio = 24/6 = 4x > 2.0x
    // Same center and baseline
    const spec = setupAnimationsWithRegions(
      { x: 13, y: 15, w: 6, h: 16 },  // narrow, centered near x=16
      { x: 4, y: 15, w: 24, h: 16 },  // wide, centered near x=16
    );
    const result = validateAssetSpec(spec, projectPath);
    const lateralIssue = result.issues.find((i) => i.field === 'crossAnimation.lateralExtent');
    expect(lateralIssue).toBeDefined();
    expect(lateralIssue!.severity).toBe('warning');
    expect(lateralIssue!.message).toContain('Lateral extent varies');
  });

  it('passes baseline check when difference is within tolerance', () => {
    // idle: maxY=29, walk: maxY=28 → diff=1px ≤ 2px tolerance
    const spec = setupAnimationsWithRegions(
      { x: 11, y: 14, w: 10, h: 16 }, // maxY=29
      { x: 11, y: 15, w: 10, h: 14 }, // maxY=28
    );
    const result = validateAssetSpec(spec, projectPath);
    const baselineIssue = result.issues.find((i) => i.field === 'crossAnimation.baseline');
    expect(baselineIssue).toBeUndefined();
  });

  it('schema accepts spatialConsistency config', () => {
    const raw = {
      ...makeValidSpec(),
      constraints: {
        requireAllFramesFilled: true,
        spatialConsistency: {
          baselineTolerance: 4,
          horizontalTolerance: 3,
          topExtentRatio: 3.0,
          lateralExtentRatio: 2.5,
        },
      },
    };
    const { spec, errors } = parseAssetSpec(raw);
    expect(errors).toHaveLength(0);
    expect(spec!.constraints.spatialConsistency).toBeDefined();
    expect(spec!.constraints.spatialConsistency!.baselineTolerance).toBe(4);
    expect(spec!.constraints.spatialConsistency!.enabled).toBe(true); // default
  });

  it('schema rejects invalid spatialConsistency values', () => {
    const raw = {
      ...makeValidSpec(),
      constraints: {
        requireAllFramesFilled: true,
        spatialConsistency: {
          baselineTolerance: -1, // invalid
        },
      },
    };
    const { spec, errors } = parseAssetSpec(raw);
    expect(spec).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });
});
