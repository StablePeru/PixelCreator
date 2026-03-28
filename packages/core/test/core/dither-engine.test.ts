import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  getBayerThreshold,
  shouldDitherPixel,
  drawDitheredGradient,
  ditherBufferToPalette,
} from '../../src/core/dither-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('getBayerThreshold', () => {
  const modes: Array<'ordered-2x2' | 'ordered-4x4' | 'ordered-8x8'> = [
    'ordered-2x2',
    'ordered-4x4',
    'ordered-8x8',
  ];

  for (const mode of modes) {
    it(`returns values between 0 and 1 for ${mode}`, () => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const t = getBayerThreshold(x, y, mode);
          expect(t).toBeGreaterThan(0);
          expect(t).toBeLessThanOrEqual(1);
        }
      }
    });
  }

  it('returns consistent values for same position', () => {
    const t1 = getBayerThreshold(3, 5, 'ordered-4x4');
    const t2 = getBayerThreshold(3, 5, 'ordered-4x4');
    expect(t1).toBe(t2);
  });

  it('wraps around for positions beyond matrix size', () => {
    const t1 = getBayerThreshold(1, 1, 'ordered-4x4');
    const t2 = getBayerThreshold(5, 5, 'ordered-4x4');
    expect(t1).toBe(t2);
  });

  it('handles negative coordinates gracefully', () => {
    const t = getBayerThreshold(-1, -1, 'ordered-4x4');
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(1);
  });
});

describe('shouldDitherPixel', () => {
  it('with ratio 0 always returns false', () => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        expect(shouldDitherPixel(x, y, 0, 'ordered-4x4')).toBe(false);
      }
    }
  });

  it('with ratio 1 always returns true', () => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        expect(shouldDitherPixel(x, y, 1, 'ordered-4x4')).toBe(true);
      }
    }
  });

  it('with ratio ~0.5 gives roughly half for ordered-4x4', () => {
    let count = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (shouldDitherPixel(x, y, 0.5, 'ordered-4x4')) count++;
      }
    }
    // 8x8 grid = 64 pixels, roughly half should be true (25-40)
    expect(count).toBeGreaterThanOrEqual(25);
    expect(count).toBeLessThanOrEqual(40);
  });

  it('with mode "none" always returns true regardless of ratio', () => {
    expect(shouldDitherPixel(0, 0, 0, 'none')).toBe(true);
    expect(shouldDitherPixel(0, 0, 0.5, 'none')).toBe(true);
    expect(shouldDitherPixel(0, 0, 1, 'none')).toBe(true);
  });

  it('more pixels are drawn with higher ratio', () => {
    let countLow = 0;
    let countHigh = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (shouldDitherPixel(x, y, 0.25, 'ordered-8x8')) countLow++;
        if (shouldDitherPixel(x, y, 0.75, 'ordered-8x8')) countHigh++;
      }
    }
    expect(countHigh).toBeGreaterThan(countLow);
  });
});

