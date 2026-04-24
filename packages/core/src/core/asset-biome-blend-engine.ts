import type {
  BiomeBlendAssetSpec,
  AssetValidationResult,
  AssetValidationIssue,
  AssetBuildResult,
} from '../types/asset.js';
import type { CanvasData } from '../types/canvas.js';
import { readCanvasJSON } from '../io/project-io.js';
import { renderFrames, scaleBuffer } from './frame-renderer.js';
import { sliceTiles, composeTilesetImage } from './tileset-engine.js';
import { buildTransitionTileset } from './terrain-blend-engine.js';
import { colorHistogram } from './color-analysis-engine.js';
import { PixelBuffer, encodePNG } from '../io/png-codec.js';

// --- Helpers ---

function checkCanvasDivisibility(
  canvas: CanvasData,
  label: 'source' | 'target',
  tw: number,
  th: number,
): AssetValidationIssue | null {
  if (canvas.width % tw !== 0 || canvas.height % th !== 0) {
    return {
      severity: 'error',
      field: 'tileSize',
      message: `${label} canvas "${canvas.name}" ${canvas.width}x${canvas.height} is not evenly divisible by tileSize ${tw}x${th}`,
    };
  }
  return null;
}

// --- Validation ---

export function validateBiomeBlendAssetSpec(
  spec: BiomeBlendAssetSpec,
  projectPath: string,
): AssetValidationResult {
  const issues: AssetValidationIssue[] = [];

  let sourceCanvas: CanvasData | null = null;
  try {
    sourceCanvas = readCanvasJSON(projectPath, spec.source.canvas);
  } catch {
    issues.push({
      severity: 'error',
      field: 'source.canvas',
      message: `Source canvas "${spec.source.canvas}" not found in project`,
    });
  }

  let targetCanvas: CanvasData | null = null;
  try {
    targetCanvas = readCanvasJSON(projectPath, spec.target.canvas);
  } catch {
    issues.push({
      severity: 'error',
      field: 'target.canvas',
      message: `Target canvas "${spec.target.canvas}" not found in project`,
    });
  }

  if (!sourceCanvas || !targetCanvas) {
    return { valid: false, asset: spec.name, issues };
  }

  if (sourceCanvas.frames.length === 0) {
    issues.push({
      severity: 'error',
      field: 'source.canvas',
      message: `Source canvas "${spec.source.canvas}" has no frames`,
    });
  }
  if (targetCanvas.frames.length === 0) {
    issues.push({
      severity: 'error',
      field: 'target.canvas',
      message: `Target canvas "${spec.target.canvas}" has no frames`,
    });
  }

  const { width: tw, height: th } = spec.tileSize;

  const srcIssue = checkCanvasDivisibility(sourceCanvas, 'source', tw, th);
  if (srcIssue) issues.push(srcIssue);
  const tgtIssue = checkCanvasDivisibility(targetCanvas, 'target', tw, th);
  if (tgtIssue) issues.push(tgtIssue);

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

  // Pixel-level checks only if grids are valid so far
  const canPixelCheck = !issues.some((i) => i.severity === 'error');
  if (canPixelCheck && spec.constraints.maxColors) {
    const limit = spec.constraints.maxColors;

    if (spec.blend.mode === 'alpha-mask') {
      // Alpha-mask mixes source/target, creating intermediate shades. Count
      // unique colors on the generated forward atlas so the hint reflects
      // the actual export — not just the input biomas.
      const srcTile = extractRepresentativeTile(
        projectPath,
        sourceCanvas,
        spec.tileSize.width,
        spec.tileSize.height,
        1,
      );
      const tgtTile = extractRepresentativeTile(
        projectPath,
        targetCanvas,
        spec.tileSize.width,
        spec.tileSize.height,
        1,
      );
      const forward = buildTransitionTileset(srcTile, tgtTile, {
        mode: spec.blend.mode,
        strength: spec.blend.strength,
        includeInverse: false,
      });
      const atlasColors = new Set<string>();
      for (const tile of forward) {
        for (const hex of colorHistogram(tile).keys()) atlasColors.add(hex);
      }
      if (atlasColors.size > limit) {
        issues.push({
          severity: 'error',
          field: 'constraints.maxColors',
          message:
            `Alpha-mask blend atlas uses ${atlasColors.size} unique colors but maxColors is ${limit} ` +
            `(excess: ${atlasColors.size - limit}). ` +
            `Reduce colors via 'pxc palette:generate --canvas ${spec.source.canvas} --name <palette> --max-colors ${limit}' ` +
            `(and likewise for "${spec.target.canvas}"), lower blend.strength, switch to blend.mode="dither", ` +
            `or raise constraints.maxColors in the spec.`,
        });
      }
    } else {
      const [srcRendered] = renderFrames(projectPath, spec.source.canvas, sourceCanvas, [0], 1);
      const [tgtRendered] = renderFrames(projectPath, spec.target.canvas, targetCanvas, [0], 1);

      const combined = new Set<string>();
      for (const hex of colorHistogram(srcRendered).keys()) combined.add(hex);
      for (const hex of colorHistogram(tgtRendered).keys()) combined.add(hex);

      if (combined.size > limit) {
        issues.push({
          severity: 'error',
          field: 'constraints.maxColors',
          message:
            `Combined source+target biomas use ${combined.size} unique colors but maxColors is ${limit} ` +
            `(excess: ${combined.size - limit}). ` +
            `Reduce colors via 'pxc palette:generate --canvas ${spec.source.canvas} --name <palette> --max-colors ${limit}' ` +
            `(and likewise for "${spec.target.canvas}") or raise constraints.maxColors in the spec.`,
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return { valid: !hasErrors, asset: spec.name, issues };
}

// --- Godot .tres emitter (Godot 4) ---

function buildGodotBlendTres(
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

// --- Build ---

/**
 * Render the top-left tile (index 0) from a canvas at the requested tile size.
 * Canvas dimensions must already be tile-divisible (checked in validation).
 */
function extractRepresentativeTile(
  projectPath: string,
  canvas: CanvasData,
  tw: number,
  th: number,
  scale: number,
): PixelBuffer {
  const [rendered] = renderFrames(projectPath, canvas.name, canvas, [0], 1);
  const scaled = scale > 1 ? scaleBuffer(rendered, scale) : rendered;
  const scaledTw = tw * scale;
  const scaledTh = th * scale;
  const { tiles } = sliceTiles(scaled, scaledTw, scaledTh);
  return tiles[0];
}

export function buildBiomeBlendAsset(
  spec: BiomeBlendAssetSpec,
  projectPath: string,
  _outputDir: string,
): AssetBuildResult {
  const validation = validateBiomeBlendAssetSpec(spec, projectPath);
  if (!validation.valid) {
    return { asset: spec.name, files: [], validation };
  }

  const sourceCanvas = readCanvasJSON(projectPath, spec.source.canvas);
  const targetCanvas = readCanvasJSON(projectPath, spec.target.canvas);

  const scale = spec.export.scale;
  const tw = spec.tileSize.width * scale;
  const th = spec.tileSize.height * scale;

  const sourceTile = extractRepresentativeTile(
    projectPath,
    sourceCanvas,
    spec.tileSize.width,
    spec.tileSize.height,
    scale,
  );
  const targetTile = extractRepresentativeTile(
    projectPath,
    targetCanvas,
    spec.tileSize.width,
    spec.tileSize.height,
    scale,
  );

  const transitionTiles = buildTransitionTileset(sourceTile, targetTile, {
    mode: spec.blend.mode,
    strength: spec.blend.strength,
    includeInverse: spec.blend.includeInverse,
  });

  const layoutColumns = spec.export.columns ?? Math.min(transitionTiles.length, 12);
  const atlas = composeTilesetImage(transitionTiles, tw, th, {
    columns: layoutColumns,
    spacing: spec.export.spacing,
  });

  const atlasFilename = `${spec.name}_blend.png`;
  const files: Array<{ name: string; content: string | Buffer }> = [
    { name: atlasFilename, content: Buffer.from(encodePNG(atlas)) },
  ];

  if (spec.export.engine === 'godot') {
    files.push({
      name: `${spec.name}.tres`,
      content: buildGodotBlendTres(atlasFilename, layoutColumns, transitionTiles.length, tw, th),
    });
  } else {
    const metadata = {
      generator: 'PixelCreator',
      version: '2.0.0',
      type: 'biome-blend',
      name: spec.name,
      source: spec.source.canvas,
      target: spec.target.canvas,
      tileSize: { width: tw, height: th },
      tileCount: transitionTiles.length,
      columns: layoutColumns,
      spacing: spec.export.spacing,
      blend: spec.blend,
      atlas: atlasFilename,
    };
    files.push({
      name: `${spec.name}.blend.json`,
      content: JSON.stringify(metadata, null, 2),
    });
  }

  files.push({
    name: `${spec.name}.asset.json`,
    content: JSON.stringify(spec, null, 2),
  });

  return { asset: spec.name, files, validation };
}

// --- Scaffold ---

export function scaffoldBiomeBlendAssetSpec(
  name: string,
  sourceCanvas: string,
  targetCanvas: string,
  tileSize: { width: number; height: number },
): BiomeBlendAssetSpec {
  return {
    name,
    type: 'biome-blend',
    tileSize,
    source: { canvas: sourceCanvas },
    target: { canvas: targetCanvas },
    blend: {
      mode: 'dither',
      strength: 0.5,
      includeInverse: false,
    },
    export: {
      engine: 'generic',
      scale: 1,
      spacing: 0,
    },
    constraints: {},
  };
}
