import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { mergeLayerBuffers, resizeBuffer } from '../../src/core/layer-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('mergeLayerBuffers', () => {
  it('merges opaque top onto bottom', () => {
    const bottom = new PixelBuffer(4, 4);
    bottom.setPixel(0, 0, RED);
    const top = new PixelBuffer(4, 4);
    top.setPixel(0, 0, GREEN);

    const result = mergeLayerBuffers(bottom, top, 255);
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });

  it('preserves bottom where top is transparent', () => {
    const bottom = new PixelBuffer(4, 4);
    bottom.setPixel(1, 1, RED);
    const top = new PixelBuffer(4, 4);

    const result = mergeLayerBuffers(bottom, top, 255);
    expect(result.getPixel(1, 1)).toEqual(RED);
  });

  it('applies top opacity', () => {
    const bottom = new PixelBuffer(4, 4);
    const top = new PixelBuffer(4, 4);
    top.setPixel(0, 0, GREEN);

    const result = mergeLayerBuffers(bottom, top, 128);
    const p = result.getPixel(0, 0);
    // Should have reduced alpha
    expect(p.a).toBeLessThan(255);
    expect(p.g).toBe(255);
  });

  it('returns clone of bottom when top is empty', () => {
    const bottom = new PixelBuffer(4, 4);
    bottom.setPixel(2, 2, RED);
    const top = new PixelBuffer(4, 4);

    const result = mergeLayerBuffers(bottom, top, 255);
    expect(result.getPixel(2, 2)).toEqual(RED);
    // Should be a new buffer (not same reference)
    bottom.setPixel(2, 2, GREEN);
    expect(result.getPixel(2, 2)).toEqual(RED);
  });
});

describe('resizeBuffer', () => {
  it('extends canvas with top-left anchor', () => {
    const src = new PixelBuffer(4, 4);
    src.setPixel(0, 0, RED);

    const result = resizeBuffer(src, 8, 8, 'top-left');
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.getPixel(0, 0)).toEqual(RED);
    expect(result.getPixel(7, 7)).toEqual(TRANSPARENT);
  });

  it('extends canvas with center anchor', () => {
    const src = new PixelBuffer(4, 4);
    src.setPixel(0, 0, RED);

    const result = resizeBuffer(src, 8, 8, 'center');
    // offset = floor((8-4)/2) = 2
    expect(result.getPixel(2, 2)).toEqual(RED);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('extends canvas with bottom-right anchor', () => {
    const src = new PixelBuffer(4, 4);
    src.setPixel(3, 3, RED);

    const result = resizeBuffer(src, 8, 8, 'bottom-right');
    // offset = 8-4 = 4, so pixel at (3,3) maps to (7,7)
    expect(result.getPixel(7, 7)).toEqual(RED);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('crops canvas with top-left anchor', () => {
    const src = new PixelBuffer(8, 8);
    src.setPixel(0, 0, RED);
    src.setPixel(7, 7, GREEN);

    const result = resizeBuffer(src, 4, 4, 'top-left');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.getPixel(0, 0)).toEqual(RED);
    // (7,7) is outside the cropped area
  });

  it('handles same size with any anchor', () => {
    const src = new PixelBuffer(4, 4);
    src.setPixel(2, 2, RED);

    const result = resizeBuffer(src, 4, 4, 'center');
    expect(result.getPixel(2, 2)).toEqual(RED);
  });
});
