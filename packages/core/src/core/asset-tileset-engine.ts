import type {
  TilesetAssetSpec,
  AssetValidationResult,
  AssetValidationIssue,
  AssetBuildResult,
} from '../types/asset.js';
import type { CanvasData } from '../types/canvas.js';
import { readCanvasJSON } from '../io/project-io.js';
import { renderFrames, scaleBuffer } from './frame-renderer.js';
import { sliceTiles, deduplicateTiles, composeTilesetImage } from './tileset-engine.js';
import { colorHistogram } from './color-analysis-engine.js';
import { PixelBuffer, encodePNG } from '../io/png-codec.js';

// --- Validation ---

export function validateTilesetAssetSpec(
  spec: TilesetAssetSpec,
  projectPath: string,
): AssetValidationResult {
  const issues: AssetValidationIssue[] = [];

  let canvas: CanvasData | null = null;
  try {
    canvas = readCanvasJSON(projectPath, spec.canvas);
  } catch {
    issues.push({
      severity: 'error',
      field: 'canvas',
      message: `Canvas "${spec.canvas}" not found in project`,
    });
    return { valid: false, asset: spec.name, issues };
  }

  if (canvas.frames.length === 0) {
    issues.push({
      severity: 'error',
      field: 'canvas',
      message: `Canvas "${spec.canvas}" has no frames`,
    });
    return { valid: false, asset: spec.name, issues };
  }

  const { width: tw, height: th } = spec.tileSize;

  // Canvas must tile evenly
  if (canvas.width % tw !== 0 || canvas.height % th !== 0) {
    issues.push({
      severity: 'error',
      field: 'tileSize',
      message: `Canvas ${canvas.width}x${canvas.height} is not evenly divisible by tileSize ${tw}x${th}`,
    });
  }

  // tileSizeMultipleOf constraint
  if (spec.constraints.tileSizeMultipleOf) {
    const m = spec.constraints.tileSizeMultipleOf;
    if (tw % m !== 0 || th % m !== 0) {
      issues.push({
        severity: 'error',
        field: 'constraints.tileSizeMultipleOf',
        message: `Tile size ${tw}x${th} is not a multiple of ${m}`,
      });
    }
  }

  // If grid is valid, do pixel-level checks
  if (canvas.width % tw === 0 && canvas.height % th === 0) {
    const [rendered] = renderFrames(projectPath, spec.canvas, canvas, [0], 1);
    const columns = canvas.width / tw;
    const rows = canvas.height / th;
    const totalTiles = columns * rows;

    // maxColors constraint (pixel-level histogram across the whole tileset image)
    if (spec.constraints.maxColors) {
      const histogram = colorHistogram(rendered);
      const limit = spec.constraints.maxColors;
      if (histogram.size > limit) {
        issues.push({
          severity: 'error',
          field: 'constraints.maxColors',
          message:
            `Tileset uses ${histogram.size} unique colors but maxColors is ${limit} ` +
            `(excess: ${histogram.size - limit}). ` +
            `Reduce colors via 'pxc palette:generate --canvas ${spec.canvas} --name <palette> --max-colors ${limit}' ` +
            `or raise constraints.maxColors in the spec.`,
        });
      }
    }

    // requireAllTilesUnique: slice + dedupe must have size == total
    if (spec.constraints.requireAllTilesUnique) {
      const { tiles } = sliceTiles(rendered, tw, th);
      const { unique } = deduplicateTiles(tiles);
      if (unique.length < tiles.length) {
        const duplicates = tiles.length - unique.length;
        issues.push({
          severity: 'error',
          field: 'constraints.requireAllTilesUnique',
          message: `Tileset has ${duplicates} duplicate tile${duplicates === 1 ? '' : 's'} (${unique.length} unique out of ${tiles.length}). Disable requireAllTilesUnique or remove duplicates.`,
        });
      }
    }

    // Tile metadata indices must be in range
    if (spec.tiles) {
      for (const meta of spec.tiles) {
        if (meta.index < 0 || meta.index >= totalTiles) {
          issues.push({
            severity: 'error',
            field: 'tiles',
            message: `Tile metadata references index ${meta.index} but tileset only has ${totalTiles} tiles (0-${totalTiles - 1})`,
          });
        }
      }
      // Warn on duplicate metadata indices
      const seen = new Set<number>();
      for (const meta of spec.tiles) {
        if (seen.has(meta.index)) {
          issues.push({
            severity: 'warning',
            field: 'tiles',
            message: `Duplicate metadata entries for tile index ${meta.index}`,
          });
        }
        seen.add(meta.index);
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return { valid: !hasErrors, asset: spec.name, issues };
}

// --- Godot TileSet .tres generation (Godot 4 format) ---

function buildGodotTilesetTres(
  spec: TilesetAssetSpec,
  atlasFilename: string,
  layoutColumns: number,
  tileCount: number,
  tileWidth: number,
  tileHeight: number,
): string {
  const lines: string[] = [];
  lines.push('[gd_resource type="TileSet" format=3 load_steps=3]');
  lines.push('');
  lines.push(`[ext_resource type="Texture2D" path="res://${atlasFilename}" id="1_atlas"]`);
  lines.push('');
  lines.push('[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_1"]');
  lines.push('texture = ExtResource("1_atlas")');
  lines.push(`texture_region_size = Vector2i(${tileWidth}, ${tileHeight})`);

  // Declare every tile cell in the atlas as present
  for (let i = 0; i < tileCount; i++) {
    const col = i % layoutColumns;
    const row = Math.floor(i / layoutColumns);
    lines.push(`${col}:${row}/0 = 0`);
  }

  lines.push('');
  lines.push('[resource]');
  lines.push(`tile_size = Vector2i(${tileWidth}, ${tileHeight})`);
  lines.push('sources/0 = SubResource("TileSetAtlasSource_1")');

  return lines.join('\n');
}

// --- Build Pipeline ---

export function buildTilesetAsset(
  spec: TilesetAssetSpec,
  projectPath: string,
  _outputDir: string,
): AssetBuildResult {
  const validation = validateTilesetAssetSpec(spec, projectPath);
  if (!validation.valid) {
    return { asset: spec.name, files: [], validation };
  }

  const canvas = readCanvasJSON(projectPath, spec.canvas);
  const [rendered] = renderFrames(projectPath, spec.canvas, canvas, [0], 1);

  const scale = spec.export.scale;
  const sourceBuffer = scale > 1 ? scaleBuffer(rendered, scale) : rendered;
  const tw = spec.tileSize.width * scale;
  const th = spec.tileSize.height * scale;
  const { tiles, columns } = sliceTiles(sourceBuffer, tw, th);

  const layoutColumns = spec.export.columns ?? columns;
  const atlas = composeTilesetImage(tiles, tw, th, {
    columns: layoutColumns,
    spacing: spec.export.spacing,
  });

  const atlasFilename = `${spec.name}_tileset.png`;
  const files: Array<{ name: string; content: string | Buffer }> = [
    { name: atlasFilename, content: Buffer.from(encodePNG(atlas)) },
  ];

  if (spec.export.engine === 'godot') {
    files.push({
      name: `${spec.name}.tres`,
      content: buildGodotTilesetTres(spec, atlasFilename, layoutColumns, tiles.length, tw, th),
    });
  } else {
    // Generic: a metadata JSON describing the atlas
    const metadata = {
      generator: 'PixelCreator',
      version: '2.0.0',
      type: 'tileset',
      name: spec.name,
      canvas: spec.canvas,
      tileSize: { width: tw, height: th },
      tileCount: tiles.length,
      columns: layoutColumns,
      spacing: spec.export.spacing,
      atlas: atlasFilename,
      tiles: spec.tiles ?? [],
    };
    files.push({
      name: `${spec.name}.tileset.json`,
      content: JSON.stringify(metadata, null, 2),
    });
  }

  // Embed the spec for reproducibility (matches character-spritesheet slice)
  files.push({
    name: `${spec.name}.asset.json`,
    content: JSON.stringify(spec, null, 2),
  });

  return { asset: spec.name, files, validation };
}

// --- Scaffold ---

export function scaffoldTilesetAssetSpec(
  name: string,
  canvas: CanvasData,
  tileSize: { width: number; height: number },
): TilesetAssetSpec {
  return {
    name,
    type: 'tileset',
    canvas: canvas.name,
    tileSize,
    export: {
      engine: 'generic',
      scale: 1,
      spacing: 0,
    },
    constraints: {
      requireAllTilesUnique: false,
    },
  };
}
