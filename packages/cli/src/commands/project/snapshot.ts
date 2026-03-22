import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, createSnapshot, formatOutput, makeResult } from '@pixelcreator/core';

export default class ProjectSnapshot extends BaseCommand {
  static override description = 'Create a snapshot of a canvas state';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    description: Flags.string({ char: 'd', description: 'Snapshot description', default: '' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectSnapshot);
    const projectPath = getProjectPath(flags.project);

    const info = createSnapshot(projectPath, flags.canvas, flags.description);

    const result = makeResult('project:snapshot', { canvas: flags.canvas, description: flags.description }, { id: info.id, canvas: flags.canvas, description: info.description, created: info.created }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Snapshot "${r.id}" created for canvas "${r.canvas}"`);
      if (r.description) console.log(`  Description: ${r.description}`);
    });
  }
}
