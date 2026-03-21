import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
} from '../../io/project-io.js';
import { validateTagRange } from '../../core/animation-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { AnimationDirection } from '../../types/canvas.js';

export default class AnimationEditTag extends BaseCommand {
  static description = 'Edit an animation tag';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    tag: Flags.string({
      description: 'Tag name to edit',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'New tag name',
    }),
    from: Flags.integer({
      description: 'New start frame index',
    }),
    to: Flags.integer({
      description: 'New end frame index',
    }),
    direction: Flags.string({
      description: 'New playback direction',
      options: ['forward', 'reverse', 'pingpong'],
    }),
    repeat: Flags.integer({
      description: 'New repeat count',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationEditTag);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const tagIndex = canvas.animationTags.findIndex((t) => t.name === flags.tag);
    if (tagIndex === -1) {
      this.error(`Animation tag "${flags.tag}" not found.`);
    }

    const tag = canvas.animationTags[tagIndex];

    // Apply partial updates
    if (flags.name !== undefined) {
      // Check name uniqueness (excluding current tag)
      if (canvas.animationTags.some((t, i) => i !== tagIndex && t.name === flags.name)) {
        this.error(`Animation tag "${flags.name}" already exists.`);
      }
      tag.name = flags.name;
    }
    if (flags.from !== undefined) tag.from = flags.from;
    if (flags.to !== undefined) tag.to = flags.to;
    if (flags.direction !== undefined) tag.direction = flags.direction as AnimationDirection;
    if (flags.repeat !== undefined) {
      if (flags.repeat < 1) {
        this.error('--repeat must be >= 1.');
      }
      tag.repeat = flags.repeat;
    }

    // Validate range after updates
    const rangeError = validateTagRange(tag, canvas.frames.length);
    if (rangeError) {
      this.error(rangeError);
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      tag: {
        name: tag.name,
        from: tag.from,
        to: tag.to,
        direction: tag.direction,
        repeat: tag.repeat,
      },
    };

    const cmdResult = makeResult(
      'animation:edit-tag',
      { canvas: flags.canvas, tag: flags.tag, name: flags.name, from: flags.from, to: flags.to, direction: flags.direction, repeat: flags.repeat },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Updated animation tag "${data.tag.name}" in "${data.canvas}"`);
      this.log(`  Frames: ${data.tag.from}-${data.tag.to} (${data.tag.direction}, repeat: ${data.tag.repeat})`);
    });
  }
}
