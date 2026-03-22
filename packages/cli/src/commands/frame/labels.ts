import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class FrameLabels extends BaseCommand {
  static override description = 'List all labeled frames in a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameLabels);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const labeled = canvas.frames
      .filter((f) => f.label)
      .map((f) => ({ index: f.index, id: f.id, label: f.label, duration: f.duration }));

    const result = makeResult('frame:labels', { canvas: flags.canvas }, { labels: labeled, totalFrames: canvas.frames.length, labeledCount: labeled.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.labeledCount === 0) {
        console.log('No labeled frames');
      } else {
        for (const l of r.labels) {
          console.log(`  [${l.index}] "${l.label}" (${l.duration}ms)`);
        }
        console.log(`${r.labeledCount} labeled frames out of ${r.totalFrames}`);
      }
    });
  }
}
