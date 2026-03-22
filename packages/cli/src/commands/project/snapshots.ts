import { BaseCommand } from '../base-command.js';
import { getProjectPath, listSnapshots, formatOutput, makeResult } from '@pixelcreator/core';

export default class ProjectSnapshots extends BaseCommand {
  static override description = 'List all snapshots in the project';

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectSnapshots);
    const projectPath = getProjectPath(flags.project);

    const snapshots = listSnapshots(projectPath);

    const result = makeResult('project:snapshots', {}, { snapshots, count: snapshots.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.count === 0) {
        console.log('No snapshots');
      } else {
        for (const s of r.snapshots) {
          console.log(`  ${s.id} — ${s.canvases.join(', ')} — ${s.description || '(no description)'} — ${s.created}`);
        }
        console.log(`${r.count} snapshot(s)`);
      }
    });
  }
}
