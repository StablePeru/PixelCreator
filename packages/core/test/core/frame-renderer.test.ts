import { describe, it, expect } from 'vitest';
import { scaleBuffer } from '../../src/core/frame-renderer.js';
import { PixelBuffer } from '../../src/io/png-codec.js';

describe('frame-renderer', () => {
  describe('scaleBuffer', () => {
    it('returns same buffer at scale 1', () => {
      const buf = new PixelBuffer(4, 4);
      buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
      const result = scaleBuffer(buf, 1);
      expect(result).toBe(buf); // same reference
    });

    it('scales 2x2 to 4x4 at 2x', () => {
      const buf = new PixelBuffer(2, 2);
      buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
      buf.setPixel(1, 0, { r: 0, g: 255, b: 0, a: 255 });
      buf.setPixel(0, 1, { r: 0, g: 0, b: 255, a: 255 });
      buf.setPixel(1, 1, { r: 255, g: 255, b: 0, a: 255 });

      const result = scaleBuffer(buf, 2);
      expect(result.width).toBe(4);
      expect(result.height).toBe(4);

      // Check that each pixel is expanded to 2x2 block
      expect(result.getPixel(0, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.getPixel(1, 0)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.getPixel(0, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });
      expect(result.getPixel(1, 1)).toEqual({ r: 255, g: 0, b: 0, a: 255 });

      expect(result.getPixel(2, 0)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
      expect(result.getPixel(3, 1)).toEqual({ r: 0, g: 255, b: 0, a: 255 });
    });

    it('scales 1x1 to 3x3 at 3x', () => {
      const buf = new PixelBuffer(1, 1);
      buf.setPixel(0, 0, { r: 128, g: 64, b: 32, a: 200 });

      const result = scaleBuffer(buf, 3);
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);

      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(result.getPixel(x, y)).toEqual({ r: 128, g: 64, b: 32, a: 200 });
        }
      }
    });
  });
});
