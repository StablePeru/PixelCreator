import { describe, it, expect } from 'vitest';
import type { TilemapData, AutoTileConfig } from '../../src/types/tileset.js';
import {
  computeBitmask,
  bitmaskToBlob47,
  bitmaskToWang16,
  resolveAutoTile,
  paintAutoTile,
  resolveAutoTilemap,
  createDefaultBlob47Mapping,
  createDefaultWang16Mapping,
} from '../../src/core/autotile-engine.js';

// Neighbor bit flags (mirrored from source for test assertions)
const N = 1;
const NE = 2;
const E = 4;
const SE = 8;
const S = 16;
const SW = 32;
const W = 64;
const NW = 128;

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

function createTerrainTilemap(
  width: number,
  height: number,
  terrainIds: (number | undefined)[],
): TilemapData {
  return {
    name: 'test',
    width,
    height,
    cells: terrainIds.map((terrainId) => ({
      tileIndex: 0,
      terrainId,
    })),
    created: '2024-01-01',
    modified: '2024-01-01',
  };
}

describe('autotile-engine', () => {
  describe('computeBitmask', () => {
    it('should return 0 for an isolated cell (no same-terrain neighbors)', () => {
      // 3x3 grid with terrain 1 only at center
      const terrainIds = [
        undefined, undefined, undefined,
        undefined, 1,         undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask).toBe(0);
    });

    it('should set N bit when north neighbor matches', () => {
      const terrainIds = [
        undefined, 1,         undefined,
        undefined, 1,         undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask & N).toBe(N);
    });

    it('should set E bit when east neighbor matches', () => {
      const terrainIds = [
        undefined, undefined, undefined,
        undefined, 1,         1,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask & E).toBe(E);
    });

    it('should set S bit when south neighbor matches', () => {
      const terrainIds = [
        undefined, undefined, undefined,
        undefined, 1,         undefined,
        undefined, 1,         undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask & S).toBe(S);
    });

    it('should set W bit when west neighbor matches', () => {
      const terrainIds = [
        undefined, undefined, undefined,
        1,         1,         undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask & W).toBe(W);
    });

    it('should return 255 when cell is surrounded by same terrain on all 8 sides', () => {
      const terrainIds = [
        1, 1, 1,
        1, 1, 1,
        1, 1, 1,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask).toBe(255);
    });

    it('should strip NE corner when N and E are not both present (N only)', () => {
      // N and NE present, but E absent -> NE should be stripped
      const terrainIds = [
        undefined, 1,  1,
        undefined, 1,  undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask & NE).toBe(0);
      expect(bitmask & N).toBe(N);
    });

    it('should keep NE corner when both N and E are present', () => {
      const terrainIds = [
        undefined, 1, 1,
        undefined, 1, 1,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      expect(bitmask & NE).toBe(NE);
      expect(bitmask & N).toBe(N);
      expect(bitmask & E).toBe(E);
    });

    it('should strip NE when N present and E present but NE is not same terrain', () => {
      const terrainIds = [
        undefined, 1,         undefined,
        undefined, 1,         1,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 1, 1, 1);
      // N+E present, NE is undefined (not terrain 1), so NE bit not set at raw level
      expect(bitmask & NE).toBe(0);
    });

    it('should treat out-of-bounds neighbors as same terrain', () => {
      // Top-left corner: N, NW, W are out of bounds -> treated as matching
      const terrainIds = [
        1, undefined, undefined,
        undefined, undefined, undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const bitmask = computeBitmask(tilemap, 0, 0, 1);
      // Out of bounds: N, NE, NW, W, SW treated as same terrain
      // In bounds: E(0,0+1) -> undefined, S(0+1,0) -> undefined, SE -> undefined
      expect(bitmask & N).toBe(N);
      expect(bitmask & W).toBe(W);
      expect(bitmask & NW).toBe(NW);
      expect(bitmask & E).toBe(0);
      expect(bitmask & S).toBe(0);
    });

    it('should treat all out-of-bounds as same terrain for corner cell', () => {
      // Bottom-right corner of a 1x1 tilemap: all neighbors are OOB
      const tilemap = createTerrainTilemap(1, 1, [1]);
      const bitmask = computeBitmask(tilemap, 0, 0, 1);
      // All 8 neighbors OOB -> all treated as same terrain
      expect(bitmask).toBe(255);
    });

    it('should handle large tilemap with no matching neighbors', () => {
      const size = 5;
      const terrainIds = Array.from({ length: size * size }, () => undefined);
      terrainIds[12] = 1; // center at (2,2)
      const tilemap = createTerrainTilemap(size, size, terrainIds);
      const bitmask = computeBitmask(tilemap, 2, 2, 1);
      expect(bitmask).toBe(0);
    });
  });

  describe('bitmaskToBlob47', () => {
    it('should return 0 for bitmask 0 (isolated)', () => {
      expect(bitmaskToBlob47(0)).toBe(0);
    });

    it('should return 46 for bitmask 255 (all neighbors)', () => {
      expect(bitmaskToBlob47(255)).toBe(46);
    });

    it('should return 1 for N only', () => {
      expect(bitmaskToBlob47(N)).toBe(1);
    });

    it('should return 2 for E only', () => {
      expect(bitmaskToBlob47(E)).toBe(2);
    });

    it('should return 4 for S only', () => {
      expect(bitmaskToBlob47(S)).toBe(4);
    });

    it('should return 8 for W only', () => {
      expect(bitmaskToBlob47(W)).toBe(8);
    });

    it('should return 5 for N+S (vertical corridor)', () => {
      expect(bitmaskToBlob47(N | S)).toBe(5);
    });

    it('should return 10 for E+W (horizontal corridor)', () => {
      expect(bitmaskToBlob47(E | W)).toBe(10);
    });

    it('should return 15 for N+E+S+W with no corners (cross)', () => {
      expect(bitmaskToBlob47(N | E | S | W)).toBe(15);
    });

    it('should strip invalid corners before lookup', () => {
      // N+NE but no E -> NE is stripped -> result should be same as N only (index 1)
      expect(bitmaskToBlob47(N | NE)).toBe(1);
    });

    it('should return 3 for N+E without NE corner', () => {
      expect(bitmaskToBlob47(N | E)).toBe(3);
    });

    it('should return 16 for N+E+NE', () => {
      expect(bitmaskToBlob47(N | E | NE)).toBe(16);
    });

    it('should return consistent results for various cardinal combos', () => {
      // Test that identical inputs always give same output
      const result1 = bitmaskToBlob47(N | E | S);
      const result2 = bitmaskToBlob47(N | E | S);
      expect(result1).toBe(result2);
      expect(result1).toBe(7); // N+E+S no corners
    });
  });

  describe('bitmaskToWang16', () => {
    it('should return 0 for bitmask 0', () => {
      expect(bitmaskToWang16(0)).toBe(0);
    });

    it('should extract only cardinal bits', () => {
      // N(1)->1, E(4)->2, S(16)->4, W(64)->8
      expect(bitmaskToWang16(N)).toBe(1);
      expect(bitmaskToWang16(E)).toBe(2);
      expect(bitmaskToWang16(S)).toBe(4);
      expect(bitmaskToWang16(W)).toBe(8);
    });

    it('should return value in range 0-15', () => {
      for (let i = 0; i < 256; i++) {
        const result = bitmaskToWang16(i);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(15);
      }
    });

    it('should ignore corner bits', () => {
      // Only corners, no cardinals
      expect(bitmaskToWang16(NE | SE | SW | NW)).toBe(0);
    });

    it('should return 15 for all cardinals', () => {
      expect(bitmaskToWang16(N | E | S | W)).toBe(15);
    });

    it('should return 15 for all 8 neighbors (ignoring corners)', () => {
      expect(bitmaskToWang16(255)).toBe(15);
    });

    it('should combine cardinal bits correctly', () => {
      // N+E -> 1+2 = 3
      expect(bitmaskToWang16(N | E)).toBe(3);
      // S+W -> 4+8 = 12
      expect(bitmaskToWang16(S | W)).toBe(12);
      // N+S -> 1+4 = 5
      expect(bitmaskToWang16(N | S)).toBe(5);
      // E+W -> 2+8 = 10
      expect(bitmaskToWang16(E | W)).toBe(10);
    });
  });

  describe('resolveAutoTile', () => {
    it('should resolve blob-47 tile index for a simple config', () => {
      const terrainIds = [
        1, 1, 1,
        1, 1, 1,
        1, 1, 1,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const config: AutoTileConfig = {
        type: 'blob-47',
        terrainId: 1,
        tileMapping: createDefaultBlob47Mapping(),
      };
      // Center cell with all 8 neighbors -> blob47 index 46
      const result = resolveAutoTile(tilemap, 1, 1, config);
      expect(result).toBe(46);
    });

    it('should resolve wang-16 tile index', () => {
      const terrainIds = [
        undefined, 1,         undefined,
        1,         1,         1,
        undefined, 1,         undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const config: AutoTileConfig = {
        type: 'wang-16',
        terrainId: 1,
        tileMapping: createDefaultWang16Mapping(),
      };
      // All 4 cardinal neighbors present -> wang16 index 15
      const result = resolveAutoTile(tilemap, 1, 1, config);
      expect(result).toBe(15);
    });

    it('should use custom tile mapping', () => {
      const terrainIds = [
        undefined, undefined, undefined,
        undefined, 1,         undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const config: AutoTileConfig = {
        type: 'blob-47',
        terrainId: 1,
        tileMapping: { 0: 42 }, // isolated -> tile 42
      };
      const result = resolveAutoTile(tilemap, 1, 1, config);
      expect(result).toBe(42);
    });

    it('should return 0 when tile mapping has no entry', () => {
      const terrainIds = [
        undefined, undefined, undefined,
        undefined, 1,         undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const config: AutoTileConfig = {
        type: 'blob-47',
        terrainId: 1,
        tileMapping: {}, // empty mapping
      };
      const result = resolveAutoTile(tilemap, 1, 1, config);
      expect(result).toBe(0);
    });

    it('should resolve wang-16 for isolated cell to index 0', () => {
      const terrainIds = [
        undefined, undefined, undefined,
        undefined, 1,         undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const config: AutoTileConfig = {
        type: 'wang-16',
        terrainId: 1,
        tileMapping: createDefaultWang16Mapping(),
      };
      const result = resolveAutoTile(tilemap, 1, 1, config);
      expect(result).toBe(0);
    });
  });

  describe('paintAutoTile', () => {
    it('should return a new tilemap (immutability)', () => {
      const tilemap = createTerrainTilemap(3, 3, Array(9).fill(undefined));
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = paintAutoTile(tilemap, 1, 1, 1, configs);
      expect(result).not.toBe(tilemap);
      expect(result.cells).not.toBe(tilemap.cells);
    });

    it('should set terrain at painted position', () => {
      const tilemap = createTerrainTilemap(3, 3, Array(9).fill(undefined));
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = paintAutoTile(tilemap, 1, 1, 1, configs);
      expect(result.cells[4].terrainId).toBe(1);
    });

    it('should re-resolve neighbors after painting', () => {
      // Start with a horizontal line of terrain 1
      const terrainIds = [
        undefined, undefined, undefined,
        1,         1,         undefined,
        undefined, undefined, undefined,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      // Paint terrain 1 at (2,1) extending the line
      const result = paintAutoTile(tilemap, 2, 1, 1, configs);
      expect(result.cells[5].terrainId).toBe(1);
      // The center cell (1,1) now has E neighbor too, so its tile should update
      // Before: (0,1)=W only -> index 8; after paint, (1,1) has W+E -> index 10
      expect(result.cells[4].tileIndex).toBe(10);
    });

    it('should throw for out-of-bounds position', () => {
      const tilemap = createTerrainTilemap(3, 3, Array(9).fill(undefined));
      const configs: AutoTileConfig[] = [];
      expect(() => paintAutoTile(tilemap, -1, 0, 1, configs)).toThrow('out of bounds');
      expect(() => paintAutoTile(tilemap, 3, 0, 1, configs)).toThrow('out of bounds');
      expect(() => paintAutoTile(tilemap, 0, -1, 1, configs)).toThrow('out of bounds');
      expect(() => paintAutoTile(tilemap, 0, 3, 1, configs)).toThrow('out of bounds');
    });

    it('should not modify original tilemap cells', () => {
      const terrainIds = [
        1, 1, 1,
        1, 1, 1,
        1, 1, 1,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const originalCell = tilemap.cells[4];
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 2,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      paintAutoTile(tilemap, 1, 1, 2, configs);
      // Original should be unchanged
      expect(tilemap.cells[4]).toBe(originalCell);
      expect(tilemap.cells[4].terrainId).toBe(1);
    });

    it('should update modified timestamp', () => {
      const tilemap = createTerrainTilemap(3, 3, Array(9).fill(undefined));
      const configs: AutoTileConfig[] = [];
      const result = paintAutoTile(tilemap, 1, 1, 1, configs);
      expect(result.modified).not.toBe(tilemap.modified);
    });
  });

  describe('resolveAutoTilemap', () => {
    it('should resolve all cells in the tilemap', () => {
      // 3x3 all terrain 1
      const terrainIds = [
        1, 1, 1,
        1, 1, 1,
        1, 1, 1,
      ];
      const tilemap = createTerrainTilemap(3, 3, terrainIds);
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = resolveAutoTilemap(tilemap, configs);
      // Every cell should have its tileIndex set
      for (const cell of result.cells) {
        expect(cell.tileIndex).toBeDefined();
        expect(cell.tileIndex).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return a new tilemap (immutability)', () => {
      const tilemap = createTerrainTilemap(2, 2, [1, 1, 1, 1]);
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = resolveAutoTilemap(tilemap, configs);
      expect(result).not.toBe(tilemap);
      expect(result.cells).not.toBe(tilemap.cells);
    });

    it('should skip cells without terrain', () => {
      const terrainIds: (number | undefined)[] = [undefined, 1, undefined, undefined];
      const tilemap = createTerrainTilemap(2, 2, terrainIds);
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = resolveAutoTilemap(tilemap, configs);
      // Cell 0 has no terrain -> tileIndex stays at original value (0)
      expect(result.cells[0].tileIndex).toBe(0);
      // Cell 1 has terrain 1 -> tileIndex should be resolved
      expect(result.cells[1].tileIndex).toBeDefined();
    });

    it('should skip cells whose terrain has no matching config', () => {
      const terrainIds: (number | undefined)[] = [2, 2, 2, 2];
      const tilemap = createTerrainTilemap(2, 2, terrainIds);
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1, // config for terrain 1, but cells are terrain 2
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = resolveAutoTilemap(tilemap, configs);
      // All cells terrain 2 with no matching config -> tileIndex unchanged
      for (const cell of result.cells) {
        expect(cell.tileIndex).toBe(0);
      }
    });

    it('should handle multiple terrain configs', () => {
      const terrainIds: (number | undefined)[] = [1, 2, 2, 1];
      const tilemap = createTerrainTilemap(2, 2, terrainIds);
      const configs: AutoTileConfig[] = [
        {
          type: 'wang-16',
          terrainId: 1,
          tileMapping: { ...createDefaultWang16Mapping(), 0: 100 },
        },
        {
          type: 'wang-16',
          terrainId: 2,
          tileMapping: { ...createDefaultWang16Mapping(), 0: 200 },
        },
      ];
      const result = resolveAutoTilemap(tilemap, configs);
      // Each terrain resolves independently
      expect(result.cells[0].tileIndex).toBeDefined();
      expect(result.cells[1].tileIndex).toBeDefined();
    });

    it('should update modified timestamp', () => {
      const tilemap = createTerrainTilemap(2, 2, [1, 1, 1, 1]);
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = resolveAutoTilemap(tilemap, configs);
      expect(result.modified).not.toBe(tilemap.modified);
    });

    it('should correctly resolve center cell in filled 3x3 grid (blob-47 = 46)', () => {
      const terrainIds = Array(9).fill(1);
      const tilemap = createTerrainTilemap(3, 3, terrainIds as number[]);
      const configs: AutoTileConfig[] = [
        {
          type: 'blob-47',
          terrainId: 1,
          tileMapping: createDefaultBlob47Mapping(),
        },
      ];
      const result = resolveAutoTilemap(tilemap, configs);
      // Center cell (1,1) has all 8 neighbors -> blob47 index 46
      expect(result.cells[4].tileIndex).toBe(46);
    });
  });

  describe('createDefaultBlob47Mapping', () => {
    it('should return 47 entries', () => {
      const mapping = createDefaultBlob47Mapping();
      expect(Object.keys(mapping).length).toBe(47);
    });

    it('should be an identity mapping (index N -> tile N)', () => {
      const mapping = createDefaultBlob47Mapping();
      for (let i = 0; i < 47; i++) {
        expect(mapping[i]).toBe(i);
      }
    });

    it('should not have entries beyond index 46', () => {
      const mapping = createDefaultBlob47Mapping();
      expect(mapping[47]).toBeUndefined();
    });
  });

  describe('createDefaultWang16Mapping', () => {
    it('should return 16 entries', () => {
      const mapping = createDefaultWang16Mapping();
      expect(Object.keys(mapping).length).toBe(16);
    });

    it('should be an identity mapping (index N -> tile N)', () => {
      const mapping = createDefaultWang16Mapping();
      for (let i = 0; i < 16; i++) {
        expect(mapping[i]).toBe(i);
      }
    });

    it('should not have entries beyond index 15', () => {
      const mapping = createDefaultWang16Mapping();
      expect(mapping[16]).toBeUndefined();
    });
  });
});
