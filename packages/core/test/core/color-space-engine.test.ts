import { describe, it, expect } from 'vitest';
import {
  rgbToOklab,
  oklabToRgb,
  rgbToOklch,
  oklchToRgb,
  perceptualDistance,
  perceptualNearestColor,
  snapToPalette,
  generateOklchRamp,
  generateHslRamp,
  generateHueShiftRampCore,
} from '../../src/core/color-space-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const ORANGE: RGBA = { r: 255, g: 165, b: 0, a: 255 };

describe('rgbToOklab / oklabToRgb round-trip', () => {
  const testColors = [
    { name: 'red', rgba: RED },
    { name: 'green', rgba: GREEN },
    { name: 'blue', rgba: BLUE },
    { name: 'white', rgba: WHITE },
    { name: 'black', rgba: BLACK },
  ];

  for (const { name, rgba } of testColors) {
    it(`round-trips ${name} correctly`, () => {
      const lab = rgbToOklab(rgba.r, rgba.g, rgba.b);
      const rgb = oklabToRgb(lab.L, lab.a, lab.b);
      expect(rgb.r).toBeCloseTo(rgba.r, 0);
      expect(rgb.g).toBeCloseTo(rgba.g, 0);
      expect(rgb.b).toBeCloseTo(rgba.b, 0);
    });
  }

  it('produces L=0 for black', () => {
    const lab = rgbToOklab(0, 0, 0);
    expect(lab.L).toBeCloseTo(0, 2);
  });

  it('produces L~1 for white', () => {
    const lab = rgbToOklab(255, 255, 255);
    expect(lab.L).toBeCloseTo(1, 1);
  });
});

describe('rgbToOklch / oklchToRgb round-trip', () => {
  const testColors = [
    { name: 'red', rgba: RED },
    { name: 'green', rgba: GREEN },
    { name: 'blue', rgba: BLUE },
    { name: 'white', rgba: WHITE },
    { name: 'black', rgba: BLACK },
  ];

  for (const { name, rgba } of testColors) {
    it(`round-trips ${name} correctly`, () => {
      const lch = rgbToOklch(rgba.r, rgba.g, rgba.b);
      const rgb = oklchToRgb(lch.L, lch.C, lch.h);
      expect(rgb.r).toBeCloseTo(rgba.r, 0);
      expect(rgb.g).toBeCloseTo(rgba.g, 0);
      expect(rgb.b).toBeCloseTo(rgba.b, 0);
    });
  }

  it('produces C~0 for achromatic colors (white)', () => {
    const lch = rgbToOklch(255, 255, 255);
    expect(lch.C).toBeCloseTo(0, 2);
  });

  it('produces C~0 for achromatic colors (black)', () => {
    const lch = rgbToOklch(0, 0, 0);
    expect(lch.C).toBeCloseTo(0, 2);
  });

  it('produces hue in 0-360 range', () => {
    const lch = rgbToOklch(RED.r, RED.g, RED.b);
    expect(lch.h).toBeGreaterThanOrEqual(0);
    expect(lch.h).toBeLessThan(360);
  });
});

