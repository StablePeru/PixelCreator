import UPNG from 'upng-js';
import { PixelBuffer } from './png-codec.js';

export interface ApngFrameInput {
  buffer: PixelBuffer;
  duration: number;
}

export interface ApngOptions {
  width: number;
  height: number;
  loop: number;
}

export function encodeApng(frames: ApngFrameInput[], options: ApngOptions): Buffer {
  const rgbaBuffers: ArrayBuffer[] = [];
  const delays: number[] = [];

  for (const frame of frames) {
    const { width, height } = frame.buffer;
    const rgba = new ArrayBuffer(width * height * 4);
    const view = new Uint8Array(rgba);
    frame.buffer.data.copy(Buffer.from(view.buffer));
    rgbaBuffers.push(rgba);
    delays.push(frame.duration);
  }

  const result = UPNG.encode(rgbaBuffers, options.width, options.height, 0, delays);
  return Buffer.from(result);
}
