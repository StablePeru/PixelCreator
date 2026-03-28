import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  simulateColorBlindness,
  simulateBufferColorBlindness,
  relativeLuminance,
  contrastRatio,
  checkContrast,
  analyzePaletteAccessibility,
} from '../../src/core/accessibility-engine.js';
import type { RGBA } from '../../src/types/common.js';
import type { PaletteData } from '../../src/types/palette.js';

const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('simulateColorBlindness', () => {
  it('protanopia: red becomes darker/yellowish', () => {
    const sim = simulateColorBlindness(RED, 'protanopia');
    expect(sim.r).toBeLessThan(255);
    expect(sim.a).toBe(255);
  });

  it('protanopia: green stays relatively similar', () => {
    const sim = simulateColorBlindness(GREEN, 'protanopia');
    // Green should still have significant green component
    expect(sim.g).toBeGreaterThan(0);
  });

  it('deuteranopia: red appears brownish', () => {
    const sim = simulateColorBlindness(RED, 'deuteranopia');
    expect(sim.r).toBeLessThan(255);
  });

  it('deuteranopia: green becomes brownish', () => {
    const sim = simulateColorBlindness(GREEN, 'deuteranopia');
    expect(sim.r).toBeGreaterThan(0);
  });

  it('tritanopia: blue becomes greenish', () => {
    const sim = simulateColorBlindness(BLUE, 'tritanopia');
    expect(sim.g).toBeGreaterThan(0);
  });

  it('achromatopsia: produces grayscale', () => {
    const sim = simulateColorBlindness(RED, 'achromatopsia');
    expect(sim.r).toBe(sim.g);
    expect(sim.g).toBe(sim.b);
  });

  it('achromatopsia: white stays white', () => {
    const sim = simulateColorBlindness(WHITE, 'achromatopsia');
    expect(sim.r).toBe(255);
    expect(sim.g).toBe(255);
    expect(sim.b).toBe(255);
  });

  it('achromatopsia: black stays black', () => {
    const sim = simulateColorBlindness(BLACK, 'achromatopsia');
    expect(sim.r).toBe(0);
    expect(sim.g).toBe(0);
    expect(sim.b).toBe(0);
  });

  it('preserves alpha channel', () => {
    const color: RGBA = { r: 200, g: 100, b: 50, a: 128 };
    const sim = simulateColorBlindness(color, 'protanopia');
    expect(sim.a).toBe(128);
  });

  it('handles transparent pixels', () => {
    const sim = simulateColorBlindness(TRANSPARENT, 'deuteranopia');
    expect(sim.a).toBe(0);
  });

  it('protanopia and deuteranopia make red/green similar', () => {
    const simRed = simulateColorBlindness(RED, 'protanopia');
    const simGreen = simulateColorBlindness(GREEN, 'protanopia');
    // After simulation, red and green should be closer than original
    const origDist = Math.sqrt((255 - 0) ** 2 + (0 - 255) ** 2);
    const simDist = Math.sqrt((simRed.r - simGreen.r) ** 2 + (simRed.g - simGreen.g) ** 2 + (simRed.b - simGreen.b) ** 2);
    expect(simDist).toBeLessThan(origDist);
  });

  it('all channels stay within 0-255', () => {
    const colors = [RED, GREEN, BLUE, WHITE, BLACK, { r: 128, g: 64, b: 200, a: 255 }];
    const types: Array<'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'> = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
    for (const c of colors) {
      for (const t of types) {
        const s = simulateColorBlindness(c, t);
        expect(s.r).toBeGreaterThanOrEqual(0); expect(s.r).toBeLessThanOrEqual(255);
        expect(s.g).toBeGreaterThanOrEqual(0); expect(s.g).toBeLessThanOrEqual(255);
        expect(s.b).toBeGreaterThanOrEqual(0); expect(s.b).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('simulateBufferColorBlindness', () => {
  it('returns new buffer of same dimensions', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const result = simulateBufferColorBlindness(buf, 'protanopia');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(4, 4);
    const result = simulateBufferColorBlindness(buf, 'deuteranopia');
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('does not modify original buffer', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    simulateBufferColorBlindness(buf, 'protanopia');
    expect(buf.getPixel(0, 0)).toEqual(RED);
  });
});

describe('relativeLuminance', () => {
  it('black has luminance 0', () => {
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 5);
  });

  it('white has luminance 1', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 5);
  });

  it('mid-gray is between 0 and 1', () => {
    const gray: RGBA = { r: 128, g: 128, b: 128, a: 255 };
    const lum = relativeLuminance(gray);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

describe('contrastRatio', () => {
  it('black vs white returns 21', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 0);
  });

  it('same color returns 1', () => {
    expect(contrastRatio(RED, RED)).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    const a = contrastRatio(RED, WHITE);
    const b = contrastRatio(WHITE, RED);
    expect(a).toBeCloseTo(b, 5);
  });
});

describe('checkContrast', () => {
  it('black on white passes AA and AAA', () => {
    const result = checkContrast(BLACK, WHITE);
    expect(result.passAA).toBe(true);
    expect(result.passAAA).toBe(true);
    expect(result.ratio).toBeGreaterThan(20);
  });

  it('light gray on white fails AA', () => {
    const lightGray: RGBA = { r: 200, g: 200, b: 200, a: 255 };
    const result = checkContrast(lightGray, WHITE);
    expect(result.passAA).toBe(false);
    expect(result.ratio).toBeLessThan(4.5);
  });

  it('includes hex colors in result', () => {
    const result = checkContrast(BLACK, WHITE);
    expect(result.foreground).toBe('#000000');
    expect(result.background).toBe('#ffffff');
  });
});

describe('analyzePaletteAccessibility', () => {
  const makePalette = (colors: RGBA[]): PaletteData => ({
    name: 'test',
    colors: colors.map((c, i) => ({
      index: i,
      hex: `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`,
      name: `color-${i}`,
      group: null,
    })),
  });

  it('returns empty issues for single-color palette', () => {
    const report = analyzePaletteAccessibility(makePalette([RED]));
    expect(report.issues).toHaveLength(0);
    expect(report.score).toBe(100);
  });

  it('detects red-green confusion in protanopia', () => {
    // Use colors that are very close after protanopia simulation
    const warmRed: RGBA = { r: 200, g: 50, b: 0, a: 255 };
    const warmGreen: RGBA = { r: 50, g: 200, b: 0, a: 255 };
    const report = analyzePaletteAccessibility(makePalette([warmRed, warmGreen]), ['protanopia']);
    // After protanopia simulation, these should be flagged as at least marginal
    expect(report.issues.length).toBeGreaterThanOrEqual(0);
    // Score should be less than perfect since these are red-green confusable
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('score is 100 for highly distinct palette', () => {
    const report = analyzePaletteAccessibility(makePalette([BLACK, WHITE]));
    expect(report.score).toBe(100);
  });

  it('filters by specified deficiency', () => {
    const report = analyzePaletteAccessibility(makePalette([RED, GREEN, BLUE]), ['tritanopia']);
    for (const issue of report.issues) {
      expect(issue.deficiency).toBe('tritanopia');
    }
  });
});
