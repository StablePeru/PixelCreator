import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readSelection, writeSelection } from '../../io/project-io.js';
import { invertSelection, getSelectionPixelCount } from '../../core/selection-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectInvert extends BaseCommand {
  static override description = 'Invert the current selection';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectInvert);
    const projectPath = getProjectPath(flags.project);

    const existing = readSelection(projectPath, flags.canvas);
    if (!existing) throw new Error(`No active selection on canvas ${flags.canvas}`);

    const inverted = invertSelection(existing);
    writeSelection(projectPath, flags.canvas, inverted);

    const count = getSelectionPixelCount(inverted);
    const result = makeResult('select:invert', { canvas: flags.canvas }, { pixelCount: count }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Selection inverted (${r.pixelCount} pixels now selected)`);
    });
  }
}
