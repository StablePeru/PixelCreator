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
