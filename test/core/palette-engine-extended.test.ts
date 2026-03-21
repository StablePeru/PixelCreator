import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  sortPaletteColors,
  generateRamp,
  samplePixelColor,
  extractUniqueColors,
} from '../../src/core/palette-engine.js';
import type { PaletteColor } from '../../src/types/palette.js';
import type { RGBA } from '../../src/types/common.js';

describe('sortPaletteColors', () => {
  const colors: PaletteColor[] = [
    { index: 0, hex: '#ff0000', name: 'red', group: null },
    { index: 1, hex: '#00ff00', name: 'green', group: null },
    { index: 2, hex: '#0000ff', name: 'blue', group: null },
  ];

  it('sorts by luminance', () => {
    const sorted = sortPaletteColors(colors, 'luminance', false);
    // Blue has lowest luminance (0.0722*255), Red medium (0.2126*255), Green highest (0.7152*255)
    expect(sorted[0].hex).toBe('#0000ff');
    expect(sorted[1].hex).toBe('#ff0000');
    expect(sorted[2].hex).toBe('#00ff00');
  });

  it('sorts by name', () => {
    const sorted = sortPaletteColors(colors, 'name', false);
    expect(sorted[0].name).toBe('blue');
    expect(sorted[1].name).toBe('green');
    expect(sorted[2].name).toBe('red');
  });

  it('respects reverse flag', () => {
    const sorted = sortPaletteColors(colors, 'luminance', true);
    expect(sorted[0].hex).toBe('#00ff00');
    expect(sorted[2].hex).toBe('#0000ff');
  });

  it('re-indexes after sort', () => {
    const sorted = sortPaletteColors(colors, 'luminance', false);
    expect(sorted[0].index).toBe(0);
    expect(sorted[1].index).toBe(1);
    expect(sorted[2].index).toBe(2);
  });

  it('sorts null names last', () => {
    const withNull: PaletteColor[] = [
      { index: 0, hex: '#ff0000', name: null, group: null },
      { index: 1, hex: '#00ff00', name: 'alpha', group: null },
    ];
    const sorted = sortPaletteColors(withNull, 'name', false);
    expect(sorted[0].name).toBe('alpha');
    expect(sorted[1].name).toBeNull();
  });
});

describe('generateRamp', () => {
  it('generates correct number of steps', () => {
    const ramp = generateRamp('#000000', '#ffffff', 5);
    expect(ramp).toHaveLength(5);
    expect(ramp[0]).toBe('#000000');
    expect(ramp[4]).toBe('#ffffff');
  });

  it('returns single color for steps=1', () => {
    const ramp = generateRamp('#ff0000', '#0000ff', 1);
    expect(ramp).toEqual(['#ff0000']);
  });

  it('returns empty array for steps=0', () => {
    const ramp = generateRamp('#ff0000', '#0000ff', 0);
    expect(ramp).toEqual([]);
  });

  it('interpolates midpoint correctly', () => {
    const ramp = generateRamp('#000000', '#ffffff', 3);
    // Midpoint should be ~#808080 (128,128,128)
    expect(ramp[1]).toBe('#808080');
  });
});

describe('samplePixelColor', () => {
  it('returns the pixel color at coordinates', () => {
    const buf = new PixelBuffer(4, 4);
    const red: RGBA = { r: 255, g: 0, b: 0, a: 255 };
    buf.setPixel(2, 3, red);
    const sampled = samplePixelColor(buf, 2, 3);
    expect(sampled).toEqual(red);
  });

  it('returns transparent for empty pixel', () => {
    const buf = new PixelBuffer(4, 4);
    const sampled = samplePixelColor(buf, 0, 0);
    expect(sampled.a).toBe(0);
  });
});

describe('extractUniqueColors', () => {
  it('extracts unique non-transparent colors', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    buf.setPixel(1, 0, { r: 255, g: 0, b: 0, a: 255 }); // duplicate
    buf.setPixel(2, 0, { r: 0, g: 255, b: 0, a: 255 });
    const colors = extractUniqueColors(buf, false);
    expect(colors).toHaveLength(2);
    expect(colors).toContain('#ff0000');
    expect(colors).toContain('#00ff00');
  });

  it('includes transparent when requested', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const withTransparent = extractUniqueColors(buf, true);
    const withoutTransparent = extractUniqueColors(buf, false);
    expect(withTransparent.length).toBeGreaterThan(withoutTransparent.length);
  });

  it('returns sorted array', () => {
    const buf = new PixelBuffer(2, 1);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    buf.setPixel(1, 0, { r: 0, g: 0, b: 255, a: 255 });
    const colors = extractUniqueColors(buf, false);
    expect(colors[0]).toBe('#0000ff');
    expect(colors[1]).toBe('#ff0000');
  });
});
