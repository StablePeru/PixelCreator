import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  invertColors,
  desaturate,
  hueShift,
  posterize,
} from '../../src/core/transform-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('invertColors', () => {
  it('inverts RGB channels', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 100, g: 50, b: 200, a: 255 });
    const result = invertColors(buf);
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(155);
    expect(px.g).toBe(205);
    expect(px.b).toBe(55);
    expect(px.a).toBe(255);
  });

  it('double invert returns original', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 42, g: 128, b: 200, a: 255 });
    const result = invertColors(invertColors(buf));
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(42);
    expect(px.g).toBe(128);
    expect(px.b).toBe(200);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(2, 1);
    buf.setPixel(0, 0, TRANSPARENT);
    buf.setPixel(1, 0, RED);
    const result = invertColors(buf);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
    expect(result.getPixel(1, 0).r).toBe(0);
    expect(result.getPixel(1, 0).g).toBe(255);
  });

  it('preserves alpha', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 100, g: 100, b: 100, a: 128 });
    const result = invertColors(buf);
    expect(result.getPixel(0, 0).a).toBe(128);
  });
});

describe('desaturate', () => {
  it('full desaturation produces grayscale', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const result = desaturate(buf, 100);
    const px = result.getPixel(0, 0);
    // All channels should be equal (grayscale)
    expect(px.r).toBe(px.g);
    expect(px.g).toBe(px.b);
  });

  it('zero desaturation preserves colors', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 255, g: 100, b: 50, a: 255 });
    const result = desaturate(buf, 0);
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(255);
    expect(px.g).toBe(100);
    expect(px.b).toBe(50);
  });

  it('partial desaturation reduces saturation', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const result = desaturate(buf, 50);
    const px = result.getPixel(0, 0);
    // Red channel should decrease, green/blue should increase
    expect(px.r).toBeLessThan(255);
    expect(px.g).toBeGreaterThan(0);
    expect(px.b).toBeGreaterThan(0);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, TRANSPARENT);
    const result = desaturate(buf, 100);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('hueShift', () => {
  it('shifts red towards green at 120 degrees', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const result = hueShift(buf, 120);
    const px = result.getPixel(0, 0);
    // Shifted 120° should move red towards green
    expect(px.g).toBeGreaterThan(px.r);
    expect(px.g).toBeGreaterThan(px.b);
  });

  it('360 degree shift returns near-original', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 200, g: 100, b: 50, a: 255 });
    const result = hueShift(buf, 360);
    const px = result.getPixel(0, 0);
    // Should be very close to original (within rounding)
    expect(Math.abs(px.r - 200)).toBeLessThanOrEqual(1);
    expect(Math.abs(px.g - 100)).toBeLessThanOrEqual(1);
    expect(Math.abs(px.b - 50)).toBeLessThanOrEqual(1);
  });

  it('negative shift works', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const result = hueShift(buf, -120);
    const px = result.getPixel(0, 0);
    // Shifted -120° should move red towards blue
    expect(px.b).toBeGreaterThan(px.g);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, TRANSPARENT);
    const result = hueShift(buf, 120);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('posterize', () => {
  it('posterize to 2 levels gives 0 or 255', () => {
    const buf = new PixelBuffer(2, 1);
    buf.setPixel(0, 0, { r: 30, g: 200, b: 128, a: 255 });
    buf.setPixel(1, 0, { r: 200, g: 30, b: 127, a: 255 });
    const result = posterize(buf, 2);
    const px0 = result.getPixel(0, 0);
    const px1 = result.getPixel(1, 0);
    // Each channel should be either 0 or 255
    for (const px of [px0, px1]) {
      expect([0, 255]).toContain(px.r);
      expect([0, 255]).toContain(px.g);
      expect([0, 255]).toContain(px.b);
    }
  });

  it('posterize to 256 levels preserves values', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 42, g: 128, b: 200, a: 255 });
    const result = posterize(buf, 256);
    const px = result.getPixel(0, 0);
    expect(px.r).toBe(42);
    expect(px.g).toBe(128);
    expect(px.b).toBe(200);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, TRANSPARENT);
    const result = posterize(buf, 2);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('preserves alpha', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r: 100, g: 100, b: 100, a: 128 });
    const result = posterize(buf, 4);
    expect(result.getPixel(0, 0).a).toBe(128);
  });
});
