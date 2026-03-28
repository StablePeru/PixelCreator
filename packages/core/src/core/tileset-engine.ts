import { createHash } from 'node:crypto';
import { PixelBuffer } from '../io/png-codec.js';
import type {
  TilemapData,
  TilemapCell,
  TilesetData,
  TileInfo,
  TileAnimation,
} from '../types/tileset.js';

export function hashTileBuffer(buffer: PixelBuffer): string {
  return createHash('sha256').update(buffer.data).digest('hex');
}

export function sliceTiles(
  source: PixelBuffer,
  tileWidth: number,
  tileHeight: number,
): { tiles: PixelBuffer[]; columns: number; rows: number } {
  if (source.width % tileWidth !== 0 || source.height % tileHeight !== 0) {
    throw new Error(
      `Source ${source.width}x${source.height} is not evenly divisible by tile size ${tileWidth}x${tileHeight}`,
    );
  }

  const columns = source.width / tileWidth;
  const rows = source.height / tileHeight;
  const tiles: PixelBuffer[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const tile = new PixelBuffer(tileWidth, tileHeight);
      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          tile.setPixel(x, y, source.getPixel(col * tileWidth + x, row * tileHeight + y));
        }
      }
      tiles.push(tile);
    }
  }

  return { tiles, columns, rows };
}

export function deduplicateTiles(tiles: PixelBuffer[]): {
  unique: PixelBuffer[];
  hashes: string[];
  indexMap: number[];
} {
  const hashToUniqueIdx = new Map<string, number>();
  const unique: PixelBuffer[] = [];
  const hashes: string[] = [];
  const indexMap: number[] = [];

  for (const tile of tiles) {
    const hash = hashTileBuffer(tile);
    const existing = hashToUniqueIdx.get(hash);
    if (existing !== undefined) {
      indexMap.push(existing);
    } else {
      const idx = unique.length;
      hashToUniqueIdx.set(hash, idx);
      unique.push(tile);
      hashes.push(hash);
      indexMap.push(idx);
    }
  }

  return { unique, hashes, indexMap };
}

export function buildTilemapFromIndexMap(
  name: string,
  columns: number,
  rows: number,
  indexMap: number[],
): TilemapData {
  const now = new Date().toISOString();
  const cells: TilemapCell[] = indexMap.map((tileIndex) => ({ tileIndex }));
  return {
    name,
    width: columns,
    height: rows,
    cells,
    created: now,
    modified: now,
  };
}

export function composeTilesetImage(
  tiles: PixelBuffer[],
  tileWidth: number,
  tileHeight: number,
  options: { columns: number; spacing: number },
): PixelBuffer {
  const cols = Math.min(options.columns, tiles.length);
  const rows = Math.ceil(tiles.length / cols);
  const spacing = options.spacing;

  const width = cols * tileWidth + Math.max(0, cols - 1) * spacing;
  const height = rows * tileHeight + Math.max(0, rows - 1) * spacing;
  const output = new PixelBuffer(width, height);

  for (let i = 0; i < tiles.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * (tileWidth + spacing);
    const oy = row * (tileHeight + spacing);
    const tile = tiles[i];

    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        output.setPixel(ox + x, oy + y, tile.getPixel(x, y));
      }
    }
  }

  return output;
}

export function renderTilemap(
  tilemap: TilemapData,
  tiles: PixelBuffer[],
  tileWidth: number,
  tileHeight: number,
  options?: { seed?: number; timeMs?: number; tileInfos?: TileInfo[] },
): PixelBuffer {
  const width = tilemap.width * tileWidth;
  const height = tilemap.height * tileHeight;
  const output = new PixelBuffer(width, height);

  for (let row = 0; row < tilemap.height; row++) {
    for (let col = 0; col < tilemap.width; col++) {
      const cell = tilemap.cells[row * tilemap.width + col];
      let tileIdx = cell.tileIndex;

      if (options?.tileInfos) {
        const info = options.tileInfos.find((t) => t.index === tileIdx);
        if (info) {
          if (info.variants && info.variants.length > 0 && options.seed !== undefined) {
            tileIdx = resolveVariant(info, col, row, options.seed);
          }
          if (info.animation && info.animation.frames.length > 0 && options.timeMs !== undefined) {
            tileIdx = resolveAnimatedTile(info, options.timeMs);
          }
        }
      }

      if (tileIdx < 0 || tileIdx >= tiles.length) continue;

      const tile = tiles[tileIdx];
      const ox = col * tileWidth;
      const oy = row * tileHeight;

      for (let y = 0; y < tileHeight; y++) {
        for (let x = 0; x < tileWidth; x++) {
          const sx = cell.flipH ? tileWidth - 1 - x : x;
          const sy = cell.flipV ? tileHeight - 1 - y : y;
          output.setPixel(ox + x, oy + y, tile.getPixel(sx, sy));
        }
      }
    }
  }

  return output;
}

