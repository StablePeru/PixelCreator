import { describe, it, expect } from 'vitest';
import {
  generateBlendMasks,
  composeBlendedTile,
  buildTransitionTileset,
  BLOB_47_COUNT,
} from '../../src/core/terrain-blend-engine.js';
import { PixelBuffer } from '../../src/io/png-codec.js';
import type { RGBA } from '../../src/types/common.js';

function solidTile(w: number, h: number, color: RGBA): PixelBuffer {
  const buf = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      buf.setPixel(x, y, color);
    }
  }
  return buf;
}

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };

describe('generateBlendMasks', () => {
  it('returns exactly 47 masks for blob-47', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'dither',
      strength: 0.5,
    });
    expect(masks).toHaveLength(BLOB_47_COUNT);
    expect(BLOB_47_COUNT).toBe(47);
  });

  it('each mask has the requested dimensions', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'dither',
      strength: 0.5,
    });
    for (const m of masks) {
      expect(m.width).toBe(16);
      expect(m.height).toBe(16);
    }
  });

  it('dither masks are strictly binary (0 or 255 in alpha)', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'dither',
      strength: 0.5,
    });
    for (const m of masks) {
      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          const { a } = m.getPixel(x, y);
          expect(a === 0 || a === 255).toBe(true);
        }
      }
    }
  });

  it('the "fully connected" config (index 46, all neighbors = same terrain) yields a fully-target mask', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 8, height: 8 },
      mode: 'dither',
      strength: 1.0,
    });
    // Index 46 = all 8 neighbors set (full blob). No A edges anywhere.
    const full = masks[46];
    for (let y = 0; y < full.height; y++) {
      for (let x = 0; x < full.width; x++) {
        expect(full.getPixel(x, y).a).toBe(255);
      }
    }
  });

  it('the "isolated" config (index 0, no neighbors = same terrain) yields some source bleed', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 8, height: 8 },
      mode: 'dither',
      strength: 1.0,
    });
    // Index 0 = no neighbors same terrain → all 8 directions are A → heavy dither.
    const isolated = masks[0];
    let aPixelCount = 0;
    for (let y = 0; y < isolated.height; y++) {
      for (let x = 0; x < isolated.width; x++) {
        if (isolated.getPixel(x, y).a === 0) aPixelCount++;
      }
    }
    expect(aPixelCount).toBeGreaterThan(0);
  });

  it('strength=0 produces a fully-target mask regardless of config', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 8, height: 8 },
      mode: 'dither',
      strength: 0,
    });
    for (const m of masks) {
      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          expect(m.getPixel(x, y).a).toBe(255);
        }
      }
    }
  });

  it('is deterministic — same input yields identical masks on repeat calls', () => {
    const a = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'dither',
      strength: 0.6,
    });
    const b = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'dither',
      strength: 0.6,
    });
    for (let i = 0; i < a.length; i++) {
      expect(a[i].data.equals(b[i].data)).toBe(true);
    }
  });
});

describe('composeBlendedTile', () => {
  it('is pure (does not mutate source or target)', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(8, 8, BLUE);
    const beforeSource = Buffer.from(source.data);
    const beforeTarget = Buffer.from(target.data);

    const [mask] = generateBlendMasks({
      tileSize: { width: 8, height: 8 },
      mode: 'dither',
      strength: 0.5,
    });
    composeBlendedTile(source, target, mask);

    expect(source.data.equals(beforeSource)).toBe(true);
    expect(target.data.equals(beforeTarget)).toBe(true);
  });

  it('returns a new PixelBuffer with the expected size', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(8, 8, BLUE);
    const [mask] = generateBlendMasks({
      tileSize: { width: 8, height: 8 },
      mode: 'dither',
      strength: 0.5,
    });
    const out = composeBlendedTile(source, target, mask);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
    expect(out).not.toBe(source);
    expect(out).not.toBe(target);
  });

  it('picks target pixels where mask alpha is 255 and source pixels where alpha is 0', () => {
    const source = solidTile(4, 4, RED);
    const target = solidTile(4, 4, BLUE);
    const mask = new PixelBuffer(4, 4);
    // Top half = target, bottom half = source
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        mask.setPixel(x, y, { r: 0, g: 0, b: 0, a: y < 2 ? 255 : 0 });
      }
    }
    const out = composeBlendedTile(source, target, mask);
    expect(out.getPixel(0, 0)).toEqual(BLUE); // target
    expect(out.getPixel(3, 1)).toEqual(BLUE);
    expect(out.getPixel(0, 2)).toEqual(RED); // source
    expect(out.getPixel(3, 3)).toEqual(RED);
  });

  it('throws when source/target/mask sizes disagree', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(4, 4, BLUE);
    const mask = new PixelBuffer(8, 8);
    expect(() => composeBlendedTile(source, target, mask)).toThrow();
  });
});

