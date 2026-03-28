import { describe, it, expect } from 'vitest';
import type { TilemapData, TileInfo, TileAnimation } from '../../src/types/tileset.js';
import {
  resolveVariant,
  resolveAnimatedTile,
  tilemapFloodFill,
  tilemapBrushPaint,
  tilemapErase,
  tilemapStamp,
} from '../../src/core/tileset-engine.js';

function createTestTilemap(width: number, height: number, defaultTileIndex: number = 0): TilemapData {
  return {
    name: 'test',
    width,
    height,
    cells: Array.from({ length: width * height }, () => ({ tileIndex: defaultTileIndex })),
    created: '2024-01-01',
    modified: '2024-01-01',
  };
}

function createTileInfo(overrides: Partial<TileInfo> = {}): TileInfo {
  return {
    id: 'tile-001',
    index: 0,
    hash: 'abc123',
    ...overrides,
  };
}

describe('tileset-engine milestone 2', () => {
  describe('resolveVariant', () => {
    it('should return original index when no variants', () => {
      const tile = createTileInfo({ index: 5 });
      const result = resolveVariant(tile, 0, 0, 42);
      expect(result).toBe(5);
    });

    it('should return original index when variants array is empty', () => {
      const tile = createTileInfo({ index: 5, variants: [] });
      const result = resolveVariant(tile, 0, 0, 42);
      expect(result).toBe(5);
    });

    it('should return deterministic result (same position + seed = same result)', () => {
      const tile = createTileInfo({ index: 0, variants: [1, 2, 3] });
      const result1 = resolveVariant(tile, 5, 10, 99);
      const result2 = resolveVariant(tile, 5, 10, 99);
      expect(result1).toBe(result2);
    });

    it('should return potentially different results for different positions', () => {
      const tile = createTileInfo({ index: 0, variants: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
      // Collect results from many positions
      const results = new Set<number>();
      for (let x = 0; x < 20; x++) {
        for (let y = 0; y < 20; y++) {
          results.add(resolveVariant(tile, x, y, 42));
        }
      }
      // With 10 possible indices and 400 positions, we should see more than 1 unique result
      expect(results.size).toBeGreaterThan(1);
    });

    it('should return potentially different results for different seeds', () => {
      const tile = createTileInfo({ index: 0, variants: [1, 2, 3, 4, 5] });
      const results = new Set<number>();
      for (let seed = 0; seed < 100; seed++) {
        results.add(resolveVariant(tile, 3, 7, seed));
      }
      expect(results.size).toBeGreaterThan(1);
    });

    it('should only return indices from the valid set (original + variants)', () => {
      const tile = createTileInfo({ index: 10, variants: [20, 30, 40] });
      const validSet = new Set([10, 20, 30, 40]);
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          const result = resolveVariant(tile, x, y, 123);
          expect(validSet.has(result)).toBe(true);
        }
      }
    });

    it('should include original tile index in possible results', () => {
      const tile = createTileInfo({ index: 0, variants: [1] });
      // With only 2 choices, run enough to statistically guarantee both appear
      const results = new Set<number>();
      for (let x = 0; x < 100; x++) {
        results.add(resolveVariant(tile, x, 0, 0));
      }
      expect(results.has(0)).toBe(true);
    });
  });

  describe('resolveAnimatedTile', () => {
    it('should return original index when no animation', () => {
      const tile = createTileInfo({ index: 5 });
      const result = resolveAnimatedTile(tile, 1000);
      expect(result).toBe(5);
    });

    it('should return original index when animation has empty frames', () => {
      const tile = createTileInfo({
        index: 5,
        animation: { frames: [], duration: 100 },
      });
      const result = resolveAnimatedTile(tile, 1000);
      expect(result).toBe(5);
    });

    it('should cycle through frames based on timeMs', () => {
      const tile = createTileInfo({
        index: 0,
        animation: { frames: [10, 20, 30], duration: 100 },
      });
      // At t=0, frame 0 -> tile 10
      expect(resolveAnimatedTile(tile, 0)).toBe(10);
      // At t=100, frame 1 -> tile 20
      expect(resolveAnimatedTile(tile, 100)).toBe(20);
      // At t=200, frame 2 -> tile 30
      expect(resolveAnimatedTile(tile, 200)).toBe(30);
      // At t=300, wraps to frame 0 -> tile 10
      expect(resolveAnimatedTile(tile, 300)).toBe(10);
    });

    it('should handle negative time', () => {
      const tile = createTileInfo({
        index: 0,
        animation: { frames: [10, 20, 30], duration: 100 },
      });
      // Negative time should still resolve to a valid frame
      const result = resolveAnimatedTile(tile, -50);
      expect([10, 20, 30]).toContain(result);
    });

    it('should handle negative time correctly with modulo wrapping', () => {
      const tile = createTileInfo({
        index: 0,
        animation: { frames: [10, 20, 30], duration: 100 },
      });
      // Total duration = 300
      // -50 mod 300 = 250 (with positive modulo) -> frame index = floor(250/100) = 2 -> tile 30
      expect(resolveAnimatedTile(tile, -50)).toBe(30);
    });

    it('should return correct frame at exact boundaries', () => {
      const tile = createTileInfo({
        index: 0,
        animation: { frames: [10, 20], duration: 200 },
      });
      // t=0 -> frame 0 -> tile 10
      expect(resolveAnimatedTile(tile, 0)).toBe(10);
      // t=199 -> still frame 0 -> tile 10
      expect(resolveAnimatedTile(tile, 199)).toBe(10);
      // t=200 -> frame 1 -> tile 20
      expect(resolveAnimatedTile(tile, 200)).toBe(20);
      // t=399 -> still frame 1 -> tile 20
      expect(resolveAnimatedTile(tile, 399)).toBe(20);
      // t=400 -> wraps to frame 0 -> tile 10
      expect(resolveAnimatedTile(tile, 400)).toBe(10);
    });

    it('should handle single-frame animation', () => {
      const tile = createTileInfo({
        index: 0,
        animation: { frames: [42], duration: 100 },
      });
      expect(resolveAnimatedTile(tile, 0)).toBe(42);
      expect(resolveAnimatedTile(tile, 50)).toBe(42);
      expect(resolveAnimatedTile(tile, 100)).toBe(42);
      expect(resolveAnimatedTile(tile, 500)).toBe(42);
    });
  });

  describe('tilemapFloodFill', () => {
    it('should fill a connected region', () => {
      // 3x3 all tile index 0, fill from center with tile 5
      const tilemap = createTestTilemap(3, 3, 0);
      const result = tilemapFloodFill(tilemap, 1, 1, 5);
      // All cells should be filled since they are all connected with tileIndex 0
      for (const cell of result.cells) {
        expect(cell.tileIndex).toBe(5);
      }
    });

    it('should not fill cells with different tile indices', () => {
      // Create a tilemap with a barrier
      const tilemap = createTestTilemap(5, 1, 0);
      // Set cell 2 to a different index (barrier)
      tilemap.cells[2] = { tileIndex: 9 };
      const result = tilemapFloodFill(tilemap, 0, 0, 5);
      // Only cells 0 and 1 should be filled
      expect(result.cells[0].tileIndex).toBe(5);
      expect(result.cells[1].tileIndex).toBe(5);
      expect(result.cells[2].tileIndex).toBe(9); // barrier unchanged
      expect(result.cells[3].tileIndex).toBe(0); // not connected
      expect(result.cells[4].tileIndex).toBe(0); // not connected
    });

    it('should return a new tilemap (immutability)', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const result = tilemapFloodFill(tilemap, 0, 0, 5);
      expect(result).not.toBe(tilemap);
      expect(result.cells).not.toBe(tilemap.cells);
      // Original should be unchanged
      expect(tilemap.cells[0].tileIndex).toBe(0);
    });

    it('should return original tilemap for out-of-bounds start position', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      expect(tilemapFloodFill(tilemap, -1, 0, 5)).toBe(tilemap);
      expect(tilemapFloodFill(tilemap, 3, 0, 5)).toBe(tilemap);
      expect(tilemapFloodFill(tilemap, 0, -1, 5)).toBe(tilemap);
      expect(tilemapFloodFill(tilemap, 0, 3, 5)).toBe(tilemap);
    });

    it('should be a no-op when target equals fill index', () => {
      const tilemap = createTestTilemap(3, 3, 5);
      const result = tilemapFloodFill(tilemap, 1, 1, 5);
      // Should return original tilemap since no changes needed
      expect(result).toBe(tilemap);
    });

    it('should fill only the connected region, not diagonals', () => {
      // 3x3 grid:
      // 0 1 0
      // 1 0 1
      // 0 1 0
      const tilemap = createTestTilemap(3, 3, 0);
      tilemap.cells[1] = { tileIndex: 1 };
      tilemap.cells[3] = { tileIndex: 1 };
      tilemap.cells[5] = { tileIndex: 1 };
      tilemap.cells[7] = { tileIndex: 1 };
      // Fill from center (1,1) which is tileIndex 0
      const result = tilemapFloodFill(tilemap, 1, 1, 9);
      // Only center (1,1) should be filled because it's surrounded by 1s on all 4 cardinal sides
      expect(result.cells[4].tileIndex).toBe(9);
      // Corners should remain 0 (not connected through cardinals)
      expect(result.cells[0].tileIndex).toBe(0);
      expect(result.cells[2].tileIndex).toBe(0);
      expect(result.cells[6].tileIndex).toBe(0);
      expect(result.cells[8].tileIndex).toBe(0);
    });

    it('should fill L-shaped region', () => {
      // 3x3:
      // 0 1 1
      // 0 1 1
      // 0 0 1
      const tilemap = createTestTilemap(3, 3, 0);
      tilemap.cells[1] = { tileIndex: 1 };
      tilemap.cells[2] = { tileIndex: 1 };
      tilemap.cells[4] = { tileIndex: 1 };
      tilemap.cells[5] = { tileIndex: 1 };
      tilemap.cells[8] = { tileIndex: 1 };
      // Fill from (0,0) which is tileIndex 0
      const result = tilemapFloodFill(tilemap, 0, 0, 7);
      // L-shaped 0 region: (0,0), (0,1), (0,2), (1,2)
      expect(result.cells[0].tileIndex).toBe(7); // (0,0)
      expect(result.cells[3].tileIndex).toBe(7); // (0,1)
      expect(result.cells[6].tileIndex).toBe(7); // (0,2)
      expect(result.cells[7].tileIndex).toBe(7); // (1,2)
      // These should not be filled (they are tileIndex 1)
      expect(result.cells[1].tileIndex).toBe(1);
      expect(result.cells[2].tileIndex).toBe(1);
    });

    it('should update modified timestamp', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const result = tilemapFloodFill(tilemap, 0, 0, 5);
      expect(result.modified).not.toBe(tilemap.modified);
    });
  });

  describe('tilemapBrushPaint', () => {
    it('should paint correct area for brush size 1', () => {
      const tilemap = createTestTilemap(5, 5, 0);
      const result = tilemapBrushPaint(tilemap, 2, 2, 1, 7);
      // Only center cell should be painted
      let paintedCount = 0;
      for (const cell of result.cells) {
        if (cell.tileIndex === 7) paintedCount++;
      }
      expect(paintedCount).toBe(1);
      expect(result.cells[2 * 5 + 2].tileIndex).toBe(7);
    });

    it('should paint correct area for brush size 3', () => {
      const tilemap = createTestTilemap(5, 5, 0);
      const result = tilemapBrushPaint(tilemap, 2, 2, 3, 7);
      // 3x3 area centered at (2,2) -> (1,1) to (3,3)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = (2 + dy) * 5 + (2 + dx);
          expect(result.cells[idx].tileIndex).toBe(7);
        }
      }
      // Cells outside the brush area should remain 0
      expect(result.cells[0].tileIndex).toBe(0); // (0,0)
      expect(result.cells[4].tileIndex).toBe(0); // (4,0)
    });

    it('should clip to tilemap bounds', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      // Paint at corner (0,0) with brush size 3 -> half = 1, range (-1,-1) to (1,1)
      const result = tilemapBrushPaint(tilemap, 0, 0, 3, 5);
      // Only in-bounds cells get painted: (0,0), (1,0), (0,1), (1,1)
      expect(result.cells[0].tileIndex).toBe(5); // (0,0)
      expect(result.cells[1].tileIndex).toBe(5); // (1,0)
      expect(result.cells[3].tileIndex).toBe(5); // (0,1)
      expect(result.cells[4].tileIndex).toBe(5); // (1,1)
      // Remaining cells should still be 0
      expect(result.cells[2].tileIndex).toBe(0); // (2,0)
      expect(result.cells[5].tileIndex).toBe(0); // (2,1)
      expect(result.cells[6].tileIndex).toBe(0); // (0,2)
    });

    it('should return a new tilemap (immutability)', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const result = tilemapBrushPaint(tilemap, 1, 1, 1, 5);
      expect(result).not.toBe(tilemap);
      expect(result.cells).not.toBe(tilemap.cells);
      // Original unchanged
      expect(tilemap.cells[4].tileIndex).toBe(0);
    });

    it('should update modified timestamp', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const result = tilemapBrushPaint(tilemap, 1, 1, 1, 5);
      expect(result.modified).not.toBe(tilemap.modified);
    });

    it('should paint even brush size correctly', () => {
      const tilemap = createTestTilemap(5, 5, 0);
      // Brush size 2 -> half = 1, range (-1, 0) from center
      // Actually: half = floor(2/2) = 1, range (-1 to 1) ... no, brush iterates -half to +half
      // For size 2: half = 1, so it paints from -1 to +1 which is 3 cells wide
      // This is actually 3x3 since the loop goes -1,0,1
      const result = tilemapBrushPaint(tilemap, 2, 2, 2, 9);
      // half = floor(2/2) = 1, so dx,dy from -1 to 1 -> 3x3
      let paintedCount = 0;
      for (const cell of result.cells) {
        if (cell.tileIndex === 9) paintedCount++;
      }
      expect(paintedCount).toBe(9);
    });
  });

  describe('tilemapErase', () => {
    it('should set cells to -1', () => {
      const tilemap = createTestTilemap(5, 5, 3);
      const result = tilemapErase(tilemap, 2, 2, 1);
      expect(result.cells[2 * 5 + 2].tileIndex).toBe(-1);
    });

    it('should erase correct brush area', () => {
      const tilemap = createTestTilemap(5, 5, 3);
      const result = tilemapErase(tilemap, 2, 2, 3);
      // 3x3 area centered at (2,2) should be -1
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = (2 + dy) * 5 + (2 + dx);
          expect(result.cells[idx].tileIndex).toBe(-1);
        }
      }
      // Cells outside should remain 3
      expect(result.cells[0].tileIndex).toBe(3);
    });

    it('should return a new tilemap (immutability)', () => {
      const tilemap = createTestTilemap(3, 3, 5);
      const result = tilemapErase(tilemap, 1, 1, 1);
      expect(result).not.toBe(tilemap);
      expect(tilemap.cells[4].tileIndex).toBe(5); // original unchanged
    });

    it('should clip to bounds', () => {
      const tilemap = createTestTilemap(3, 3, 2);
      const result = tilemapErase(tilemap, 0, 0, 3);
      // Only in-bounds cells should be -1
      expect(result.cells[0].tileIndex).toBe(-1);
      expect(result.cells[1].tileIndex).toBe(-1);
      expect(result.cells[3].tileIndex).toBe(-1);
      expect(result.cells[4].tileIndex).toBe(-1);
      // These are further out and should remain 2
      expect(result.cells[2].tileIndex).toBe(2); // (2,0) — within half=1 range from (0,0)? dx=2 > half=1
      expect(result.cells[8].tileIndex).toBe(2);
    });
  });

  describe('tilemapStamp', () => {
    it('should stamp a pattern at the given position', () => {
      const tilemap = createTestTilemap(5, 5, 0);
      const pattern = [
        [1, 2],
        [3, 4],
      ];
      const result = tilemapStamp(tilemap, 1, 1, pattern);
      expect(result.cells[1 * 5 + 1].tileIndex).toBe(1); // (1,1)
      expect(result.cells[1 * 5 + 2].tileIndex).toBe(2); // (2,1)
      expect(result.cells[2 * 5 + 1].tileIndex).toBe(3); // (1,2)
      expect(result.cells[2 * 5 + 2].tileIndex).toBe(4); // (2,2)
    });

    it('should clip to tilemap bounds', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const pattern = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      // Stamp at (2,2) -> only (2,2) is in bounds from first row
      const result = tilemapStamp(tilemap, 2, 2, pattern);
      expect(result.cells[2 * 3 + 2].tileIndex).toBe(1); // (2,2) gets pattern[0][0]
      // (3,2) and (4,2) are out of bounds -> clipped
      // (2,3) is also out of bounds -> clipped
    });

    it('should return a new tilemap (immutability)', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const pattern = [[5]];
      const result = tilemapStamp(tilemap, 1, 1, pattern);
      expect(result).not.toBe(tilemap);
      expect(result.cells).not.toBe(tilemap.cells);
      expect(tilemap.cells[4].tileIndex).toBe(0); // original unchanged
    });

    it('should handle empty pattern rows', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const pattern: number[][] = [];
      const result = tilemapStamp(tilemap, 0, 0, pattern);
      // No changes since pattern is empty
      for (const cell of result.cells) {
        expect(cell.tileIndex).toBe(0);
      }
    });

    it('should stamp at origin (0,0)', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const pattern = [
        [7, 8],
        [9, 10],
      ];
      const result = tilemapStamp(tilemap, 0, 0, pattern);
      expect(result.cells[0 * 3 + 0].tileIndex).toBe(7); // (0,0)
      expect(result.cells[0 * 3 + 1].tileIndex).toBe(8); // (1,0)
      expect(result.cells[1 * 3 + 0].tileIndex).toBe(9); // (0,1)
      expect(result.cells[1 * 3 + 1].tileIndex).toBe(10); // (1,1)
      // Other cells unchanged
      expect(result.cells[0 * 3 + 2].tileIndex).toBe(0);
    });

    it('should handle pattern starting from negative coordinates', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const pattern = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      // Start at (-1, 0) -> only columns 1 and 2 of the pattern are in bounds
      const result = tilemapStamp(tilemap, -1, 0, pattern);
      expect(result.cells[0 * 3 + 0].tileIndex).toBe(2); // (0,0) gets pattern[0][1]
      expect(result.cells[0 * 3 + 1].tileIndex).toBe(3); // (1,0) gets pattern[0][2]
      expect(result.cells[1 * 3 + 0].tileIndex).toBe(5); // (0,1) gets pattern[1][1]
      expect(result.cells[1 * 3 + 1].tileIndex).toBe(6); // (1,1) gets pattern[1][2]
    });

    it('should update modified timestamp', () => {
      const tilemap = createTestTilemap(3, 3, 0);
      const pattern = [[5]];
      const result = tilemapStamp(tilemap, 0, 0, pattern);
      expect(result.modified).not.toBe(tilemap.modified);
    });
  });
});
