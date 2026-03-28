import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { flattenLayers } from '../../src/core/layer-engine.js';
import type { LayerWithBuffer } from '../../src/core/layer-engine.js';
import type { LayerInfo } from '../../src/types/canvas.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

function makeLayer(id: string, type: 'normal' | 'reference' | 'tilemap', color: RGBA, order: number): LayerWithBuffer {
  const buf = new PixelBuffer(4, 4);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      buf.setPixel(x, y, color);
    }
  }
  const info: LayerInfo = {
    id, name: id, type, visible: true, opacity: 255,
    blendMode: 'normal', locked: false, order,
  };
  return { info, buffer: buf };
}

describe('flattenLayers with reference layers', () => {
  it('excludes reference layers by default', () => {
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', 'normal', RED, 0),
      makeLayer('ref', 'reference', GREEN, 1),
    ];
    const result = flattenLayers(layers, 4, 4);
    // Should only have the red normal layer, not green reference
    expect(result.getPixel(0, 0)).toEqual(RED);
  });

  it('includes reference layers when option set', () => {
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', 'normal', RED, 0),
      makeLayer('ref', 'reference', GREEN, 1),
    ];
    const result = flattenLayers(layers, 4, 4, { includeReference: true });
    // Green reference on top of red should show green
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });

  it('reference layer with partial opacity composites correctly when included', () => {
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', 'normal', RED, 0),
    ];
    // Create reference with partial opacity
    const refBuf = new PixelBuffer(4, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        refBuf.setPixel(x, y, GREEN);
      }
    }
    const refInfo: LayerInfo = {
      id: 'ref', name: 'ref', type: 'reference', visible: true, opacity: 128,
      blendMode: 'normal', locked: false, order: 1,
    };
    layers.push({ info: refInfo, buffer: refBuf });

    const result = flattenLayers(layers, 4, 4, { includeReference: true });
    const pixel = result.getPixel(0, 0);
    // Should be a blend of red and green
    expect(pixel.r).toBeGreaterThan(0);
    expect(pixel.g).toBeGreaterThan(0);
  });

  it('does not affect normal layer compositing when excluded', () => {
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', 'normal', RED, 0),
      makeLayer('ref', 'reference', BLUE, 1),
      makeLayer('fg', 'normal', GREEN, 2),
    ];
    const result = flattenLayers(layers, 4, 4);
    // Reference excluded, green on top of red = green
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });

  it('does not filter tilemap layers', () => {
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', 'normal', RED, 0),
      makeLayer('tiles', 'tilemap', GREEN, 1),
    ];
    const result = flattenLayers(layers, 4, 4);
    // Tilemap should be included (green on top)
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });

  it('handles mixed normal + reference + tilemap layers', () => {
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', 'normal', RED, 0),
      makeLayer('ref', 'reference', BLUE, 1),
      makeLayer('tiles', 'tilemap', GREEN, 2),
    ];
    const result = flattenLayers(layers, 4, 4);
    // Reference excluded, tilemap (green) on top of normal (red)
    expect(result.getPixel(0, 0)).toEqual(GREEN);
  });

  it('empty reference layer has no effect when included', () => {
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', 'normal', RED, 0),
    ];
    const emptyRef = new PixelBuffer(4, 4); // all transparent
    const refInfo: LayerInfo = {
      id: 'ref', name: 'ref', type: 'reference', visible: true, opacity: 255,
      blendMode: 'normal', locked: false, order: 1,
    };
    layers.push({ info: refInfo, buffer: emptyRef });

    const result = flattenLayers(layers, 4, 4, { includeReference: true });
    expect(result.getPixel(0, 0)).toEqual(RED);
  });
});
