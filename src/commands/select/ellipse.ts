import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readSelection, writeSelection } from '../../io/project-io.js';
import { createEllipseSelection, mergeSelections } from '../../core/selection-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectEllipse extends BaseCommand {
  static override description = 'Create an elliptical selection on a canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    cx: Flags.integer({ description: 'Center X coordinate', required: true }),
    cy: Flags.integer({ description: 'Center Y coordinate', required: true }),
    rx: Flags.integer({ description: 'Radius X', required: true }),
    ry: Flags.integer({ description: 'Radius Y', required: true }),
    add: Flags.boolean({ description: 'Add to existing selection instead of replacing', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectEllipse);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    let mask = createEllipseSelection(canvas.width, canvas.height, flags.cx, flags.cy, flags.rx, flags.ry);

    if (flags.add) {
      const existing = readSelection(projectPath, flags.canvas);
      if (existing) {
        mask = mergeSelections(existing, mask);
      }
    }

    writeSelection(projectPath, flags.canvas, mask);

    const result = makeResult('select:ellipse', { canvas: flags.canvas, cx: flags.cx, cy: flags.cy, rx: flags.rx, ry: flags.ry, add: flags.add }, { cx: flags.cx, cy: flags.cy, rx: flags.rx, ry: flags.ry, add: flags.add }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Selected ellipse center (${r.cx}, ${r.cy}) radius ${r.rx}x${r.ry}${r.add ? ' (added to existing)' : ''}`);
    });
  }
}
