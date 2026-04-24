import { Hono } from 'hono';
import {
  listAssetSpecs,
  readAssetSpec,
  parseAssetSpec,
  readCanvasJSON,
  renderFrames,
  scaleBuffer,
  sliceTiles,
  composeTilesetImage,
  buildTransitionTileset,
  encodePNG,
} from '@pixelcreator/core';
import type { AssetSpec, BiomeBlendAssetSpec, PixelBuffer } from '@pixelcreator/core';

export const assetRoutes = new Hono<{ Variables: { projectPath: string } }>();

interface AssetSummary {
  name: string;
  type: AssetSpec['type'] | 'unknown';
  valid: boolean;
  error?: string;
  // biome-blend extras
  sourceCanvas?: string;
  targetCanvas?: string;
  tileSize?: { width: number; height: number };
  blendMode?: string;
  blendStrength?: number;
  includeInverse?: boolean;
}

function summarize(name: string, spec: AssetSpec): AssetSummary {
  if (spec.type === 'biome-blend') {
    return {
      name,
      type: spec.type,
      valid: true,
      sourceCanvas: spec.source.canvas,
      targetCanvas: spec.target.canvas,
      tileSize: spec.tileSize,
      blendMode: spec.blend.mode,
      blendStrength: spec.blend.strength,
      includeInverse: spec.blend.includeInverse,
    };
  }
  return { name, type: spec.type, valid: true };
}

assetRoutes.get('/asset', (c) => {
  const projectPath = c.get('projectPath');
  const names = listAssetSpecs(projectPath);
  const assets: AssetSummary[] = names.map((name) => {
    try {
      const raw = readAssetSpec(projectPath, name);
      const { spec, errors } = parseAssetSpec(raw);
      if (!spec) {
        return { name, type: 'unknown', valid: false, error: errors.join('; ') };
      }
      return summarize(name, spec);
    } catch (err) {
      return { name, type: 'unknown', valid: false, error: String(err) };
    }
  });
  return c.json({ assets });
});

function extractRepresentativeTile(
  projectPath: string,
  canvasName: string,
  tw: number,
  th: number,
): PixelBuffer {
  const canvas = readCanvasJSON(projectPath, canvasName);
  const [rendered] = renderFrames(projectPath, canvasName, canvas, [0], 1);
  const { tiles } = sliceTiles(rendered, tw, th);
  return tiles[0];
}

assetRoutes.get('/asset/:name/biome-blend/preview.png', (c) => {
  const projectPath = c.get('projectPath');
  const name = c.req.param('name');
  const columnsQuery = c.req.query('columns');
  const scaleQuery = c.req.query('scale');

  let spec: BiomeBlendAssetSpec;
  try {
    const raw = readAssetSpec(projectPath, name);
    const parsed = parseAssetSpec(raw);
    if (!parsed.spec) {
      return c.json({ error: `Invalid asset spec: ${parsed.errors.join('; ')}` }, 400);
    }
    if (parsed.spec.type !== 'biome-blend') {
      return c.json(
        { error: `Asset "${name}" is type "${parsed.spec.type}", not biome-blend` },
        400,
      );
    }
    spec = parsed.spec;
  } catch (err) {
    return c.json({ error: String(err) }, 404);
  }

  const scale = scaleQuery ? Math.max(1, Math.min(8, parseInt(scaleQuery, 10) || 1)) : 1;
  const tw = spec.tileSize.width;
  const th = spec.tileSize.height;

  let srcTile: PixelBuffer;
  let tgtTile: PixelBuffer;
  try {
    srcTile = extractRepresentativeTile(projectPath, spec.source.canvas, tw, th);
    tgtTile = extractRepresentativeTile(projectPath, spec.target.canvas, tw, th);
  } catch (err) {
    return c.json({ error: `Failed to read source/target canvases: ${String(err)}` }, 500);
  }

  const tiles = buildTransitionTileset(srcTile, tgtTile, {
    mode: spec.blend.mode,
    strength: spec.blend.strength,
    includeInverse: spec.blend.includeInverse,
  });
  const scaled = scale > 1 ? tiles.map((t) => scaleBuffer(t, scale)) : tiles;
  const outTw = tw * scale;
  const outTh = th * scale;

  const defaultColumns = Math.min(tiles.length, 12);
  const columns = columnsQuery
    ? Math.max(1, Math.min(tiles.length, parseInt(columnsQuery, 10) || defaultColumns))
    : defaultColumns;

  const atlas = composeTilesetImage(scaled, outTw, outTh, { columns, spacing: 0 });
  const png = encodePNG(atlas);

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
  });
});
