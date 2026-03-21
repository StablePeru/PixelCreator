import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  generatePaletteCycleFrames,
  reverseFrameRange,
} from '../../src/core/animation-engine.js';
import type { RGBA } from '../../src/types/common.js';
import type { FrameInfo } from '../../src/types/canvas.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };

describe('generatePaletteCycleFrames', () => {
  it('generates correct number of frames', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    const result = generatePaletteCycleFrames(buf, [RED, GREEN, BLUE], [0, 1, 2], 4);
    expect(result).toHaveLength(4);
  });

  it('first frame matches original', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, GREEN);
    const result = generatePaletteCycleFrames(buf, [RED, GREEN, BLUE], [0, 1, 2], 3);
    // Frame 0: shift by 0 — RED→RED, GREEN→GREEN
    expect(result[0].getPixel(0, 0)).toEqual(RED);
    expect(result[0].getPixel(1, 0)).toEqual(GREEN);
  });

  it('second frame shifts colors by 1', () => {
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, GREEN);
    const result = generatePaletteCycleFrames(buf, [RED, GREEN, BLUE], [0, 1, 2], 3);
    // Frame 1: shift by 1 — RED→GREEN, GREEN→BLUE
    expect(result[1].getPixel(0, 0)).toEqual(GREEN);
    expect(result[1].getPixel(1, 0)).toEqual(BLUE);
  });

  it('non-cycle pixels are preserved', () => {
    const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
    const buf = new PixelBuffer(2, 2);
    buf.setPixel(0, 0, RED);
    buf.setPixel(1, 0, WHITE);
    const result = generatePaletteCycleFrames(buf, [RED, GREEN], [0, 1], 3);
    // WHITE is not in cycle palette, should be preserved
    expect(result[1].getPixel(1, 0)).toEqual(WHITE);
  });

  it('transparent pixels are skipped', () => {
    const buf = new PixelBuffer(2, 2);
    const result = generatePaletteCycleFrames(buf, [RED], [0], 2);
    expect(result[0].getPixel(0, 0).a).toBe(0);
  });

  it('wraps around cycle', () => {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, BLUE);
    const result = generatePaletteCycleFrames(buf, [RED, GREEN, BLUE], [0, 1, 2], 4);
    // BLUE is index 2, frame 1 shift: (2+1)%3 = 0 = RED
    expect(result[1].getPixel(0, 0)).toEqual(RED);
  });
});

describe('reverseFrameRange', () => {
  const frames: FrameInfo[] = [
    { id: 'f1', index: 0, duration: 100 },
    { id: 'f2', index: 1, duration: 200 },
    { id: 'f3', index: 2, duration: 300 },
    { id: 'f4', index: 3, duration: 400 },
  ];

  it('reverses durations in range', () => {
    const result = reverseFrameRange(frames, 0, 3);
    expect(result[0].duration).toBe(400);
    expect(result[1].duration).toBe(300);
    expect(result[2].duration).toBe(200);
    expect(result[3].duration).toBe(100);
  });

  it('preserves IDs', () => {
    const result = reverseFrameRange(frames, 0, 3);
    expect(result[0].id).toBe('f1');
    expect(result[3].id).toBe('f4');
  });

  it('partial range reversal', () => {
    const result = reverseFrameRange(frames, 1, 2);
    expect(result[0].duration).toBe(100); // unchanged
    expect(result[1].duration).toBe(300); // swapped
    expect(result[2].duration).toBe(200); // swapped
    expect(result[3].duration).toBe(400); // unchanged
  });

  it('reverses labels', () => {
    const labeled: FrameInfo[] = [
      { id: 'f1', index: 0, duration: 100, label: 'start' },
      { id: 'f2', index: 1, duration: 200 },
      { id: 'f3', index: 2, duration: 300, label: 'end' },
    ];
    const result = reverseFrameRange(labeled, 0, 2);
    expect(result[0].label).toBe('end');
    expect(result[2].label).toBe('start');
  });

  it('single frame range is no-op', () => {
    const result = reverseFrameRange(frames, 1, 1);
    expect(result[1].duration).toBe(200);
  });
});
