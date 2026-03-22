import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class AnimationRemoveTag extends BaseCommand {
  static description = 'Remove an animation tag';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    tag: Flags.string({
      description: 'Tag name to remove',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationRemoveTag);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const tagIndex = canvas.animationTags.findIndex((t) => t.name === flags.tag);
    if (tagIndex === -1) {
      this.error(`Animation tag "${flags.tag}" not found.`);
    }

    const removed = canvas.animationTags.splice(tagIndex, 1)[0];
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      removed: {
        name: removed.name,
        from: removed.from,
        to: removed.to,
        direction: removed.direction,
        repeat: removed.repeat,
      },
      remainingTags: canvas.animationTags.length,
    };

    const cmdResult = makeResult(
      'animation:remove-tag',
      { canvas: flags.canvas, tag: flags.tag },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Removed animation tag "${data.removed.name}" from "${data.canvas}"`);
      this.log(`  Remaining tags: ${data.remainingTags}`);
    });
  }
}
