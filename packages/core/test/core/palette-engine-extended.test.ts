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

  it('sorts by hue', () => {
    // Red hue ~0, Green hue ~0.33, Blue hue ~0.66
    const hueColors: PaletteColor[] = [
      { index: 0, hex: '#0000ff', name: 'blue', group: null },
      { index: 1, hex: '#00ff00', name: 'green', group: null },
      { index: 2, hex: '#ff0000', name: 'red', group: null },
    ];
    const sorted = sortPaletteColors(hueColors, 'hue', false);
    expect(sorted[0].hex).toBe('#ff0000');
    expect(sorted[1].hex).toBe('#00ff00');
    expect(sorted[2].hex).toBe('#0000ff');
  });

  it('sorts by saturation', () => {
    // #808080 (gray) has 0 saturation, #ff0000 (red) has full saturation
    const satColors: PaletteColor[] = [
      { index: 0, hex: '#ff0000', name: 'red', group: null },
      { index: 1, hex: '#808080', name: 'gray', group: null },
      { index: 2, hex: '#bf4040', name: 'muted-red', group: null },
    ];
    const sorted = sortPaletteColors(satColors, 'saturation', false);
    expect(sorted[0].hex).toBe('#808080');
    expect(sorted[2].hex).toBe('#ff0000');
  });

  it('sorts by index', () => {
    const indexColors: PaletteColor[] = [
      { index: 2, hex: '#0000ff', name: 'blue', group: null },
      { index: 0, hex: '#ff0000', name: 'red', group: null },
      { index: 1, hex: '#00ff00', name: 'green', group: null },
    ];
    const sorted = sortPaletteColors(indexColors, 'index', false);
    expect(sorted[0].hex).toBe('#ff0000');
    expect(sorted[1].hex).toBe('#00ff00');
    expect(sorted[2].hex).toBe('#0000ff');
  });

  it('handles both null names correctly', () => {
    const bothNull: PaletteColor[] = [
      { index: 0, hex: '#ff0000', name: null, group: null },
      { index: 1, hex: '#00ff00', name: null, group: null },
    ];
    const sorted = sortPaletteColors(bothNull, 'name', false);
    expect(sorted).toHaveLength(2);
  });

  it('hexToHSL handles achromatic colors (max === min)', () => {
    // Gray colors have max === min, triggering the h=0, s=0 branch
    const grays: PaletteColor[] = [
      { index: 0, hex: '#808080', name: 'mid-gray', group: null },
      { index: 1, hex: '#404040', name: 'dark-gray', group: null },
    ];
    const sorted = sortPaletteColors(grays, 'hue', false);
    expect(sorted).toHaveLength(2);
    // Both have hue=0, so order is stable
  });

  it('hexToHSL handles green-dominant hue', () => {
    // Green-dominant: max === g branch in hexToHSL
    const greenish: PaletteColor[] = [
      { index: 0, hex: '#40ff40', name: 'light-green', group: null },
      { index: 1, hex: '#ff4040', name: 'light-red', group: null },
    ];
    const sorted = sortPaletteColors(greenish, 'hue', false);
    // Red has lower hue than green
    expect(sorted[0].hex).toBe('#ff4040');
    expect(sorted[1].hex).toBe('#40ff40');
  });

  it('hexToHSL handles blue-dominant hue', () => {
    // Blue-dominant: max === b branch in hexToHSL
    const bluish: PaletteColor[] = [
      { index: 0, hex: '#4040ff', name: 'light-blue', group: null },
      { index: 1, hex: '#40ff40', name: 'light-green', group: null },
    ];
    const sorted = sortPaletteColors(bluish, 'hue', false);
    // Green hue < Blue hue
    expect(sorted[0].hex).toBe('#40ff40');
    expect(sorted[1].hex).toBe('#4040ff');
  });

  it('hexToHSL saturation with lightness > 0.5', () => {
    // Light color with l > 0.5 triggers the alternate saturation formula
    const lightColors: PaletteColor[] = [
      { index: 0, hex: '#ffcccc', name: 'light-pink', group: null },
      { index: 1, hex: '#cc0000', name: 'dark-red', group: null },
    ];
    const sorted = sortPaletteColors(lightColors, 'saturation', false);
    expect(sorted).toHaveLength(2);
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
