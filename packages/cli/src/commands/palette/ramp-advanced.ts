import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readPaletteJSON,
  writePaletteJSON,
  generateAdvancedRamp,
  generateHueShiftRamp,
  formatOutput,
  makeResult,
  type RampInterpolation,
} from '@pixelcreator/core';

const VALID_INTERPOLATIONS: RampInterpolation[] = ['rgb', 'hsl', 'oklch', 'hue-shift'];

export default class PaletteRampAdvanced extends BaseCommand {
  static description =
    'Create advanced ramps with different interpolation modes (RGB, HSL, OKLCH, hue-shift)';

  static flags = {
    ...BaseCommand.baseFlags,
    palette: Flags.string({
      description: 'Palette name',
      required: true,
    }),
    start: Flags.string({
      description: 'Start color hex (for rgb/hsl/oklch interpolation)',
    }),
    end: Flags.string({
      description: 'End color hex (for rgb/hsl/oklch interpolation)',
    }),
    base: Flags.string({
      description: 'Base color hex (for hue-shift mode)',
    }),
    steps: Flags.integer({
      description: 'Number of colors in the ramp',
      required: true,
    }),
    interpolation: Flags.string({
      description: 'Interpolation mode: rgb, hsl, oklch, hue-shift',
      options: VALID_INTERPOLATIONS as string[],
      default: 'oklch',
    }),
    'hue-shift': Flags.integer({
      description: 'Degrees of hue shift (for hue-shift mode)',
      default: 60,
    }),
    'sat-shift': Flags.string({
      description: 'Saturation shift -1 to 1 (for hue-shift mode)',
      default: '-0.2',
    }),
    'light-start': Flags.string({
      description: 'Lightness start 0-1 (for hue-shift mode)',
      default: '0.15',
    }),
    'light-end': Flags.string({
      description: 'Lightness end 0-1 (for hue-shift mode)',
      default: '0.9',
    }),
    name: Flags.string({
      description: 'Name for the ramp (auto-generated if not provided)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteRampAdvanced);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.palette);

    const interpolation = flags.interpolation as RampInterpolation;

    if (flags.steps < 1) {
      this.error('Steps must be a positive integer.');
    }

    let generatedColors: string[];

    if (interpolation === 'hue-shift') {
      if (!flags.base) {
        this.error('--base is required for hue-shift interpolation mode.');
      }

      const satShift = parseFloat(flags['sat-shift']);
      const lightStart = parseFloat(flags['light-start']);
      const lightEnd = parseFloat(flags['light-end']);

      if (isNaN(satShift) || satShift < -1 || satShift > 1) {
        this.error('--sat-shift must be a number between -1 and 1.');
      }

      if (isNaN(lightStart) || lightStart < 0 || lightStart > 1) {
        this.error('--light-start must be a number between 0 and 1.');
      }

      if (isNaN(lightEnd) || lightEnd < 0 || lightEnd > 1) {
        this.error('--light-end must be a number between 0 and 1.');
      }

      generatedColors = generateHueShiftRamp(flags.base, flags.steps, {
        hueShift: flags['hue-shift'],
        saturationShift: satShift,
        lightnessStart: lightStart,
        lightnessEnd: lightEnd,
      });
    } else {
      if (!flags.start || !flags.end) {
        this.error('--start and --end are required for rgb, hsl, and oklch interpolation modes.');
      }

      generatedColors = generateAdvancedRamp(flags.start, flags.end, flags.steps, interpolation);
    }

    // Add generated colors to palette
    const indices: number[] = [];
    for (const hex of generatedColors) {
      const nextIndex = palette.colors.length;
      palette.colors.push({
        index: nextIndex,
        hex,
        name: null,
        group: null,
      });
      indices.push(nextIndex);
    }

    // Create ramp entry
    const rampName = flags.name ?? `ramp-${interpolation}-${Date.now()}`;

    if (palette.ramps.some((r) => r.name === rampName)) {
      this.error(`Ramp "${rampName}" already exists in palette "${flags.palette}".`);
    }

    palette.ramps.push({ name: rampName, indices, interpolation });

    writePaletteJSON(projectPath, palette);

    const resultData = {
      palette: flags.palette,
      rampName,
      interpolation,
      steps: flags.steps,
      colors: generatedColors,
      indices,
    };

    const cmdResult = makeResult(
      'palette:ramp-advanced',
      {
        palette: flags.palette,
        start: flags.start,
        end: flags.end,
        base: flags.base,
        steps: flags.steps,
        interpolation,
        name: flags.name,
      },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(
        `Ramp "${data.rampName}" created in palette "${data.palette}" (${data.interpolation} interpolation)`,
      );
      this.log(`  Steps: ${data.steps}`);
      this.log(`  Colors: ${data.colors.join(', ')}`);
      this.log(`  Indices: ${data.indices.join(', ')}`);
    });
  }
}
