import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  readCanvasJSON,
  writeAssetSpec,
  listAssetSpecs,
  formatOutput,
  makeResult,
  scaffoldAssetSpec,
} from '@pixelcreator/core';
import type { AssetSpec, AssetExportConfig } from '@pixelcreator/core';

export default class AssetInit extends BaseCommand {
  static description = 'Initialize an asset spec for a canvas (character spritesheet)';

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

    // Check if asset already exists
    const existing = listAssetSpecs(projectPath);
    if (existing.includes(flags.name) && !flags.force) {
      this.error(`Asset "${flags.name}" already exists. Use --force to overwrite.`);
    }

    // Read canvas to scaffold from
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    // Scaffold spec from canvas state
    const spec = scaffoldAssetSpec(flags.name, canvas);

    // Apply CLI overrides
    const exportConfig: AssetExportConfig = {
      ...spec.export,
      engine: flags.engine as AssetExportConfig['engine'],
      scale: flags.scale,
    };
    const finalSpec: AssetSpec = { ...spec, export: exportConfig };

    // Write to disk
    writeAssetSpec(projectPath, finalSpec);

    const resultData = {
      name: finalSpec.name,
      canvas: finalSpec.canvas,
      frameSize: finalSpec.frameSize,
      animations: finalSpec.animations.map((anim) => anim.name),
      engine: finalSpec.export.engine,
      path: `assets/${finalSpec.name}.asset.json`,
    };

    const cmdResult = makeResult(
      'asset:init',
      { name: flags.name, canvas: flags.canvas, engine: flags.engine, scale: flags.scale },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Asset spec "${data.name}" created`);
      this.log(`  Canvas: ${data.canvas} (${data.frameSize.width}x${data.frameSize.height})`);
      this.log(`  Animations: ${data.animations.join(', ')}`);
      this.log(`  Engine: ${data.engine}`);
      this.log(`  File: ${data.path}`);
      this.log('');
      this.log('Next steps:');
      this.log('  1. Edit the spec file to adjust animations, constraints, export settings');
      this.log('  2. Run `pxc asset:validate --name ' + data.name + '` to check');
      this.log('  3. Run `pxc asset:build --name ' + data.name + '` to export');
    });
  }
}
