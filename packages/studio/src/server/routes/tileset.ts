import * as fs from 'node:fs';
import * as path from 'node:path';
import { Hono } from 'hono';
import {
  readProjectJSON,
  writeProjectJSON,
  readTilesetJSON,
  writeTilesetJSON,
  readCanvasJSON,
  readLayerFrame,
  flattenLayers,
  sliceTiles,
  deduplicateTiles,
  composeTilesetImage,
  renderTilemap,
  encodePNG,
  savePNG,
  loadPNG,
  generateSequentialId,
} from '@pixelcreator/core';
import type { TilesetData, TilemapData, TilemapCell, LayerWithBuffer } from '@pixelcreator/core';

export const tilesetRoutes = new Hono<{ Variables: { projectPath: string } }>();

tilesetRoutes.get('/tileset/:name', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  try {
    const tileset = readTilesetJSON(projectPath, name);
    return c.json(tileset);
  } catch {
    return c.json({ error: `Tileset "${name}" not found` }, 404);
  }
});

tilesetRoutes.post('/tileset', async (c) => {
  const projectPath = c.get('projectPath');
  const body = await c.req.json();
  const { name, canvas: canvasName, tileWidth, tileHeight } = body as {
    name: string; canvas: string; tileWidth: number; tileHeight: number;
  };

  if (!name || !canvasName || !tileWidth || !tileHeight) {
    return c.json({ error: 'name, canvas, tileWidth, tileHeight required' }, 400);
  }

  try {
    const project = readProjectJSON(projectPath);
    if (project.tilesets.includes(name)) {
      return c.json({ error: `Tileset "${name}" already exists` }, 409);
    }

    // Flatten canvas to get source image
    const canvasData = readCanvasJSON(projectPath, canvasName);
    const frame = canvasData.frames[0];
    const layers: LayerWithBuffer[] = canvasData.layers
      .filter((l) => l.visible)
      .map((l) => ({ info: l, buffer: readLayerFrame(projectPath, canvasName, l.id, frame.id) }));
    const source = flattenLayers(layers, canvasData.width, canvasData.height);

    // Slice and deduplicate
    const { tiles: rawTiles } = sliceTiles(source, tileWidth, tileHeight);
    const { unique, hashes, indexMap } = deduplicateTiles(rawTiles);

    const now = new Date().toISOString();
    const tileset: TilesetData = {
      name,
      tileWidth,
      tileHeight,
      source: { canvas: canvasName },
      tiles: unique.map((buf, i) => ({
        id: generateSequentialId('tile', i + 1),
        index: i,
        hash: hashes[i],
      })),
      tilemaps: [],
      created: now,
      modified: now,
    };

    // Save tile PNGs
    const tilesDir = path.join(projectPath, 'tilesets', name, 'tiles');
    fs.mkdirSync(tilesDir, { recursive: true });
    for (let ti = 0; ti < unique.length; ti++) {
      const tilePath = path.join(tilesDir, `${hashes[ti]}.png`);
      savePNG(unique[ti], tilePath);
    }

    writeTilesetJSON(projectPath, name, tileset);
    project.tilesets.push(name);
    writeProjectJSON(projectPath, project);

    return c.json(tileset, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

tilesetRoutes.delete('/tileset/:name', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  try {
    const project = readProjectJSON(projectPath);
    const idx = project.tilesets.indexOf(name);
    if (idx === -1) return c.json({ error: `Tileset "${name}" not found` }, 404);

    const dir = path.join(projectPath, 'tilesets', name);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });

    const jsonPath = path.join(projectPath, 'tilesets', `${name}.tileset.json`);
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);

    project.tilesets.splice(idx, 1);
    writeProjectJSON(projectPath, project);
    return c.json({ success: true, deleted: name });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

tilesetRoutes.put('/tileset/:name/tile/:id/props', async (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const tileId = c.req.param('id');
  const body = await c.req.json();
  const { properties } = body as { properties: Record<string, string | number | boolean> };

  try {
    const tileset = readTilesetJSON(projectPath, name);
    const tile = tileset.tiles.find((t) => t.id === tileId);
    if (!tile) return c.json({ error: `Tile "${tileId}" not found` }, 404);

    tile.properties = properties;
    writeTilesetJSON(projectPath, name, tileset);
    return c.json(tile);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

tilesetRoutes.get('/tileset/:name/image', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const columns = parseInt(c.req.query('columns') || '8', 10);

  try {
    const tileset = readTilesetJSON(projectPath, name);
    const tilesDir = path.join(projectPath, 'tilesets', name, 'tiles');
    const tileBuffers = tileset.tiles.map((t) => loadPNG(path.join(tilesDir, `${t.hash}.png`)));
    const image = composeTilesetImage(tileBuffers, tileset.tileWidth, tileset.tileHeight, { columns, spacing: 0 });
    const png = encodePNG(image);

    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Tilemap endpoints
tilesetRoutes.post('/tileset/:name/tilemap', async (c) => {
  const projectPath = c.get('projectPath');
  const tilesetName = c.req.param('name');
  const body = await c.req.json();
  const { name: mapName, width, height } = body as { name: string; width: number; height: number };

  try {
    const tileset = readTilesetJSON(projectPath, tilesetName);
    if (tileset.tilemaps.some((t) => t.name === mapName)) {
      return c.json({ error: `Tilemap "${mapName}" already exists` }, 409);
    }

    const now = new Date().toISOString();
    const tilemap: TilemapData = {
      name: mapName,
      width,
      height,
      cells: Array.from({ length: width * height }, () => ({ tileIndex: -1 })),
      created: now,
      modified: now,
    };

    tileset.tilemaps.push(tilemap);
    writeTilesetJSON(projectPath, tilesetName, tileset);
    return c.json(tilemap, 201);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

tilesetRoutes.put('/tileset/:name/tilemap/:mapName/cell', async (c) => {
  const projectPath = c.get('projectPath');
  const tilesetName = c.req.param('name');
  const mapName = c.req.param('mapName');
  const body = await c.req.json();
  const { x, y, tileIndex, flipH, flipV } = body as {
    x: number; y: number; tileIndex: number; flipH?: boolean; flipV?: boolean;
  };

  try {
    const tileset = readTilesetJSON(projectPath, tilesetName);
    const tilemap = tileset.tilemaps.find((t) => t.name === mapName);
    if (!tilemap) return c.json({ error: `Tilemap "${mapName}" not found` }, 404);

    const idx = y * tilemap.width + x;
    if (idx < 0 || idx >= tilemap.cells.length) return c.json({ error: 'Cell out of bounds' }, 400);

    tilemap.cells[idx] = { tileIndex, flipH, flipV };
    tilemap.modified = new Date().toISOString();
    writeTilesetJSON(projectPath, tilesetName, tileset);

    return c.json({ success: true, x, y, tileIndex });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

tilesetRoutes.get('/tileset/:name/tilemap/:mapName/render', (c) => {
  const projectPath = c.get('projectPath');
  const tilesetName = c.req.param('name');
  const mapName = c.req.param('mapName');

  try {
    const tileset = readTilesetJSON(projectPath, tilesetName);
    const tilemap = tileset.tilemaps.find((t) => t.name === mapName);
    if (!tilemap) return c.json({ error: `Tilemap "${mapName}" not found` }, 404);

    const tilesDir = path.join(projectPath, 'tilesets', tilesetName, 'tiles');
    const { loadPNG } = require('@pixelcreator/core') as typeof import('@pixelcreator/core');
    const tileBuffers = tileset.tiles.map((t) => loadPNG(path.join(tilesDir, `${t.hash}.png`)));

    const rendered = renderTilemap(tilemap, tileBuffers, tileset.tileWidth, tileset.tileHeight);
    const png = encodePNG(rendered);

    return new Response(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

tilesetRoutes.delete('/tileset/:name/tilemap/:mapName', (c) => {
  const projectPath = c.get('projectPath');
  const tilesetName = c.req.param('name');
  const mapName = c.req.param('mapName');

  try {
    const tileset = readTilesetJSON(projectPath, tilesetName);
    const idx = tileset.tilemaps.findIndex((t) => t.name === mapName);
    if (idx === -1) return c.json({ error: `Tilemap "${mapName}" not found` }, 404);

    tileset.tilemaps.splice(idx, 1);
    writeTilesetJSON(projectPath, tilesetName, tileset);
    return c.json({ success: true, deleted: mapName });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
