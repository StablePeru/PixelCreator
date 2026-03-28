import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  applyDropShadow,
  applyOuterGlow,
  applyOutline,
  applyColorOverlay,
  applyLayerEffects,
  boxBlur,
  expandSilhouette,
  detectEdges,
} from '../../src/core/effects-engine.js';
import type { RGBA } from '../../src/types/common.js';
import type { LayerEffect } from '../../src/types/canvas.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

function makeBuffer(w: number, h: number, fill?: (x: number, y: number) => RGBA): PixelBuffer {
  const buf = new PixelBuffer(w, h);
  if (fill) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) buf.setPixel(x, y, fill(x, y));
  }
  return buf;
}

// 4x4 buffer with a 2x2 red square in the center
function makeCenterSquare(): PixelBuffer {
  return makeBuffer(8, 8, (x, y) =>
    x >= 3 && x <= 4 && y >= 3 && y <= 4 ? RED : TRANSPARENT,
  );
}

describe('applyDropShadow', () => {
  it('creates shadow at offset position', () => {
    const buf = makeCenterSquare();
    const result = applyDropShadow(buf, { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, opacity: 255 }, 8, 8);
    // Shadow should appear at (4,4), (5,4), (4,5), (5,5) — shifted by 1,1
    expect(result.getPixel(4, 4).a).toBeGreaterThan(0);
    // Original should be preserved
    expect(result.getPixel(3, 3)).toEqual(RED);
  });

  it('shadow color matches parameter', () => {
    const buf = makeBuffer(4, 4, (x, y) => x === 0 && y === 0 ? RED : TRANSPARENT);
    const result = applyDropShadow(buf, { offsetX: 1, offsetY: 0, color: '#00ff00', blur: 0, opacity: 255 }, 4, 4);
    const shadow = result.getPixel(1, 0);
    expect(shadow.g).toBe(255);
    expect(shadow.r).toBe(0);
  });

  it('shadow opacity is clamped', () => {
    const buf = makeBuffer(4, 4, (x, y) => x === 0 && y === 0 ? { ...RED, a: 100 } : TRANSPARENT);
    const result = applyDropShadow(buf, { offsetX: 1, offsetY: 0, color: '#000000', blur: 0, opacity: 200 }, 4, 4);
    expect(result.getPixel(1, 0).a).toBeLessThanOrEqual(100);
  });

  it('blur=0 produces sharp shadow', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const result = applyDropShadow(buf, { offsetX: 2, offsetY: 0, color: '#000000', blur: 0, opacity: 255 }, 8, 8);
    expect(result.getPixel(6, 4).a).toBe(255);
    expect(result.getPixel(7, 4).a).toBe(0);
  });

  it('blur>0 spreads shadow', () => {
    const buf = makeBuffer(16, 16, (x, y) => x === 8 && y === 8 ? RED : TRANSPARENT);
    const result = applyDropShadow(buf, { offsetX: 0, offsetY: 0, color: '#000000', blur: 2, opacity: 255 }, 16, 16);
    // Adjacent pixels should have some alpha from blur
    expect(result.getPixel(9, 8).a).toBeGreaterThan(0);
  });

  it('offset outside canvas clips shadow', () => {
    const buf = makeBuffer(4, 4, (x, y) => x === 3 && y === 3 ? RED : TRANSPARENT);
    const result = applyDropShadow(buf, { offsetX: 5, offsetY: 5, color: '#000000', blur: 0, opacity: 255 }, 4, 4);
    // Shadow at (8,8) is outside 4x4 canvas — only original remains
    expect(result.getPixel(3, 3)).toEqual(RED);
  });

  it('empty buffer produces empty result', () => {
    const buf = new PixelBuffer(4, 4);
    const result = applyDropShadow(buf, { offsetX: 1, offsetY: 1, color: '#000000', blur: 0, opacity: 255 }, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('applyOuterGlow', () => {
  it('glow appears around non-transparent pixels', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const result = applyOuterGlow(buf, { color: '#ffffff', radius: 2, intensity: 255 }, 8, 8);
    expect(result.getPixel(5, 4).a).toBeGreaterThan(0);
    expect(result.getPixel(3, 4).a).toBeGreaterThan(0);
  });

  it('glow does not modify original content', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const result = applyOuterGlow(buf, { color: '#00ff00', radius: 2, intensity: 200 }, 8, 8);
    expect(result.getPixel(4, 4)).toEqual(RED);
  });

  it('glow radius controls spread', () => {
    const buf = makeBuffer(16, 16, (x, y) => x === 8 && y === 8 ? RED : TRANSPARENT);
    const r1 = applyOuterGlow(buf, { color: '#ffffff', radius: 1, intensity: 255 }, 16, 16);
    const r3 = applyOuterGlow(buf, { color: '#ffffff', radius: 3, intensity: 255 }, 16, 16);
    // Larger radius should affect more distant pixels
    expect(r3.getPixel(11, 8).a).toBeGreaterThan(r1.getPixel(11, 8).a);
  });

  it('glow intensity controls alpha', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const low = applyOuterGlow(buf, { color: '#ffffff', radius: 2, intensity: 50 }, 8, 8);
    const high = applyOuterGlow(buf, { color: '#ffffff', radius: 2, intensity: 250 }, 8, 8);
    expect(high.getPixel(5, 4).a).toBeGreaterThan(low.getPixel(5, 4).a);
  });

  it('single pixel produces glow in all directions', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const result = applyOuterGlow(buf, { color: '#ffffff', radius: 2, intensity: 255 }, 8, 8);
    expect(result.getPixel(3, 4).a).toBeGreaterThan(0);
    expect(result.getPixel(5, 4).a).toBeGreaterThan(0);
    expect(result.getPixel(4, 3).a).toBeGreaterThan(0);
    expect(result.getPixel(4, 5).a).toBeGreaterThan(0);
  });
});

