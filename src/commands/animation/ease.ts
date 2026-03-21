import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON } from '../../io/project-io.js';
import { applyEasing } from '../../core/tween-engine.js';
import type { EaseFunction } from '../../core/tween-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class AnimationEase extends BaseCommand {
  static override description = 'Apply easing curve to frame durations in a tag';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    tag: Flags.string({ description: 'Animation tag name', required: true }),
    ease: Flags.string({ description: 'Easing function', required: true, options: ['linear', 'ease-in', 'ease-out', 'ease-in-out'] }),
    'total-duration': Flags.integer({ description: 'Total duration for the tag in ms' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationEase);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const tag = canvas.animationTags.find((t) => t.name === flags.tag);
    if (!tag) throw new Error(`Tag "${flags.tag}" not found`);

    const tagFrames = canvas.frames.slice(tag.from, tag.to + 1);
    const durations = tagFrames.map((f) => f.duration);
    const eased = applyEasing(durations, flags.ease as EaseFunction, flags['total-duration']);

    for (let i = 0; i < tagFrames.length; i++) {
      canvas.frames[tag.from + i].duration = eased[i];
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('animation:ease', { canvas: flags.canvas, tag: flags.tag, ease: flags.ease }, { tag: flags.tag, ease: flags.ease, framesAffected: tagFrames.length, durations: eased }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Applied ${r.ease} easing to ${r.framesAffected} frames in tag "${r.tag}"`);
    });
  }
}
