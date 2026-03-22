import { describe, it, expect } from 'vitest';
import { composeSpritesheet } from '../../src/core/spritesheet-engine.js';
import { PixelBuffer } from '../../src/io/png-codec.js';

function makeRedFrame(w: number, h: number): PixelBuffer {
  const buf = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      buf.setPixel(x, y, { r: 255, g: 0, b: 0, a: 255 });
    }
  }
  return buf;
}

describe('spritesheet-engine', () => {
  it('horizontal layout', () => {
    const frames = [makeRedFrame(4, 4), makeRedFrame(4, 4), makeRedFrame(4, 4)];
    const result = composeSpritesheet(frames, 4, 4, [100, 100, 100], [], {
      layout: 'horizontal',
      columns: 4,
      spacing: 0,
    });
    expect(result.metadata.size.width).toBe(12); // 3 * 4
    expect(result.metadata.size.height).toBe(4);
    expect(result.metadata.frames).toHaveLength(3);
  });

  it('vertical layout', () => {
    const frames = [makeRedFrame(4, 4), makeRedFrame(4, 4)];
    const result = composeSpritesheet(frames, 4, 4, [100, 100], [], {
      layout: 'vertical',
      columns: 1,
      spacing: 0,
    });
    expect(result.metadata.size.width).toBe(4);
    expect(result.metadata.size.height).toBe(8); // 2 * 4
  });

  it('grid layout with spacing', () => {
    const frames = [makeRedFrame(4, 4), makeRedFrame(4, 4), makeRedFrame(4, 4), makeRedFrame(4, 4)];
    const result = composeSpritesheet(frames, 4, 4, [100, 100, 100, 100], [], {
      layout: 'grid',
      columns: 2,
      spacing: 2,
    });
    // 2 cols: 2*4 + 1*2 = 10 wide
    // 2 rows: 2*4 + 1*2 = 10 tall
    expect(result.metadata.size.width).toBe(10);
    expect(result.metadata.size.height).toBe(10);
  });

  it('metadata includes frame positions and durations', () => {
    const frames = [makeRedFrame(8, 8), makeRedFrame(8, 8)];
    const result = composeSpritesheet(frames, 8, 8, [50, 150], [], {
      layout: 'horizontal',
      columns: 2,
      spacing: 0,
    });
    expect(result.metadata.frames[0]).toEqual({ x: 0, y: 0, w: 8, h: 8, duration: 50 });
    expect(result.metadata.frames[1]).toEqual({ x: 8, y: 0, w: 8, h: 8, duration: 150 });
  });

  it('metadata includes animation tags', () => {
    const frames = [makeRedFrame(4, 4)];
    const tags = [{ name: 'idle', from: 0, to: 0, direction: 'forward' as const, repeat: 1 }];
    const result = composeSpritesheet(frames, 4, 4, [100], tags, {
      layout: 'horizontal',
      columns: 1,
      spacing: 0,
    });
    expect(result.metadata.animationTags).toEqual(tags);
  });
});
