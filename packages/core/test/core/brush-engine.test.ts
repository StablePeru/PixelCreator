import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  createBrushMask,
  generateDiamondMask,
  applyBrushStamp,
  applyBrushStroke,
  computeSymmetryPoints,
  applySymmetricStroke,
  interpolateStrokePoints,
  pixelPerfectFilter,
  createDefaultPresets,
  validateBrushPreset,
} from '../../src/core/brush-engine.js';
import type { RGBA } from '../../src/types/common.js';
import type { BrushPreset, SymmetryConfig } from '../../src/types/brush.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

const pixelPreset: BrushPreset = {
  id: 'test-pixel',
  name: 'Pixel',
  size: 1,
  shape: 'square',
  spacing: 1,
  opacity: 255,
  pixelPerfect: true,
};

const round3Preset: BrushPreset = {
  id: 'test-round3',
  name: 'Round 3',
  size: 3,
  shape: 'circle',
  spacing: 1,
  opacity: 255,
  pixelPerfect: false,
};

describe('createBrushMask', () => {
  it('creates a 1x1 square mask', () => {
    const mask = createBrushMask({ ...pixelPreset, size: 1, shape: 'square' });
    expect(mask).toEqual([[true]]);
  });

  it('creates a 3x3 square mask', () => {
    const mask = createBrushMask({ ...pixelPreset, size: 3, shape: 'square' });
    expect(mask.length).toBe(3);
    expect(mask[0].length).toBe(3);
    expect(mask.flat().every(v => v === true)).toBe(true);
  });

  it('creates a 3x3 circle mask', () => {
    const mask = createBrushMask({ ...round3Preset });
    expect(mask.length).toBe(3);
    // Center and cardinal neighbors should be true
    expect(mask[1][1]).toBe(true);
    expect(mask[0][1]).toBe(true);
    expect(mask[1][0]).toBe(true);
  });

  it('creates a 3x3 diamond mask', () => {
    const mask = createBrushMask({ ...pixelPreset, size: 3, shape: 'diamond' });
    expect(mask[1][1]).toBe(true); // center
    expect(mask[0][1]).toBe(true); // top
    expect(mask[1][0]).toBe(true); // left
    expect(mask[0][0]).toBe(false); // corner
  });

  it('creates even-sized square mask', () => {
    const mask = createBrushMask({ ...pixelPreset, size: 2, shape: 'square' });
    expect(mask.length).toBe(2);
    expect(mask[0].length).toBe(2);
    expect(mask.flat().every(v => v === true)).toBe(true);
  });

  it('uses custom pattern when provided', () => {
    const pattern = [[true, false], [false, true]];
    const mask = createBrushMask({ ...pixelPreset, size: 2, shape: 'custom', pattern });
    expect(mask).toEqual(pattern);
  });
});

describe('generateDiamondMask', () => {
  it('generates correct diamond for size 3', () => {
    const mask = generateDiamondMask(3);
    expect(mask[0][0]).toBe(false);
    expect(mask[0][1]).toBe(true);
    expect(mask[1][1]).toBe(true);
  });
});

describe('applyBrushStamp', () => {
  it('stamps a single pixel with 1x1 mask', () => {
    const buf = new PixelBuffer(8, 8);
    const mask = [[true]];
    applyBrushStamp(buf, 3, 4, RED, mask);
    expect(buf.getPixel(3, 4)).toEqual(RED);
    expect(buf.getPixel(2, 4)).toEqual(TRANSPARENT);
  });

  it('stamps a 3x3 square mask', () => {
    const buf = new PixelBuffer(8, 8);
    const mask = [[true, true, true], [true, true, true], [true, true, true]];
    applyBrushStamp(buf, 4, 4, RED, mask);
    // Center and all neighbors should be colored
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(3, 3)).toEqual(RED);
    expect(buf.getPixel(5, 5)).toEqual(RED);
  });

  it('clips at canvas edges', () => {
    const buf = new PixelBuffer(4, 4);
    const mask = [[true, true, true], [true, true, true], [true, true, true]];
    // Stamp near corner, should not throw
    applyBrushStamp(buf, 0, 0, RED, mask);
    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(1, 0)).toEqual(RED);
    expect(buf.getPixel(0, 1)).toEqual(RED);
  });

  it('applies partial opacity with blending', () => {
    const buf = new PixelBuffer(4, 4);
    const mask = [[true]];
    applyBrushStamp(buf, 1, 1, RED, mask, 128);
    const pixel = buf.getPixel(1, 1);
    // Should have partial alpha
    expect(pixel.a).toBeGreaterThan(0);
    expect(pixel.a).toBeLessThan(255);
    expect(pixel.r).toBe(255);
  });
});

