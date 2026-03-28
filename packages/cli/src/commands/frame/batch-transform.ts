import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  batchApplyToFrames,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';
import type { BatchFrameTransform } from '@pixelcreator/core';

export default class FrameBatchTransform extends BaseCommand {
  static override description = 'Apply a transform to multiple frames';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    range: Flags.string({ description: 'Frame range (e.g., "0-5")', required: true }),
    transform: Flags.string({
      description: 'Transform: flip-h, flip-v, rotate-90, invert, brightness, contrast, etc.',
      required: true,
    }),
    amount: Flags.integer({ description: 'Amount parameter for transforms that need it' }),
    degrees: Flags.integer({ description: 'Degrees for hue-shift' }),
    levels: Flags.integer({ description: 'Levels for posterize' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameBatchTransform);
    const projectPath = getProjectPath(flags.project);

    const [start, end] = flags.range.split('-').map(Number);
    if (isNaN(start) || isNaN(end) || start > end) {
      this.error(`Invalid range: "${flags.range}". Expected "start-end" (e.g., "0-5")`);
    }

    const transform = flags.transform as BatchFrameTransform;
    const params: Record<string, number> = {};
    if (flags.amount !== undefined) params.amount = flags.amount;
    if (flags.degrees !== undefined) params.degrees = flags.degrees;
    if (flags.levels !== undefined) params.levels = flags.levels;

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const targetFrames = canvas.frames.filter((f) => f.index >= start && f.index <= end);
    let affected = 0;

    for (const layer of canvas.layers.filter((l) => l.type === 'normal')) {
      const inputs = targetFrames.map((f) => ({
        frameId: f.id,
        buffer: readLayerFrame(projectPath, flags.canvas, layer.id, f.id),
      }));

      const results = batchApplyToFrames(inputs, transform, params);
      for (const r of results) {
        writeLayerFrame(projectPath, flags.canvas, layer.id, r.frameId, r.buffer);
        affected++;
      }
    }

    const result = makeResult(
      'frame:batch-transform',
      { canvas: flags.canvas, range: flags.range, transform },
      { framesAffected: affected, transform },
      startTime,
    );
    formatOutput(this.getOutputFormat(flags), result, (r) => {
      console.log(`Applied ${r.transform} to ${r.framesAffected} frame-layer(s)`);
    });
  }
}