/**
 * Resolve a tile variant using deterministic hash of position + seed.
 * Same position always returns same variant (no flickering on re-render).
 */
export function resolveVariant(
  tile: TileInfo,
  cellX: number,
  cellY: number,
  seed: number = 0,
): number {
  if (!tile.variants || tile.variants.length === 0) return tile.index;

  // All possible indices including the original
  const allIndices = [tile.index, ...tile.variants];

  // Deterministic hash: simple but effective
  const hash = ((cellX * 73856093) ^ (cellY * 19349663) ^ (seed * 83492791)) >>> 0;
  return allIndices[hash % allIndices.length];
}

/**
 * Resolve which tile frame to show for an animated tile at a given time.
 */
export function resolveAnimatedTile(tile: TileInfo, timeMs: number): number {
  if (!tile.animation || tile.animation.frames.length === 0) return tile.index;

  const { frames, duration } = tile.animation;
  const totalDuration = duration * frames.length;
  const elapsed = ((timeMs % totalDuration) + totalDuration) % totalDuration;
  const frameIndex = Math.floor(elapsed / duration);
  return frames[Math.min(frameIndex, frames.length - 1)];
}

export function generateTiledMetadata(
  tileset: TilesetData,
  imageFile: string,
  columns: number,
  spacing: number,
): object {
  const cols = Math.min(columns, tileset.tiles.length);
  const rows = Math.ceil(tileset.tiles.length / cols);
  const imageWidth = cols * tileset.tileWidth + Math.max(0, cols - 1) * spacing;
  const imageHeight = rows * tileset.tileHeight + Math.max(0, rows - 1) * spacing;

  return {
    name: tileset.name,
    tilewidth: tileset.tileWidth,
    tileheight: tileset.tileHeight,
    tilecount: tileset.tiles.length,
    columns: cols,
    spacing,
    image: imageFile,
    imagewidth: imageWidth,
    imageheight: imageHeight,
    type: 'tileset',
    tiledversion: '1.10',
    version: '1.10',
  };
}

// --- Tilemap Painting Tools ---

/**
 * Flood fill a tilemap from a starting cell, replacing matching terrain.
 * BFS-based, analogous to pixel flood fill but on tile cells.
 */
export function tilemapFloodFill(
  tilemap: TilemapData,
  startX: number,
  startY: number,
  fillTileIndex: number,
): TilemapData {
  const { width, height, cells } = tilemap;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return tilemap;
  }

  const newCells = cells.map((c) => ({ ...c }));
  const targetIdx = cells[startY * width + startX].tileIndex;
  if (targetIdx === fillTileIndex) return tilemap;

  const visited = new Uint8Array(width * height);
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  visited[startY * width + startX] = 1;

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    newCells[y * width + x] = { ...newCells[y * width + x], tileIndex: fillTileIndex };

    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];

    for (const n of neighbors) {
      if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue;
      const idx = n.y * width + n.x;
      if (visited[idx]) continue;
      if (cells[idx].tileIndex !== targetIdx) continue;
      visited[idx] = 1;
      queue.push(n);
    }
  }

  return {
    ...tilemap,
    cells: newCells,
    modified: new Date().toISOString(),
  };
}

/**
 * Paint tiles in a rectangular brush area centered on (cx, cy).
 */
export function tilemapBrushPaint(
  tilemap: TilemapData,
  cx: number,
  cy: number,
  brushSize: number,
  tileIndex: number,
): TilemapData {
  const { width, height, cells } = tilemap;
  const newCells = cells.map((c) => ({ ...c }));
  const half = Math.floor(brushSize / 2);

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      newCells[y * width + x] = { ...newCells[y * width + x], tileIndex };
    }
  }

  return {
    ...tilemap,
    cells: newCells,
    modified: new Date().toISOString(),
  };
}

/**
 * Erase tiles in a rectangular area (set to -1 = empty).
 */
export function tilemapErase(
  tilemap: TilemapData,
  cx: number,
  cy: number,
  brushSize: number,
): TilemapData {
  return tilemapBrushPaint(tilemap, cx, cy, brushSize, -1);
}

/**
 * Stamp a rectangular pattern of tiles at a position.
 */
export function tilemapStamp(
  tilemap: TilemapData,
  startX: number,
  startY: number,
  pattern: number[][],
): TilemapData {
  const { width, height, cells } = tilemap;
  const newCells = cells.map((c) => ({ ...c }));

  for (let py = 0; py < pattern.length; py++) {
    for (let px = 0; px < pattern[py].length; px++) {
      const x = startX + px;
      const y = startY + py;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      newCells[y * width + x] = { ...newCells[y * width + x], tileIndex: pattern[py][px] };
    }
  }

  return {
    ...tilemap,
    cells: newCells,
    modified: new Date().toISOString(),
  };
}
