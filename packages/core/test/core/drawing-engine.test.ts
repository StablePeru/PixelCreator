import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  drawPixel,
  drawLine,
  drawRect,
  floodFill,
  replaceColor,
} from '../../src/core/drawing-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('drawPixel', () => {
  it('sets a pixel at given coordinates', () => {
    const buf = new PixelBuffer(8, 8);
    drawPixel(buf, 3, 4, RED);
    expect(buf.getPixel(3, 4)).toEqual(RED);
  });

  it('ignores out-of-bounds pixels', () => {
    const buf = new PixelBuffer(8, 8);
    drawPixel(buf, -1, 0, RED);
    drawPixel(buf, 8, 0, RED);
    // Should not throw
  });
});

describe('drawLine', () => {
  it('draws a horizontal line', () => {
    const buf = new PixelBuffer(8, 8);
    drawLine(buf, 0, 0, 7, 0, RED);
    for (let x = 0; x < 8; x++) {
      expect(buf.getPixel(x, 0)).toEqual(RED);
    }
    // Below should be transparent
    expect(buf.getPixel(0, 1)).toEqual(TRANSPARENT);
  });

  it('draws a vertical line', () => {
    const buf = new PixelBuffer(8, 8);
    drawLine(buf, 2, 0, 2, 7, GREEN);
    for (let y = 0; y < 8; y++) {
      expect(buf.getPixel(2, y)).toEqual(GREEN);
    }
  });

  it('draws a diagonal line', () => {
    const buf = new PixelBuffer(8, 8);
    drawLine(buf, 0, 0, 7, 7, BLUE);
    for (let i = 0; i < 8; i++) {
      expect(buf.getPixel(i, i)).toEqual(BLUE);
    }
  });

  it('draws a single pixel line', () => {
    const buf = new PixelBuffer(8, 8);
    drawLine(buf, 3, 3, 3, 3, RED);
    expect(buf.getPixel(3, 3)).toEqual(RED);
  });
});

describe('drawRect', () => {
  it('draws a filled rectangle', () => {
    const buf = new PixelBuffer(8, 8);
    drawRect(buf, 1, 1, 3, 3, RED, true);
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        expect(buf.getPixel(x, y)).toEqual(RED);
      }
    }
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('draws an outlined rectangle', () => {
    const buf = new PixelBuffer(8, 8);
    drawRect(buf, 1, 1, 4, 4, GREEN, false);
    // Top edge
    expect(buf.getPixel(1, 1)).toEqual(GREEN);
    expect(buf.getPixel(4, 1)).toEqual(GREEN);
    // Bottom edge
    expect(buf.getPixel(1, 4)).toEqual(GREEN);
    expect(buf.getPixel(4, 4)).toEqual(GREEN);
    // Interior should be empty
    expect(buf.getPixel(2, 2)).toEqual(TRANSPARENT);
    expect(buf.getPixel(3, 3)).toEqual(TRANSPARENT);
  });
});

describe('floodFill', () => {
  it('fills contiguous area', () => {
    const buf = new PixelBuffer(8, 8);
    // Draw a box outline
    drawRect(buf, 2, 2, 4, 4, RED, false);
    // Fill inside
    floodFill(buf, 3, 3, GREEN);
    expect(buf.getPixel(3, 3)).toEqual(GREEN);
    expect(buf.getPixel(4, 4)).toEqual(GREEN);
    // Border should remain
    expect(buf.getPixel(2, 2)).toEqual(RED);
    // Outside should remain transparent
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('fills entire canvas from corner', () => {
    const buf = new PixelBuffer(4, 4);
    floodFill(buf, 0, 0, BLUE);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(buf.getPixel(x, y)).toEqual(BLUE);
      }
    }
  });

  it('does nothing if fill color matches target', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    floodFill(buf, 0, 0, RED);
    expect(buf.getPixel(0, 0)).toEqual(RED);
  });

  it('non-contiguous fill replaces all matching pixels', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    buf.setPixel(3, 3, RED);
    // They're not contiguous, but non-contiguous mode should catch both
    floodFill(buf, 0, 0, GREEN, 0, false);
    expect(buf.getPixel(0, 0)).toEqual(GREEN);
    expect(buf.getPixel(3, 3)).toEqual(GREEN);
  });
});

describe('replaceColor', () => {
  it('replaces all matching pixels', () => {
    const buf = new PixelBuffer(4, 4);
    drawRect(buf, 0, 0, 4, 4, RED, true);
    buf.setPixel(2, 2, GREEN);
    const count = replaceColor(buf, RED, BLUE);
    expect(count).toBe(15);
    expect(buf.getPixel(0, 0)).toEqual(BLUE);
    expect(buf.getPixel(2, 2)).toEqual(GREEN);
  });

  it('returns 0 when no pixels match', () => {
    const buf = new PixelBuffer(4, 4);
    const count = replaceColor(buf, RED, BLUE);
    expect(count).toBe(0);
  });
});
