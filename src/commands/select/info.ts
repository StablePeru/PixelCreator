import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readSelection } from '../../io/project-io.js';
import { getSelectionBounds, getSelectionPixelCount } from '../../core/selection-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectInfo extends BaseCommand {
  static override description = 'Display information about the current selection';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectInfo);
    const projectPath = getProjectPath(flags.project);

    const mask = readSelection(projectPath, flags.canvas);
    if (!mask) throw new Error(`No active selection on canvas ${flags.canvas}`);

    const bounds = getSelectionBounds(mask);
    const pixelCount = getSelectionPixelCount(mask);
    const totalPixels = mask.width * mask.height;
    const percentage = ((pixelCount / totalPixels) * 100).toFixed(1);

    const result = makeResult('select:info', { canvas: flags.canvas }, { bounds, pixelCount, totalPixels, percentage, canvasSize: { width: mask.width, height: mask.height } }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.bounds) {
        console.log(`Selection: (${r.bounds.x}, ${r.bounds.y}) ${r.bounds.width}x${r.bounds.height}`);
      }
      console.log(`Pixels: ${r.pixelCount} / ${r.totalPixels} (${r.percentage}%)`);
    });
  }
}
