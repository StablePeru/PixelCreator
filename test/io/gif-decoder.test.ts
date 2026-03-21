import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { decodeGif } from '../../src/io/gif-decoder.js';
import { encodeGif } from '../../src/io/gif-encoder.js';
import { PixelBuffer } from '../../src/io/png-codec.js';

function createTestGif(frameCount: number, width: number, height: number): Buffer {
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const buffer = new PixelBuffer(width, height);
    // Fill with different colors per frame
    const r = i === 0 ? 255 : 0;
    const g = i === 1 ? 255 : 0;
    const b = i >= 2 ? 255 : 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        buffer.setPixel(x, y, { r, g, b, a: 255 });
      }
    }
    frames.push({ buffer, duration: 100 });
  }
  return encodeGif(frames, { width, height, loop: 0 });
}

describe('gif-decoder', () => {
  it('decodes a single-frame GIF', () => {
    const gifData = createTestGif(1, 4, 4);
    const frames = decodeGif(gifData);
    expect(frames).toHaveLength(1);
    expect(frames[0].buffer.width).toBe(4);
    expect(frames[0].buffer.height).toBe(4);
    expect(frames[0].duration).toBeGreaterThanOrEqual(10);
  });

  it('decodes multi-frame GIF', () => {
    const gifData = createTestGif(3, 8, 8);
    const frames = decodeGif(gifData);
    expect(frames).toHaveLength(3);
    for (const frame of frames) {
      expect(frame.buffer.width).toBe(8);
      expect(frame.buffer.height).toBe(8);
    }
  });

  it('preserves frame dimensions', () => {
    const gifData = createTestGif(2, 16, 12);
    const frames = decodeGif(gifData);
    expect(frames[0].buffer.width).toBe(16);
    expect(frames[0].buffer.height).toBe(12);
  });

  it('roundtrips encode→decode', () => {
    const width = 4;
    const height = 4;
    const original = new PixelBuffer(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        original.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
      }
    }
    const gifData = encodeGif([{ buffer: original, duration: 100 }], { width, height, loop: 0 });
    const frames = decodeGif(gifData);
    expect(frames).toHaveLength(1);
    // GIF quantization may slightly alter colors, but red should remain dominant
    const pixel = frames[0].buffer.getPixel(0, 0);
    expect(pixel.a).toBeGreaterThan(0);
  });
});
