import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, createDefaultPresets, createBrushMask, formatOutput, makeResult } from '@pixelcreator/core';

export default class BrushShow extends BaseCommand {
  static override description = 'Show brush preset details and ASCII mask preview';

  static override flags = {
    ...BaseCommand.baseFlags,
    id: Flags.string({ description: 'Brush preset ID', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(BrushShow);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const defaults = createDefaultPresets();
    const custom = project.settings?.brushPresets ?? [];
    const all = [...defaults, ...custom];

    const preset = all.find(p => p.id === flags.id);
    if (!preset) {
      throw new Error(`Brush preset not found: ${flags.id}`);
    }

    const mask = createBrushMask(preset);
    const ascii = mask.map(row => row.map(v => v ? '#' : '.').join('')).join('\n');

    const result = makeResult('brush:show', { id: flags.id }, { ...preset, mask: ascii }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Brush: ${r.name} (${r.id})`);
      this.log(`  Size: ${r.size}px | Shape: ${r.shape} | Spacing: ${r.spacing} | Opacity: ${r.opacity}`);
      this.log(`  Pixel Perfect: ${r.pixelPerfect}`);
      this.log(`  Mask preview:`);
      for (const line of r.mask.split('\n')) {
        this.log(`    ${line}`);
      }
    });
  }
}
