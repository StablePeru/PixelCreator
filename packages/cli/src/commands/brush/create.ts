import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  writeProjectJSON,
  validateBrushPreset,
  generateSequentialId,
  formatOutput,
  makeResult,
} from '@pixelcreator/core';
import type {
  BrushPreset,
  BrushShape,
  PressureCurve,
  PressureSensitivityConfig,
} from '@pixelcreator/core';

export default class BrushCreate extends BaseCommand {
  static override description = 'Create a custom brush preset';

  static override flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({ description: 'Brush preset name', required: true }),
    size: Flags.integer({ description: 'Brush size in pixels (1-64)', required: true }),
    shape: Flags.string({
      description: 'Brush shape',
      options: ['circle', 'square', 'diamond'],
      default: 'circle',
    }),
    spacing: Flags.string({ description: 'Stamp spacing (0.1-10)', default: '1' }),
    opacity: Flags.integer({ description: 'Brush opacity (0-255)', default: 255 }),
    'pixel-perfect': Flags.boolean({ description: 'Enable pixel-perfect mode', default: false }),
    'pressure-enabled': Flags.boolean({
      description: 'Enable pressure sensitivity on this preset',
      default: false,
    }),
    'pressure-curve': Flags.string({
      description: 'Pressure response curve',
      options: ['linear', 'soft', 'hard'],
      default: 'linear',
    }),
    'pressure-min-size': Flags.string({
      description: 'Minimum size ratio at zero pressure (0..1)',
      default: '0.2',
    }),
    'pressure-min-opacity': Flags.string({
      description: 'Minimum opacity ratio at zero pressure (0..1)',
      default: '0.2',
    }),
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

    if (flags['pressure-enabled']) {
      const minSize = this.parseRatio(flags['pressure-min-size'], 'pressure-min-size');
      const minOpacity = this.parseRatio(flags['pressure-min-opacity'], 'pressure-min-opacity');

      preset.pressureSensitivity = {
        enabled: true,
        curve: flags['pressure-curve'] as PressureCurve,
        minSize,
        minOpacity,
      };
    }

    const validation = validateBrushPreset(preset);
    if (!validation.valid) {
      throw new Error(`Invalid brush preset: ${validation.errors?.join(', ')}`);
    }

    project.settings.brushPresets.push(preset);
    writeProjectJSON(projectPath, project);

    const pressureLabel = preset.pressureSensitivity
      ? ` | pressure: ${preset.pressureSensitivity.curve}`
      : '';
    const result = makeResult(
      'brush:create',
      {
        name: flags.name,
        size: flags.size,
        shape: flags.shape,
        pressure: !!preset.pressureSensitivity,
      },
      {
        id,
        name: flags.name,
        size: flags.size,
        shape: flags.shape,
        pressure: !!preset.pressureSensitivity,
      },
      startTime,
    );
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(
        `Created brush preset "${r.name}" (${r.id}) — ${r.size}px ${r.shape}${pressureLabel}`,
      );
    });
  }

  private parseRatio(raw: string, flagName: string): number {
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > 1) {
      throw new Error(`--${flagName} must be a number between 0 and 1, got "${raw}"`);
    }
    return value;
  }
}
