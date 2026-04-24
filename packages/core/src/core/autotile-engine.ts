import type { TilemapData, AutoTileConfig } from '../types/tileset.js';

// Neighbor bit flags (8-direction bitmask)
// NW(128)  N(1)   NE(2)
// W(64)    Cell   E(4)
// SW(32)   S(16)  SE(8)
const N = 1;
const NE = 2;
const E = 4;
const SE = 8;
const S = 16;
const SW = 32;
const W = 64;
const NW = 128;

/**
 * Strip corner bits that lack both adjacent cardinal neighbors.
 * A corner is only valid when both of its adjacent cardinals are present.
 * NW requires N+W, NE requires N+E, SE requires S+E, SW requires S+W.
 */
function stripInvalidCorners(bitmask: number): number {
  let result = bitmask;
  if ((result & (N | E)) !== (N | E)) result &= ~NE;
  if ((result & (S | E)) !== (S | E)) result &= ~SE;
  if ((result & (S | W)) !== (S | W)) result &= ~SW;
  if ((result & (N | W)) !== (N | W)) result &= ~NW;
  return result;
}

/**
 * The 47 canonical blob-tile configurations.
 * Each entry is the bitmask with corners already properly set.
 * Index in this array = blob-47 tile index (0..46).
 */
export const BLOB_47_CONFIGS: number[] = [
  /* 0  Isolated           */ 0,
  /* 1  N only             */ N,
  /* 2  E only             */ E,
  /* 3  N+E (no corner)    */ N | E,
  /* 4  S only             */ S,
  /* 5  N+S                */ N | S,
  /* 6  E+S (no corner)    */ E | S,
  /* 7  N+E+S (no corners) */ N | E | S,
  /* 8  W only             */ W,
  /* 9  N+W (no corner)    */ N | W,
  /* 10 E+W                */ E | W,
  /* 11 N+E+W (no corners) */ N | E | W,
  /* 12 S+W (no corner)    */ S | W,
  /* 13 N+S+W (no corners) */ N | S | W,
  /* 14 E+S+W (no corners) */ E | S | W,
  /* 15 N+E+S+W (no corners) — cross */ N | E | S | W,
  /* 16 N+E+NE             */ N | E | NE,
  /* 17 N+E+S+NE           */ N | E | S | NE,
  /* 18 N+E+W+NE           */ N | E | W | NE,
  /* 19 E+S+SE             */ E | S | SE,
  /* 20 N+E+S+SE           */ N | E | S | SE,
  /* 21 E+S+W+SE           */ E | S | W | SE,
  /* 22 S+W+SW             */ S | W | SW,
  /* 23 N+S+W+SW           */ N | S | W | SW,
  /* 24 E+S+W+SW           */ E | S | W | SW,
  /* 25 N+W+NW             */ N | W | NW,
  /* 26 N+E+W+NW           */ N | E | W | NW,
  /* 27 N+S+W+NW           */ N | S | W | NW,
  /* 28 N+E+S+NE+SE        */ N | E | S | NE | SE,
  /* 29 E+S+W+SE+SW        */ E | S | W | SE | SW,
  /* 30 N+S+W+NW+SW        */ N | S | W | NW | SW,
  /* 31 N+E+W+NE+NW        */ N | E | W | NE | NW,
  /* 32 N+E+S+W+NE         */ N | E | S | W | NE,
  /* 33 N+E+S+W+SE         */ N | E | S | W | SE,
  /* 34 N+E+S+W+SW         */ N | E | S | W | SW,
  /* 35 N+E+S+W+NW         */ N | E | S | W | NW,
  /* 36 N+E+S+W+NE+SE      */ N | E | S | W | NE | SE,
  /* 37 N+E+S+W+SE+SW      */ N | E | S | W | SE | SW,
  /* 38 N+E+S+W+NW+SW      */ N | E | S | W | NW | SW,
  /* 39 N+E+S+W+NE+NW      */ N | E | S | W | NE | NW,
  /* 40 N+E+S+W+NE+SW (opposite corners) */ N | E | S | W | NE | SW,
  /* 41 N+E+S+W+NW+SE (opposite corners) */ N | E | S | W | NW | SE,
  /* 42 N+E+S+W+NE+SE+SW   */ N | E | S | W | NE | SE | SW,
  /* 43 N+E+S+W+NE+NW+SW   */ N | E | S | W | NE | NW | SW,
  /* 44 N+E+S+W+NE+NW+SE   */ N | E | S | W | NE | NW | SE,
  /* 45 N+E+S+W+NW+SE+SW   */ N | E | S | W | NW | SE | SW,
  /* 46 N+E+S+W+NE+NW+SE+SW (full) */ N | E | S | W | NE | NW | SE | SW,
];

/**
 * Pre-computed lookup: stripped bitmask (0-255) -> blob-47 index (0-46).
 * Built once at module load.
 */
const BLOB_47_LOOKUP: Record<number, number> = buildBlob47Lookup();

function buildBlob47Lookup(): Record<number, number> {
  const lookup: Record<number, number> = {};

  // Map each canonical config bitmask to its blob-47 index
  const canonicalMap = new Map<number, number>();
  for (let i = 0; i < BLOB_47_CONFIGS.length; i++) {
    canonicalMap.set(BLOB_47_CONFIGS[i], i);
  }

  // For every possible 8-bit bitmask, strip invalid corners, then find the canonical tile
  for (let raw = 0; raw < 256; raw++) {
    const stripped = stripInvalidCorners(raw);
    const idx = canonicalMap.get(stripped);
    lookup[raw] = idx !== undefined ? idx : 0;
  }

  return lookup;
}

