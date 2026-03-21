import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ProjectDescription extends BaseCommand {
  static description = 'View or set project description';

  static flags = {
    ...BaseCommand.baseFlags,
    set: Flags.string({
      description: 'Set the project description',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectDescription);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (flags.set === undefined) {
      const resultData = { description: project.description, changed: false };
      const cmdResult = makeResult('project:description', {}, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log(data.description || '(no description)');
      });
      return;
    }

    project.description = flags.set;
    writeProjectJSON(projectPath, project);

    const resultData = { description: project.description, changed: true };
    const cmdResult = makeResult('project:description', { set: flags.set }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Description updated: "${data.description}"`);
    });
  }
}
