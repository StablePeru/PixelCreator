import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  formatOutput,
  getProjectPath,
  makeResult,
  readValidationFlags,
  removeFlag,
  writeValidationFlags,
} from '@pixelcreator/core';

export default class ValidationRemove extends BaseCommand {
  static description = 'Delete a validation flag';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    id: Flags.string({ description: 'Flag ID', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidationRemove);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const file = readValidationFlags(projectPath, flags.canvas);
    const nextFile = removeFlag(file, flags.id);

    if (!flags['dry-run']) {
      writeValidationFlags(projectPath, flags.canvas, nextFile);
    }

    const result = makeResult(
      'validation:remove',
      { canvas: flags.canvas, id: flags.id },
      { canvas: flags.canvas, id: flags.id, dryRun: flags['dry-run'] },
      startTime,
    );

    formatOutput(format, result, (data) => {
      const prefix = data.dryRun ? '[dry-run] Would remove' : 'Removed';
      this.log(`${prefix} ${data.id} from "${data.canvas}"`);
    });
  }
}
