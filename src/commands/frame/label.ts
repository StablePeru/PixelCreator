import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class FrameLabel extends BaseCommand {
  static override description = 'Set or clear a label on a frame';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    frame: Flags.integer({ description: 'Frame index', required: true }),
    label: Flags.string({ description: 'Label text to set' }),
    clear: Flags.boolean({ description: 'Clear the label', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameLabel);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    if (flags.frame < 0 || flags.frame >= canvas.frames.length) {
      throw new Error(`Frame index ${flags.frame} out of range`);
    }

    if (flags.clear) {
      delete canvas.frames[flags.frame].label;
    } else if (flags.label) {
      canvas.frames[flags.frame].label = flags.label;
    } else {
      throw new Error('Must provide --label or --clear');
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const result = makeResult('frame:label', { canvas: flags.canvas, frame: flags.frame, label: flags.label, clear: flags.clear }, { frame: flags.frame, label: flags.clear ? null : flags.label }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.label) {
        console.log(`Frame ${r.frame} labeled: "${r.label}"`);
      } else {
        console.log(`Frame ${r.frame} label cleared`);
      }
    });
  }
}
