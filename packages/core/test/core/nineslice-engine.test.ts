import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { computeNineSliceRegions, sliceNine } from '../../src/core/nineslice-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };

describe('computeNineSliceRegions', () => {
  it('produces 9 regions for uniform borders', () => {
    const regions = computeNineSliceRegions(16, 16, { top: 4, bottom: 4, left: 4, right: 4 });
    expect(regions).toHaveLength(9);
    const names = regions.map((r) => r.name);
    expect(names).toContain('top-left');
    expect(names).toContain('center');
    expect(names).toContain('bottom-right');
  });

  it('computes correct coordinates', () => {
    const regions = computeNineSliceRegions(16, 16, { top: 4, bottom: 4, left: 4, right: 4 });
    const center = regions.find((r) => r.name === 'center')!;
    expect(center.x).toBe(4);
    expect(center.y).toBe(4);
    expect(center.width).toBe(8);
    expect(center.height).toBe(8);
  });

  it('skips zero-width center when left+right=width', () => {
    const regions = computeNineSliceRegions(8, 8, { top: 2, bottom: 2, left: 4, right: 4 });
    expect(regions.find((r) => r.name === 'center')).toBeUndefined();
    expect(regions.find((r) => r.name === 'top')).toBeUndefined();
  });

  it('skips zero-height center when top+bottom=height', () => {
    const regions = computeNineSliceRegions(8, 8, { top: 4, bottom: 4, left: 2, right: 2 });
    expect(regions.find((r) => r.name === 'center')).toBeUndefined();
    expect(regions.find((r) => r.name === 'left')).toBeUndefined();
  });

  it('throws when top+bottom > height', () => {
    expect(() => computeNineSliceRegions(8, 8, { top: 5, bottom: 5, left: 2, right: 2 })).toThrow();
  });

  it('throws when left+right > width', () => {
    expect(() => computeNineSliceRegions(8, 8, { top: 2, bottom: 2, left: 5, right: 5 })).toThrow();
  });

  it('handles zero borders (single center region)', () => {
    const regions = computeNineSliceRegions(8, 8, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(regions).toHaveLength(1);
    expect(regions[0].name).toBe('center');
    expect(regions[0].width).toBe(8);
    expect(regions[0].height).toBe(8);
  });
});

describe('sliceNine', () => {
  it('extracts pixel data for each region', () => {
    const buf = new PixelBuffer(8, 8);
    buf.setPixel(0, 0, RED); // top-left corner
    buf.setPixel(4, 4, RED); // center

    const { regions, buffers } = sliceNine(buf, { top: 2, bottom: 2, left: 2, right: 2 });
    expect(regions.length).toBe(9);
    expect(buffers.size).toBe(9);

    const topLeft = buffers.get('top-left')!;
    expect(topLeft.width).toBe(2);
    expect(topLeft.height).toBe(2);
    expect(topLeft.getPixel(0, 0)).toEqual(RED);

    const center = buffers.get('center')!;
    expect(center.width).toBe(4);
    expect(center.height).toBe(4);
    expect(center.getPixel(2, 2)).toEqual(RED);
  });
});
