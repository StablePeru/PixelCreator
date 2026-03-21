import { PNG } from 'pngjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RGBA } from '../types/common.js';

export class PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;

  constructor(width: number, height: number, data?: Buffer) {
    this.width = width;
    this.height = height;
    if (data) {
      if (data.length !== width * height * 4) {
        throw new Error(`Buffer size mismatch: expected ${width * height * 4}, got ${data.length}`);
      }
      this.data = data;
    } else {
      this.data = Buffer.alloc(width * height * 4, 0);
    }
  }

  getPixel(x: number, y: number): RGBA {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new Error(`Pixel out of bounds: (${x}, ${y}) in ${this.width}x${this.height}`);
    }
    const idx = (y * this.width + x) * 4;
    return {
      r: this.data[idx],
      g: this.data[idx + 1],
      b: this.data[idx + 2],
      a: this.data[idx + 3],
    };
  }

  setPixel(x: number, y: number, color: RGBA): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = color.r;
    this.data[idx + 1] = color.g;
    this.data[idx + 2] = color.b;
    this.data[idx + 3] = color.a;
  }

  getPixelU32(x: number, y: number): number {
    const idx = (y * this.width + x) * 4;
    return this.data[idx] | (this.data[idx + 1] << 8) | (this.data[idx + 2] << 16) | (this.data[idx + 3] << 24);
  }

  setPixelU32(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = value & 0xFF;
    this.data[idx + 1] = (value >> 8) & 0xFF;
    this.data[idx + 2] = (value >> 16) & 0xFF;
    this.data[idx + 3] = (value >> 24) & 0xFF;
  }

  copyFrom(
    source: PixelBuffer,
    srcX: number, srcY: number,
    dstX: number, dstY: number,
    width: number, height: number,
  ): void {
    for (let y = 0; y < height; y++) {
      const sy = srcY + y;
      const dy = dstY + y;
      if (sy < 0 || sy >= source.height || dy < 0 || dy >= this.height) continue;
      const srcStart = (sy * source.width + Math.max(0, srcX)) * 4;
      const dstStart = (dy * this.width + Math.max(0, dstX)) * 4;
      const effectiveX = Math.max(0, srcX);
      const effectiveW = Math.min(width, source.width - effectiveX, this.width - Math.max(0, dstX));
      if (effectiveW <= 0) continue;
      source.data.copy(this.data, dstStart, srcStart, srcStart + effectiveW * 4);
    }
  }

  equals(other: PixelBuffer): boolean {
    if (this.width !== other.width || this.height !== other.height) return false;
    return this.data.equals(other.data);
  }

  clone(): PixelBuffer {
    return new PixelBuffer(this.width, this.height, Buffer.from(this.data));
  }

  clear(color?: RGBA): void {
    if (!color || (color.r === 0 && color.g === 0 && color.b === 0 && color.a === 0)) {
      this.data.fill(0);
    } else {
      for (let i = 0; i < this.width * this.height; i++) {
        const idx = i * 4;
        this.data[idx] = color.r;
        this.data[idx + 1] = color.g;
        this.data[idx + 2] = color.b;
        this.data[idx + 3] = color.a;
      }
    }
  }
}

export function encodePNG(buffer: PixelBuffer): Buffer {
  const png = new PNG({ width: buffer.width, height: buffer.height });
  buffer.data.copy(png.data);
  return PNG.sync.write(png);
}

export function decodePNG(data: Buffer): PixelBuffer {
  const png = PNG.sync.read(data);
  return new PixelBuffer(png.width, png.height, Buffer.from(png.data));
}

export function savePNG(buffer: PixelBuffer, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, encodePNG(buffer));
}

export function loadPNG(filePath: string): PixelBuffer {
  const data = fs.readFileSync(filePath);
  return decodePNG(data);
}

export function createEmptyBuffer(width: number, height: number): PixelBuffer {
  return new PixelBuffer(width, height);
}
