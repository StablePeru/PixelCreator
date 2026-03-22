import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { drawGradient } from '../../src/core/drawing-engine.js';
import type { RGBA } from '../../src/types/common.js';

const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };

describe('drawGradient', () => {
  it('horizontal gradient interpolates left to right', () => {
    const buf = new PixelBuffer(8, 1);
    drawGradient(buf, 0, 0, 7, 0, BLACK, WHITE);
    const first = buf.getPixel(0, 0);
    const last = buf.getPixel(7, 0);
    expect(first.r).toBe(0);
    expect(last.r).toBe(255);
    // Middle should be interpolated
    const mid = buf.getPixel(4, 0);
    expect(mid.r).toBeGreaterThan(100);
    expect(mid.r).toBeLessThan(200);
  });

  it('vertical gradient interpolates top to bottom', () => {
    const buf = new PixelBuffer(1, 8);
    drawGradient(buf, 0, 0, 0, 7, BLACK, WHITE);
    expect(buf.getPixel(0, 0).r).toBe(0);
    expect(buf.getPixel(0, 7).r).toBe(255);
  });

  it('gradient with same start and end fills solid', () => {
    const buf = new PixelBuffer(4, 4);
    drawGradient(buf, 0, 0, 3, 0, RED, RED);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(buf.getPixel(x, y)).toEqual(RED);
      }
    }
  });

  it('respects region parameter', () => {
    const buf = new PixelBuffer(8, 8);
    drawGradient(buf, 0, 0, 3, 0, BLACK, WHITE, { x: 2, y: 2, width: 4, height: 4 });
    // Outside region should be transparent
    expect(buf.getPixel(0, 0).a).toBe(0);
    // Inside region should have gradient values
    expect(buf.getPixel(2, 2).a).toBe(255);
  });

  it('interpolates alpha channel', () => {
    const start: RGBA = { r: 255, g: 0, b: 0, a: 255 };
    const end: RGBA = { r: 0, g: 0, b: 255, a: 0 };
    const buf = new PixelBuffer(8, 1);
    drawGradient(buf, 0, 0, 7, 0, start, end);
    expect(buf.getPixel(0, 0).a).toBe(255);
    expect(buf.getPixel(7, 0).a).toBe(0);
    const midA = buf.getPixel(4, 0).a;
    expect(midA).toBeGreaterThan(50);
    expect(midA).toBeLessThan(200);
  });

  it('diagonal gradient works', () => {
    const buf = new PixelBuffer(4, 4);
    drawGradient(buf, 0, 0, 3, 3, RED, BLUE);
    // Top-left should be red-ish
    expect(buf.getPixel(0, 0).r).toBe(255);
    // Bottom-right should be blue-ish
    expect(buf.getPixel(3, 3).b).toBe(255);
  });
});
