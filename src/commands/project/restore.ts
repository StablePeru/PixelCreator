import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath } from '../../io/project-io.js';
import { restoreSnapshot } from '../../io/snapshot-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ProjectRestore extends BaseCommand {
  static override description = 'Restore a canvas from a snapshot';

  static override flags = {
    ...BaseCommand.baseFlags,
    snapshot: Flags.string({ description: 'Snapshot ID', required: true }),
    canvas: Flags.string({ char: 'c', description: 'Canvas name to restore', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectRestore);
    const projectPath = getProjectPath(flags.project);

    restoreSnapshot(projectPath, flags.snapshot, flags.canvas);

    const result = makeResult('project:restore', { snapshot: flags.snapshot, canvas: flags.canvas }, { snapshot: flags.snapshot, canvas: flags.canvas }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Restored canvas "${r.canvas}" from snapshot "${r.snapshot}"`);
    });
  }
}
