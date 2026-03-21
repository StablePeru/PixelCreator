import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  rgbToHsl, hslToRgb,
  colorHistogram, topColors,
  generatePalette, colorHarmony,
  compareBuffers,
} from '../../src/core/color-analysis-engine.js';
import { scaleBufferBilinear } from '../../src/core/transform-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };

describe('rgbToHsl / hslToRgb', () => {
  it('red is h=0, s=100, l=50', () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('green is h=120', () => {
    expect(rgbToHsl(0, 255, 0).h).toBe(120);
  });

  it('white is l=100, s=0', () => {
    const hsl = rgbToHsl(255, 255, 255);
    expect(hsl.l).toBe(100);
    expect(hsl.s).toBe(0);
  });

  it('round-trips correctly', () => {
    const hsl = rgbToHsl(128, 64, 200);
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    expect(Math.abs(rgb.r - 128)).toBeLessThan(5);
    expect(Math.abs(rgb.g - 64)).toBeLessThan(5);
    expect(Math.abs(rgb.b - 200)).toBeLessThan(5);
  });

  it('gray has s=0', () => {
    expect(rgbToHsl(128, 128, 128).s).toBe(0);
  });
});

describe('colorHistogram', () => {
  it('counts colors correctly', () => {
    const buf = new PixelBuffer(4, 4);
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 4; x++)
        buf.setPixel(x, y, RED);
    for (let y = 2; y < 4; y++)
      for (let x = 0; x < 4; x++)
        buf.setPixel(x, y, BLUE);

    const hist = colorHistogram(buf);
    expect(hist.size).toBe(2);
    expect(hist.get('#ff0000')!.count).toBe(8);
    expect(hist.get('#0000ff')!.count).toBe(8);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const hist = colorHistogram(buf);
    expect(hist.size).toBe(1);
  });
});

describe('topColors', () => {
  it('returns top N by count', () => {
    const buf = new PixelBuffer(4, 1);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, RED);
    buf.setPixel(2, 0, RED);
    buf.setPixel(3, 0, BLUE);

    const top = topColors(buf, 2);
    expect(top).toHaveLength(2);
    expect(top[0].color).toEqual(RED);
    expect(top[0].count).toBe(3);
    expect(top[0].percentage).toBe(75);
  });
});

describe('generatePalette', () => {
  it('generates palette from canvas', () => {
    const buf = new PixelBuffer(4, 4);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        buf.setPixel(x, y, x < 2 ? RED : BLUE);

    const palette = generatePalette(buf, 2);
    expect(palette).toHaveLength(2);
  });

  it('returns all colors if fewer than max', () => {
    const buf = new PixelBuffer(2, 1);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, GREEN);
    const palette = generatePalette(buf, 10);
    expect(palette).toHaveLength(2);
  });
});

describe('colorHarmony', () => {
  it('complementary returns 2 colors', () => {
    const result = colorHarmony(RED, 'complementary');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(RED);
  });

  it('triadic returns 3 colors', () => {
    const result = colorHarmony(RED, 'triadic');
    expect(result).toHaveLength(3);
  });

  it('analogous returns 3 colors', () => {
    const result = colorHarmony(RED, 'analogous');
    expect(result).toHaveLength(3);
  });

  it('split-complementary returns 3 colors', () => {
    const result = colorHarmony(RED, 'split-complementary');
    expect(result).toHaveLength(3);
  });
});

describe('compareBuffers', () => {
  it('identical buffers have 0 diff', () => {
    const a = new PixelBuffer(4, 4);
    a.setPixel(0, 0, RED);
    const b = a.clone();
    const result = compareBuffers(a, b);
    expect(result.identical).toBe(true);
    expect(result.diffCount).toBe(0);
  });

  it('different buffers show diff count', () => {
    const a = new PixelBuffer(4, 4);
    a.setPixel(0, 0, RED);
    const b = new PixelBuffer(4, 4);
    b.setPixel(0, 0, BLUE);
    const result = compareBuffers(a, b);
    expect(result.identical).toBe(false);
    expect(result.diffCount).toBe(1);
  });

  it('diff buffer marks differences in red', () => {
    const a = new PixelBuffer(2, 2);
    a.setPixel(0, 0, RED);
    const b = new PixelBuffer(2, 2);
    b.setPixel(0, 0, BLUE);
    const result = compareBuffers(a, b);
    expect(result.diffBuffer.getPixel(0, 0).r).toBe(255);
  });
});

describe('scaleBufferBilinear', () => {
  it('doubles size', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const scaled = scaleBufferBilinear(buf, 8, 8);
    expect(scaled.width).toBe(8);
    expect(scaled.height).toBe(8);
    expect(scaled.getPixel(0, 0)).toEqual(RED);
  });

  it('halves size', () => {
    const buf = new PixelBuffer(8, 8);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        buf.setPixel(x, y, RED);
    const scaled = scaleBufferBilinear(buf, 4, 4);
    expect(scaled.width).toBe(4);
    expect(scaled.getPixel(2, 2)).toEqual(RED);
  });

  it('bilinear blends adjacent pixels', () => {
    const buf = new PixelBuffer(2, 1);
    buf.setPixel(0, 0, { r: 0, g: 0, b: 0, a: 255 });
    buf.setPixel(1, 0, { r: 200, g: 200, b: 200, a: 255 });
    const scaled = scaleBufferBilinear(buf, 4, 1);
    const mid = scaled.getPixel(2, 0);
    expect(mid.r).toBeGreaterThan(50);
    expect(mid.r).toBeLessThanOrEqual(200);
  });
});