describe('applyBrushStroke', () => {
  it('draws a single-point stroke', () => {
    const buf = new PixelBuffer(8, 8);
    applyBrushStroke(buf, [{ x: 3, y: 3 }], RED, pixelPreset);
    expect(buf.getPixel(3, 3)).toEqual(RED);
  });

  it('draws a horizontal stroke with pixel preset', () => {
    const buf = new PixelBuffer(8, 8);
    applyBrushStroke(buf, [{ x: 0, y: 0 }, { x: 4, y: 0 }], RED, pixelPreset);
    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(4, 0)).toEqual(RED);
  });

  it('draws a stroke with a larger brush', () => {
    const buf = new PixelBuffer(16, 16);
    applyBrushStroke(buf, [{ x: 8, y: 8 }], GREEN, round3Preset);
    // Center and neighbors should be colored (3px circle)
    expect(buf.getPixel(8, 8)).toEqual(GREEN);
    expect(buf.getPixel(8, 7)).toEqual(GREEN);
  });

  it('applies pixel-perfect filter for 1px strokes', () => {
    const buf = new PixelBuffer(8, 8);
    // L-shaped stroke: right then down - middle point should be filtered
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    applyBrushStroke(buf, points, RED, pixelPreset);
    expect(buf.getPixel(0, 0)).toEqual(RED);
    expect(buf.getPixel(2, 2)).toEqual(RED);
  });
});

describe('computeSymmetryPoints', () => {
  it('returns single point for mode none', () => {
    const pts = computeSymmetryPoints(3, 4, { mode: 'none' }, 16, 16);
    expect(pts).toEqual([{ x: 3, y: 4 }]);
  });

  it('mirrors horizontally around center', () => {
    const pts = computeSymmetryPoints(2, 4, { mode: 'horizontal', axisX: 8 }, 16, 16);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 2, y: 4 });
    expect(pts[1]).toEqual({ x: 13, y: 4 });
  });

  it('mirrors vertically around center', () => {
    const pts = computeSymmetryPoints(4, 2, { mode: 'vertical', axisY: 8 }, 16, 16);
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ x: 4, y: 2 });
    expect(pts[1]).toEqual({ x: 4, y: 13 });
  });

  it('mirrors both axes producing 4 points', () => {
    const pts = computeSymmetryPoints(2, 2, { mode: 'both', axisX: 8, axisY: 8 }, 16, 16);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ x: 2, y: 2 });
    expect(pts[1]).toEqual({ x: 13, y: 2 });
    expect(pts[2]).toEqual({ x: 2, y: 13 });
    expect(pts[3]).toEqual({ x: 13, y: 13 });
  });

  it('uses canvas center as default axis', () => {
    const pts = computeSymmetryPoints(1, 1, { mode: 'horizontal' }, 8, 8);
    expect(pts).toHaveLength(2);
    // axisX defaults to 4 (floor(8/2))
    expect(pts[1]).toEqual({ x: 6, y: 1 });
  });

  it('produces correct radial-4 points', () => {
    const config: SymmetryConfig = {
      mode: 'radial',
      radialSegments: 4,
      radialCenterX: 8,
      radialCenterY: 8,
    };
    const pts = computeSymmetryPoints(12, 8, config, 16, 16);
    expect(pts).toHaveLength(4);
    // Original: right of center (12,8)
    // 90: below center (8,12)
    // 180: left of center (4,8)
    // 270: above center (8,4)
    expect(pts).toContainEqual({ x: 12, y: 8 });
    expect(pts).toContainEqual({ x: 8, y: 12 });
    expect(pts).toContainEqual({ x: 4, y: 8 });
    expect(pts).toContainEqual({ x: 8, y: 4 });
  });

  it('produces correct radial-6 points', () => {
    const config: SymmetryConfig = {
      mode: 'radial',
      radialSegments: 6,
      radialCenterX: 8,
      radialCenterY: 8,
    };
    const pts = computeSymmetryPoints(12, 8, config, 16, 16);
    expect(pts).toHaveLength(6);
  });

  it('deduplicates radial points on center', () => {
    const config: SymmetryConfig = {
      mode: 'radial',
      radialSegments: 4,
      radialCenterX: 8,
      radialCenterY: 8,
    };
    const pts = computeSymmetryPoints(8, 8, config, 16, 16);
    // All rotations of center produce the same point
    expect(pts).toHaveLength(1);
    expect(pts[0]).toEqual({ x: 8, y: 8 });
  });
});

