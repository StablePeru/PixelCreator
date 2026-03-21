import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { flattenLayers, type LayerWithBuffer } from '../../src/core/layer-engine.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const HALF_RED: RGBA = { r: 255, g: 0, b: 0, a: 128 };

describe('flattenLayers', () => {
  it('returns empty buffer for no layers', () => {
    const result = flattenLayers([], 4, 4);
    expect(result.getPixel(0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('returns single layer content', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const layers: LayerWithBuffer[] = [
      {
        info: { id: 'l1', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 },
        buffer: buf,
      },
    ];
    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(RED);
  });

  it('top layer covers bottom layer', () => {
    const bottom = new PixelBuffer(4, 4);
    bottom.setPixel(0, 0, RED);
    const top = new PixelBuffer(4, 4);
    top.setPixel(0, 0, BLUE);

    const layers: LayerWithBuffer[] = [
      {
        info: { id: 'l1', name: 'bottom', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 },
        buffer: bottom,
      },
      {
        info: { id: 'l2', name: 'top', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 1 },
        buffer: top,
      },
    ];

    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(BLUE);
  });

  it('skips invisible layers', () => {
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, RED);
    const layers: LayerWithBuffer[] = [
      {
        info: { id: 'l1', name: 'hidden', type: 'normal', visible: false, opacity: 255, blendMode: 'normal', locked: false, order: 0 },
        buffer: buf,
      },
    ];
    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('respects layer order regardless of array order', () => {
    const bottom = new PixelBuffer(4, 4);
    bottom.setPixel(0, 0, RED);
    const top = new PixelBuffer(4, 4);
    top.setPixel(0, 0, GREEN);

    // Array order reversed from render order
    const layers: LayerWithBuffer[] = [
      {
        info: { id: 'l2', name: 'top', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 1 },
        buffer: top,
      },
      {
        info: { id: 'l1', name: 'bottom', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 },
        buffer: bottom,
      },
    ];

    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });
});
