import { describe, it, expect } from 'vitest';
import { encodeGif } from '../../src/io/gif-encoder.js';
import { PixelBuffer } from '../../src/io/png-codec.js';

describe('gif-encoder', () => {
  it('encodes a 2-frame 4x4 GIF with valid magic bytes', () => {
    const frame1 = new PixelBuffer(4, 4);
    const frame2 = new PixelBuffer(4, 4);

    // Fill frame1 red
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        frame1.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
      }
    }
    // Fill frame2 blue
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        frame2.setPixel(x, y, { r: 0, g: 0, b: 255, a: 255 });
      }
    }

    const result = encodeGif(
      [
        { buffer: frame1, duration: 100 },
        { buffer: frame2, duration: 200 },
      ],
      { width: 4, height: 4, loop: 0 },
    );

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);

    // GIF89a magic bytes
    const magic = result.subarray(0, 6).toString('ascii');
    expect(magic).toBe('GIF89a');
  });

  it('handles transparency', () => {
    const frame = new PixelBuffer(2, 2);
    frame.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    // Other pixels remain transparent (alpha = 0)

    const result = encodeGif(
      [{ buffer: frame, duration: 100 }],
      { width: 2, height: 2, loop: 0 },
    );

    expect(result.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    expect(result.length).toBeGreaterThan(0);
  });
});
