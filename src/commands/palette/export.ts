import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON } from '../../io/project-io.js';
import { serializeGpl, serializeJasc, serializeHex } from '../../io/palette-codec.js';
import type { PaletteColorRgb } from '../../io/palette-codec.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class PaletteExport extends BaseCommand {
  static override description = 'Export a palette to GPL, JASC, or HEX format';

  static override flags = {
    ...BaseCommand.baseFlags,
    palette: Flags.string({ description: 'Palette name', required: true }),
    format: Flags.string({ description: 'Output format: gpl, jasc, hex', required: true, options: ['gpl', 'jasc', 'hex'] }),
    dest: Flags.string({ description: 'Destination file path', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteExport);
    const projectPath = getProjectPath(flags.project);

    const palette = readPaletteJSON(projectPath, flags.palette);
    const colors: PaletteColorRgb[] = palette.colors.map((c) => {
      const rgba = hexToRGBA(c.hex);
      return { r: rgba.r, g: rgba.g, b: rgba.b, name: c.name };
    });

    let output: string;
    switch (flags.format) {
      case 'gpl':
        output = serializeGpl(palette.name, colors);
        break;
      case 'jasc':
        output = serializeJasc(colors);
        break;
      case 'hex':
        output = serializeHex(colors);
        break;
      default:
        throw new Error(`Unknown format: ${flags.format}`);
    }

    const dir = path.dirname(flags.dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(flags.dest, output, 'utf-8');

    const result = makeResult('palette:export', { palette: flags.palette, format: flags.format, dest: flags.dest }, { palette: flags.palette, format: flags.format, colorCount: colors.length, dest: flags.dest }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported ${r.colorCount} colors from "${r.palette}" to ${r.dest} (${r.format})`);
    });
  }
}
