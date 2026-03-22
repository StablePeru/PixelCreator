import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import {
  hashTileBuffer,
  sliceTiles,
  deduplicateTiles,
  buildTilemapFromIndexMap,
  composeTilesetImage,
  renderTilemap,
  generateTiledMetadata,
} from '../../src/core/tileset-engine.js';
import type { RGBA } from '../../src/types/common.js';
import type { TilesetData } from '../../src/types/tileset.js';

const RED: RGBA = { r: 255, g: 0, b: 0, a: 255 };
const GREEN: RGBA = { r: 0, g: 255, b: 0, a: 255 };
const BLUE: RGBA = { r: 0, g: 0, b: 255, a: 255 };
const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

function fillBuffer(width: number, height: number, color: RGBA): PixelBuffer {
  const buf = new PixelBuffer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buf.setPixel(x, y, color);
    }
  }
  return buf;
}

describe('hashTileBuffer', () => {
  it('returns same hash for identical buffers', () => {
    const a = fillBuffer(4, 4, RED);
    const b = fillBuffer(4, 4, RED);
    expect(hashTileBuffer(a)).toBe(hashTileBuffer(b));
  });

  it('returns different hash for different buffers', () => {
    const a = fillBuffer(4, 4, RED);
    const b = fillBuffer(4, 4, GREEN);
    expect(hashTileBuffer(a)).not.toBe(hashTileBuffer(b));
  });

  it('returns a hex string', () => {
    const buf = fillBuffer(2, 2, BLUE);
    const hash = hashTileBuffer(buf);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('sliceTiles', () => {
  it('slices into correct number of tiles', () => {
    const source = new PixelBuffer(8, 8);
    const result = sliceTiles(source, 4, 4);
    expect(result.tiles).toHaveLength(4);
    expect(result.columns).toBe(2);
    expect(result.rows).toBe(2);
  });

  it('preserves pixel content in sliced tiles', () => {
    const source = new PixelBuffer(8, 4);
    // Fill left half red, right half green
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) source.setPixel(x, y, RED);
      for (let x = 4; x < 8; x++) source.setPixel(x, y, GREEN);
    }
    const result = sliceTiles(source, 4, 4);
    expect(result.tiles).toHaveLength(2);
    expect(result.tiles[0].getPixel(0, 0)).toEqual(RED);
    expect(result.tiles[1].getPixel(0, 0)).toEqual(GREEN);
  });

  it('throws error when not evenly divisible', () => {
    const source = new PixelBuffer(10, 8);
    expect(() => sliceTiles(source, 4, 4)).toThrow('not evenly divisible');
  });
});

describe('deduplicateTiles', () => {
  it('removes duplicate tiles', () => {
    const a = fillBuffer(4, 4, RED);
    const b = fillBuffer(4, 4, RED);
    const c = fillBuffer(4, 4, GREEN);
    const result = deduplicateTiles([a, b, c]);
    expect(result.unique).toHaveLength(2);
    expect(result.hashes).toHaveLength(2);
  });

  it('builds correct indexMap', () => {
    const a = fillBuffer(4, 4, RED);
    const b = fillBuffer(4, 4, GREEN);
    const c = fillBuffer(4, 4, RED);
    const d = fillBuffer(4, 4, BLUE);
    const result = deduplicateTiles([a, b, c, d]);
    expect(result.unique).toHaveLength(3);
    expect(result.indexMap).toEqual([0, 1, 0, 2]);
  });

  it('preserves all tiles when none are duplicates', () => {
    const a = fillBuffer(4, 4, RED);
    const b = fillBuffer(4, 4, GREEN);
    const result = deduplicateTiles([a, b]);
    expect(result.unique).toHaveLength(2);
    expect(result.indexMap).toEqual([0, 1]);
  });
});

describe('buildTilemapFromIndexMap', () => {
  it('creates tilemap with correct dimensions', () => {
    const tilemap = buildTilemapFromIndexMap('test', 3, 2, [0, 1, 0, 1, 0, 1]);
    expect(tilemap.name).toBe('test');
    expect(tilemap.width).toBe(3);
    expect(tilemap.height).toBe(2);
    expect(tilemap.cells).toHaveLength(6);
  });

  it('maps cell indices correctly', () => {
    const tilemap = buildTilemapFromIndexMap('map', 2, 2, [0, 1, 2, 0]);
    expect(tilemap.cells[0].tileIndex).toBe(0);
    expect(tilemap.cells[1].tileIndex).toBe(1);
    expect(tilemap.cells[2].tileIndex).toBe(2);
    expect(tilemap.cells[3].tileIndex).toBe(0);
  });
});

describe('composeTilesetImage', () => {
  it('produces correct output dimensions', () => {
    const tiles = [fillBuffer(4, 4, RED), fillBuffer(4, 4, GREEN), fillBuffer(4, 4, BLUE)];
    const result = composeTilesetImage(tiles, 4, 4, { columns: 2, spacing: 0 });
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
  });

  it('produces correct dimensions with spacing', () => {
    const tiles = [fillBuffer(4, 4, RED), fillBuffer(4, 4, GREEN)];
    const result = composeTilesetImage(tiles, 4, 4, { columns: 2, spacing: 2 });
    expect(result.width).toBe(10); // 4 + 2 + 4
    expect(result.height).toBe(4);
  });

  it('places tile pixels correctly', () => {
    const tiles = [fillBuffer(2, 2, RED), fillBuffer(2, 2, GREEN)];
    const result = composeTilesetImage(tiles, 2, 2, { columns: 2, spacing: 0 });
    expect(result.getPixel(0, 0)).toEqual(RED);
    expect(result.getPixel(2, 0)).toEqual(GREEN);
  });
});

describe('renderTilemap', () => {
  it('renders tilemap to correct size', () => {
    const tiles = [fillBuffer(4, 4, RED), fillBuffer(4, 4, GREEN)];
    const tilemap = buildTilemapFromIndexMap('test', 2, 1, [0, 1]);
    const result = renderTilemap(tilemap, tiles, 4, 4);
    expect(result.width).toBe(8);
    expect(result.height).toBe(4);
  });

  it('renders correct pixel content', () => {
    const tiles = [fillBuffer(4, 4, RED), fillBuffer(4, 4, GREEN)];
    const tilemap = buildTilemapFromIndexMap('test', 2, 1, [1, 0]);
    const result = renderTilemap(tilemap, tiles, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(GREEN);
    expect(result.getPixel(4, 0)).toEqual(RED);
  });

  it('skips empty cells (tileIndex -1)', () => {
    const tiles = [fillBuffer(4, 4, RED)];
    const tilemap = buildTilemapFromIndexMap('test', 2, 1, [0, -1]);
    // Override cell for -1
    tilemap.cells[1] = { tileIndex: -1 };
    const result = renderTilemap(tilemap, tiles, 4, 4);
    expect(result.getPixel(0, 0)).toEqual(RED);
    expect(result.getPixel(4, 0)).toEqual(TRANSPARENT);
  });

  it('round-trip: slice → dedup → render preserves content', () => {
    // Create a 8x4 source with two identical 4x4 tiles
    const source = new PixelBuffer(8, 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) source.setPixel(x, y, RED);
      for (let x = 4; x < 8; x++) source.setPixel(x, y, RED);
    }

    const { tiles } = sliceTiles(source, 4, 4);
    const { unique, indexMap } = deduplicateTiles(tiles);
    const tilemap = buildTilemapFromIndexMap('rt', 2, 1, indexMap);
    const rendered = renderTilemap(tilemap, unique, 4, 4);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 8; x++) {
        expect(rendered.getPixel(x, y)).toEqual(source.getPixel(x, y));
      }
    }
  });
});

describe('generateTiledMetadata', () => {
  it('generates valid TSJ structure', () => {
    const tileset: TilesetData = {
      name: 'terrain',
      tileWidth: 16,
      tileHeight: 16,
      tiles: [
        { id: 'tile-001', index: 0, hash: 'abc' },
        { id: 'tile-002', index: 1, hash: 'def' },
      ],
      tilemaps: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    const meta = generateTiledMetadata(tileset, 'terrain.png', 4, 0) as Record<string, unknown>;
    expect(meta.name).toBe('terrain');
    expect(meta.tilewidth).toBe(16);
    expect(meta.tileheight).toBe(16);
    expect(meta.tilecount).toBe(2);
    expect(meta.columns).toBe(2);
    expect(meta.image).toBe('terrain.png');
    expect(meta.type).toBe('tileset');
  });
});
