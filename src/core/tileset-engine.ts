import { createHash } from 'node:crypto';
import { PixelBuffer } from '../io/png-codec.js';
import type { TilemapData, TilemapCell, TilesetData } from '../types/tileset.js';

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

export function deduplicateTiles(
  tiles: PixelBuffer[],
): { unique: PixelBuffer[]; hashes: string[]; indexMap: number[] } {
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
): PixelBuffer {
  const width = tilemap.width * tileWidth;
  const height = tilemap.height * tileHeight;
  const output = new PixelBuffer(width, height);

  for (let row = 0; row < tilemap.height; row++) {
    for (let col = 0; col < tilemap.width; col++) {
      const cell = tilemap.cells[row * tilemap.width + col];
      if (cell.tileIndex < 0 || cell.tileIndex >= tiles.length) continue;

      const tile = tiles[cell.tileIndex];
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
