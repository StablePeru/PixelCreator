import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';

export default class FrameBatchDuration extends BaseCommand {
  static override description = 'Set duration for multiple frames at once';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    range: Flags.string({ description: 'Frame range (e.g., "0-5")', required: true }),
    duration: Flags.integer({ description: 'Duration in ms', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameBatchDuration);
    const projectPath = getProjectPath(flags.project);

    const [start, end] = flags.range.split('-').map(Number);
    if (isNaN(start) || isNaN(end) || start > end) {
      this.error(`Invalid range: "${flags.range}". Expected "start-end" (e.g., "0-5")`);
    }
    if (flags.duration < 1) this.error('Duration must be >= 1');

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    let updated = 0;

    for (const frame of canvas.frames) {
      if (frame.index >= start && frame.index <= end) {
        frame.duration = flags.duration;
        updated++;
      }
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult(
      'frame:batch-duration',
      { canvas: flags.canvas, range: flags.range, duration: flags.duration },
      { updated, duration: flags.duration },
      startTime,
    );
    formatOutput(this.getOutputFormat(flags), result, (r) => {
      console.log(`Updated duration to ${r.duration}ms for ${r.updated} frame(s)`);
    });
  }
}
