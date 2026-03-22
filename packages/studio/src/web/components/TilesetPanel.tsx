import { useState, useEffect } from 'react';

interface TileInfo {
  id: string;
  index: number;
  hash: string;
  label?: string;
}

interface TilesetData {
  name: string;
  tileWidth: number;
  tileHeight: number;
  tiles: TileInfo[];
  tilemaps: { name: string }[];
}

interface TilesetPanelProps {
  tilesets: string[];
}

export function TilesetPanel({ tilesets }: TilesetPanelProps) {
  const [activeTileset, setActiveTileset] = useState<string | null>(tilesets[0] || null);
  const [tileset, setTileset] = useState<TilesetData | null>(null);
  const [selectedTile, setSelectedTile] = useState(0);

  useEffect(() => {
    if (!activeTileset) { setTileset(null); return; }
    fetch(`/api/tileset/${activeTileset}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setTileset)
      .catch(() => {});
  }, [activeTileset]);

  if (tilesets.length === 0) return null;

  return (
    <div className="tileset-panel">
      <div className="tileset-panel__header">
        <span>Tileset</span>
        <select
          value={activeTileset || ''}
          onChange={(e) => setActiveTileset(e.target.value || null)}
        >
          {tilesets.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {tileset && activeTileset && (
        <>
          <div className="tileset-panel__image">
            <img
              src={`/api/tileset/${activeTileset}/image?columns=8`}
              alt="Tileset"
              style={{ imageRendering: 'pixelated', maxWidth: '100%' }}
            />
          </div>
          <div className="tileset-panel__info">
            {tileset.tiles.length} tiles ({tileset.tileWidth}x{tileset.tileHeight})
            {tileset.tilemaps.length > 0 && ` | ${tileset.tilemaps.length} maps`}
          </div>
        </>
      )}
    </div>
  );
}
