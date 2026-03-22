import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, deleteTemplateFile, formatOutput, makeResult } from '@pixelcreator/core';

export default class TemplateDelete extends BaseCommand {
  static description = 'Delete a template';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Template name',
      required: true,
    }),
    force: Flags.boolean({
      description: 'Skip confirmation',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TemplateDelete);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!project.templates.includes(flags.name)) {
      this.error(`Template "${flags.name}" not found.`);
    }

    deleteTemplateFile(projectPath, flags.name);

    project.templates = project.templates.filter((t) => t !== flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = { name: flags.name, deleted: true };
    const cmdResult = makeResult('template:delete', { name: flags.name, force: flags.force }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Template "${data.name}" deleted.`);
    });
  }
}
