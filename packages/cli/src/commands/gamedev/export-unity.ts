import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, exportToGameEngine, writeExportFiles, formatOutput, makeResult,
} from '@pixelcreator/core';
import type { GamedevExportOptions } from '@pixelcreator/core';

export default class GamedevExportUnity extends BaseCommand {
  static description = 'Export canvas as Unity-ready spritesheet with sprite metadata JSON';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Output directory for exported files',
      required: true,
    }),
    scale: Flags.integer({
      description: 'Scale factor (nearest-neighbor)',
      default: 1,
    }),
    'no-animations': Flags.boolean({
      description: 'Exclude animation data from export',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GamedevExportUnity);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const destDir = path.resolve(flags.dest);

    const options: GamedevExportOptions = {
      engine: 'unity',
      canvas: flags.canvas,
      includeAnimations: !flags['no-animations'],
      includeTileset: false,
      scale: flags.scale,
      outputDir: destDir,
    };

    const { files } = exportToGameEngine(projectPath, options);
    const written = writeExportFiles(destDir, files);

    const resultData = {
      canvas: flags.canvas,
      engine: 'unity',
      scale: flags.scale,
      includeAnimations: options.includeAnimations,
      dest: destDir,
      files: written,
      fileCount: written.length,
    };

    const cmdResult = makeResult(
      'gamedev:export-unity',
      { canvas: flags.canvas, dest: flags.dest, scale: flags.scale, 'no-animations': flags['no-animations'] },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Exported "${data.canvas}" for Unity (scale ${data.scale}x)`);
      this.log(`  Destination: ${data.dest}`);
      this.log(`  Animations: ${data.includeAnimations ? 'included' : 'excluded'}`);
      this.log(`  Files written:`);
      for (const f of data.files) {
        this.log(`    ${f}`);
      }
    });
  }
}
