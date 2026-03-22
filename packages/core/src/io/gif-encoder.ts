import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
import { PixelBuffer } from './png-codec.js';

export interface GifFrameInput {
  buffer: PixelBuffer;
  duration: number;
}

export interface GifOptions {
  width: number;
  height: number;
  loop: number;
}

export function encodeGif(frames: GifFrameInput[], options: GifOptions): Buffer {
  const gif = GIFEncoder();

  for (const frame of frames) {
    const { width, height } = frame.buffer;
    const rgba = new Uint8Array(width * height * 4);
    frame.buffer.data.copy(Buffer.from(rgba.buffer));

    const palette = quantize(rgba, 256, { format: 'rgba4444' });
    const index = applyPalette(rgba, palette, 'rgba4444');

    // Find transparent index: first palette entry with alpha < 128
    let transparentIndex = -1;
    for (let i = 0; i < palette.length; i++) {
      if (palette[i][3] < 128) {
        transparentIndex = i;
        break;
      }
    }

    // Mark fully transparent pixels
    for (let i = 0; i < width * height; i++) {
      if (rgba[i * 4 + 3] < 128) {
        if (transparentIndex >= 0) {
          index[i] = transparentIndex;
        }
      }
    }

    const delay = Math.round(frame.duration / 10); // ms to centiseconds
    gif.writeFrame(index, width, height, {
      palette,
      delay: Math.max(1, delay),
      transparent: transparentIndex >= 0 ? transparentIndex : undefined,
      dispose: 2, // restore to background
    });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}
