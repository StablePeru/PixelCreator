import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  generateAdvancedRamp,
  generateHueShiftRamp,
  applyPaletteSwap,
} from '../../src/core/palette-engine.js';
import type { RGBA } from '../../src/types/common.js';
import type { HueShiftRampConfig } from '../../src/types/palette.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const YELLOW: RGBA = { r: 255, g: 255, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('generateAdvancedRamp', () => {
  describe('rgb mode', () => {
    it('returns correct number of steps', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 5, 'rgb');
      expect(ramp).toHaveLength(5);
    });

    it('starts and ends with correct colors', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 5, 'rgb');
      expect(ramp[0]).toBe('#ff0000');
      expect(ramp[ramp.length - 1]).toBe('#0000ff');
    });

    it('generates valid hex strings', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#00ff00', 5, 'rgb');
      for (const hex of ramp) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe('hsl mode', () => {
    it('returns correct number of steps', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 5, 'hsl');
      expect(ramp).toHaveLength(5);
    });

    it('starts and ends with correct colors', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 5, 'hsl');
      expect(ramp[0]).toBe('#ff0000');
      expect(ramp[ramp.length - 1]).toBe('#0000ff');
    });
  });

  describe('oklch mode', () => {
    it('returns correct number of steps', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 5, 'oklch');
      expect(ramp).toHaveLength(5);
    });

    it('starts and ends with correct colors', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 5, 'oklch');
      expect(ramp[0]).toBe('#ff0000');
      expect(ramp[ramp.length - 1]).toBe('#0000ff');
    });
  });

  describe('hue-shift mode', () => {
    it('returns correct number of steps', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 5, 'hue-shift');
      expect(ramp).toHaveLength(5);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for 0 steps', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 0, 'rgb');
      expect(ramp).toHaveLength(0);
    });

    it('returns single color for 1 step', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#0000ff', 1, 'rgb');
      expect(ramp).toHaveLength(1);
      expect(ramp[0]).toBe('#ff0000');
    });

    it('same start and end color returns uniform ramp', () => {
      const ramp = generateAdvancedRamp('#ff0000', '#ff0000', 3, 'rgb');
      expect(ramp).toHaveLength(3);
      for (const hex of ramp) {
        expect(hex).toBe('#ff0000');
      }
    });
  });
});

