import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readPaletteJSON, writePaletteJSON, parseGpl, parseJasc, parseHex, detectPaletteFormat, rgbaToHex, formatOutput, makeResult } from '@pixelcreator/core';
import type { PaletteColorRgb, PaletteData, PaletteColor } from '@pixelcreator/core';

export default class PaletteImport extends BaseCommand {
  static override description = 'Import a palette from GPL, JASC, or HEX file';

  static override flags = {
    ...BaseCommand.baseFlags,
    file: Flags.string({ description: 'Source palette file path', required: true }),
    name: Flags.string({ description: 'Palette name in project', required: true }),
    format: Flags.string({ description: 'Format: auto, gpl, jasc, hex', default: 'auto', options: ['auto', 'gpl', 'jasc', 'hex'] }),
    merge: Flags.boolean({ description: 'Merge into existing palette', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PaletteImport);
    const projectPath = getProjectPath(flags.project);

    const content = fs.readFileSync(flags.file, 'utf-8');
    let fmt = flags.format;
    if (fmt === 'auto') {
      const detected = detectPaletteFormat(content);
      if (!detected) throw new Error('Could not detect palette format. Use --format to specify.');
      fmt = detected;
    }

    let parsed: PaletteColorRgb[];
    const paletteName = flags.name;

    switch (fmt) {
      case 'gpl': {
        const gpl = parseGpl(content);
        parsed = gpl.colors;
        break;
      }
      case 'jasc':
        parsed = parseJasc(content).colors;
        break;
      case 'hex':
        parsed = parseHex(content).colors;
        break;
      default:
        throw new Error(`Unknown format: ${fmt}`);
    }

    const newColors: PaletteColor[] = parsed.map((c, i) => ({
      index: i,
      hex: rgbaToHex({ r: c.r, g: c.g, b: c.b, a: 255 }),
      name: c.name,
      group: null,
    }));

    const project = readProjectJSON(projectPath);

    if (flags.merge && project.palettes.includes(flags.name)) {
      const existing = readPaletteJSON(projectPath, flags.name);
      const existingHexes = new Set(existing.colors.map((c) => c.hex));
      let nextIndex = existing.colors.length;
      for (const c of newColors) {
        if (!existingHexes.has(c.hex)) {
          c.index = nextIndex++;
          existing.colors.push(c);
          existingHexes.add(c.hex);
        }
      }
      writePaletteJSON(projectPath, existing);
    } else {
      if (project.palettes.includes(flags.name) && !flags.merge) {
        throw new Error(`Palette "${flags.name}" already exists. Use --merge to add colors.`);
      }

      const palette: PaletteData = {
        name: paletteName,
        description: `Imported from ${flags.file}`,
        colors: newColors,
        constraints: { maxColors: 256, locked: false, allowAlpha: true },
        ramps: [],
      };
      writePaletteJSON(projectPath, palette);

      if (!project.palettes.includes(flags.name)) {
        project.palettes.push(flags.name);
        writeProjectJSON(projectPath, project);
      }
    }

    const result = makeResult('palette:import', { file: flags.file, name: flags.name, format: fmt, merge: flags.merge }, { name: flags.name, format: fmt, colorCount: newColors.length, merge: flags.merge }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Imported ${r.colorCount} colors into palette "${r.name}" (${r.format})${r.merge ? ' (merged)' : ''}`);
    });
  }
}
