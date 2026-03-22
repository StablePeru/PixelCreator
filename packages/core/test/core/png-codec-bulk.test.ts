import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };

describe('PixelBuffer bulk ops', () => {
  describe('getPixelU32 / setPixelU32', () => {
    it('round-trips pixel data', () => {
      const buf = new PixelBuffer(4, 4);
      buf.setPixel(1, 1, RED);
      const u32 = buf.getPixelU32(1, 1);
      const buf2 = new PixelBuffer(4, 4);
      buf2.setPixelU32(2, 2, u32);
      expect(buf2.getPixel(2, 2)).toEqual(RED);
    });

    it('clips out of bounds on setPixelU32', () => {
      const buf = new PixelBuffer(4, 4);
      buf.setPixelU32(-1, 0, 0xFFFFFFFF);
      // Should not throw
    });
  });

  describe('copyFrom', () => {
    it('copies region between buffers', () => {
      const src = new PixelBuffer(8, 8);
      src.setPixel(2, 2, RED);
      src.setPixel(3, 3, GREEN);

      const dst = new PixelBuffer(8, 8);
      dst.copyFrom(src, 2, 2, 4, 4, 2, 2);

      expect(dst.getPixel(4, 4)).toEqual(RED);
      expect(dst.getPixel(5, 5)).toEqual(GREEN);
    });

    it('clips to bounds', () => {
      const src = new PixelBuffer(4, 4);
      src.setPixel(0, 0, RED);
      const dst = new PixelBuffer(4, 4);
      dst.copyFrom(src, 0, 0, 3, 3, 4, 4);
      expect(dst.getPixel(3, 3)).toEqual(RED);
      // Beyond bounds should not crash
    });
  });

  describe('equals', () => {
    it('identical buffers are equal', () => {
      const a = new PixelBuffer(4, 4);
      a.setPixel(0, 0, RED);
      const b = a.clone();
      expect(a.equals(b)).toBe(true);
    });

    it('different buffers are not equal', () => {
      const a = new PixelBuffer(4, 4);
      a.setPixel(0, 0, RED);
      const b = new PixelBuffer(4, 4);
      b.setPixel(0, 0, GREEN);
      expect(a.equals(b)).toBe(false);
    });

    it('different sizes are not equal', () => {
      const a = new PixelBuffer(4, 4);
      const b = new PixelBuffer(8, 8);
      expect(a.equals(b)).toBe(false);
    });
  });
});
