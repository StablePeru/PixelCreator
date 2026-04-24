import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeAssetSpec,
  listAssetSpecs,
  formatOutput,
  makeResult,
  scaffoldAssetSpec,
  scaffoldTilesetAssetSpec,
  scaffoldBiomeBlendAssetSpec,
} from '@pixelcreator/core';
import type {
  AssetSpec,
  AssetExportConfig,
  TilesetAssetExportConfig,
  BiomeBlendExportConfig,
  BiomeBlendMode,
} from '@pixelcreator/core';

type AssetTypeFlag = 'character-spritesheet' | 'tileset' | 'biome-blend';
type CharacterEngineFlag = 'godot' | 'unity' | 'generic';
type TilesetEngineFlag = 'godot' | 'generic';

export default class AssetInit extends BaseCommand {
  static description =
    'Initialize an asset spec for a canvas (character-spritesheet, tileset, or biome-blend)';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Asset name (lowercase, alphanumeric with hyphens/underscores)',
      required: true,
    }),
    canvas: Flags.string({
      char: 'c',
      description:
        'Canvas name to base the asset on (required for character-spritesheet and tileset)',
    }),
    type: Flags.string({
      description: 'Asset type',
      options: ['character-spritesheet', 'tileset', 'biome-blend'],
      default: 'character-spritesheet',
    }),
    'tile-size': Flags.string({
      description:
        'Tile size as WxH (e.g. 16x16). Required when --type=tileset or --type=biome-blend.',
    }),
    'source-canvas': Flags.string({
      description: 'Source bioma canvas name (required when --type=biome-blend)',
    }),
    'target-canvas': Flags.string({
      description: 'Target bioma canvas name (required when --type=biome-blend)',
    }),
    'blend-mode': Flags.string({
      description: 'Blend algorithm (biome-blend only)',
      options: ['dither'],
      default: 'dither',
    }),
    strength: Flags.string({
      description: 'Blend strength in [0, 1] (biome-blend only)',
      default: '0.5',
    }),
    'include-inverse': Flags.boolean({
      description: 'Also emit the 47 inverse transition tiles (biome-blend only)',
      default: false,
    }),
    engine: Flags.string({
      description: 'Target game engine',
      options: ['godot', 'unity', 'generic'],
      default: 'generic',
    }),
    scale: Flags.integer({
      description: 'Export scale factor (1-8)',
      default: 1,
    }),
    force: Flags.boolean({
      description: 'Overwrite existing asset spec',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AssetInit);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const assetType = flags.type as AssetTypeFlag;

    // Check if asset already exists
    const existing = listAssetSpecs(projectPath);
    if (existing.includes(flags.name) && !flags.force) {
      this.error(`Asset "${flags.name}" already exists. Use --force to overwrite.`);
    }

    let finalSpec: AssetSpec;

    if (assetType === 'tileset') {
      if (!flags.canvas) {
        this.error('--canvas is required for --type=tileset');
      }
      if (!flags['tile-size']) {
        this.error('--tile-size is required for --type=tileset (e.g. --tile-size 16x16)');
      }
      const tileSize = parseTileSize(flags['tile-size']!);
      if (!tileSize) {
        this.error(
          `Invalid --tile-size "${flags['tile-size']}" — expected format WxH with integers (e.g. 16x16)`,
        );
      }
      if (flags.engine === 'unity') {
        this.error('Tileset export to Unity is not yet supported. Use --engine=godot or generic.');
      }

      const canvas = readCanvasJSON(projectPath, flags.canvas!);
      const base = scaffoldTilesetAssetSpec(flags.name, canvas, tileSize);
      const exportConfig: TilesetAssetExportConfig = {
        ...base.export,
        engine: flags.engine as TilesetEngineFlag,
        scale: flags.scale,
      };
      finalSpec = { ...base, export: exportConfig };
    } else if (assetType === 'biome-blend') {
      if (!flags['source-canvas'] || !flags['target-canvas']) {
        this.error('--source-canvas and --target-canvas are required for --type=biome-blend');
      }
      if (!flags['tile-size']) {
        this.error('--tile-size is required for --type=biome-blend (e.g. --tile-size 16x16)');
      }
      const tileSize = parseTileSize(flags['tile-size']!);
      if (!tileSize) {
        this.error(
          `Invalid --tile-size "${flags['tile-size']}" — expected format WxH with integers (e.g. 16x16)`,
        );
      }
      if (flags.engine === 'unity') {
        this.error(
          'biome-blend export to Unity is not yet supported. Use --engine=godot or generic.',
        );
      }

      const strength = parseStrength(flags.strength);
      if (strength === null) {
        this.error(`Invalid --strength "${flags.strength}" — expected number in [0, 1]`);
      }

      // Ensure both canvases exist — surface the error early rather than at validate.
      readCanvasJSON(projectPath, flags['source-canvas']!);
      readCanvasJSON(projectPath, flags['target-canvas']!);

      const base = scaffoldBiomeBlendAssetSpec(
        flags.name,
        flags['source-canvas']!,
        flags['target-canvas']!,
        tileSize,
      );
      const exportConfig: BiomeBlendExportConfig = {
        ...base.export,
        engine: flags.engine as TilesetEngineFlag,
        scale: flags.scale,
      };
      finalSpec = {
        ...base,
        blend: {
          mode: flags['blend-mode'] as BiomeBlendMode,
          strength: strength as number,
          includeInverse: flags['include-inverse'],
        },
        export: exportConfig,
      };
    } else {
      if (!flags.canvas) {
        this.error('--canvas is required for --type=character-spritesheet');
      }
      const canvas = readCanvasJSON(projectPath, flags.canvas!);
      const base = scaffoldAssetSpec(flags.name, canvas);
      const exportConfig: AssetExportConfig = {
        ...base.export,
        engine: flags.engine as CharacterEngineFlag,
        scale: flags.scale,
      };
      finalSpec = { ...base, export: exportConfig };
    }

    // Write to disk
    writeAssetSpec(projectPath, finalSpec);

    const summary = buildSummary(finalSpec);

    const cmdResult = makeResult(
      'asset:init',
      {
        name: flags.name,
        canvas: flags.canvas ?? null,
        sourceCanvas: flags['source-canvas'] ?? null,
        targetCanvas: flags['target-canvas'] ?? null,
        type: assetType,
        tileSize: flags['tile-size'] ?? null,
        engine: flags.engine,
        scale: flags.scale,
      },
      summary,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Asset spec "${data.name}" created [${data.type}]`);
      if (data.type === 'tileset') {
        this.log(
          `  Canvas: ${data.canvas}  (tile ${data.tileSize!.width}x${data.tileSize!.height})`,
        );
      } else if (data.type === 'biome-blend') {
        this.log(
          `  Source: ${data.sourceCanvas}  Target: ${data.targetCanvas}  (tile ${data.tileSize!.width}x${data.tileSize!.height})`,
        );
        this.log(
          `  Blend: ${data.blendMode} strength=${data.blendStrength} includeInverse=${data.includeInverse}`,
        );
      } else {
        this.log(
          `  Canvas: ${data.canvas}  (frame ${data.frameSize!.width}x${data.frameSize!.height})`,
        );
        this.log(`  Animations: ${data.animations!.join(', ')}`);
      }
      this.log(`  Engine: ${data.engine}`);
      this.log(`  File: ${data.path}`);
      this.log('');
      this.log('Next steps:');
      this.log('  1. Edit the spec file to adjust constraints or export settings');
      this.log(`  2. Run \`pxc asset:validate --name ${data.name}\` to check`);
      this.log(`  3. Run \`pxc asset:build --name ${data.name}\` to export`);
    });
  }
}

