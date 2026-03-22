import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, writePaletteJSON, colorHarmony, hexToRGBA, rgbaToHex, formatOutput, makeResult } from '@pixelcreator/core';
import type { HarmonyType, PaletteData, PaletteColor } from '@pixelcreator/core';

export default class PaletteHarmony extends BaseCommand {
  static description = 'Create a palette from color harmony rules';

  static flags = {
    ...BaseCommand.baseFlags,
    color: Flags.string({
      description: 'Base color in hex (e.g. #ff0000)',
      required: true,
    }),
    type: Flags.string({
      description: 'Harmony type',
      required: true,
      options: ['complementary', 'triadic', 'analogous', 'split-complementary'],
    }),
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteHarmony);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.palettes.includes(flags.name)) {
      this.error(`Palette "${flags.name}" already exists.`);
    }

    const baseRGBA = hexToRGBA(flags.color);
    const harmonyType = flags.type as HarmonyType;
    const harmonyColors = colorHarmony(baseRGBA, harmonyType);

    const colors: PaletteColor[] = harmonyColors.map((rgba, index) => ({
      index,
      hex: rgbaToHex(rgba),
      name: null,
      group: null,
    }));

    const palette: PaletteData = {
      name: flags.name,
      description: `${harmonyType} harmony from ${flags.color}`,
      colors,
      constraints: { maxColors: 256, locked: false, allowAlpha: true },
      ramps: [],
    };

    writePaletteJSON(projectPath, palette);
    project.palettes.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      type: harmonyType,
      colorCount: colors.length,
    };

    const cmdResult = makeResult(
      'palette:harmony',
      { color: flags.color, type: flags.type, name: flags.name },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Palette "${data.name}" created with ${data.colorCount} ${data.type} harmony colors`);
      for (const c of colors) {
        console.log(`  [${c.index}] ${c.hex}`);
      }
    });
  }
}
