import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { tweenFrames, applyEasing } from '../../src/core/tween-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('tweenFrames', () => {
  it('generates correct number of intermediate frames', () => {
    const from = new PixelBuffer(2, 2);
    const to = new PixelBuffer(2, 2);
    const result = tweenFrames(from, to, 3);
    expect(result).toHaveLength(3);
  });

  it('midpoint of red→blue is purple', () => {
    const from = new PixelBuffer(1, 1);
    from.setPixel(0, 0, RED);
    const to = new PixelBuffer(1, 1);
    to.setPixel(0, 0, BLUE);

    const result = tweenFrames(from, to, 1); // single midpoint
    const mid = result[0].getPixel(0, 0);
    expect(mid.r).toBeGreaterThan(100);
    expect(mid.r).toBeLessThan(160);
    expect(mid.b).toBeGreaterThan(100);
    expect(mid.b).toBeLessThan(160);
  });

  it('first tween frame is closer to from', () => {
    const from = new PixelBuffer(1, 1);
    from.setPixel(0, 0, { r: 0, g: 0, b: 0, a: 255 });
    const to = new PixelBuffer(1, 1);
    to.setPixel(0, 0, { r: 200, g: 200, b: 200, a: 255 });

    const result = tweenFrames(from, to, 3);
    expect(result[0].getPixel(0, 0).r).toBeLessThan(100);
    expect(result[2].getPixel(0, 0).r).toBeGreaterThan(100);
  });

  it('interpolates alpha channel', () => {
    const from = new PixelBuffer(1, 1);
    from.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const to = new PixelBuffer(1, 1);
    to.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 0 });

    const result = tweenFrames(from, to, 1);
    const mid = result[0].getPixel(0, 0);
    expect(mid.a).toBeGreaterThan(100);
    expect(mid.a).toBeLessThan(160);
  });

  it('returns empty array for 0 steps', () => {
    const from = new PixelBuffer(1, 1);
    const to = new PixelBuffer(1, 1);
    expect(tweenFrames(from, to, 0)).toHaveLength(0);
  });

  it('throws on dimension mismatch', () => {
    const from = new PixelBuffer(2, 2);
    const to = new PixelBuffer(4, 4);
    expect(() => tweenFrames(from, to, 1)).toThrow();
  });
});

describe('applyEasing', () => {
  it('linear distributes evenly', () => {
    const result = applyEasing([100, 100, 100, 100], 'linear');
    expect(result).toHaveLength(4);
    expect(result.every((d) => d === result[0])).toBe(true);
  });

  it('ease-in starts slow', () => {
    const result = applyEasing([100, 100, 100, 100], 'ease-in');
    expect(result[0]).toBeLessThan(result[3]);
  });

  it('ease-out starts fast', () => {
    const result = applyEasing([100, 100, 100, 100], 'ease-out');
    expect(result[0]).toBeGreaterThan(result[3]);
  });

  it('ease-in-out is symmetric', () => {
    const result = applyEasing([100, 100, 100, 100, 100, 100], 'ease-in-out');
    // First should be shorter, middle longer
    expect(result[0]).toBeLessThan(result[2]);
  });

  it('respects totalDuration', () => {
    const result = applyEasing([100, 100, 100], 'linear', 600);
    expect(result.reduce((s, d) => s + d, 0)).toBeCloseTo(600, -1);
  });

  it('single frame returns total duration', () => {
    const result = applyEasing([100], 'ease-in', 500);
    expect(result[0]).toBe(500);
  });

  it('empty array returns empty', () => {
    expect(applyEasing([], 'linear')).toHaveLength(0);
  });

  it('all durations are at least 1ms', () => {
    const result = applyEasing([10, 10, 10, 10, 10], 'ease-in', 20);
    expect(result.every((d) => d >= 1)).toBe(true);
  });
});
