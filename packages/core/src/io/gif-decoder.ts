import { GifReader } from 'omggif';
import { PixelBuffer } from './png-codec.js';

export interface GifFrame {
  buffer: PixelBuffer;
  duration: number;
}

export function decodeGif(data: Buffer): GifFrame[] {
  const reader = new GifReader(new Uint8Array(data));
  const width = reader.width;
  const height = reader.height;
  const frameCount = reader.numFrames();
  const frames: GifFrame[] = [];

  // Canvas for compositing (handles disposal methods)
  const canvas = new Uint8Array(width * height * 4);
  const previousCanvas = new Uint8Array(width * height * 4);

  for (let i = 0; i < frameCount; i++) {
    const info = reader.frameInfo(i);
    const delay = info.delay * 10; // centiseconds to ms

    // Save state before frame for dispose-to-previous
    if (info.disposal === 3) {
      previousCanvas.set(canvas);
    }

    // Decode frame RGBA into a temp buffer
    const framePixels = new Uint8Array(width * height * 4);
    reader.decodeAndBlitFrameRGBA(i, framePixels);

    // Composite frame onto canvas
    for (let y = info.y; y < info.y + info.height; y++) {
      for (let x = info.x; x < info.x + info.width; x++) {
        const idx = (y * width + x) * 4;
        const a = framePixels[idx + 3];
        if (a > 0) {
          canvas[idx] = framePixels[idx];
          canvas[idx + 1] = framePixels[idx + 1];
          canvas[idx + 2] = framePixels[idx + 2];
          canvas[idx + 3] = framePixels[idx + 3];
        }
      }
    }

    // Create PixelBuffer from current canvas state
    const pixelBuffer = new PixelBuffer(width, height, Buffer.from(canvas));
    frames.push({ buffer: pixelBuffer, duration: Math.max(delay, 10) });

    // Handle disposal
    if (info.disposal === 2) {
      // Restore to background (clear frame area)
      for (let y = info.y; y < info.y + info.height; y++) {
        for (let x = info.x; x < info.x + info.width; x++) {
          const idx = (y * width + x) * 4;
          canvas[idx] = 0;
          canvas[idx + 1] = 0;
          canvas[idx + 2] = 0;
          canvas[idx + 3] = 0;
        }
      }
    } else if (info.disposal === 3) {
      // Restore to previous
      canvas.set(previousCanvas);
    }
  }

  return frames;
}
