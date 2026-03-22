import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { findNearestColor, validateBufferAgainstPalette } from '../../src/core/palette-engine.js';
import type { PaletteData } from '../../src/types/palette.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };

describe('findNearestColor', () => {
  it('finds exact match', () => {
    const result = findNearestColor(RED, [RED, GREEN]);
    expect(result.index).toBe(0);
    expect(result.distance).toBe(0);
  });

  it('finds nearest color', () => {
    const darkRed: RGBA = { r: 200, g: 10, b: 10, a: 255 };
    const result = findNearestColor(darkRed, [RED, GREEN]);
    expect(result.index).toBe(0);
  });
});

describe('validateBufferAgainstPalette', () => {
  const palette: PaletteData = {
    name: 'test',
    description: '',
    colors: [
      { index: 0, hex: '#ff0000', name: null, group: null },
      { index: 1, hex: '#00ff00', name: null, group: null },
    ],
    constraints: { maxColors: 32, locked: false, allowAlpha: true },
    ramps: [],
  };

  it('passes with palette colors only', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, GREEN);
    const violations = validateBufferAgainstPalette(buf, palette, 'layer-001', 'frame-001');
    expect(violations).toHaveLength(0);
  });

  it('reports non-palette colors', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, { r: 0, g: 0, b: 255, a: 255 });
    const violations = validateBufferAgainstPalette(buf, palette, 'layer-001', 'frame-001');
    expect(violations).toHaveLength(1);
    expect(violations[0].x).toBe(0);
    expect(violations[0].y).toBe(0);
    expect(violations[0].color).toBe('#0000ff');
  });

  it('ignores transparent pixels', () => {
    const buf = new PixelBuffer(4, 4);
    // All transparent - should pass
    const violations = validateBufferAgainstPalette(buf, palette, 'layer-001', 'frame-001');
    expect(violations).toHaveLength(0);
  });
});
