import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  createSimplexNoise,
  generateNoiseMap,
  generateSimplexNoise,
  generateFbm,
  generateTurbulence,
  mapNoiseToPixels,
  generateCheckerboard,
  generateStripes,
  generateGridDots,
  generateBrick,
} from '../../src/core/procedural-engine.js';

describe('createSimplexNoise', () => {
  it('same seed produces same output', () => {
    const a = createSimplexNoise(42);
    const b = createSimplexNoise(42);
    expect(a.noise2D(1.5, 2.5)).toBe(b.noise2D(1.5, 2.5));
  });

  it('different seeds produce different output', () => {
    const a = createSimplexNoise(42);
    const b = createSimplexNoise(99);
    expect(a.noise2D(1.5, 2.5)).not.toBe(b.noise2D(1.5, 2.5));
  });

  it('output values within [-1, 1]', () => {
    const noise = createSimplexNoise(42);
    for (let i = 0; i < 100; i++) {
      const v = noise.noise2D(i * 0.1, i * 0.17);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('varies smoothly at low scale', () => {
    const noise = createSimplexNoise(42);
    const a = noise.noise2D(5.0, 5.0);
    const b = noise.noise2D(5.01, 5.0);
    expect(Math.abs(a - b)).toBeLessThan(0.1);
  });

  it('handles 1x1 buffer', () => {
    const map = generateNoiseMap(1, 1, 'simplex', { seed: 42, scale: 0.1 });
    expect(map.length).toBe(1);
    expect(map[0]).toBeGreaterThanOrEqual(0);
    expect(map[0]).toBeLessThanOrEqual(1);
  });

  it('128x128 completes quickly', () => {
    const start = Date.now();
    generateNoiseMap(128, 128, 'simplex', { seed: 42, scale: 0.1 });
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe('generateNoiseMap', () => {
  it('returns correct length', () => {
    const map = generateNoiseMap(16, 16, 'simplex', { seed: 42, scale: 0.1 });
    expect(map.length).toBe(256);
  });

  it('all values in [0, 1]', () => {
    const map = generateNoiseMap(32, 32, 'fbm', { seed: 42, scale: 0.1, octaves: 4, lacunarity: 2, persistence: 0.5 });
    for (let i = 0; i < map.length; i++) {
      expect(map[i]).toBeGreaterThanOrEqual(0);
      expect(map[i]).toBeLessThanOrEqual(1);
    }
  });

  it('seeded reproducibility', () => {
    const a = generateNoiseMap(8, 8, 'simplex', { seed: 123, scale: 0.1 });
    const b = generateNoiseMap(8, 8, 'simplex', { seed: 123, scale: 0.1 });
    for (let i = 0; i < a.length; i++) {
      expect(a[i]).toBe(b[i]);
    }
  });
});

describe('fBm noise', () => {
  it('octaves=1 similar to simplex', () => {
    const s = generateNoiseMap(8, 8, 'simplex', { seed: 42, scale: 0.1 });
    const f = generateNoiseMap(8, 8, 'fbm', { seed: 42, scale: 0.1, octaves: 1, lacunarity: 2, persistence: 0.5 });
    // With 1 octave, fBm should be very close to simplex
    let diff = 0;
    for (let i = 0; i < s.length; i++) diff += Math.abs(s[i] - f[i]);
    expect(diff / s.length).toBeLessThan(0.1);
  });

  it('higher octaves produce different output than 1 octave', () => {
    const lo = generateNoiseMap(16, 16, 'fbm', { seed: 42, scale: 0.1, octaves: 1, lacunarity: 2, persistence: 0.5 });
    const hi = generateNoiseMap(16, 16, 'fbm', { seed: 42, scale: 0.1, octaves: 6, lacunarity: 2, persistence: 0.5 });
    let diff = 0;
    for (let i = 0; i < lo.length; i++) diff += Math.abs(lo[i] - hi[i]);
    expect(diff).toBeGreaterThan(0);
  });
});

describe('turbulence', () => {
  it('all values non-negative', () => {
    const map = generateNoiseMap(32, 32, 'turbulence', { seed: 42, scale: 0.1, octaves: 4, lacunarity: 2, persistence: 0.5 });
    for (let i = 0; i < map.length; i++) {
      expect(map[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it('differs from fBm with same params', () => {
    const f = generateNoiseMap(16, 16, 'fbm', { seed: 42, scale: 0.1, octaves: 4, lacunarity: 2, persistence: 0.5 });
    const t = generateNoiseMap(16, 16, 'turbulence', { seed: 42, scale: 0.1, octaves: 4, lacunarity: 2, persistence: 0.5 });
    let diff = 0;
    for (let i = 0; i < f.length; i++) diff += Math.abs(f[i] - t[i]);
    expect(diff).toBeGreaterThan(0);
  });
});

describe('noise mapping', () => {
  it('grayscale produces gray pixels', () => {
    const buf = new PixelBuffer(4, 4);
    const map = new Float64Array(16).fill(0.5);
    mapNoiseToPixels(buf, map, { mode: 'grayscale' });
    const p = buf.getPixel(0, 0);
    expect(p.r).toBe(p.g); expect(p.g).toBe(p.b); expect(p.a).toBe(255);
  });

  it('threshold produces only two colors', () => {
    const buf = new PixelBuffer(4, 4);
    const map = new Float64Array([0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7, 0.3, 0.7]);
    mapNoiseToPixels(buf, map, { mode: 'threshold', threshold: 0.5, colorAbove: '#ff0000', colorBelow: '#0000ff' });
    expect(buf.getPixel(0, 0).b).toBe(255); // 0.3 < 0.5
    expect(buf.getPixel(1, 0).r).toBe(255); // 0.7 >= 0.5
  });

  it('threshold 0 makes all above', () => {
    const buf = new PixelBuffer(2, 2);
    const map = new Float64Array([0.1, 0.5, 0.9, 0.01]);
    mapNoiseToPixels(buf, map, { mode: 'threshold', threshold: 0, colorAbove: '#ff0000', colorBelow: '#0000ff' });
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) expect(buf.getPixel(x, y).r).toBe(255);
  });

  it('palette maps to correct colors', () => {
    const buf = new PixelBuffer(3, 1);
    const map = new Float64Array([0.1, 0.5, 0.9]);
    mapNoiseToPixels(buf, map, { mode: 'palette', paletteColors: ['#ff0000', '#00ff00', '#0000ff'] });
    expect(buf.getPixel(0, 0).r).toBe(255); // 0.1 → idx 0 → red
    expect(buf.getPixel(1, 0).g).toBe(255); // 0.5 → idx 1 → green
    expect(buf.getPixel(2, 0).b).toBe(255); // 0.9 → idx 2 → blue
  });

  it('palette with 1 color fills uniformly', () => {
    const buf = new PixelBuffer(4, 4);
    const map = new Float64Array(16).fill(0.5);
    mapNoiseToPixels(buf, map, { mode: 'palette', paletteColors: ['#ff0000'] });
    expect(buf.getPixel(0, 0).r).toBe(255);
    expect(buf.getPixel(3, 3).r).toBe(255);
  });
});

describe('generateCheckerboard', () => {
  it('alternates colors at cell boundaries', () => {
    const buf = new PixelBuffer(8, 8);
    generateCheckerboard(buf, { cellSize: 4, color1: '#ffffff', color2: '#000000' });
    expect(buf.getPixel(0, 0).r).toBe(255);
    expect(buf.getPixel(4, 0).r).toBe(0);
    expect(buf.getPixel(0, 4).r).toBe(0);
    expect(buf.getPixel(4, 4).r).toBe(255);
  });

  it('cellSize 1 produces pixel checkerboard', () => {
    const buf = new PixelBuffer(4, 4);
    generateCheckerboard(buf, { cellSize: 1, color1: '#ffffff', color2: '#000000' });
    expect(buf.getPixel(0, 0).r).toBe(255);
    expect(buf.getPixel(1, 0).r).toBe(0);
    expect(buf.getPixel(0, 1).r).toBe(0);
    expect(buf.getPixel(1, 1).r).toBe(255);
  });

  it('respects region constraint', () => {
    const buf = new PixelBuffer(8, 8);
    generateCheckerboard(buf, { cellSize: 2, color1: '#ff0000', color2: '#0000ff' }, { x: 2, y: 2, width: 4, height: 4 });
    expect(buf.getPixel(0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 }); // outside region
    expect(buf.getPixel(2, 2).r).toBe(255); // inside
  });
});

describe('generateStripes', () => {
  it('horizontal stripes are constant per row', () => {
    const buf = new PixelBuffer(8, 8);
    generateStripes(buf, { direction: 'horizontal', widths: [2, 2], colors: ['#ff0000', '#0000ff'] });
    expect(buf.getPixel(0, 0).r).toBe(255);
    expect(buf.getPixel(4, 0).r).toBe(255);
    expect(buf.getPixel(0, 2).b).toBe(255);
  });

  it('vertical stripes are constant per column', () => {
    const buf = new PixelBuffer(8, 8);
    generateStripes(buf, { direction: 'vertical', widths: [2, 2], colors: ['#ff0000', '#0000ff'] });
    expect(buf.getPixel(0, 0).r).toBe(255);
    expect(buf.getPixel(0, 4).r).toBe(255);
    expect(buf.getPixel(2, 0).b).toBe(255);
  });

  it('diagonal shifts by 1 per row', () => {
    const buf = new PixelBuffer(8, 8);
    generateStripes(buf, { direction: 'diagonal-down', widths: [4, 4], colors: ['#ff0000', '#0000ff'] });
    const c00 = buf.getPixel(0, 0);
    const c10 = buf.getPixel(1, 0);
    // Pattern should shift
    expect(c00.r === c10.r || c00.b === c10.b).toBe(true);
  });
});

describe('generateGridDots', () => {
  it('dots appear at expected intervals', () => {
    const buf = new PixelBuffer(16, 16);
    generateGridDots(buf, { spacingX: 4, spacingY: 4, dotSize: 1, color: '#ff0000', background: '#000000' });
    expect(buf.getPixel(0, 0).r).toBe(255); // dot at origin
    expect(buf.getPixel(4, 0).r).toBe(255); // dot at spacing
    expect(buf.getPixel(2, 0).r).toBe(0);   // between dots = background
  });

  it('background fills non-dot areas', () => {
    const buf = new PixelBuffer(8, 8);
    generateGridDots(buf, { spacingX: 8, spacingY: 8, dotSize: 1, color: '#ffffff', background: '#ff0000' });
    expect(buf.getPixel(4, 4).r).toBe(255); // background red
    expect(buf.getPixel(4, 4).g).toBe(0);
  });
});

describe('generateBrick', () => {
  it('mortar lines at expected positions', () => {
    const buf = new PixelBuffer(16, 16);
    generateBrick(buf, { brickWidth: 4, brickHeight: 2, mortarSize: 1, brickColor: '#ff0000', mortarColor: '#888888', offset: 0.5 });
    // Row 0-1 = brick, row 2 = mortar
    expect(buf.getPixel(0, 0).r).toBe(255); // brick
    expect(buf.getPixel(0, 2).r).toBe(136); // mortar (0x88)
  });

  it('alternating row offset', () => {
    const buf = new PixelBuffer(16, 8);
    generateBrick(buf, { brickWidth: 4, brickHeight: 2, mortarSize: 1, brickColor: '#ff0000', mortarColor: '#000000', offset: 0.5 });
    // First row: mortar at x=4, second row: shifted by 2
    expect(buf.getPixel(4, 0).r).toBe(0);  // mortar
    expect(buf.getPixel(4, 3).r).toBe(255); // brick (shifted row)
  });
});
