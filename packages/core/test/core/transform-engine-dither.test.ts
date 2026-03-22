import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { ditherBuffer } from '../../src/core/transform-engine.js';
import type { RGBA } from '../../src/types/common.js';

const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
const GRAY: RGBA = { r: 128, g: 128, b: 128, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('ditherBuffer', () => {
  it('ordered dither maps to nearest palette colors', () => {
    const buf = new PixelBuffer(4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        buf.setPixel(x, y, GRAY);
      }
    }
    const result = ditherBuffer(buf, [BLACK, WHITE], 'ordered', 4);
    // All pixels should be either black or white
    let blacks = 0;
    let whites = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const px = result.getPixel(x, y);
        if (px.r === 0 && px.g === 0 && px.b === 0) blacks++;
        else if (px.r === 255 && px.g === 255 && px.b === 255) whites++;
      }
    }
    expect(blacks + whites).toBe(16);
    expect(blacks).toBeGreaterThan(0);
    expect(whites).toBeGreaterThan(0);
  });

  it('floyd-steinberg dither maps to palette colors', () => {
    const buf = new PixelBuffer(4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        buf.setPixel(x, y, GRAY);
      }
    }
    const result = ditherBuffer(buf, [BLACK, WHITE], 'floyd-steinberg');
    // All pixels should be either black or white
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const px = result.getPixel(x, y);
        expect(px.r === 0 || px.r === 255).toBe(true);
      }
    }
  });

  it('skips transparent pixels', () => {
    const buf = new PixelBuffer(2, 1);
    buf.setPixel(0, 0, TRANSPARENT);
    buf.setPixel(1, 0, GRAY);
    const result = ditherBuffer(buf, [BLACK, WHITE], 'ordered', 2);
    expect(result.getPixel(0, 0).a).toBe(0);
    expect(result.getPixel(1, 0).a).toBe(255);
  });

  it('pure palette color stays unchanged', () => {
    const buf = new PixelBuffer(2, 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        buf.setPixel(x, y, WHITE);
      }
    }
    const result = ditherBuffer(buf, [BLACK, WHITE], 'ordered', 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        expect(result.getPixel(x, y).r).toBe(255);
      }
    }
  });

  it('ordered dither with matrix size 2 works', () => {
    const buf = new PixelBuffer(2, 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        buf.setPixel(x, y, GRAY);
      }
    }
    const result = ditherBuffer(buf, [BLACK, WHITE], 'ordered', 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const px = result.getPixel(x, y);
        expect(px.r === 0 || px.r === 255).toBe(true);
      }
    }
  });

  it('ordered dither with matrix size 8 works', () => {
    const buf = new PixelBuffer(8, 8);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        buf.setPixel(x, y, GRAY);
      }
    }
    const result = ditherBuffer(buf, [BLACK, WHITE], 'ordered', 8);
    let hasBlack = false;
    let hasWhite = false;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const px = result.getPixel(x, y);
        if (px.r === 0) hasBlack = true;
        if (px.r === 255) hasWhite = true;
      }
    }
    expect(hasBlack).toBe(true);
    expect(hasWhite).toBe(true);
  });
});
