export interface TileAnimation {
  frames: number[];
  duration: number;
}

export interface TileInfo {
  id: string;
  index: number;
  hash: string;
  label?: string;
  properties?: Record<string, string | number | boolean>;
  variants?: number[];
  animation?: TileAnimation;
}

export interface TilemapCell {
  tileIndex: number;
  flipH?: boolean;
  flipV?: boolean;
  terrainId?: number;
}

export interface TilemapData {
  name: string;
  width: number;
  height: number;
  cells: TilemapCell[];
  created: string;
  modified: string;
}

export interface TilesetData {
  name: string;
  tileWidth: number;
  tileHeight: number;
  source?: { canvas?: string; file?: string };
  tiles: TileInfo[];
  tilemaps: TilemapData[];
  autoTile?: AutoTileConfig[];
  created: string;
  modified: string;
}

export type AutoTileType = 'wang-16' | 'blob-47';

export interface AutoTileConfig {
  type: AutoTileType;
  terrainId: number;
  tileMapping: Record<number, number>;
}

export interface TileVariant {
  tileIndices: number[];
  weight?: number[];
}
