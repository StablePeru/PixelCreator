import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, createDefaultPresets, formatOutput, makeResult } from '@pixelcreator/core';

export default class BrushList extends BaseCommand {
  static override description = 'List all brush presets (default + project custom)';

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(BrushList);
    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const defaults = createDefaultPresets();
    const custom = project.settings?.brushPresets ?? [];
    const all = [...defaults, ...custom];

    const result = makeResult('brush:list', {}, { presets: all, defaultCount: defaults.length, customCount: custom.length, total: all.length }, startTime);
    formatOutput(format, result, (data) => {
      this.log(`Brush presets (${data.total}): ${data.defaultCount} default, ${data.customCount} custom`);
      for (const p of data.presets) {
        const tag = defaults.find(d => d.id === p.id) ? '[default]' : '[custom]';
        this.log(`  ${p.id} "${p.name}" — ${p.size}px ${p.shape} ${tag}`);
      }
    });
  }
}
