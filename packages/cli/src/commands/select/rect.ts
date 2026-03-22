import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readSelection, writeSelection, createRectSelection, mergeSelections, formatOutput, makeResult } from '@pixelcreator/core';

export default class SelectRect extends BaseCommand {
  static override description = 'Create a rectangular selection on a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    x: Flags.integer({ description: 'Top-left X coordinate', required: true }),
    y: Flags.integer({ description: 'Top-left Y coordinate', required: true }),
    width: Flags.integer({ description: 'Selection width', required: true }),
    height: Flags.integer({ description: 'Selection height', required: true }),
    add: Flags.boolean({ description: 'Add to existing selection instead of replacing', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectRect);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    let mask = createRectSelection(canvas.width, canvas.height, flags.x, flags.y, flags.width, flags.height);

    if (flags.add) {
      const existing = readSelection(projectPath, flags.canvas);
      if (existing) {
        mask = mergeSelections(existing, mask);
      }
    }

    writeSelection(projectPath, flags.canvas, mask);

    const result = makeResult('select:rect', { canvas: flags.canvas, x: flags.x, y: flags.y, width: flags.width, height: flags.height, add: flags.add }, { x: flags.x, y: flags.y, width: flags.width, height: flags.height, add: flags.add }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Selected rect (${r.x}, ${r.y}) ${r.width}x${r.height}${r.add ? ' (added to existing)' : ''}`);
    });
  }
}
