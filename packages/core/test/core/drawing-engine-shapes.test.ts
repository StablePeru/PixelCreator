import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { drawCircle, drawEllipse } from '../../src/core/drawing-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

describe('drawCircle', () => {
  it('draws a single pixel for radius 0', () => {
    const buf = new PixelBuffer(8, 8);
    drawCircle(buf, 4, 4, 0, RED, false);
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(3, 4)).toEqual(TRANSPARENT);
  });

  it('draws a circle outline', () => {
    const buf = new PixelBuffer(16, 16);
    drawCircle(buf, 8, 8, 4, RED, false);
    // Center should be empty
    expect(buf.getPixel(8, 8)).toEqual(TRANSPARENT);
    // Top of circle
    expect(buf.getPixel(8, 4)).toEqual(RED);
    // Bottom of circle
    expect(buf.getPixel(8, 12)).toEqual(RED);
    // Left of circle
    expect(buf.getPixel(4, 8)).toEqual(RED);
    // Right of circle
    expect(buf.getPixel(12, 8)).toEqual(RED);
  });

  it('draws a filled circle', () => {
    const buf = new PixelBuffer(16, 16);
    drawCircle(buf, 8, 8, 4, RED, true);
    // Center should be filled
    expect(buf.getPixel(8, 8)).toEqual(RED);
    // Cardinal points should be filled
    expect(buf.getPixel(8, 4)).toEqual(RED);
    expect(buf.getPixel(8, 12)).toEqual(RED);
    // Outside should be transparent
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('clips out-of-bounds pixels silently', () => {
    const buf = new PixelBuffer(4, 4);
    // Circle centered at edge — should not throw
    drawCircle(buf, 0, 0, 3, RED, true);
    expect(buf.getPixel(0, 0)).toEqual(RED);
  });
});

describe('drawEllipse', () => {
  it('draws a single pixel for rx=0 ry=0', () => {
    const buf = new PixelBuffer(8, 8);
    drawEllipse(buf, 4, 4, 0, 0, RED, false);
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(3, 4)).toEqual(TRANSPARENT);
  });

  it('draws a vertical line for rx=0', () => {
    const buf = new PixelBuffer(8, 8);
    drawEllipse(buf, 4, 4, 0, 2, RED, false);
    expect(buf.getPixel(4, 2)).toEqual(RED);
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(4, 6)).toEqual(RED);
    expect(buf.getPixel(3, 4)).toEqual(TRANSPARENT);
  });

  it('draws a horizontal line for ry=0', () => {
    const buf = new PixelBuffer(8, 8);
    drawEllipse(buf, 4, 4, 2, 0, RED, false);
    expect(buf.getPixel(2, 4)).toEqual(RED);
    expect(buf.getPixel(4, 4)).toEqual(RED);
    expect(buf.getPixel(6, 4)).toEqual(RED);
    expect(buf.getPixel(4, 3)).toEqual(TRANSPARENT);
  });

  it('draws an ellipse outline', () => {
    const buf = new PixelBuffer(20, 20);
    drawEllipse(buf, 10, 10, 6, 3, RED, false);
    // Center should be empty
    expect(buf.getPixel(10, 10)).toEqual(TRANSPARENT);
    // Cardinal extremes should be drawn
    expect(buf.getPixel(10, 7)).toEqual(RED);  // top
    expect(buf.getPixel(10, 13)).toEqual(RED); // bottom
    expect(buf.getPixel(4, 10)).toEqual(RED);  // left
    expect(buf.getPixel(16, 10)).toEqual(RED); // right
  });

  it('draws a filled ellipse', () => {
    const buf = new PixelBuffer(20, 20);
    drawEllipse(buf, 10, 10, 6, 3, RED, true);
    // Center should be filled
    expect(buf.getPixel(10, 10)).toEqual(RED);
    // Points along horizontal axis
    expect(buf.getPixel(8, 10)).toEqual(RED);
    expect(buf.getPixel(12, 10)).toEqual(RED);
    // Outside should be transparent
    expect(buf.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('draws a circle when rx equals ry', () => {
    const buf = new PixelBuffer(16, 16);
    drawEllipse(buf, 8, 8, 4, 4, RED, false);
    // Should be symmetric like a circle
    expect(buf.getPixel(8, 4)).toEqual(RED);
    expect(buf.getPixel(8, 12)).toEqual(RED);
    expect(buf.getPixel(4, 8)).toEqual(RED);
    expect(buf.getPixel(12, 8)).toEqual(RED);
  });

  it('clips out-of-bounds pixels silently', () => {
    const buf = new PixelBuffer(4, 4);
    drawEllipse(buf, 0, 0, 5, 3, RED, true);
    expect(buf.getPixel(0, 0)).toEqual(RED);
  });
});
