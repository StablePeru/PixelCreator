import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  writeProjectJSON,
  writePaletteJSON,
} from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { PaletteData, PaletteColor } from '../../types/palette.js';

export default class PaletteCreate extends BaseCommand {
  static description = 'Create a new color palette';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
    colors: Flags.string({
      description: 'Comma-separated hex colors (e.g. "#ff0000,#00ff00,#0000ff")',
      required: true,
    }),
    'max-colors': Flags.integer({
      description: 'Maximum number of colors allowed',
      default: 256,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteCreate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.palettes.includes(flags.name)) {
      this.error(`Palette "${flags.name}" already exists in this project.`);
    }

    const hexValues = flags.colors.split(',').map((c) => c.trim());

    if (hexValues.length > flags['max-colors']) {
      this.error(`Too many colors: ${hexValues.length} exceeds max of ${flags['max-colors']}.`);
    }

    const colors: PaletteColor[] = hexValues.map((hex, index) => ({
      index,
      hex: hex.startsWith('#') ? hex : `#${hex}`,
      name: null,
      group: null,
    }));

    const palette: PaletteData = {
      name: flags.name,
      description: '',
      colors,
      constraints: {
        maxColors: flags['max-colors'],
        locked: false,
        allowAlpha: true,
      },
      ramps: [],
    };

    writePaletteJSON(projectPath, palette);

    project.palettes.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      colorCount: colors.length,
      maxColors: flags['max-colors'],
      colors: colors.map((c) => c.hex),
    };

    const cmdResult = makeResult(
      'palette:create',
      { name: flags.name, colors: flags.colors, 'max-colors': flags['max-colors'] },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Palette "${data.name}" created with ${data.colorCount} colors`);
      for (const hex of data.colors) {
        this.log(`  ${hex}`);
      }
    });
  }
}
