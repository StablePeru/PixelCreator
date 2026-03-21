import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { PixelBuffer, encodePNG, decodePNG, savePNG, loadPNG } from '../../src/io/png-codec.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('PixelBuffer', () => {
  it('creates buffer with correct dimensions', () => {
    const buf = new PixelBuffer(16, 16);
    expect(buf.width).toBe(16);
    expect(buf.height).toBe(16);
    expect(buf.data.length).toBe(16 * 16 * 4);
  });

  it('initializes to transparent black', () => {
    const buf = new PixelBuffer(4, 4);
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('sets and gets pixels correctly', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(1, 2, RED);
    expect(buf.getPixel(1, 2)).toEqual(RED);
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('throws on out-of-bounds get', () => {
    const buf = new PixelBuffer(4, 4);
    expect(() => buf.getPixel(-1, 0)).toThrow();
    expect(() => buf.getPixel(4, 0)).toThrow();
  });

  it('silently ignores out-of-bounds set', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(-1, 0, RED); // Should not throw
    buf.setPixel(4, 0, RED);
  });

  it('clones correctly', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const clone = buf.clone();
    expect(clone.getPixel(0, 0)).toEqual(RED);
    clone.setPixel(0, 0, TRANSPARENT);
    expect(buf.getPixel(0, 0)).toEqual(RED); // Original unchanged
  });

  it('clears buffer', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    buf.clear();
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('PNG encode/decode', () => {
  it('roundtrips pixel data', () => {
    const buf = new PixelBuffer(8, 8);
    buf.setPixel(0, 0, RED);
    buf.setPixel(7, 7, { r: 0, g: 255, b: 0, a: 128 });

    const encoded = encodePNG(buf);
    const decoded = decodePNG(encoded);

    expect(decoded.width).toBe(8);
    expect(decoded.height).toBe(8);
    expect(decoded.getPixel(0, 0)).toEqual(RED);
    expect(decoded.getPixel(7, 7)).toEqual({ r: 0, g: 255, b: 0, a: 128 });
  });
});

describe('PNG file I/O', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and loads PNG files', () => {
    const buf = new PixelBuffer(16, 16);
    buf.setPixel(5, 5, RED);

    const filePath = path.join(tmpDir, 'test.png');
    savePNG(buf, filePath);

    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = loadPNG(filePath);
    expect(loaded.width).toBe(16);
    expect(loaded.height).toBe(16);
    expect(loaded.getPixel(5, 5)).toEqual(RED);
  });

  it('creates directories as needed', () => {
    const buf = new PixelBuffer(4, 4);
    const filePath = path.join(tmpDir, 'sub', 'dir', 'test.png');
    savePNG(buf, filePath);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
