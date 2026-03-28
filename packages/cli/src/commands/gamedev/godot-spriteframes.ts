import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath, readCanvasJSON, extractFrameMetadata, extractAnimations,
  exportGodotSpriteFrames, formatOutput, makeResult,
} from '@pixelcreator/core';

export default class GamedevGodotSpriteframes extends BaseCommand {
  static description = 'Generate a Godot .tres SpriteFrames resource for a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination .tres file path',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(GamedevGodotSpriteframes);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (canvas.frames.length === 0) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const frameMetadata = extractFrameMetadata(canvas, canvas.width, canvas.height);
    const animations = extractAnimations(canvas, frameMetadata);
    const sheetFilename = `${flags.canvas}_sheet.png`;
    const tresContent = exportGodotSpriteFrames(sheetFilename, animations);

    const destPath = path.resolve(flags.dest);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.writeFileSync(destPath, tresContent, 'utf-8');

    const resultData = {
      canvas: flags.canvas,
      dest: destPath,
      frameCount: canvas.frames.length,
      animationCount: animations.length,
      animations: animations.map(a => a.name),
    };

    const cmdResult = makeResult(
      'gamedev:godot-spriteframes',
      { canvas: flags.canvas, dest: flags.dest },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Generated Godot SpriteFrames: ${data.dest}`);
      this.log(`  Frames: ${data.frameCount}`);
      this.log(`  Animations: ${data.animations.join(', ')}`);
    });
  }
}
