import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class AnimationListTags extends BaseCommand {
  static description = 'List animation tags';

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
    const { flags } = await this.parse(AnimationListTags);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const tags = canvas.animationTags.map((t) => ({
      name: t.name,
      from: t.from,
      to: t.to,
      direction: t.direction,
      repeat: t.repeat,
      frameCount: t.to - t.from + 1,
    }));

    const resultData = {
      canvas: flags.canvas,
      tags,
      count: tags.length,
    };

    const cmdResult = makeResult(
      'animation:list-tags',
      { canvas: flags.canvas },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      if (data.tags.length === 0) {
        this.log(`No animation tags in "${data.canvas}"`);
        return;
      }

      this.log(`Animation tags in "${data.canvas}" (${data.count}):`);
      for (const tag of data.tags) {
        this.log(`  ${tag.name}: frames ${tag.from}-${tag.to} (${tag.frameCount} frames, ${tag.direction}, repeat: ${tag.repeat})`);
      }
    });
  }
}
