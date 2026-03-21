import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, deleteSelection } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class SelectNone extends BaseCommand {
  static override description = 'Clear the active selection (deselect all)';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(SelectNone);
    const projectPath = getProjectPath(flags.project);

    deleteSelection(projectPath, flags.canvas);

    const result = makeResult('select:none', { canvas: flags.canvas }, { canvas: flags.canvas }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, () => {
      console.log(`Selection cleared for canvas ${flags.canvas}`);
    });
  }
}