/**
 * Compute the raw 8-bit bitmask for a cell at (x, y) in the tilemap.
 * Neighbors matching `terrainId` set their corresponding bit.
 * Out-of-bounds cells are treated as the same terrain (matching).
 */
export function computeBitmask(
  tilemap: TilemapData,
  x: number,
  y: number,
  terrainId: number,
): number {
  const { width, height, cells } = tilemap;

  const isSameTerrain = (nx: number, ny: number): boolean => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
    const cell = cells[ny * width + nx];
    return cell?.terrainId === terrainId;
  };

  let bitmask = 0;
  if (isSameTerrain(x, y - 1)) bitmask |= N;
  if (isSameTerrain(x + 1, y - 1)) bitmask |= NE;
  if (isSameTerrain(x + 1, y)) bitmask |= E;
  if (isSameTerrain(x + 1, y + 1)) bitmask |= SE;
  if (isSameTerrain(x, y + 1)) bitmask |= S;
  if (isSameTerrain(x - 1, y + 1)) bitmask |= SW;
  if (isSameTerrain(x - 1, y)) bitmask |= W;
  if (isSameTerrain(x - 1, y - 1)) bitmask |= NW;

  // Strip corners where both adjacent cardinals aren't present
  return stripInvalidCorners(bitmask);
}

/**
 * Map an 8-bit bitmask to one of the 47 canonical blob-tile indices (0-46).
 * Applies the corner-stripping rule before lookup.
 */
export function bitmaskToBlob47(bitmask: number): number {
  const stripped = stripInvalidCorners(bitmask);
  return BLOB_47_LOOKUP[stripped] ?? 0;
}

/**
 * Map an 8-bit bitmask to a Wang-16 index (0-15) using only cardinal directions.
 * Cardinal bits: N=1, E=4, S=16, W=64 -> mapped to 4-bit: N=1, E=2, S=4, W=8
 */
export function bitmaskToWang16(bitmask: number): number {
  let wang = 0;
  if (bitmask & N) wang |= 1;
  if (bitmask & E) wang |= 2;
  if (bitmask & S) wang |= 4;
  if (bitmask & W) wang |= 8;
  return wang;
}

/**
 * Resolve the auto-tile index for a single cell at (x, y).
 * Returns the actual tile index from the config's tileMapping.
 */
export function resolveAutoTile(
  tilemap: TilemapData,
  x: number,
  y: number,
  config: AutoTileConfig,
): number {
  const bitmask = computeBitmask(tilemap, x, y, config.terrainId);

  const logicalIndex =
    config.type === 'blob-47' ? bitmaskToBlob47(bitmask) : bitmaskToWang16(bitmask);

  return config.tileMapping[logicalIndex] ?? 0;
}

/**
 * Paint a terrain cell and re-resolve auto-tiles for all affected neighbors.
 * Returns a new TilemapData (immutable).
 */
export function paintAutoTile(
  tilemap: TilemapData,
  x: number,
  y: number,
  terrainId: number,
  configs: AutoTileConfig[],
): TilemapData {
  const { width, height } = tilemap;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    throw new Error(`Position (${x}, ${y}) is out of bounds for tilemap ${width}x${height}`);
  }

  // Copy cells array
  const newCells = tilemap.cells.map((cell) => ({ ...cell }));

  // Set the painted cell's terrain
  const targetIdx = y * width + x;
  newCells[targetIdx] = { ...newCells[targetIdx], terrainId };

  // Build the intermediate tilemap for bitmask computation
  const intermediateTilemap: TilemapData = {
    ...tilemap,
    cells: newCells,
    modified: new Date().toISOString(),
  };

  // Re-resolve all 9 cells in the 3x3 neighborhood
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const cellIdx = ny * width + nx;
      const cell = newCells[cellIdx];
      const cellTerrainId = cell.terrainId;

      if (cellTerrainId === undefined) continue;

      const config = configs.find((c) => c.terrainId === cellTerrainId);
      if (!config) continue;

      const tileIndex = resolveAutoTile(intermediateTilemap, nx, ny, config);
      newCells[cellIdx] = { ...newCells[cellIdx], tileIndex };
    }
  }

  return {
    ...tilemap,
    cells: newCells,
    modified: new Date().toISOString(),
  };
}

/**
 * Create the default blob-47 identity mapping (index N -> tile N).
 */
export function createDefaultBlob47Mapping(): Record<number, number> {
  const mapping: Record<number, number> = {};
  for (let i = 0; i < 47; i++) {
    mapping[i] = i;
  }
  return mapping;
}

/**
 * Create the default Wang-16 identity mapping (index N -> tile N).
 */
export function createDefaultWang16Mapping(): Record<number, number> {
  const mapping: Record<number, number> = {};
  for (let i = 0; i < 16; i++) {
    mapping[i] = i;
  }
  return mapping;
}

/**
 * Resolve auto-tiles for every cell in the entire tilemap.
 * Returns a new TilemapData with all tileIndex values updated (immutable).
 */
export function resolveAutoTilemap(tilemap: TilemapData, configs: AutoTileConfig[]): TilemapData {
  const { width, height } = tilemap;
  const newCells = tilemap.cells.map((cell) => ({ ...cell }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellIdx = y * width + x;
      const cell = newCells[cellIdx];
      const cellTerrainId = cell.terrainId;

      if (cellTerrainId === undefined) continue;

      const config = configs.find((c) => c.terrainId === cellTerrainId);
      if (!config) continue;

      const tileIndex = resolveAutoTile(tilemap, x, y, config);
      newCells[cellIdx] = { ...newCells[cellIdx], tileIndex };
    }
  }

  return {
    ...tilemap,
    cells: newCells,
    modified: new Date().toISOString(),
  };
}