describe('generateHueShiftRamp', () => {
  const defaultConfig: HueShiftRampConfig = {
    hueShift: 30,
    saturationShift: 0.2,
    lightnessStart: 0.2,
    lightnessEnd: 0.9,
  };

  it('returns correct number of steps', () => {
    const ramp = generateHueShiftRamp('#ff6600', 7, defaultConfig);
    expect(ramp).toHaveLength(7);
  });

  it('generates different colors across the ramp', () => {
    const ramp = generateHueShiftRamp('#ff6600', 5, defaultConfig);
    const unique = new Set(ramp);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('generates valid hex strings', () => {
    const ramp = generateHueShiftRamp('#ff6600', 5, defaultConfig);
    for (const hex of ramp) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('hueShift parameter affects output', () => {
    const rampLow = generateHueShiftRamp('#ff6600', 5, {
      ...defaultConfig,
      hueShift: 10,
    });
    const rampHigh = generateHueShiftRamp('#ff6600', 5, {
      ...defaultConfig,
      hueShift: 60,
    });
    // Different hue shifts should produce different ramps
    const allSame = rampLow.every((hex, i) => hex === rampHigh[i]);
    expect(allSame).toBe(false);
  });

  it('lightnessStart/End parameters affect output', () => {
    const rampNarrow = generateHueShiftRamp('#ff6600', 5, {
      ...defaultConfig,
      lightnessStart: 0.4,
      lightnessEnd: 0.6,
    });
    const rampWide = generateHueShiftRamp('#ff6600', 5, {
      ...defaultConfig,
      lightnessStart: 0.1,
      lightnessEnd: 0.95,
    });
    const allSame = rampNarrow.every((hex, i) => hex === rampWide[i]);
    expect(allSame).toBe(false);
  });

  it('returns empty array for 0 steps', () => {
    const ramp = generateHueShiftRamp('#ff6600', 0, defaultConfig);
    expect(ramp).toHaveLength(0);
  });

  it('returns single color for 1 step', () => {
    const ramp = generateHueShiftRamp('#ff6600', 1, defaultConfig);
    expect(ramp).toHaveLength(1);
    expect(ramp[0]).toBe('#ff6600');
  });
});

describe('applyPaletteSwap', () => {
  it('swaps colors correctly', () => {
    const buf = new PixelBuffer(4, 4);
    // Fill with red and blue pixels in a pattern
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        buf.setPixel(x, y, x < 2 ? RED : BLUE);
      }
    }

    const fromPalette = [RED, BLUE];
    const toPalette = [GREEN, YELLOW];
    const result = applyPaletteSwap(buf, fromPalette, toPalette);

    // Red pixels should become green
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 2; x++) {
        const pixel = result.getPixel(x, y);
        expect(pixel.r).toBe(GREEN.r);
        expect(pixel.g).toBe(GREEN.g);
        expect(pixel.b).toBe(GREEN.b);
      }
    }

    // Blue pixels should become yellow
    for (let y = 0; y < 4; y++) {
      for (let x = 2; x < 4; x++) {
        const pixel = result.getPixel(x, y);
        expect(pixel.r).toBe(YELLOW.r);
        expect(pixel.g).toBe(YELLOW.g);
        expect(pixel.b).toBe(YELLOW.b);
      }
    }
  });

  it('preserves transparent pixels', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    // (1,0) stays transparent

    const fromPalette = [RED];
    const toPalette = [GREEN];
    const result = applyPaletteSwap(buf, fromPalette, toPalette);

    const transparentPixel = result.getPixel(1, 0);
    expect(transparentPixel.a).toBe(0);
  });

  it('preserves alpha of swapped pixels', () => {
    const buf = new PixelBuffer(4, 4);
    const semiRed: RGBA = { r: 255, g: 0, b: 0, a: 128 };
    buf.setPixel(0, 0, semiRed);

    const fromPalette = [RED];
    const toPalette = [GREEN];
    const result = applyPaletteSwap(buf, fromPalette, toPalette);

    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(GREEN.r);
    expect(pixel.g).toBe(GREEN.g);
    expect(pixel.b).toBe(GREEN.b);
    expect(pixel.a).toBe(128);
  });

  it('does not modify original buffer', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);

    const fromPalette = [RED];
    const toPalette = [GREEN];
    applyPaletteSwap(buf, fromPalette, toPalette);

    // Original should be unchanged
    const original = buf.getPixel(0, 0);
    expect(original).toEqual(RED);
  });

  it('keeps color when toPalette index is out of range', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, BLUE);

    // fromPalette has 2 entries but toPalette only has 1
    const fromPalette = [RED, BLUE];
    const toPalette = [GREEN];
    const result = applyPaletteSwap(buf, fromPalette, toPalette);

    // RED (index 0) should swap to GREEN
    const swapped = result.getPixel(0, 0);
    expect(swapped.r).toBe(GREEN.r);
    expect(swapped.g).toBe(GREEN.g);
    expect(swapped.b).toBe(GREEN.b);

    // BLUE (index 1) has no toPalette entry, should remain unchanged
    const kept = result.getPixel(1, 0);
    expect(kept).toEqual(BLUE);
  });

  it('matches nearest color when pixel is not exact palette match', () => {
    const buf = new PixelBuffer(4, 4);
    const darkRed: RGBA = { r: 200, g: 10, b: 10, a: 255 };
    buf.setPixel(0, 0, darkRed);

    const fromPalette = [RED, BLUE];
    const toPalette = [GREEN, YELLOW];
    const result = applyPaletteSwap(buf, fromPalette, toPalette);

    // darkRed is closest to RED (index 0), so should swap to GREEN
    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(GREEN.r);
    expect(pixel.g).toBe(GREEN.g);
    expect(pixel.b).toBe(GREEN.b);
  });
});
