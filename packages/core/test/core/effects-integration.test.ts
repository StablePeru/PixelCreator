import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { flattenLayers } from '../../src/core/layer-engine.js';
import type { LayerWithBuffer } from '../../src/core/layer-engine.js';
import type { LayerInfo, LayerEffect } from '../../src/types/canvas.js';
import type { RGBA } from '../../src/types/common.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

function makeLayer(id: string, color: RGBA, effects?: LayerEffect[], opts?: Partial<LayerInfo>): LayerWithBuffer {
  const buf = new PixelBuffer(8, 8);
  // Draw a 2x2 square in center
  for (let y = 3; y <= 4; y++) {
    for (let x = 3; x <= 4; x++) {
      buf.setPixel(x, y, color);
    }
  }
  const info: LayerInfo = {
    id, name: id, type: 'normal', visible: true, opacity: 255,
    blendMode: 'normal', locked: false, order: 0,
    effects,
    ...opts,
  };
  return { info, buffer: buf };
}

describe('flattenLayers with effects', () => {
  it('applies drop shadow during compositing', () => {
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'drop-shadow', enabled: true, params: { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, opacity: 200 } },
    ];
    const layers: LayerWithBuffer[] = [makeLayer('bg', RED, effects)];
    const result = flattenLayers(layers, 8, 8);
    // Original pixels present
    expect(result.getPixel(3, 3)).toEqual(RED);
    // Shadow pixels present at offset
    expect(result.getPixel(5, 5).a).toBeGreaterThan(0);
  });

  it('skips effects on hidden layers', () => {
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'outline', enabled: true, params: { color: '#0000ff', thickness: 2, position: 'outside' } },
    ];
    const layers: LayerWithBuffer[] = [makeLayer('bg', RED, effects, { visible: false })];
    const result = flattenLayers(layers, 8, 8);
    // Hidden layer produces empty result
    expect(result.getPixel(3, 3)).toEqual(TRANSPARENT);
  });

  it('layers without effects are unchanged', () => {
    const layers: LayerWithBuffer[] = [makeLayer('bg', RED)];
    const result = flattenLayers(layers, 8, 8);
    expect(result.getPixel(3, 3)).toEqual(RED);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });

  it('multiple layers with different effects compose correctly', () => {
    const shadowEffect: LayerEffect[] = [
      { id: 'e1', type: 'drop-shadow', enabled: true, params: { offsetX: 1, offsetY: 0, color: '#000000', blur: 0, opacity: 255 } },
    ];
    const overlayEffect: LayerEffect[] = [
      { id: 'e2', type: 'color-overlay', enabled: true, params: { color: '#00ff00', opacity: 255, blendMode: 'normal' } },
    ];
    const layers: LayerWithBuffer[] = [
      makeLayer('bg', RED, shadowEffect, { order: 0 }),
      makeLayer('fg', GREEN, overlayEffect, { order: 1 }),
    ];
    const result = flattenLayers(layers, 8, 8);
    // fg layer with green overlay on top
    expect(result.getPixel(3, 3).g).toBe(255);
  });

  it('disabled effects are skipped during compositing', () => {
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'outline', enabled: false, params: { color: '#0000ff', thickness: 2, position: 'outside' } },
    ];
    const layers: LayerWithBuffer[] = [makeLayer('bg', RED, effects)];
    const result = flattenLayers(layers, 8, 8);
    // No outline drawn
    expect(result.getPixel(1, 3)).toEqual(TRANSPARENT);
  });

  it('outline effect renders in final output', () => {
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'outline', enabled: true, params: { color: '#0000ff', thickness: 1, position: 'outside' } },
    ];
    const layers: LayerWithBuffer[] = [makeLayer('bg', RED, effects)];
    const result = flattenLayers(layers, 8, 8);
    // Outline pixel should be blue
    expect(result.getPixel(2, 3).b).toBe(255);
    // Original should be red
    expect(result.getPixel(3, 3)).toEqual(RED);
  });

  it('outer glow effect renders behind content', () => {
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'outer-glow', enabled: true, params: { color: '#ffff00', radius: 2, intensity: 255 } },
    ];
    const layers: LayerWithBuffer[] = [makeLayer('bg', RED, effects)];
    const result = flattenLayers(layers, 8, 8);
    // Glow pixel near content
    expect(result.getPixel(2, 3).a).toBeGreaterThan(0);
    // Original preserved
    expect(result.getPixel(3, 3)).toEqual(RED);
  });

  it('color overlay tints layer during compositing', () => {
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'color-overlay', enabled: true, params: { color: '#0000ff', opacity: 255, blendMode: 'normal' } },
    ];
    const layers: LayerWithBuffer[] = [makeLayer('bg', RED, effects)];
    const result = flattenLayers(layers, 8, 8);
    // Should be blue (overlay replaces red)
    expect(result.getPixel(3, 3).b).toBe(255);
    expect(result.getPixel(3, 3).r).toBe(0);
  });
});
