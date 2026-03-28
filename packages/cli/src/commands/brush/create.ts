import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, validateBrushPreset, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { BrushPreset, BrushShape } from '@pixelcreator/core';

export default class BrushCreate extends BaseCommand {
  static override description = 'Create a custom brush preset';

  static override flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({ description: 'Brush preset name', required: true }),
    size: Flags.integer({ description: 'Brush size in pixels (1-64)', required: true }),
    shape: Flags.string({ description: 'Brush shape', options: ['circle', 'square', 'diamond'], default: 'circle' }),
    spacing: Flags.string({ description: 'Stamp spacing (0.1-10)', default: '1' }),
    opacity: Flags.integer({ description: 'Brush opacity (0-255)', default: 255 }),
    'pixel-perfect': Flags.boolean({ description: 'Enable pixel-perfect mode', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(BrushCreate);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!project.settings.brushPresets) {
      project.settings.brushPresets = [];
    }

    const id = generateSequentialId('brush', project.settings.brushPresets.length + 9);

    const preset: BrushPreset = {
      id,
      name: flags.name,
      size: flags.size,
      shape: flags.shape as BrushShape,
      spacing: parseFloat(flags.spacing),
      opacity: flags.opacity,
      pixelPerfect: flags['pixel-perfect'],
    };

    const validation = validateBrushPreset(preset);
    if (!validation.valid) {
      throw new Error(`Invalid brush preset: ${validation.errors?.join(', ')}`);
    }

    project.settings.brushPresets.push(preset);
    writeProjectJSON(projectPath, project);

    const result = makeResult('brush:create', { name: flags.name, size: flags.size, shape: flags.shape }, { id, name: flags.name, size: flags.size, shape: flags.shape }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Created brush preset "${r.name}" (${r.id}) — ${r.size}px ${r.shape}`);
    });
  }
}
