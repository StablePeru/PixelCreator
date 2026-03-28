import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { batchApplyToFrames, validateBatchFrameIds } from '../../src/core/batch-frame-engine.js';

function makeFrame(id: string, width = 4, height = 4): { frameId: string; buffer: PixelBuffer } {
  const buffer = new PixelBuffer(width, height);
  // Fill with a distinct color per pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buffer.setPixel(x, y, { r: (x * 50) % 256, g: (y * 70) % 256, b: 128, a: 255 });
    }
  }
  return { frameId: id, buffer };
}

describe('batchApplyToFrames', () => {
  it('applies flip-h to all frames', () => {
    const frames = [makeFrame('f1'), makeFrame('f2')];
    const results = batchApplyToFrames(frames, 'flip-h');
    expect(results).toHaveLength(2);
    expect(results[0].frameId).toBe('f1');
    expect(results[1].frameId).toBe('f2');
    // Flipped: top-left pixel should match original top-right
    const origTopRight = frames[0].buffer.getPixel(3, 0);
    const flippedTopLeft = results[0].buffer.getPixel(0, 0);
    expect(flippedTopLeft.r).toBe(origTopRight.r);
  });

  it('applies flip-v to all frames', () => {
    const frames = [makeFrame('f1')];
    const results = batchApplyToFrames(frames, 'flip-v');
    const origBottomLeft = frames[0].buffer.getPixel(0, 3);
    const flippedTopLeft = results[0].buffer.getPixel(0, 0);
    expect(flippedTopLeft.g).toBe(origBottomLeft.g);
  });

  it('applies rotate-90 to all frames', () => {
    const frames = [makeFrame('f1', 4, 2)];
    const results = batchApplyToFrames(frames, 'rotate-90');
    // 4x2 rotated 90° → 2x4
    expect(results[0].buffer.width).toBe(2);
    expect(results[0].buffer.height).toBe(4);
  });

  it('applies rotate-180', () => {
    const frames = [makeFrame('f1')];
    const results = batchApplyToFrames(frames, 'rotate-180');
    expect(results[0].buffer.width).toBe(4);
    expect(results[0].buffer.height).toBe(4);
  });

  it('applies rotate-270', () => {
    const frames = [makeFrame('f1', 4, 2)];
    const results = batchApplyToFrames(frames, 'rotate-270');
    expect(results[0].buffer.width).toBe(2);
    expect(results[0].buffer.height).toBe(4);
  });

  it('applies brightness with amount param', () => {
    const frames = [makeFrame('f1')];
    const orig = frames[0].buffer.getPixel(0, 0);
    const results = batchApplyToFrames(frames, 'brightness', { amount: 50 });
    const modified = results[0].buffer.getPixel(0, 0);
    expect(modified.r).toBeGreaterThanOrEqual(orig.r);
  });

  it('applies contrast with amount param', () => {
    const frames = [makeFrame('f1')];
    const results = batchApplyToFrames(frames, 'contrast', { amount: 50 });
    expect(results[0].buffer.width).toBe(4);
  });

  it('applies invert to all frames', () => {
    const frames = [makeFrame('f1')];
    const orig = frames[0].buffer.getPixel(0, 0);
    const results = batchApplyToFrames(frames, 'invert');
    const inverted = results[0].buffer.getPixel(0, 0);
    expect(inverted.r).toBe(255 - orig.r);
    expect(inverted.g).toBe(255 - orig.g);
  });

  it('applies desaturate', () => {
    const frames = [makeFrame('f1')];
    const results = batchApplyToFrames(frames, 'desaturate', { amount: 100 });
    const pixel = results[0].buffer.getPixel(1, 1);
    // Fully desaturated: r === g === b
    expect(pixel.r).toBe(pixel.g);
    expect(pixel.g).toBe(pixel.b);
  });

  it('applies hue-shift', () => {
    const frames = [makeFrame('f1')];
    const results = batchApplyToFrames(frames, 'hue-shift', { degrees: 180 });
    expect(results[0].buffer.width).toBe(4);
  });

  it('applies posterize', () => {
    const frames = [makeFrame('f1')];
    const results = batchApplyToFrames(frames, 'posterize', { levels: 2 });
    const pixel = results[0].buffer.getPixel(0, 0);
    // Posterized to 2 levels: values should be 0 or 255
    expect([0, 255]).toContain(pixel.r);
  });

  it('returns empty array for empty input', () => {
    const results = batchApplyToFrames([], 'flip-h');
    expect(results).toHaveLength(0);
  });

  it('preserves frame IDs', () => {
    const frames = [makeFrame('alpha'), makeFrame('beta'), makeFrame('gamma')];
    const results = batchApplyToFrames(frames, 'invert');
    expect(results.map((r) => r.frameId)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('does not mutate original buffers (immutability)', () => {
    const frames = [makeFrame('f1')];
    const origPixel = frames[0].buffer.getPixel(0, 0);
    const origR = origPixel.r;
    batchApplyToFrames(frames, 'invert');
    expect(frames[0].buffer.getPixel(0, 0).r).toBe(origR);
  });

  it('throws for unknown transform', () => {
    const frames = [makeFrame('f1')];
    expect(() => batchApplyToFrames(frames, 'unknown' as any)).toThrow('Unknown batch transform');
  });
});

describe('validateBatchFrameIds', () => {
  const available = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }];

  it('returns null for valid IDs', () => {
    expect(validateBatchFrameIds(['f1', 'f2'], available)).toBeNull();
  });

  it('returns error for empty array', () => {
    expect(validateBatchFrameIds([], available)).toBe('No frame IDs provided');
  });

  it('returns error for unknown frame ID', () => {
    const result = validateBatchFrameIds(['f1', 'f99'], available);
    expect(result).toContain('f99');
  });

  it('returns error listing all unknown IDs', () => {
    const result = validateBatchFrameIds(['x1', 'x2'], available);
    expect(result).toContain('x1');
    expect(result).toContain('x2');
  });
});
