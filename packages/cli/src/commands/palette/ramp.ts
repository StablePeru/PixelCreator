import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, writePaletteJSON, generateRamp, formatOutput, makeResult } from '@pixelcreator/core';

export default class PaletteRamp extends BaseCommand {
  static description = 'Create or delete palette ramps';

  static flags = {
    ...BaseCommand.baseFlags,
    palette: Flags.string({
      description: 'Palette name',
      required: true,
    }),
    create: Flags.string({
      description: 'Create a ramp with this name',
    }),
    delete: Flags.string({
      description: 'Delete a ramp by name',
    }),
    generate: Flags.string({
      description: 'Generate ramp colors (format: "#start:#end:steps")',
    }),
    indices: Flags.string({
      description: 'Use existing color indices (comma-separated)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteRamp);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.palette);

    if (!flags.create && !flags.delete) {
      this.error('Exactly one action required: --create or --delete');
    }

    if (flags.create && flags.delete) {
      this.error('Only one action allowed: --create or --delete');
    }

    let action: string;
    let rampName: string;
    let indices: number[] = [];
    let colors: string[] = [];

    if (flags.delete) {
      rampName = flags.delete;
      action = 'deleted';

      const rampIdx = palette.ramps.findIndex((r) => r.name === rampName);
      if (rampIdx === -1) {
        this.error(`Ramp "${rampName}" not found in palette "${flags.palette}".`);
      }

      palette.ramps.splice(rampIdx, 1);
    } else {
      rampName = flags.create!;
      action = 'created';

      if (palette.ramps.some((r) => r.name === rampName)) {
        this.error(`Ramp "${rampName}" already exists in palette "${flags.palette}".`);
      }

      if (!flags.generate && !flags.indices) {
        this.error('--create requires either --generate or --indices.');
      }

      if (flags.generate && flags.indices) {
        this.error('Use either --generate or --indices, not both.');
      }

      if (flags.generate) {
        const parts = flags.generate.split(':');
        if (parts.length !== 3) {
          this.error('--generate format must be "#start:#end:steps".');
        }

        const startHex = parts[0];
        const endHex = parts[1];
        const steps = parseInt(parts[2], 10);

        if (isNaN(steps) || steps < 1) {
          this.error('Steps must be a positive integer.');
        }

        const generatedColors = generateRamp(startHex, endHex, steps);

        // Add generated colors to palette
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

        colors = generatedColors;
      } else {
        indices = flags.indices!.split(',').map((s) => parseInt(s.trim(), 10));

        for (const idx of indices) {
          if (isNaN(idx) || !palette.colors.some((c) => c.index === idx)) {
            this.error(`Color index ${idx} not found in palette.`);
          }
        }

        colors = indices.map((idx) => palette.colors.find((c) => c.index === idx)!.hex);
      }

      palette.ramps.push({ name: rampName, indices });
    }

    writePaletteJSON(projectPath, palette);

    const resultData = {
      palette: flags.palette,
      action,
      rampName,
      indices,
      colors,
    };

    const cmdResult = makeResult(
      'palette:ramp',
      { palette: flags.palette, create: flags.create, delete: flags.delete, generate: flags.generate, indices: flags.indices },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Ramp "${data.rampName}" ${data.action} in palette "${data.palette}"`);
      if (data.colors.length > 0) {
        this.log(`  Colors: ${data.colors.join(', ')}`);
        this.log(`  Indices: ${data.indices.join(', ')}`);
      }
    });
  }
}
