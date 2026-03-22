import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, readPaletteJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class PaletteList extends BaseCommand {
  static description = 'List all palettes in the project';

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const palettes = project.palettes.map((name) => {
      const palette = readPaletteJSON(projectPath, name);
      return {
        name: palette.name,
        colorCount: palette.colors.length,
      };
    });

    const cmdResult = makeResult(
      'palette:list',
      {},
      { palettes, total: palettes.length },
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      if (data.palettes.length === 0) {
        this.log('No palettes found. Create one with `pxc palette:create`.');
        return;
      }

      this.log(`Palettes (${data.total}):`);
      for (const p of data.palettes) {
        this.log(`  ${p.name} — ${p.colorCount} colors`);
      }
    });
  }
}