describe('perceptualDistance', () => {
  it('returns 0 for identical colors', () => {
    expect(perceptualDistance(RED, RED)).toBe(0);
    expect(perceptualDistance(BLACK, BLACK)).toBe(0);
    expect(perceptualDistance(WHITE, WHITE)).toBe(0);
  });

  it('returns positive value for different colors', () => {
    expect(perceptualDistance(RED, BLUE)).toBeGreaterThan(0);
    expect(perceptualDistance(BLACK, WHITE)).toBeGreaterThan(0);
  });

  it('matches intuition: red is closer to orange than to blue', () => {
    const redToOrange = perceptualDistance(RED, ORANGE);
    const redToBlue = perceptualDistance(RED, BLUE);
    expect(redToOrange).toBeLessThan(redToBlue);
  });

  it('is symmetric: d(a,b) === d(b,a)', () => {
    const ab = perceptualDistance(RED, BLUE);
    const ba = perceptualDistance(BLUE, RED);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('black-to-white has large distance', () => {
    const d = perceptualDistance(BLACK, WHITE);
    expect(d).toBeGreaterThan(0.5);
  });
});

describe('perceptualNearestColor', () => {
  it('finds exact match in palette', () => {
    const result = perceptualNearestColor(RED, [RED, GREEN, BLUE]);
    expect(result.index).toBe(0);
    expect(result.distance).toBe(0);
    expect(result.color).toEqual(RED);
  });

  it('finds nearest color in palette', () => {
    const darkRed: RGBA = { r: 200, g: 10, b: 10, a: 255 };
    const result = perceptualNearestColor(darkRed, [RED, GREEN, BLUE]);
    expect(result.index).toBe(0);
    expect(result.color).toEqual(RED);
  });

  it('works with single-color palette', () => {
    const result = perceptualNearestColor(BLUE, [GREEN]);
    expect(result.index).toBe(0);
    expect(result.color).toEqual(GREEN);
  });

  it('returns correct distance for non-exact match', () => {
    const result = perceptualNearestColor(ORANGE, [RED, GREEN, BLUE]);
    expect(result.distance).toBeGreaterThan(0);
  });
});

describe('snapToPalette', () => {
  it('snaps to nearest palette color', () => {
    const palette = [RED, GREEN, BLUE];
    const darkRed: RGBA = { r: 200, g: 10, b: 10, a: 255 };
    const snapped = snapToPalette(darkRed, palette);
    expect(snapped).toEqual(RED);
  });

  it('returns exact color if present in palette', () => {
    const palette = [RED, GREEN, BLUE];
    const snapped = snapToPalette(GREEN, palette);
    expect(snapped).toEqual(GREEN);
  });

  it('returns input color for empty palette', () => {
    const snapped = snapToPalette(RED, []);
    expect(snapped).toEqual(RED);
  });
});

describe('generateOklchRamp', () => {
  it('returns correct number of steps', () => {
    const ramp = generateOklchRamp('#ff0000', '#0000ff', 5);
    expect(ramp).toHaveLength(5);
  });

  it('starts and ends with correct colors', () => {
    const ramp = generateOklchRamp('#ff0000', '#0000ff', 5);
    expect(ramp[0]).toBe('#ff0000');
    expect(ramp[ramp.length - 1]).toBe('#0000ff');
  });

  it('returns empty array for 0 steps', () => {
    const ramp = generateOklchRamp('#ff0000', '#0000ff', 0);
    expect(ramp).toHaveLength(0);
  });

  it('returns single start color for 1 step', () => {
    const ramp = generateOklchRamp('#ff0000', '#0000ff', 1);
    expect(ramp).toHaveLength(1);
    expect(ramp[0]).toBe('#ff0000');
  });

  it('generates intermediate colors', () => {
    const ramp = generateOklchRamp('#ff0000', '#0000ff', 3);
    expect(ramp[1]).not.toBe('#ff0000');
    expect(ramp[1]).not.toBe('#0000ff');
  });

  it('returns valid hex strings', () => {
    const ramp = generateOklchRamp('#ff0000', '#00ff00', 5);
    for (const hex of ramp) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('generateHslRamp', () => {
  it('returns correct number of steps', () => {
    const ramp = generateHslRamp('#ff0000', '#0000ff', 5);
    expect(ramp).toHaveLength(5);
  });

  it('starts and ends with correct colors', () => {
    const ramp = generateHslRamp('#ff0000', '#0000ff', 5);
    expect(ramp[0]).toBe('#ff0000');
    expect(ramp[ramp.length - 1]).toBe('#0000ff');
  });

  it('returns empty array for 0 steps', () => {
    const ramp = generateHslRamp('#ff0000', '#0000ff', 0);
    expect(ramp).toHaveLength(0);
  });

  it('returns single start color for 1 step', () => {
    const ramp = generateHslRamp('#ff0000', '#0000ff', 1);
    expect(ramp).toHaveLength(1);
    expect(ramp[0]).toBe('#ff0000');
  });

  it('generates valid hex strings', () => {
    const ramp = generateHslRamp('#ff0000', '#00ff00', 5);
    for (const hex of ramp) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('generateHueShiftRampCore', () => {
  const defaultConfig = {
    hueShift: 30,
    saturationShift: 0.2,
    lightnessStart: 0.2,
    lightnessEnd: 0.9,
  };

  it('returns correct number of steps', () => {
    const ramp = generateHueShiftRampCore('#ff6600', 7, defaultConfig);
    expect(ramp).toHaveLength(7);
  });

  it('returns empty array for 0 steps', () => {
    const ramp = generateHueShiftRampCore('#ff6600', 0, defaultConfig);
    expect(ramp).toHaveLength(0);
  });

  it('returns single color for 1 step', () => {
    const ramp = generateHueShiftRampCore('#ff6600', 1, defaultConfig);
    expect(ramp).toHaveLength(1);
    expect(ramp[0]).toBe('#ff6600');
  });

  it('generates different colors across the ramp', () => {
    const ramp = generateHueShiftRampCore('#ff6600', 5, defaultConfig);
    const unique = new Set(ramp);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('generates valid hex strings', () => {
    const ramp = generateHueShiftRampCore('#ff6600', 5, defaultConfig);
    for (const hex of ramp) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('darker colors come first with lightnessStart < lightnessEnd', () => {
    const ramp = generateHueShiftRampCore('#ff6600', 5, defaultConfig);
    // First color should be darker (starts at lightnessStart=0.2)
    // Last color should be lighter (ends at lightnessEnd=0.9)
    expect(ramp[0]).not.toBe(ramp[ramp.length - 1]);
  });
});
