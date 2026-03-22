import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readTemplateJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class TemplateInfo extends BaseCommand {
  static description = 'Show template details';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Template name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TemplateInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const template = readTemplateJSON(projectPath, flags.name);

    const cmdResult = makeResult('template:info', { name: flags.name }, template, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Template: ${data.name}`);
      if (data.description) this.log(`  Description: ${data.description}`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Palette: ${data.palette ?? '(none)'}`);
      this.log(`  Layers (${data.layers.length}):`);
      for (const l of data.layers) {
        this.log(`    ${l.name} (${l.type}, opacity: ${l.opacity}, blend: ${l.blendMode})`);
      }
    });
  }
}
