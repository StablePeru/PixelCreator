import { describe, it, expect } from 'vitest';
import { encodeApng } from '../../src/io/apng-encoder.js';
import { PixelBuffer } from '../../src/io/png-codec.js';

describe('apng-encoder', () => {
  it('encodes a 2-frame APNG with PNG signature bytes', () => {
    const frame1 = new PixelBuffer(4, 4);
    const frame2 = new PixelBuffer(4, 4);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        frame1.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
        frame2.setPixel(x, y, { r: 0, g: 255, b: 0, a: 255 });
      }
    }

    const result = encodeApng(
      [
        { buffer: frame1, duration: 100 },
        { buffer: frame2, duration: 200 },
      ],
      { width: 4, height: 4, loop: 0 },
    );

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);

    // PNG signature: 137 80 78 71 13 10 26 10
    expect(result[0]).toBe(137);
    expect(result[1]).toBe(80);  // P
    expect(result[2]).toBe(78);  // N
    expect(result[3]).toBe(71);  // G
  });
});
