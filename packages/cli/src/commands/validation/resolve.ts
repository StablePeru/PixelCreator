import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  formatOutput,
  getProjectPath,
  makeResult,
  readValidationFlags,
  resolveFlag,
  writeValidationFlags,
} from '@pixelcreator/core';

export default class ValidationResolve extends BaseCommand {
  static description = 'Mark a validation flag as resolved';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    id: Flags.string({ description: 'Flag ID (e.g. flag-003)', required: true }),
    resolution: Flags.string({
      char: 'r',
      description: 'How the issue was fixed (free text)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ValidationResolve);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    const file = readValidationFlags(projectPath, flags.canvas);
    const nextFile = resolveFlag(file, flags.id, flags.resolution);
    const resolved = nextFile.flags.find((f) => f.id === flags.id)!;

    if (!flags['dry-run']) {
      writeValidationFlags(projectPath, flags.canvas, nextFile);
    }

    const result = makeResult(
      'validation:resolve',
      { canvas: flags.canvas, id: flags.id },
      { flag: resolved, dryRun: flags['dry-run'] },
      startTime,
    );

    formatOutput(format, result, (data) => {
      const prefix = data.dryRun ? '[dry-run] Would resolve' : 'Resolved';
      this.log(`${prefix} ${data.flag.id} on "${data.flag.canvas}": ${data.flag.resolution}`);
    });
  }
}
