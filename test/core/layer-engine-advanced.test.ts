import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  blendChannel,
  flattenLayers,
  flattenLayerTree,
  getChildLayers,
  applyClippingMask,
} from '../../src/core/layer-engine.js';
import type { LayerWithBuffer } from '../../src/core/layer-engine.js';
import type { RGBA, } from '../../src/types/common.js';
import type { LayerInfo } from '../../src/types/canvas.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 255 };
const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

function makeLayer(id: string, order: number, overrides?: Partial<LayerInfo>): LayerInfo {
  return {
    id, name: id, type: 'normal', visible: true, opacity: 255,
    blendMode: 'normal', locked: false, order,
    parentId: null, isGroup: false, clipping: false,
    ...overrides,
  };
}

function makeLayerWithBuffer(info: LayerInfo, w: number, h: number, pixels?: Array<[number, number, RGBA]>): LayerWithBuffer {
  const buf = new PixelBuffer(w, h);
  if (pixels) {
    for (const [x, y, c] of pixels) buf.setPixel(x, y, c);
  }
  return { info, buffer: buf };
}

// --- New Blend Modes ---

describe('blendChannel — new modes', () => {
  it('color-dodge brightens', () => {
    expect(blendChannel('color-dodge', 128, 128)).toBeGreaterThan(128);
    expect(blendChannel('color-dodge', 0, 128)).toBe(128); // no dodge
    expect(blendChannel('color-dodge', 255, 128)).toBe(255); // max dodge
  });

  it('color-burn darkens', () => {
    expect(blendChannel('color-burn', 128, 128)).toBeLessThan(128);
    expect(blendChannel('color-burn', 255, 128)).toBe(128); // no burn
    expect(blendChannel('color-burn', 0, 128)).toBe(0); // full burn
  });

  it('hard-light: src < 128 darkens, src >= 128 lightens', () => {
    const dark = blendChannel('hard-light', 64, 128);
    const light = blendChannel('hard-light', 192, 128);
    expect(dark).toBeLessThan(128);
    expect(light).toBeGreaterThan(128);
  });

  it('soft-light: subtle blend', () => {
    const result = blendChannel('soft-light', 128, 128);
    expect(result).toBeGreaterThan(100);
    expect(result).toBeLessThan(180);
  });

  it('difference: absolute difference', () => {
    expect(blendChannel('difference', 200, 50)).toBe(150);
    expect(blendChannel('difference', 50, 200)).toBe(150);
    expect(blendChannel('difference', 100, 100)).toBe(0);
  });

  it('exclusion: lower contrast difference', () => {
    expect(blendChannel('exclusion', 0, 128)).toBe(128);
    expect(blendChannel('exclusion', 255, 128)).toBe(127);
    expect(blendChannel('exclusion', 128, 128)).toBeLessThan(128);
  });

  it('addition: clamped sum', () => {
    expect(blendChannel('addition', 100, 100)).toBe(200);
    expect(blendChannel('addition', 200, 200)).toBe(255); // clamped
    expect(blendChannel('addition', 0, 128)).toBe(128);
  });

  it('subtract: clamped difference', () => {
    expect(blendChannel('subtract', 50, 200)).toBe(150);
    expect(blendChannel('subtract', 200, 50)).toBe(0); // clamped
    expect(blendChannel('subtract', 0, 128)).toBe(128);
  });

  it('all modes handle 0 and 255 edge cases', () => {
    const modes = ['color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'addition', 'subtract'] as const;
    for (const mode of modes) {
      const r0 = blendChannel(mode, 0, 0);
      const r255 = blendChannel(mode, 255, 255);
      expect(r0).toBeGreaterThanOrEqual(0);
      expect(r0).toBeLessThanOrEqual(255);
      expect(r255).toBeGreaterThanOrEqual(0);
      expect(r255).toBeLessThanOrEqual(255);
    }
  });
});

// --- Layer Groups ---

describe('getChildLayers', () => {
  it('returns root layers when parentId is null', () => {
    const layers = [
      makeLayer('a', 0),
      makeLayer('b', 1, { parentId: 'group1' }),
      makeLayer('group1', 2, { isGroup: true }),
    ];
    const roots = getChildLayers(layers, null);
    expect(roots).toHaveLength(2); // a and group1
  });

  it('returns children of a group', () => {
    const layers = [
      makeLayer('a', 0),
      makeLayer('b', 1, { parentId: 'group1' }),
      makeLayer('c', 2, { parentId: 'group1' }),
      makeLayer('group1', 3, { isGroup: true }),
    ];
    const children = getChildLayers(layers, 'group1');
    expect(children).toHaveLength(2);
    expect(children.map((l) => l.id)).toContain('b');
    expect(children.map((l) => l.id)).toContain('c');
  });
});

describe('flattenLayers with groups', () => {
  it('group composites children before applying to result', () => {
    const layers: LayerWithBuffer[] = [
      makeLayerWithBuffer(makeLayer('bg', 0), 4, 4, [[0, 0, BLUE], [1, 0, BLUE], [2, 0, BLUE], [3, 0, BLUE]]),
      makeLayerWithBuffer(makeLayer('group1', 1, { isGroup: true }), 4, 4),
      makeLayerWithBuffer(makeLayer('child1', 2, { parentId: 'group1' }), 4, 4, [[0, 0, RED]]),
      makeLayerWithBuffer(makeLayer('child2', 3, { parentId: 'group1' }), 4, 4, [[1, 0, GREEN]]),
    ];

    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(RED);   // child1 over bg
    expect(result.getPixel(1, 0)).toEqual(GREEN);  // child2 over bg
    expect(result.getPixel(2, 0)).toEqual(BLUE);   // just bg
  });

  it('invisible group hides all children', () => {
    const layers: LayerWithBuffer[] = [
      makeLayerWithBuffer(makeLayer('bg', 0), 4, 4, [[0, 0, BLUE]]),
      makeLayerWithBuffer(makeLayer('group1', 1, { isGroup: true, visible: false }), 4, 4),
      makeLayerWithBuffer(makeLayer('child1', 2, { parentId: 'group1' }), 4, 4, [[0, 0, RED]]),
    ];

    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(BLUE); // group hidden, child not rendered
  });

  it('group opacity affects composited result', () => {
    const layers: LayerWithBuffer[] = [
      makeLayerWithBuffer(makeLayer('bg', 0), 4, 4, [[0, 0, BLACK]]),
      makeLayerWithBuffer(makeLayer('group1', 1, { isGroup: true, opacity: 128 }), 4, 4),
      makeLayerWithBuffer(makeLayer('child1', 2, { parentId: 'group1' }), 4, 4, [[0, 0, WHITE]]),
    ];

    const result = flattenLayers(layers, 4, 4);
    const pixel = result.getPixel(0, 0);
    // White at ~50% opacity over black → ~128 gray
    expect(pixel.r).toBeGreaterThan(100);
    expect(pixel.r).toBeLessThan(160);
  });

  it('backward compat: layers without parentId render normally', () => {
    const layers: LayerWithBuffer[] = [
      makeLayerWithBuffer(makeLayer('bg', 0), 4, 4, [[0, 0, RED]]),
      makeLayerWithBuffer(makeLayer('fg', 1), 4, 4, [[0, 0, GREEN]]),
    ];

    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });
});

// --- Clipping Masks ---

describe('applyClippingMask', () => {
  it('clips layer to base non-transparent pixels', () => {
    const layer = new PixelBuffer(4, 4);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        layer.setPixel(x, y, RED);

    const base = new PixelBuffer(4, 4);
    base.setPixel(1, 1, GREEN);
    base.setPixel(2, 2, GREEN);

    const result = applyClippingMask(layer, base);
    expect(result.getPixel(1, 1)).toEqual(RED);
    expect(result.getPixel(2, 2)).toEqual(RED);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
    expect(result.getPixel(3, 3)).toEqual(TRANSPARENT);
  });

  it('fully transparent base clips everything', () => {
    const layer = new PixelBuffer(4, 4);
    layer.setPixel(0, 0, RED);
    const base = new PixelBuffer(4, 4);

    const result = applyClippingMask(layer, base);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('flattenLayers with clipping', () => {
  it('clipping layer is masked by previous layer', () => {
    const layers: LayerWithBuffer[] = [
      makeLayerWithBuffer(makeLayer('base', 0), 4, 4, [[1, 1, GREEN], [2, 2, GREEN]]),
      makeLayerWithBuffer(makeLayer('clipped', 1, { clipping: true }), 4, 4,
        [[0, 0, RED], [1, 1, RED], [2, 2, RED], [3, 3, RED]]),
    ];

    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(1, 1)).toEqual(RED);  // where base has pixels
    expect(result.getPixel(2, 2)).toEqual(RED);  // where base has pixels
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT); // clipped away
    expect(result.getPixel(3, 3)).toEqual(TRANSPARENT); // clipped away
  });
});

// --- Nested Groups ---

describe('nested groups', () => {
  it('nested group composes correctly', () => {
    const layers: LayerWithBuffer[] = [
      makeLayerWithBuffer(makeLayer('outer-group', 0, { isGroup: true }), 4, 4),
      makeLayerWithBuffer(makeLayer('inner-group', 1, { isGroup: true, parentId: 'outer-group' }), 4, 4),
      makeLayerWithBuffer(makeLayer('deep-child', 2, { parentId: 'inner-group' }), 4, 4, [[0, 0, RED]]),
    ];

    const result = flattenLayers(layers, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(RED);
  });
});
