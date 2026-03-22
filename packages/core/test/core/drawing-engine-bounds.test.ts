import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { computeContentBounds, extractRegion } from '../../src/core/drawing-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };

describe('computeContentBounds', () => {
  it('returns null for empty buffer', () => {
    const buf = new PixelBuffer(8, 8);
    expect(computeContentBounds(buf)).toBeNull();
  });

  it('computes bounds for single pixel', () => {
    const buf = new PixelBuffer(8, 8);
    buf.setPixel(3, 5, RED);
    const bounds = computeContentBounds(buf);
    expect(bounds).toEqual({ x: 3, y: 5, width: 1, height: 1 });
  });

  it('computes bounds for filled region', () => {
    const buf = new PixelBuffer(8, 8);
    buf.setPixel(2, 1, RED);
    buf.setPixel(5, 6, RED);
    const bounds = computeContentBounds(buf);
    expect(bounds).toEqual({ x: 2, y: 1, width: 4, height: 6 });
  });

  it('includes all non-transparent pixels', () => {
    const buf = new PixelBuffer(8, 8);
    buf.setPixel(0, 0, RED);
    buf.setPixel(7, 7, RED);
    const bounds = computeContentBounds(buf);
    expect(bounds).toEqual({ x: 0, y: 0, width: 8, height: 8 });
  });
});

describe('extractRegion', () => {
  it('extracts a sub-region', () => {
    const buf = new PixelBuffer(8, 8);
    buf.setPixel(2, 2, RED);
    buf.setPixel(3, 3, RED);

    const region = extractRegion(buf, 2, 2, 3, 3);
    expect(region.width).toBe(3);
    expect(region.height).toBe(3);
    expect(region.getPixel(0, 0)).toEqual(RED);
    expect(region.getPixel(1, 1)).toEqual(RED);
    expect(region.getPixel(2, 0).a).toBe(0);
  });

  it('handles out-of-bounds gracefully', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(3, 3, RED);

    const region = extractRegion(buf, 2, 2, 4, 4);
    expect(region.width).toBe(4);
    expect(region.height).toBe(4);
    expect(region.getPixel(1, 1)).toEqual(RED);
    // Out-of-bounds areas should be transparent
    expect(region.getPixel(3, 3).a).toBe(0);
  });
});
