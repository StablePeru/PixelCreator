import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, createDefaultPresets, formatOutput, makeResult } from '@pixelcreator/core';

export default class BrushDelete extends BaseCommand {
  static override description = 'Delete a custom brush preset';

  static override flags = {
    ...BaseCommand.baseFlags,
    id: Flags.string({ description: 'Brush preset ID to delete', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(BrushDelete);
    const projectPath = getProjectPath(flags.project);

    const defaults = createDefaultPresets();
    if (defaults.some(d => d.id === flags.id)) {
      throw new Error(`Cannot delete built-in brush preset: ${flags.id}`);
    }

    const project = readProjectJSON(projectPath);
    const presets = project.settings?.brushPresets ?? [];
    const idx = presets.findIndex(p => p.id === flags.id);
    if (idx === -1) {
      throw new Error(`Brush preset not found: ${flags.id}`);
    }

    const removed = presets.splice(idx, 1)[0];
    project.settings.brushPresets = presets;
    writeProjectJSON(projectPath, project);

    const result = makeResult('brush:delete', { id: flags.id }, { id: removed.id, name: removed.name }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Deleted brush preset "${r.name}" (${r.id})`);
    });
  }
}
