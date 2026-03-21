export interface TileInfo {
  id: string;
  index: number;
  hash: string;
  label?: string;
  properties?: Record<string, string | number | boolean>;
}

export interface TilemapCell {
  tileIndex: number;
  flipH?: boolean;
  flipV?: boolean;
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
  created: string;
  modified: string;
}