describe('applySymmetricStroke', () => {
  it('draws on both sides with horizontal symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const symmetry: SymmetryConfig = { mode: 'horizontal', axisX: 8 };
    applySymmetricStroke(buf, [{ x: 2, y: 8 }], RED, pixelPreset, symmetry);
    expect(buf.getPixel(2, 8)).toEqual(RED);
    expect(buf.getPixel(13, 8)).toEqual(RED);
  });

  it('draws on 4 sides with both symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const symmetry: SymmetryConfig = { mode: 'both', axisX: 8, axisY: 8 };
    applySymmetricStroke(buf, [{ x: 2, y: 2 }], RED, pixelPreset, symmetry);
    expect(buf.getPixel(2, 2)).toEqual(RED);
    expect(buf.getPixel(13, 2)).toEqual(RED);
    expect(buf.getPixel(2, 13)).toEqual(RED);
    expect(buf.getPixel(13, 13)).toEqual(RED);
  });

  it('falls back to normal stroke for symmetry none', () => {
    const buf = new PixelBuffer(8, 8);
    applySymmetricStroke(buf, [{ x: 3, y: 3 }], RED, pixelPreset, { mode: 'none' });
    expect(buf.getPixel(3, 3)).toEqual(RED);
  });

  it('handles radial symmetry strokes', () => {
    const buf = new PixelBuffer(16, 16);
    const symmetry: SymmetryConfig = {
      mode: 'radial',
      radialSegments: 4,
      radialCenterX: 8,
      radialCenterY: 8,
    };
    applySymmetricStroke(buf, [{ x: 12, y: 8 }], RED, pixelPreset, symmetry);
    expect(buf.getPixel(12, 8)).toEqual(RED);
    expect(buf.getPixel(4, 8)).toEqual(RED);
    expect(buf.getPixel(8, 12)).toEqual(RED);
    expect(buf.getPixel(8, 4)).toEqual(RED);
  });
});

describe('interpolateStrokePoints', () => {
  it('returns empty array for empty input', () => {
    expect(interpolateStrokePoints([], 1)).toEqual([]);
  });

  it('returns single point for single input', () => {
    const result = interpolateStrokePoints([{ x: 5, y: 5 }], 1);
    expect(result).toEqual([{ x: 5, y: 5 }]);
  });

  it('produces points with correct spacing', () => {
    const result = interpolateStrokePoints([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2);
    // Should have first point + spaced points
    expect(result.length).toBeGreaterThan(2);
    // All points should be on y=0
    for (const p of result) {
      expect(p.y).toBe(0);
    }
  });
});

describe('pixelPerfectFilter', () => {
  it('returns points unchanged for 2 or fewer', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(pixelPerfectFilter(pts)).toEqual(pts);
  });

  it('preserves straight lines', () => {
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
    expect(pixelPerfectFilter(pts)).toEqual(pts);
  });

  it('removes L-shaped double pixels', () => {
    // H→V corner: (0,0)→(1,0)→(1,1) — right then down, creates fat corner at (1,0)
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
    const filtered = pixelPerfectFilter(pts);
    // The middle (1,0) is an axis-aligned L-corner → removed
    expect(filtered).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  });
});

describe('createDefaultPresets', () => {
  it('returns 8 default presets', () => {
    const presets = createDefaultPresets();
    expect(presets).toHaveLength(8);
  });

  it('all presets are valid', () => {
    const presets = createDefaultPresets();
    for (const p of presets) {
      expect(validateBrushPreset(p).valid).toBe(true);
    }
  });
});

describe('validateBrushPreset', () => {
  it('rejects invalid presets', () => {
    const result = validateBrushPreset({ id: '', name: '', size: 0, shape: 'invalid' });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});