describe('applyOutline', () => {
  it('outside outline adds pixels outside content', () => {
    const buf = makeBuffer(8, 8, (x, y) => x >= 3 && x <= 4 && y >= 3 && y <= 4 ? RED : TRANSPARENT);
    const result = applyOutline(buf, { color: '#0000ff', thickness: 1, position: 'outside' }, 8, 8);
    // Outside pixel should be blue
    expect(result.getPixel(2, 3).b).toBe(255);
    // Original should be preserved
    expect(result.getPixel(3, 3)).toEqual(RED);
  });

  it('inside outline replaces edge pixels', () => {
    const buf = makeBuffer(8, 8, (x, y) => x >= 2 && x <= 5 && y >= 2 && y <= 5 ? RED : TRANSPARENT);
    const result = applyOutline(buf, { color: '#0000ff', thickness: 1, position: 'inside' }, 8, 8);
    // Edge pixel should be blue
    expect(result.getPixel(2, 2).b).toBe(255);
    // Interior pixel should be original
    expect(result.getPixel(3, 3)).toEqual(RED);
  });

  it('center outline straddles boundary', () => {
    const buf = makeBuffer(8, 8, (x, y) => x >= 3 && x <= 4 && y >= 3 && y <= 4 ? RED : TRANSPARENT);
    const result = applyOutline(buf, { color: '#0000ff', thickness: 1, position: 'center' }, 8, 8);
    // Both outside and edge pixels should have outline
    expect(result.getPixel(2, 3).a).toBeGreaterThan(0);
  });

  it('thickness controls outline width', () => {
    const buf = makeBuffer(16, 16, (x, y) => x >= 6 && x <= 9 && y >= 6 && y <= 9 ? RED : TRANSPARENT);
    const thin = applyOutline(buf, { color: '#0000ff', thickness: 1, position: 'outside' }, 16, 16);
    const thick = applyOutline(buf, { color: '#0000ff', thickness: 3, position: 'outside' }, 16, 16);
    // 3px outline should reach further
    expect(thick.getPixel(3, 6).a).toBeGreaterThan(thin.getPixel(3, 6).a);
  });

  it('outline color matches parameter', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const result = applyOutline(buf, { color: '#00ff00', thickness: 1, position: 'outside' }, 8, 8);
    const outlinePixel = result.getPixel(5, 4);
    expect(outlinePixel.g).toBe(255);
  });

  it('outline on empty buffer produces nothing', () => {
    const buf = new PixelBuffer(4, 4);
    const result = applyOutline(buf, { color: '#000000', thickness: 1, position: 'outside' }, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('applyColorOverlay', () => {
  it('replaces RGB of non-transparent pixels', () => {
    const buf = makeBuffer(4, 4, (x, y) => x === 0 && y === 0 ? RED : TRANSPARENT);
    const result = applyColorOverlay(buf, { color: '#0000ff', opacity: 255, blendMode: 'normal' });
    expect(result.getPixel(0, 0).b).toBe(255);
    expect(result.getPixel(0, 0).r).toBe(0);
  });

  it('preserves alpha', () => {
    const buf = makeBuffer(4, 4, (x, y) => x === 0 && y === 0 ? { r: 255, g: 0, b: 0, a: 128 } : TRANSPARENT);
    const result = applyColorOverlay(buf, { color: '#00ff00', opacity: 255, blendMode: 'normal' });
    expect(result.getPixel(0, 0).a).toBe(128);
  });

  it('overlay opacity blends with original', () => {
    const buf = makeBuffer(4, 4, (x, y) => x === 0 && y === 0 ? RED : TRANSPARENT);
    const result = applyColorOverlay(buf, { color: '#0000ff', opacity: 128, blendMode: 'normal' });
    // Should be a mix of red and blue
    expect(result.getPixel(0, 0).r).toBeGreaterThan(0);
    expect(result.getPixel(0, 0).b).toBeGreaterThan(0);
  });

  it('multiply blend mode works', () => {
    const buf = makeBuffer(4, 4, () => ({ r: 200, g: 200, b: 200, a: 255 }));
    const result = applyColorOverlay(buf, { color: '#808080', opacity: 255, blendMode: 'multiply' });
    const p = result.getPixel(0, 0);
    // multiply: 200 * 128 / 255 ≈ 100
    expect(p.r).toBeLessThan(200);
  });

  it('transparent pixels remain transparent', () => {
    const buf = makeBuffer(4, 4, () => TRANSPARENT);
    const result = applyColorOverlay(buf, { color: '#ff0000', opacity: 255, blendMode: 'normal' });
    expect(result.getPixel(0, 0)).toEqual(TRANSPARENT);
  });
});

describe('applyLayerEffects', () => {
  it('applies multiple effects in order', () => {
    const buf = makeBuffer(16, 16, (x, y) => x >= 6 && x <= 9 && y >= 6 && y <= 9 ? RED : TRANSPARENT);
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'drop-shadow', enabled: true, params: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, opacity: 200 } },
      { id: 'e2', type: 'outline', enabled: true, params: { color: '#ffffff', thickness: 1, position: 'outside' } },
    ];
    const result = applyLayerEffects(buf, effects, 16, 16);
    // Original preserved
    expect(result.getPixel(6, 6)).toEqual(RED);
    // Shadow should exist
    expect(result.getPixel(11, 8).a).toBeGreaterThan(0);
  });

  it('skips disabled effects', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'outline', enabled: false, params: { color: '#0000ff', thickness: 2, position: 'outside' } },
    ];
    const result = applyLayerEffects(buf, effects, 8, 8);
    // No outline should be drawn
    expect(result.getPixel(5, 4)).toEqual(TRANSPARENT);
  });

  it('empty effects returns unchanged buffer', () => {
    const buf = makeCenterSquare();
    const result = applyLayerEffects(buf, [], 8, 8);
    expect(result.getPixel(3, 3)).toEqual(RED);
  });

  it('single effect produces correct result', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? RED : TRANSPARENT);
    const effects: LayerEffect[] = [
      { id: 'e1', type: 'color-overlay', enabled: true, params: { color: '#00ff00', opacity: 255, blendMode: 'normal' } },
    ];
    const result = applyLayerEffects(buf, effects, 8, 8);
    expect(result.getPixel(4, 4).g).toBe(255);
  });
});

