import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, reindexFrames, formatOutput, makeResult } from '@pixelcreator/core';

export default class FrameReorder extends BaseCommand {
  static description = 'Move a frame to a different position';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    from: Flags.integer({
      description: 'Source frame index',
      required: true,
    }),
    to: Flags.integer({
      description: 'Destination frame index',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameReorder);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.from < 0 || flags.from >= canvas.frames.length) {
      this.error(`Source index ${flags.from} out of range (0-${canvas.frames.length - 1}).`);
    }
    if (flags.to < 0 || flags.to >= canvas.frames.length) {
      this.error(`Destination index ${flags.to} out of range (0-${canvas.frames.length - 1}).`);
    }
    if (flags.from === flags.to) {
      this.error('Source and destination indices are the same.');
    }

    // Splice out the frame and insert at new position
    const [frame] = canvas.frames.splice(flags.from, 1);
    canvas.frames.splice(flags.to, 0, frame);

    // Reindex PNGs and metadata
    reindexFrames(projectPath, flags.canvas, canvas);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      from: flags.from,
      to: flags.to,
      frameId: frame.id,
      totalFrames: canvas.frames.length,
    };

    const cmdResult = makeResult(
      'frame:reorder',
      { canvas: flags.canvas, from: flags.from, to: flags.to },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Moved frame from index ${data.from} to ${data.to} in "${data.canvas}"`);
      this.log(`  Total frames: ${data.totalFrames}`);
    });
  }
}
