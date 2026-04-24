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
} from '@pixelcreator/core';
import type { AssetSpec, AssetExportConfig, TilesetAssetExportConfig } from '@pixelcreator/core';

type AssetTypeFlag = 'character-spritesheet' | 'tileset';
type CharacterEngineFlag = 'godot' | 'unity' | 'generic';
type TilesetEngineFlag = 'godot' | 'generic';

export default class AssetInit extends BaseCommand {
  static description = 'Initialize an asset spec for a canvas (character-spritesheet or tileset)';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Asset name (lowercase, alphanumeric with hyphens/underscores)',
      required: true,
    }),
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name to base the asset on',
      required: true,
    }),
    type: Flags.string({
      description: 'Asset type',
      options: ['character-spritesheet', 'tileset'],
      default: 'character-spritesheet',
    }),
    'tile-size': Flags.string({
      description:
        'Tile size for tileset assets as WxH (e.g. 16x16). Required when --type=tileset.',
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

    // Read canvas to scaffold from
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    let finalSpec: AssetSpec;

    if (assetType === 'tileset') {
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

      const base = scaffoldTilesetAssetSpec(flags.name, canvas, tileSize);
      const exportConfig: TilesetAssetExportConfig = {
        ...base.export,
        engine: flags.engine as TilesetEngineFlag,
        scale: flags.scale,
      };
      finalSpec = { ...base, export: exportConfig };
    } else {
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

    const summary =
      finalSpec.type === 'tileset'
        ? {
            type: finalSpec.type,
            name: finalSpec.name,
            canvas: finalSpec.canvas,
            tileSize: finalSpec.tileSize,
            engine: finalSpec.export.engine,
            path: `assets/${finalSpec.name}.asset.json`,
          }
        : {
            type: finalSpec.type,
            name: finalSpec.name,
            canvas: finalSpec.canvas,
            frameSize: finalSpec.frameSize,
            animations: finalSpec.animations.map((anim) => anim.name),
            engine: finalSpec.export.engine,
            path: `assets/${finalSpec.name}.asset.json`,
          };

    const cmdResult = makeResult(
      'asset:init',
      {
        name: flags.name,
        canvas: flags.canvas,
        type: assetType,
        tileSize: flags['tile-size'],
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

function parseTileSize(raw: string): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(raw.trim());
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width < 1 || height < 1) return null;
  return { width, height };
}
