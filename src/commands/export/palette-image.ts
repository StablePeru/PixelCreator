import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readPaletteJSON } from '../../io/project-io.js';
import { PixelBuffer, savePNG } from '../../io/png-codec.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportPaletteImage extends BaseCommand {
  static override description = 'Export a palette as a PNG swatch image';

  static override flags = {
    ...BaseCommand.baseFlags,
    palette: Flags.string({ description: 'Palette name', required: true }),
    dest: Flags.string({ description: 'Destination PNG file path', required: true }),
    columns: Flags.integer({ description: 'Number of columns', default: 8 }),
    'cell-size': Flags.integer({ description: 'Size of each color cell in pixels', default: 16 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportPaletteImage);
    const projectPath = getProjectPath(flags.project);

    const palette = readPaletteJSON(projectPath, flags.palette);
    const cols = flags.columns;
    const cellSize = flags['cell-size'];
    const rows = Math.ceil(palette.colors.length / cols);
    const width = cols * cellSize;
    const height = rows * cellSize;

    const buffer = new PixelBuffer(width, height);
    for (let i = 0; i < palette.colors.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const color = hexToRGBA(palette.colors[i].hex);
      for (let y = row * cellSize; y < (row + 1) * cellSize; y++) {
        for (let x = col * cellSize; x < (col + 1) * cellSize; x++) {
          buffer.setPixel(x, y, color);
        }
      }
    }

    savePNG(buffer, flags.dest);

    const result = makeResult('export:palette-image', { palette: flags.palette, dest: flags.dest }, { palette: flags.palette, colorCount: palette.colors.length, width, height, dest: flags.dest }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported palette "${r.palette}" (${r.colorCount} colors) as ${r.width}x${r.height} PNG to ${r.dest}`);
    });
  }
}
