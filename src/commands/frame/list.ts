import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class FrameList extends BaseCommand {
  static description = 'List all frames in a canvas';

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
    const { flags } = await this.parse(FrameList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const frames = canvas.frames.map((f) => ({
      id: f.id,
      index: f.index,
      duration: f.duration,
    }));

    const cmdResult = makeResult(
      'frame:list',
      { canvas: flags.canvas },
      { canvas: flags.canvas, frames, total: frames.length },
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      if (data.frames.length === 0) {
        this.log(`Canvas "${data.canvas}" has no frames.`);
        return;
      }

      this.log(`Frames in "${data.canvas}" (${data.total}):`);
      for (const f of data.frames) {
        this.log(`  [${f.index}] ${f.id} — ${f.duration}ms`);
      }
    });
  }
}
