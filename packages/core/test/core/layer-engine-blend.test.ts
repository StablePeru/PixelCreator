import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { blendChannel, flattenLayers, mergeLayerBuffers } from '../../src/core/layer-engine.js';
import type { LayerWithBuffer } from '../../src/core/layer-engine.js';
import type { BlendMode } from '../../src/types/canvas.js';

describe('blendChannel', () => {
  it('normal mode returns source', () => {
    expect(blendChannel('normal', 200, 100)).toBe(200);
  });

  it('multiply mode', () => {
    expect(blendChannel('multiply', 200, 100)).toBe(Math.round(200 * 100 / 255));
  });

  it('screen mode', () => {
    expect(blendChannel('screen', 200, 100)).toBe(200 + 100 - Math.round(200 * 100 / 255));
  });

  it('overlay mode with dark dst', () => {
    // dstC < 128
    expect(blendChannel('overlay', 200, 50)).toBe(Math.round(2 * 200 * 50 / 255));
  });

  it('overlay mode with light dst', () => {
    // dstC >= 128
    expect(blendChannel('overlay', 200, 200)).toBe(255 - Math.round(2 * (255 - 200) * (255 - 200) / 255));
  });

  it('darken mode', () => {
    expect(blendChannel('darken', 200, 100)).toBe(100);
    expect(blendChannel('darken', 50, 200)).toBe(50);
  });

  it('lighten mode', () => {
    expect(blendChannel('lighten', 200, 100)).toBe(200);
    expect(blendChannel('lighten', 50, 200)).toBe(200);
  });

  it('multiply black returns 0', () => {
    expect(blendChannel('multiply', 0, 128)).toBe(0);
    expect(blendChannel('multiply', 128, 0)).toBe(0);
  });

  it('screen white returns 255', () => {
    expect(blendChannel('screen', 255, 128)).toBe(255);
  });
});

describe('flattenLayers with blend modes', () => {
  function makeLayer(r: number, g: number, b: number, a: number, blendMode: BlendMode, order: number): LayerWithBuffer {
    const buf = new PixelBuffer(1, 1);
    buf.setPixel(0, 0, { r, g, b, a });
    return {
      info: {
        id: `layer-${order}`,
        name: `layer-${order}`,
        type: 'normal',
        visible: true,
        opacity: 255,
        blendMode,
        locked: false,
        order,
      },
      buffer: buf,
    };
  }

  it('multiply blend produces darker result', () => {
    const bottom = makeLayer(255, 0, 0, 255, 'normal', 0);
    const top = makeLayer(128, 128, 128, 255, 'multiply', 1);
    const result = flattenLayers([bottom, top], 1, 1);
    const pixel = result.getPixel(0, 0);
    // multiply: Math.round(128 * 255 / 255) = 128 for R, Math.round(128 * 0 / 255) = 0 for G/B
    expect(pixel.r).toBe(128);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(0);
  });

  it('lighten blend picks brighter channel', () => {
    const bottom = makeLayer(100, 200, 50, 255, 'normal', 0);
    const top = makeLayer(150, 100, 150, 255, 'lighten', 1);
    const result = flattenLayers([bottom, top], 1, 1);
    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(150);
    expect(pixel.g).toBe(200);
    expect(pixel.b).toBe(150);
  });

  it('darken blend picks darker channel', () => {
    const bottom = makeLayer(100, 200, 50, 255, 'normal', 0);
    const top = makeLayer(150, 100, 150, 255, 'darken', 1);
    const result = flattenLayers([bottom, top], 1, 1);
    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(100);
    expect(pixel.g).toBe(100);
    expect(pixel.b).toBe(50);
  });

  it('blend mode on transparent dst uses source directly', () => {
    const top = makeLayer(128, 64, 32, 255, 'multiply', 0);
    const result = flattenLayers([top], 1, 1);
    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(128);
    expect(pixel.g).toBe(64);
    expect(pixel.b).toBe(32);
  });

  it('normal blend mode still works', () => {
    const bottom = makeLayer(255, 0, 0, 255, 'normal', 0);
    const top = makeLayer(0, 0, 255, 255, 'normal', 1);
    const result = flattenLayers([bottom, top], 1, 1);
    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(0);
    expect(pixel.g).toBe(0);
    expect(pixel.b).toBe(255);
  });
});

describe('mergeLayerBuffers with blend modes', () => {
  it('uses blend mode parameter', () => {
    const bottom = new PixelBuffer(1, 1);
    bottom.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const top = new PixelBuffer(1, 1);
    top.setPixel(0, 0, { r: 0, g: 0, b: 255, a: 255 });

    const result = mergeLayerBuffers(bottom, top, 255, 'darken');
    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(0);
    expect(pixel.b).toBe(0);
  });

  it('defaults to normal when no blend mode', () => {
    const bottom = new PixelBuffer(1, 1);
    bottom.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    const top = new PixelBuffer(1, 1);
    top.setPixel(0, 0, { r: 0, g: 0, b: 255, a: 255 });

    const result = mergeLayerBuffers(bottom, top, 255);
    const pixel = result.getPixel(0, 0);
    expect(pixel.r).toBe(0);
    expect(pixel.b).toBe(255);
  });
});
