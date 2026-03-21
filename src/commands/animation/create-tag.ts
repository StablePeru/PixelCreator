import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
} from '../../io/project-io.js';
import { validateTagRange } from '../../core/animation-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { AnimationDirection, AnimationTag } from '../../types/canvas.js';

export default class AnimationCreateTag extends BaseCommand {
  static description = 'Create an animation tag';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Tag name',
      required: true,
    }),
    from: Flags.integer({
      description: 'Start frame index (inclusive)',
      required: true,
    }),
    to: Flags.integer({
      description: 'End frame index (inclusive)',
      required: true,
    }),
    direction: Flags.string({
      description: 'Playback direction',
      options: ['forward', 'reverse', 'pingpong'],
      default: 'forward',
    }),
    repeat: Flags.integer({
      description: 'Number of times to repeat',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationCreateTag);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    // Validate unique name
    if (canvas.animationTags.some((t) => t.name === flags.name)) {
      this.error(`Animation tag "${flags.name}" already exists.`);
    }

    // Validate repeat
    if (flags.repeat < 1) {
      this.error('--repeat must be >= 1.');
    }

    const tag: AnimationTag = {
      name: flags.name,
      from: flags.from,
      to: flags.to,
      direction: flags.direction as AnimationDirection,
      repeat: flags.repeat,
    };

    // Validate range
    const rangeError = validateTagRange(tag, canvas.frames.length);
    if (rangeError) {
      this.error(rangeError);
    }

    canvas.animationTags.push(tag);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      tag,
    };

    const cmdResult = makeResult(
      'animation:create-tag',
      { canvas: flags.canvas, name: flags.name, from: flags.from, to: flags.to, direction: flags.direction, repeat: flags.repeat },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Created animation tag "${data.tag.name}" in "${data.canvas}"`);
      this.log(`  Frames: ${data.tag.from}-${data.tag.to} (${data.tag.direction}, repeat: ${data.tag.repeat})`);
    });
  }
}
