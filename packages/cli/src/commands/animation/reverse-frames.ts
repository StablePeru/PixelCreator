import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, reverseFrameRange, formatOutput, makeResult } from '@pixelcreator/core';

export default class AnimationReverseFrames extends BaseCommand {
  static override description = 'Reverse frame order in a range';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    from: Flags.integer({ description: 'Start frame index' }),
    to: Flags.integer({ description: 'End frame index' }),
    tag: Flags.string({ description: 'Animation tag name (alternative to from/to)' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationReverseFrames);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);

    let from: number;
    let to: number;

    if (flags.tag) {
      const tag = canvas.animationTags.find((t) => t.name === flags.tag);
      if (!tag) throw new Error(`Tag "${flags.tag}" not found`);
      from = tag.from;
      to = tag.to;
    } else if (flags.from !== undefined && flags.to !== undefined) {
      from = flags.from;
      to = flags.to;
    } else {
      throw new Error('Must provide --from/--to or --tag');
    }

    if (from < 0 || to >= canvas.frames.length || from > to) {
      throw new Error(`Invalid range: ${from}-${to}`);
    }

    // Reverse frame pixel data (swap PNGs between positions)
    for (let i = 0; i < Math.floor((to - from + 1) / 2); i++) {
      const idxA = from + i;
      const idxB = to - i;
      const frameA = canvas.frames[idxA];
      const frameB = canvas.frames[idxB];

      for (const layer of canvas.layers) {
        if (layer.isGroup) continue;
        const bufA = readLayerFrame(projectPath, flags.canvas, layer.id, frameA.id);
        const bufB = readLayerFrame(projectPath, flags.canvas, layer.id, frameB.id);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frameA.id, bufB);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frameB.id, bufA);
      }
    }

    // Reverse durations and labels
    canvas.frames = reverseFrameRange(canvas.frames, from, to);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('animation:reverse-frames', { canvas: flags.canvas, from, to }, { from, to, framesReversed: to - from + 1 }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Reversed ${r.framesReversed} frames (${r.from}-${r.to})`);
    });
  }
}