interface AssetInitSummary {
  type: AssetTypeFlag;
  name: string;
  canvas?: string;
  sourceCanvas?: string;
  targetCanvas?: string;
  tileSize?: { width: number; height: number };
  frameSize?: { width: number; height: number };
  animations?: string[];
  blendMode?: string;
  blendStrength?: number;
  includeInverse?: boolean;
  engine: string;
  path: string;
}

function buildSummary(spec: AssetSpec): AssetInitSummary {
  if (spec.type === 'tileset') {
    return {
      type: spec.type,
      name: spec.name,
      canvas: spec.canvas,
      tileSize: spec.tileSize,
      engine: spec.export.engine,
      path: `assets/${spec.name}.asset.json`,
    };
  }
  if (spec.type === 'biome-blend') {
    return {
      type: spec.type,
      name: spec.name,
      sourceCanvas: spec.source.canvas,
      targetCanvas: spec.target.canvas,
      tileSize: spec.tileSize,
      blendMode: spec.blend.mode,
      blendStrength: spec.blend.strength,
      includeInverse: spec.blend.includeInverse,
      engine: spec.export.engine,
      path: `assets/${spec.name}.asset.json`,
    };
  }
  return {
    type: spec.type,
    name: spec.name,
    canvas: spec.canvas,
    frameSize: spec.frameSize,
    animations: spec.animations.map((anim) => anim.name),
    engine: spec.export.engine,
    path: `assets/${spec.name}.asset.json`,
  };
}

function parseTileSize(raw: string): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(raw.trim());
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width < 1 || height < 1) return null;
  return { width, height };
}

function parseStrength(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return n;
}
