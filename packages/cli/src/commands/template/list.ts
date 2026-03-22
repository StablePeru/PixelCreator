import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, readTemplateJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class TemplateList extends BaseCommand {
  static description = 'List all templates in the project';

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(TemplateList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const templates = project.templates.map((name) => {
      const data = readTemplateJSON(projectPath, name);
      return {
        name: data.name,
        width: data.width,
        height: data.height,
        layers: data.layers.length,
        description: data.description,
      };
    });

    const resultData = { templates };
    const cmdResult = makeResult('template:list', {}, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      if (data.templates.length === 0) {
        this.log('No templates found.');
        return;
      }
      this.log(`Templates (${data.templates.length}):`);
      for (const t of data.templates) {
        const desc = t.description ? ` — ${t.description}` : '';
        this.log(`  ${t.name} (${t.width}x${t.height}, ${t.layers} layers)${desc}`);
      }
    });
  }
}
