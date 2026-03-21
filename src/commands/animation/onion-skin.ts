import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
} from '../../io/project-io.js';
import { compositeOnionSkin } from '../../core/animation-engine.js';
import { renderFrames, scaleBuffer } from '../../core/frame-renderer.js';
import { savePNG } from '../../io/png-codec.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class AnimationOnionSkin extends BaseCommand {
  static description = 'Generate onion skin overlay for a frame';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.integer({
      description: 'Frame index (0-based)',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination file path',
      required: true,
    }),
    before: Flags.integer({
      description: 'Number of previous frames to overlay',
      default: 1,
    }),
    after: Flags.integer({
      description: 'Number of next frames to overlay',
      default: 1,
    }),
    opacity: Flags.integer({
      description: 'Base opacity for onion frames (0-255)',
      default: 80,
    }),
    'before-color': Flags.string({
      description: 'Tint color for before frames (hex)',
    }),
    'after-color': Flags.string({
      description: 'Tint color for after frames (hex)',
    }),
    scale: Flags.integer({
      description: 'Scale factor',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationOnionSkin);

    const outputFormat = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.frame < 0 || flags.frame >= canvas.frames.length) {
      this.error(`Frame index ${flags.frame} out of range (0-${canvas.frames.length - 1}).`);
    }

    // Gather all needed frame indices
    const allIndices: number[] = [];
    const beforeIndices: number[] = [];
    const afterIndices: number[] = [];

    for (let i = 1; i <= flags.before; i++) {
      const idx = flags.frame - i;
      if (idx >= 0) {
        beforeIndices.unshift(idx);
        allIndices.push(idx);
      }
    }

    allIndices.push(flags.frame);

    for (let i = 1; i <= flags.after; i++) {
      const idx = flags.frame + i;
      if (idx < canvas.frames.length) {
        afterIndices.push(idx);
        allIndices.push(idx);
      }
    }

    // Sort allIndices and render
    const sortedIndices = [...new Set(allIndices)].sort((a, b) => a - b);
    const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, sortedIndices, 1);
    const frameMap = new Map<number, typeof renderedFrames[0]>();
    for (let i = 0; i < sortedIndices.length; i++) {
      frameMap.set(sortedIndices[i], renderedFrames[i]);
    }

    const currentFrame = frameMap.get(flags.frame)!;
    const beforeFrames = beforeIndices.map((idx) => frameMap.get(idx)!);
    const afterFrameBuffers = afterIndices.map((idx) => frameMap.get(idx)!);

    const beforeTint = flags['before-color'] ? hexToRGBA(flags['before-color']) : undefined;
    const afterTint = flags['after-color'] ? hexToRGBA(flags['after-color']) : undefined;

    let result = compositeOnionSkin(currentFrame, beforeFrames, afterFrameBuffers, flags.opacity, beforeTint, afterTint);

    if (flags.scale > 1) {
      result = scaleBuffer(result, flags.scale);
    }

    const path = await import('node:path');
    const destPath = path.resolve(flags.dest);
    savePNG(result, destPath);

    const resultData = {
      canvas: flags.canvas,
      frame: flags.frame,
      dest: destPath,
      before: beforeIndices.length,
      after: afterIndices.length,
      opacity: flags.opacity,
    };

    const cmdResult = makeResult(
      'animation:onion-skin',
      { canvas: flags.canvas, frame: flags.frame, dest: flags.dest, before: flags.before, after: flags.after, opacity: flags.opacity },
      resultData,
      startTime,
    );

    formatOutput(outputFormat, cmdResult, (data) => {
      this.log(`Onion skin exported to ${data.dest}`);
      this.log(`  Frame: ${data.frame}, before: ${data.before}, after: ${data.after}, opacity: ${data.opacity}`);
    });
  }
}
