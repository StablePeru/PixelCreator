import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { generateOutline, drawRect } from '../../src/core/drawing-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('generateOutline', () => {
  it('generates outline around a filled rect', () => {
    const buf = new PixelBuffer(8, 8);
    drawRect(buf, 3, 3, 2, 2, RED, true);
    const outline = generateOutline(buf, BLACK, 1, true);
    // Adjacent transparent pixels should get outline
    expect(outline.getPixel(2, 3).a).toBeGreaterThan(0);
    expect(outline.getPixel(5, 3).a).toBeGreaterThan(0);
    // The content pixel itself should NOT be in the outline
    expect(outline.getPixel(3, 3).a).toBe(0);
    // Far away pixel should not be in outline
    expect(outline.getPixel(0, 0).a).toBe(0);
  });

  it('returns new buffer without modifying input', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(2, 2, RED);
    const original = buf.getPixel(1, 1);
    generateOutline(buf, BLACK, 1, true);
    expect(buf.getPixel(1, 1)).toEqual(original);
    expect(buf.getPixel(2, 2)).toEqual(RED);
  });

  it('outline without corners uses 4-connected neighbors', () => {
    const buf = new PixelBuffer(5, 5);
    buf.setPixel(2, 2, RED);
    const outline = generateOutline(buf, BLACK, 1, false);
    // Cardinal neighbors should have outline
    expect(outline.getPixel(1, 2).a).toBeGreaterThan(0);
    expect(outline.getPixel(3, 2).a).toBeGreaterThan(0);
    expect(outline.getPixel(2, 1).a).toBeGreaterThan(0);
    expect(outline.getPixel(2, 3).a).toBeGreaterThan(0);
    // Diagonal neighbors should NOT have outline
    expect(outline.getPixel(1, 1).a).toBe(0);
    expect(outline.getPixel(3, 3).a).toBe(0);
  });

  it('outline with corners includes diagonals', () => {
    const buf = new PixelBuffer(5, 5);
    buf.setPixel(2, 2, RED);
    const outline = generateOutline(buf, BLACK, 1, true);
    // Diagonal neighbors should also have outline
    expect(outline.getPixel(1, 1).a).toBeGreaterThan(0);
    expect(outline.getPixel(3, 3).a).toBeGreaterThan(0);
  });

  it('thickness 2 extends further', () => {
    const buf = new PixelBuffer(7, 7);
    buf.setPixel(3, 3, RED);
    const outline = generateOutline(buf, BLACK, 2, true);
    // 2 pixels away should get outline
    expect(outline.getPixel(1, 3).a).toBeGreaterThan(0);
    expect(outline.getPixel(5, 3).a).toBeGreaterThan(0);
  });

  it('empty buffer produces no outline', () => {
    const buf = new PixelBuffer(4, 4);
    const outline = generateOutline(buf, BLACK, 1, true);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(outline.getPixel(x, y).a).toBe(0);
      }
    }
  });
});
