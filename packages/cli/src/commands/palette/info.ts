import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class PaletteInfo extends BaseCommand {
  static description = 'Show palette information';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.name);

    const resultData = {
      name: palette.name,
      description: palette.description,
      colorCount: palette.colors.length,
      maxColors: palette.constraints.maxColors,
      locked: palette.constraints.locked,
      allowAlpha: palette.constraints.allowAlpha,
      colors: palette.colors,
      ramps: palette.ramps,
    };

    const cmdResult = makeResult('palette:info', { name: flags.name }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Palette: ${data.name}`);
      if (data.description) this.log(`  Description: ${data.description}`);
      this.log(`  Colors: ${data.colorCount}/${data.maxColors}`);
      this.log(`  Locked: ${data.locked}`);
      this.log(`  Allow alpha: ${data.allowAlpha}`);
      if (data.colors.length > 0) {
        this.log('  Colors:');
        for (const c of data.colors) {
          const label = c.name ? ` (${c.name})` : '';
          const group = c.group ? ` [${c.group}]` : '';
          this.log(`    ${c.index}: ${c.hex}${label}${group}`);
        }
      }
      if (data.ramps.length > 0) {
        this.log('  Ramps:');
        for (const r of data.ramps) {
          this.log(`    ${r.name}: [${r.indices.join(', ')}]`);
        }
      }
    });
  }
}
