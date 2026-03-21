import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readPaletteJSON, writePaletteJSON } from '../../io/project-io.js';
import { loadPNG } from '../../io/png-codec.js';
import { rgbaToHex } from '../../types/common.js';
import type { PaletteData, PaletteColor } from '../../types/palette.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ImportPaletteImage extends BaseCommand {
  static override description = 'Import unique colors from a PNG image as a palette';

  static override flags = {
    ...BaseCommand.baseFlags,
    file: Flags.string({ description: 'Path to PNG image', required: true }),
    name: Flags.string({ char: 'n', description: 'Palette name', required: true }),
    merge: Flags.boolean({ description: 'Merge into existing palette', default: false }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ImportPaletteImage);
    const projectPath = getProjectPath(flags.project);

    const buffer = loadPNG(flags.file);
    const hexSet = new Set<string>();
    const colors: PaletteColor[] = [];

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const pixel = buffer.getPixel(x, y);
        if (pixel.a === 0) continue;
        const hex = rgbaToHex({ r: pixel.r, g: pixel.g, b: pixel.b, a: 255 });
        if (!hexSet.has(hex)) {
          hexSet.add(hex);
          colors.push({ index: colors.length, hex, name: null, group: null });
        }
      }
    }

    const project = readProjectJSON(projectPath);

    if (flags.merge && project.palettes.includes(flags.name)) {
      const existing = readPaletteJSON(projectPath, flags.name);
      const existingHexes = new Set(existing.colors.map((c) => c.hex));
      let nextIndex = existing.colors.length;
      for (const c of colors) {
        if (!existingHexes.has(c.hex)) {
          c.index = nextIndex++;
          existing.colors.push(c);
        }
      }
      writePaletteJSON(projectPath, existing);
    } else {
      if (project.palettes.includes(flags.name) && !flags.merge) {
        throw new Error(`Palette "${flags.name}" already exists. Use --merge to add colors.`);
      }
      const palette: PaletteData = {
        name: flags.name,
        description: `Extracted from ${flags.file}`,
        colors,
        constraints: { maxColors: 256, locked: false, allowAlpha: true },
        ramps: [],
      };
      writePaletteJSON(projectPath, palette);
      if (!project.palettes.includes(flags.name)) {
        project.palettes.push(flags.name);
        writeProjectJSON(projectPath, project);
      }
    }

    const result = makeResult('import:palette-image', { file: flags.file, name: flags.name }, { name: flags.name, colorCount: colors.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Imported ${r.colorCount} unique colors into palette "${r.name}"`);
    });
  }
}