describe('boxBlur', () => {
  it('radius=0 returns unchanged buffer', () => {
    const buf = makeBuffer(4, 4, (x, y) => x === 0 && y === 0 ? RED : TRANSPARENT);
    const result = boxBlur(buf, 0);
    expect(result.getPixel(0, 0)).toEqual(RED);
  });

  it('blurs pixels with radius>0', () => {
    const buf = makeBuffer(8, 8, (x, y) => x === 4 && y === 4 ? { r: 255, g: 0, b: 0, a: 255 } : TRANSPARENT);
    const result = boxBlur(buf, 1);
    // Center should have reduced alpha (averaged with neighbors)
    expect(result.getPixel(4, 4).a).toBeLessThan(255);
    // Neighbors should have some color
    expect(result.getPixel(5, 4).a).toBeGreaterThan(0);
  });
});

describe('expandSilhouette', () => {
  it('expands by correct pixel count', () => {
    const buf = makeBuffer(16, 16, (x, y) => x === 8 && y === 8 ? RED : TRANSPARENT);
    const result = expandSilhouette(buf, 2);
    // 2px away should have some alpha
    expect(result.getPixel(10, 8).a).toBeGreaterThan(0);
    // 4px away should be transparent
    expect(result.getPixel(12, 8).a).toBe(0);
  });
});
