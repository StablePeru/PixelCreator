import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  flipBufferH,
  flipBufferV,
  rotateBuffer90,
  scaleBufferNearest,
  adjustBrightness,
  adjustContrast,
} from '../../src/core/transform-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('flipBufferH', () => {
  it('flips pixels horizontally', () => {
    const buf = new PixelBuffer(4, 2);
    buf.setPixel(0, 0, RED);
    buf.setPixel(3, 0, GREEN);
    const result = flipBufferH(buf);
    expect(result.getPixel(3, 0)).toEqual(RED);
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });

  it('preserves dimensions', () => {
    const buf = new PixelBuffer(3, 5);
    const result = flipBufferH(buf);
    expect(result.width).toBe(3);
    expect(result.height).toBe(5);
  });

  it('handles 1px wide buffer', () => {
    const buf = new PixelBuffer(1, 3);
    buf.setPixel(0, 0, RED);
    const result = flipBufferH(buf);
    expect(result.getPixel(0, 0)).toEqual(RED);
  });
});

describe('flipBufferV', () => {
  it('flips pixels vertically', () => {
    const buf = new PixelBuffer(2, 4);
    buf.setPixel(0, 0, RED);
    buf.setPixel(0, 3, GREEN);
    const result = flipBufferV(buf);
    expect(result.getPixel(0, 3)).toEqual(RED);
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });

  it('preserves dimensions', () => {
    const buf = new PixelBuffer(5, 3);
    const result = flipBufferV(buf);
    expect(result.width).toBe(5);
    expect(result.height).toBe(3);
  });
});

describe('rotateBuffer90', () => {
  it('rotates 90° CW', () => {
    // 4x2 buffer with red at (0,0)
    const buf = new PixelBuffer(4, 2);
    buf.setPixel(0, 0, RED);
    buf.setPixel(3, 1, GREEN);
    const result = rotateBuffer90(buf, 1);
    expect(result.width).toBe(2);
    expect(result.height).toBe(4);
    // (0,0) → (height-1-0, 0) = (1, 0)
    expect(result.getPixel(1, 0)).toEqual(RED);
    // (3,1) → (height-1-1, 3) = (0, 3)
    expect(result.getPixel(0, 3)).toEqual(GREEN);
  });

  it('rotates 180°', () => {
    const buf = new PixelBuffer(4, 2);
    buf.setPixel(0, 0, RED);
    const result = rotateBuffer90(buf, 2);
    expect(result.width).toBe(4);
    expect(result.height).toBe(2);
    expect(result.getPixel(3, 1)).toEqual(RED);
  });

  it('rotates 270° CW', () => {
    const buf = new PixelBuffer(4, 2);
    buf.setPixel(0, 0, RED);
    const result = rotateBuffer90(buf, 3);
    expect(result.width).toBe(2);
    expect(result.height).toBe(4);
    // (0,0) → (0, width-1-0) = (0, 3)
    expect(result.getPixel(0, 3)).toEqual(RED);
  });

  it('90° then 270° is identity', () => {
    const buf = new PixelBuffer(3, 2);
    buf.setPixel(0, 0, RED);
    buf.setPixel(2, 1, GREEN);
    const r1 = rotateBuffer90(buf, 1);
    const r2 = rotateBuffer90(r1, 3);
    expect(r2.width).toBe(3);
    expect(r2.height).toBe(2);
    expect(r2.getPixel(0, 0)).toEqual(RED);
    expect(r2.getPixel(2, 1)).toEqual(GREEN);
  });
});

describe('scaleBufferNearest', () => {
  it('upscales by integer factor', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, GREEN);
    buf.setPixel(0, 1, BLUE);
    const result = scaleBufferNearest(buf, 4, 4);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.getPixel(0, 0)).toEqual(RED);
    expect(result.getPixel(1, 0)).toEqual(RED);
    expect(result.getPixel(2, 0)).toEqual(GREEN);
    expect(result.getPixel(0, 2)).toEqual(BLUE);
  });

  it('downscales', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    buf.setPixel(2, 0, GREEN);
    const result = scaleBufferNearest(buf, 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.getPixel(0, 0)).toEqual(RED);
    expect(result.getPixel(1, 0)).toEqual(GREEN);
  });

  it('errors on zero dimensions', () => {
    const buf = new PixelBuffer(2, 2);
    expect(() => scaleBufferNearest(buf, 0, 2)).toThrow();
  });

  it('scales to 1x1', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const result = scaleBufferNearest(buf, 1, 1);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.getPixel(0, 0)).toEqual(RED);
  });
});

describe('adjustBrightness', () => {
  it('increases brightness', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 100, g: 50, b: 200, a: 255 });
    const result = adjustBrightness(buf, 50);
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(150);
    expect(px.g).toBe(100);
    expect(px.b).toBe(250);
    expect(px.a).toBe(255);
  });

  it('clamps to 255', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 200, g: 200, b: 200, a: 255 });
    const result = adjustBrightness(buf, 100);
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(255);
    expect(px.g).toBe(255);
    expect(px.b).toBe(255);
  });

  it('clamps to 0', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 30, g: 10, b: 50, a: 255 });
    const result = adjustBrightness(buf, -100);
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(0);
    expect(px.g).toBe(0);
    expect(px.b).toBe(0);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(2, 1);
    buf.setPixel(0, 0, TRANSPARENT);
    buf.setPixel(1, 0, RED);
    const result = adjustBrightness(buf, 50);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
    expect(result.getPixel(1, 0).r).toBe(255);
  });
});

describe('adjustContrast', () => {
  it('increases contrast pushes away from mid gray', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 200, g: 50, b: 128, a: 255 });
    const result = adjustContrast(buf, 50);
    const px = result.getPixel(0, 0);
    // 200 > 128 → should increase; 50 < 128 → should decrease
    expect(px.r).toBeGreaterThan(200);
    expect(px.g).toBeLessThan(50);
    // 128 should stay approximately 128
    expect(px.b).toBeGreaterThanOrEqual(126);
    expect(px.b).toBeLessThanOrEqual(130);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, TRANSPARENT);
    const result = adjustContrast(buf, 50);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('zero amount is near identity', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 100, g: 150, b: 200, a: 255 });
    const result = adjustContrast(buf, 0);
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(100);
    expect(px.g).toBe(150);
    expect(px.b).toBe(200);
  });
});
