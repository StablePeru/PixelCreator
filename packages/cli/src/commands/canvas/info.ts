import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class CanvasInfo extends BaseCommand {
  static description = 'Display information about a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const resultData = {
      name: canvas.name,
      width: canvas.width,
      height: canvas.height,
      palette: canvas.palette,
      layers: canvas.layers.length,
      frames: canvas.frames.length,
      animationTags: canvas.animationTags,
      created: canvas.created,
      modified: canvas.modified,
    };

    const cmdResult = makeResult(
      'canvas:info',
      { canvas: flags.canvas },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas: ${data.name}`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Palette: ${data.palette ?? 'none'}`);
      this.log(`  Layers: ${data.layers}`);
      this.log(`  Frames: ${data.frames}`);
      this.log(`  Animation tags: ${data.animationTags.length}`);
      if (data.animationTags.length > 0) {
        for (const tag of data.animationTags) {
          this.log(`    - ${tag.name} (frames ${tag.from}-${tag.to}, ${tag.direction})`);
        }
      }
      this.log(`  Created: ${data.created}`);
      this.log(`  Modified: ${data.modified}`);
    });
  }
}
