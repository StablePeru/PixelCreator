import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, readCanvasJSON, extractFrameMetadata, extractAnimations,
  exportUnitySpriteSheet, formatOutput, makeResult,
} from '@pixelcreator/core';

export default class GamedevUnitySpritesheet extends BaseCommand {
  static description = 'Generate a Unity sprite sheet JSON descriptor for a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination .json file path',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GamedevUnitySpritesheet);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (canvas.frames.length === 0) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const frameMetadata = extractFrameMetadata(canvas, canvas.width, canvas.height);
    const animations = extractAnimations(canvas, frameMetadata);
    const sheetFilename = `${flags.canvas}_sheet.png`;
    const unityData = exportUnitySpriteSheet(flags.canvas, sheetFilename, frameMetadata, animations);

    const destPath = path.resolve(flags.dest);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(destPath, JSON.stringify(unityData, null, 2), 'utf-8');

    const resultData = {
      canvas: flags.canvas,
      dest: destPath,
      spriteCount: unityData.sprites.length,
      animationCount: unityData.animations.length,
      animations: unityData.animations.map(a => a.name),
    };

    const cmdResult = makeResult(
      'gamedev:unity-spritesheet',
      { canvas: flags.canvas, dest: flags.dest },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Generated Unity sprite sheet: ${data.dest}`);
      this.log(`  Sprites: ${data.spriteCount}`);
      this.log(`  Animations: ${data.animations.join(', ')}`);
    });
  }
}
