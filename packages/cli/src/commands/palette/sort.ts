import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, writePaletteJSON, sortPaletteColors, type PaletteSortMode, formatOutput, makeResult } from '@pixelcreator/core';

const VALID_MODES: PaletteSortMode[] = ['hue', 'luminance', 'saturation', 'index', 'name'];

export default class PaletteSort extends BaseCommand {
  static description = 'Sort palette colors by a given criterion';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
    by: Flags.string({
      description: 'Sort mode: hue, luminance, saturation, index, name',
      required: true,
      options: VALID_MODES as string[],
    }),
    reverse: Flags.boolean({
      description: 'Reverse sort order',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteSort);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.name);

    const mode = flags.by as PaletteSortMode;

    // Build old→new index mapping for ramp updates
    const oldColors = palette.colors.map((c) => c.index);
    const sorted = sortPaletteColors(palette.colors, mode, flags.reverse);

    // Map old indices to new indices for ramp updates
    const indexMap = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      // Find which old index ended up at position i
      const oldIdx = oldColors.indexOf(
        palette.colors.find((c) => c.hex === sorted[i].hex && !indexMap.has(c.index))?.index ?? -1,
      );
      if (oldIdx !== -1) {
        indexMap.set(oldColors[oldIdx], i);
      }
    }

    palette.colors = sorted;

    // Update ramp indices
    for (const ramp of palette.ramps) {
      ramp.indices = ramp.indices
        .map((oldIdx) => indexMap.get(oldIdx))
        .filter((idx): idx is number => idx !== undefined);
    }

    writePaletteJSON(projectPath, palette);

    const resultData = {
      name: palette.name,
      sortedBy: mode,
      reversed: flags.reverse,
      colorCount: palette.colors.length,
      colors: palette.colors.map((c) => c.hex),
    };

    const cmdResult = makeResult(
      'palette:sort',
      { name: flags.name, by: flags.by, reverse: flags.reverse },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Palette "${data.name}" sorted by ${data.sortedBy}${data.reversed ? ' (reversed)' : ''}`);
      this.log(`  ${data.colorCount} colors`);
      for (const hex of data.colors) {
        this.log(`  ${hex}`);
      }
    });
  }
}
