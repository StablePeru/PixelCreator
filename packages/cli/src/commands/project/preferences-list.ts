import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class ProjectPreferencesList extends BaseCommand {
  static override description = 'List all project preference values';

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectPreferencesList);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const prefs = project.settings.preferences ?? {};

    const result = makeResult('project:preferences-list', {}, { preferences: prefs, count: Object.keys(prefs).length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (r.count === 0) {
        this.log('No preferences set. Use `pxc project:preferences --key <key> --value <value>` to set.');
        return;
      }
      this.log(`Preferences (${r.count}):`);
      for (const [k, v] of Object.entries(r.preferences)) {
        this.log(`  ${k} = ${v}`);
      }
    });
  }
}