describe('drawDitheredGradient', () => {
  it('creates a buffer with only color1 and color2 (no blended colors)', () => {
    const buf = new PixelBuffer(16, 1);
    drawDitheredGradient(buf, 0, 0, 15, 0, RED, BLUE, 'ordered-4x4');

    for (let x = 0; x < 16; x++) {
      const pixel = buf.getPixel(x, 0);
      const isRed = pixel.r === RED.r && pixel.g === RED.g && pixel.b === RED.b;
      const isBlue = pixel.r === BLUE.r && pixel.g === BLUE.g && pixel.b === BLUE.b;
      expect(isRed || isBlue).toBe(true);
    }
  });

  it('uses full buffer width', () => {
    const buf = new PixelBuffer(16, 1);
    drawDitheredGradient(buf, 0, 0, 15, 0, RED, BLUE, 'ordered-4x4');

    // At least some pixels should be set (not transparent)
    let nonTransparent = 0;
    for (let x = 0; x < 16; x++) {
      const pixel = buf.getPixel(x, 0);
      if (pixel.a > 0) nonTransparent++;
    }
    expect(nonTransparent).toBe(16);
  });

  it('gradient starts with color1 side and ends with color2 side', () => {
    const buf = new PixelBuffer(32, 1);
    drawDitheredGradient(buf, 0, 0, 31, 0, WHITE, BLACK, 'ordered-8x8');

    // At the very start (t~0), color1 (WHITE) should dominate
    let whiteCountStart = 0;
    for (let x = 0; x < 4; x++) {
      const p = buf.getPixel(x, 0);
      if (p.r === WHITE.r && p.g === WHITE.g && p.b === WHITE.b) whiteCountStart++;
    }
    // At the very end (t~1), color2 (BLACK) should dominate
    let blackCountEnd = 0;
    for (let x = 28; x < 32; x++) {
      const p = buf.getPixel(x, 0);
      if (p.r === BLACK.r && p.g === BLACK.g && p.b === BLACK.b) blackCountEnd++;
    }

    expect(whiteCountStart).toBeGreaterThan(0);
    expect(blackCountEnd).toBeGreaterThan(0);
  });

  it('works with a 2D region', () => {
    const buf = new PixelBuffer(8, 8);
    drawDitheredGradient(buf, 0, 0, 7, 0, RED, GREEN, 'ordered-4x4');

    // All rows should have pixels set (gradient fills the entire region)
    for (let y = 0; y < 8; y++) {
      const pixel = buf.getPixel(0, y);
      expect(pixel.a).toBe(255);
    }
  });
});

describe('ditherBufferToPalette', () => {
  it('reduces buffer to palette colors only', () => {
    const buf = new PixelBuffer(4, 4);
    // Fill with a color not in palette
    const midColor: RGBA = { r: 128, g: 0, b: 128, a: 255 };
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        buf.setPixel(x, y, midColor);
      }
    }

    const palette = [RED, BLUE];
    const result = ditherBufferToPalette(buf, palette, 'ordered-4x4');

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const pixel = result.getPixel(x, y);
        const isRed = pixel.r === RED.r && pixel.g === RED.g && pixel.b === RED.b;
        const isBlue = pixel.r === BLUE.r && pixel.g === BLUE.g && pixel.b === BLUE.b;
        expect(isRed || isBlue).toBe(true);
      }
    }
  });

  it('preserves transparent pixels', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    // (1,0) stays transparent

    const palette = [RED, GREEN];
    const result = ditherBufferToPalette(buf, palette, 'ordered-4x4');

    const transparentPixel = result.getPixel(1, 0);
    expect(transparentPixel.a).toBe(0);

    const redPixel = result.getPixel(0, 0);
    expect(redPixel.r).toBe(RED.r);
    expect(redPixel.g).toBe(RED.g);
    expect(redPixel.b).toBe(RED.b);
  });

  it('handles "none" mode by returning a clone', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);

    const result = ditherBufferToPalette(buf, [GREEN], 'none');

    // With mode 'none', buffer is cloned as-is
    const pixel = result.getPixel(0, 0);
    expect(pixel).toEqual(RED);
  });

  it('handles empty palette by returning a clone', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);

    const result = ditherBufferToPalette(buf, [], 'ordered-4x4');

    const pixel = result.getPixel(0, 0);
    expect(pixel).toEqual(RED);
  });

  it('snaps exact palette colors without dithering', () => {
    const buf = new PixelBuffer(4, 4);
    // Fill with a color that is already in the palette
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        buf.setPixel(x, y, RED);
      }
    }

    const palette = [RED, GREEN, BLUE];
    const result = ditherBufferToPalette(buf, palette, 'ordered-4x4');

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const pixel = result.getPixel(x, y);
        expect(pixel.r).toBe(RED.r);
        expect(pixel.g).toBe(RED.g);
        expect(pixel.b).toBe(RED.b);
      }
    }
  });

  it('preserves alpha of original pixels', () => {
    const buf = new PixelBuffer(4, 4);
    const semiTransparent: RGBA = { r: 255, g: 0, b: 0, a: 128 };
    buf.setPixel(0, 0, semiTransparent);

    const palette = [RED, GREEN];
    const result = ditherBufferToPalette(buf, palette, 'ordered-4x4');

    const pixel = result.getPixel(0, 0);
    expect(pixel.a).toBe(128);
  });
});
