import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON, writePaletteJSON } from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class PaletteConstraints extends BaseCommand {
  static description = 'View or update palette constraints';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Palette name',
      required: true,
    }),
    'max-colors': Flags.integer({
      description: 'Maximum number of colors allowed',
    }),
    locked: Flags.string({
      description: 'Lock palette (true/false)',
    }),
    'allow-alpha': Flags.string({
      description: 'Allow alpha transparency (true/false)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteConstraints);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const palette = readPaletteJSON(projectPath, flags.name);

    const hasSetter = flags['max-colors'] !== undefined || flags.locked !== undefined || flags['allow-alpha'] !== undefined;

    if (!hasSetter) {
      const resultData = { palette: flags.name, constraints: palette.constraints, changes: [] as string[] };
      const cmdResult = makeResult('palette:constraints', { name: flags.name }, resultData, startTime);
      formatOutput(format, cmdResult, (data) => {
        this.log(`Palette "${data.palette}" constraints:`);
        this.log(`  Max colors: ${data.constraints.maxColors}`);
        this.log(`  Locked: ${data.constraints.locked}`);
        this.log(`  Allow alpha: ${data.constraints.allowAlpha}`);
      });
      return;
    }

    const changes: string[] = [];

    if (flags['max-colors'] !== undefined) {
      if (flags['max-colors'] < 1) {
        this.error('--max-colors must be at least 1.');
      }
      changes.push(`maxColors: ${palette.constraints.maxColors} -> ${flags['max-colors']}`);
      palette.constraints.maxColors = flags['max-colors'];
    }

    if (flags.locked !== undefined) {
      if (flags.locked !== 'true' && flags.locked !== 'false') {
        this.error('--locked must be "true" or "false".');
      }
      const val = flags.locked === 'true';
      changes.push(`locked: ${palette.constraints.locked} -> ${val}`);
      palette.constraints.locked = val;
    }

    if (flags['allow-alpha'] !== undefined) {
      if (flags['allow-alpha'] !== 'true' && flags['allow-alpha'] !== 'false') {
        this.error('--allow-alpha must be "true" or "false".');
      }
      const val = flags['allow-alpha'] === 'true';
      changes.push(`allowAlpha: ${palette.constraints.allowAlpha} -> ${val}`);
      palette.constraints.allowAlpha = val;
    }

    writePaletteJSON(projectPath, palette);

    const resultData = { palette: flags.name, constraints: palette.constraints, changes };
    const cmdResult = makeResult('palette:constraints', { name: flags.name, 'max-colors': flags['max-colors'], locked: flags.locked, 'allow-alpha': flags['allow-alpha'] }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Palette "${data.palette}" constraints updated:`);
      for (const c of data.changes) {
        this.log(`  ${c}`);
      }
    });
  }
}