describe('buildTransitionTileset', () => {
  it('returns 47 blended tiles by default', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(8, 8, BLUE);
    const tiles = buildTransitionTileset(source, target, {
      mode: 'dither',
      strength: 0.5,
      includeInverse: false,
    });
    expect(tiles).toHaveLength(47);
  });

  it('returns 94 blended tiles when includeInverse is true', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(8, 8, BLUE);
    const tiles = buildTransitionTileset(source, target, {
      mode: 'dither',
      strength: 0.5,
      includeInverse: true,
    });
    expect(tiles).toHaveLength(94);
  });

  it('the first tile (isolated config) contains both source and target colors at strength=1', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(8, 8, BLUE);
    const [isolated] = buildTransitionTileset(source, target, {
      mode: 'dither',
      strength: 1.0,
      includeInverse: false,
    });
    let hasRed = false;
    let hasBlue = false;
    for (let y = 0; y < isolated.height; y++) {
      for (let x = 0; x < isolated.width; x++) {
        const px = isolated.getPixel(x, y);
        if (px.r === 255 && px.b === 0) hasRed = true;
        if (px.r === 0 && px.b === 255) hasBlue = true;
      }
    }
    expect(hasRed).toBe(true);
    expect(hasBlue).toBe(true);
  });

  it('throws when source and target have different sizes', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(4, 4, BLUE);
    expect(() =>
      buildTransitionTileset(source, target, {
        mode: 'dither',
        strength: 0.5,
        includeInverse: false,
      }),
    ).toThrow();
  });
});

describe('generateBlendMasks — alpha-mask mode', () => {
  it('returns exactly 47 masks for blob-47', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'alpha-mask',
      strength: 0.8,
    });
    expect(masks).toHaveLength(BLOB_47_COUNT);
  });

  it('alpha-mask masks have non-binary alpha values (soft gradient)', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'alpha-mask',
      strength: 0.8,
    });
    // The "isolated" config (index 0) has A weight on every side → expect
    // at least one intermediate alpha value across the whole tileset.
    let sawIntermediate = false;
    for (const m of masks) {
      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          const a = m.getPixel(x, y).a;
          if (a > 0 && a < 255) {
            sawIntermediate = true;
            break;
          }
        }
        if (sawIntermediate) break;
      }
      if (sawIntermediate) break;
    }
    expect(sawIntermediate).toBe(true);
  });

  it('strength=0 still produces a fully-target mask in alpha-mask mode', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 8, height: 8 },
      mode: 'alpha-mask',
      strength: 0,
    });
    for (const m of masks) {
      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          expect(m.getPixel(x, y).a).toBe(255);
        }
      }
    }
  });

  it('the fully-connected config (index 46) is fully target (alpha 255) in alpha-mask mode', () => {
    const masks = generateBlendMasks({
      tileSize: { width: 8, height: 8 },
      mode: 'alpha-mask',
      strength: 1,
    });
    const full = masks[46];
    for (let y = 0; y < full.height; y++) {
      for (let x = 0; x < full.width; x++) {
        expect(full.getPixel(x, y).a).toBe(255);
      }
    }
  });

  it('is deterministic in alpha-mask mode', () => {
    const a = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'alpha-mask',
      strength: 0.7,
    });
    const b = generateBlendMasks({
      tileSize: { width: 16, height: 16 },
      mode: 'alpha-mask',
      strength: 0.7,
    });
    for (let i = 0; i < a.length; i++) {
      expect(a[i].data.equals(b[i].data)).toBe(true);
    }
  });
});

describe('composeBlendedTile — alpha-mask interpolation', () => {
  it('interpolates RGB channels when mask alpha is between 0 and 255', () => {
    const source = solidTile(2, 2, RED);
    const target = solidTile(2, 2, BLUE);
    const mask = new PixelBuffer(2, 2);
    // Mid-alpha everywhere
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        mask.setPixel(x, y, { r: 0, g: 0, b: 0, a: 128 });
      }
    }
    const out = composeBlendedTile(source, target, mask);
    const px = out.getPixel(0, 0);
    // Half-way between RED and BLUE: both r and b non-zero, alpha full.
    expect(px.r).toBeGreaterThan(0);
    expect(px.r).toBeLessThan(255);
    expect(px.b).toBeGreaterThan(0);
    expect(px.b).toBeLessThan(255);
    expect(px.a).toBe(255);
  });
});

describe('buildTransitionTileset — alpha-mask mode', () => {
  it('produces tiles that contain intermediate (mixed) colors', () => {
    const source = solidTile(8, 8, RED);
    const target = solidTile(8, 8, BLUE);
    const [isolated] = buildTransitionTileset(source, target, {
      mode: 'alpha-mask',
      strength: 1,
      includeInverse: false,
    });
    let hasMix = false;
    for (let y = 0; y < isolated.height; y++) {
      for (let x = 0; x < isolated.width; x++) {
        const p = isolated.getPixel(x, y);
        if (p.r > 0 && p.r < 255 && p.b > 0 && p.b < 255) {
          hasMix = true;
          break;
        }
      }
      if (hasMix) break;
    }
    expect(hasMix).toBe(true);
  });
});
