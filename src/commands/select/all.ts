import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeSelection } from '../../io/project-io.js';
import { createAllSelection } from '../../core/selection-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectAll extends BaseCommand {
  static override description = 'Select the entire canvas';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectAll);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const mask = createAllSelection(canvas.width, canvas.height);
    writeSelection(projectPath, flags.canvas, mask);

    const result = makeResult('select:all', { canvas: flags.canvas }, { width: canvas.width, height: canvas.height, pixelCount: canvas.width * canvas.height }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Selected all ${r.pixelCount} pixels (${r.width}x${r.height})`);
    });
  }
}
