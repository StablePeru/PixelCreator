import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  drawWithBrush,
  drawSymmetricPixel,
  drawSymmetricLine,
} from '../../src/core/drawing-engine.js';
import { createBrushMask } from '../../src/core/brush-engine.js';
import type { RGBA } from '../../src/types/common.js';
import type { SymmetryConfig } from '../../src/types/brush.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('drawSymmetricPixel', () => {
  it('draws pixel with horizontal symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const sym: SymmetryConfig = { mode: 'horizontal', axisX: 8 };
    drawSymmetricPixel(buf, 2, 5, RED, sym, 16, 16);
    expect(buf.getPixel(2, 5)).toEqual(RED);
    expect(buf.getPixel(13, 5)).toEqual(RED);
  });

  it('draws pixel with vertical symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const sym: SymmetryConfig = { mode: 'vertical', axisY: 8 };
    drawSymmetricPixel(buf, 5, 2, GREEN, sym, 16, 16);
    expect(buf.getPixel(5, 2)).toEqual(GREEN);
    expect(buf.getPixel(5, 13)).toEqual(GREEN);
  });

  it('draws pixel with both axes symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const sym: SymmetryConfig = { mode: 'both', axisX: 8, axisY: 8 };
    drawSymmetricPixel(buf, 2, 2, RED, sym, 16, 16);
    expect(buf.getPixel(2, 2)).toEqual(RED);
    expect(buf.getPixel(13, 2)).toEqual(RED);
    expect(buf.getPixel(2, 13)).toEqual(RED);
    expect(buf.getPixel(13, 13)).toEqual(RED);
  });

  it('draws single pixel with no symmetry', () => {
    const buf = new PixelBuffer(8, 8);
    drawSymmetricPixel(buf, 3, 3, RED, { mode: 'none' }, 8, 8);
    expect(buf.getPixel(3, 3)).toEqual(RED);
    expect(buf.getPixel(4, 3)).toEqual(TRANSPARENT);
  });
});

describe('drawSymmetricLine', () => {
  it('draws line with horizontal symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const sym: SymmetryConfig = { mode: 'horizontal', axisX: 8 };
    drawSymmetricLine(buf, 1, 4, 1, 8, RED, sym, 16, 16);
    // Original line at x=1
    expect(buf.getPixel(1, 4)).toEqual(RED);
    expect(buf.getPixel(1, 8)).toEqual(RED);
    // Mirrored line at x=14
    expect(buf.getPixel(14, 4)).toEqual(RED);
    expect(buf.getPixel(14, 8)).toEqual(RED);
  });

  it('draws line with both axes symmetry', () => {
    const buf = new PixelBuffer(16, 16);
    const sym: SymmetryConfig = { mode: 'both', axisX: 8, axisY: 8 };
    drawSymmetricLine(buf, 1, 1, 3, 1, RED, sym, 16, 16);
    // Original
    expect(buf.getPixel(1, 1)).toEqual(RED);
    expect(buf.getPixel(3, 1)).toEqual(RED);
    // Mirrored horizontally
    expect(buf.getPixel(14, 1)).toEqual(RED);
    // Mirrored vertically
    expect(buf.getPixel(1, 14)).toEqual(RED);
    // Mirrored both
    expect(buf.getPixel(14, 14)).toEqual(RED);
  });

  it('draws line with no symmetry', () => {
    const buf = new PixelBuffer(8, 8);
    drawSymmetricLine(buf, 0, 0, 4, 0, RED, { mode: 'none' }, 8, 8);
    for (let x = 0; x <= 4; x++) {
      expect(buf.getPixel(x, 0)).toEqual(RED);
    }
    expect(buf.getPixel(0, 1)).toEqual(TRANSPARENT);
  });
});

describe('drawWithBrush', () => {
  it('draws single pixel with 1x1 mask', () => {
    const buf = new PixelBuffer(8, 8);
    const mask = createBrushMask({ id: 't', name: 't', size: 1, shape: 'square', spacing: 1, opacity: 255, pixelPerfect: false });
    drawWithBrush(buf, [{ x: 3, y: 3 }], RED, mask);
    expect(buf.getPixel(3, 3)).toEqual(RED);
  });

  it('draws with 3x3 circle brush', () => {
    const buf = new PixelBuffer(16, 16);
    const mask = createBrushMask({ id: 't', name: 't', size: 3, shape: 'circle', spacing: 1, opacity: 255, pixelPerfect: false });
    drawWithBrush(buf, [{ x: 8, y: 8 }], GREEN, mask);
    expect(buf.getPixel(8, 8)).toEqual(GREEN);
    expect(buf.getPixel(8, 7)).toEqual(GREEN);
  });

  it('draws with custom mask brush', () => {
    const buf = new PixelBuffer(8, 8);
    const mask = [[true, false], [false, true]];
    drawWithBrush(buf, [{ x: 4, y: 4 }], RED, mask);
    // Only checkerboard pixels should be set
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(3, 3)).toEqual(RED);
  });
});
