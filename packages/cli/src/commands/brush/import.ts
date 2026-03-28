import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, loadPNG, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { BrushPreset } from '@pixelcreator/core';

export default class BrushImport extends BaseCommand {
  static override description = 'Import a brush pattern from a PNG file (alpha channel becomes mask)';

  static override flags = {
    ...BaseCommand.baseFlags,
    file: Flags.string({ description: 'Path to PNG file', required: true }),
    name: Flags.string({ description: 'Brush preset name', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(BrushImport);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const buffer = loadPNG(flags.file);
    const size = Math.max(buffer.width, buffer.height);

    const pattern: boolean[][] = [];
    for (let y = 0; y < buffer.height; y++) {
      pattern[y] = [];
      for (let x = 0; x < buffer.width; x++) {
        const pixel = buffer.getPixel(x, y);
        pattern[y][x] = pixel.a > 127;
      }
    }

    if (!project.settings.brushPresets) {
      project.settings.brushPresets = [];
    }

    const id = generateSequentialId('brush', project.settings.brushPresets.length + 9);
    const preset: BrushPreset = {
      id,
      name: flags.name,
      size,
      shape: 'custom',
      pattern,
      spacing: 1,
      opacity: 255,
      pixelPerfect: false,
    };

    project.settings.brushPresets.push(preset);
    writeProjectJSON(projectPath, project);

    const result = makeResult('brush:import', { file: flags.file, name: flags.name }, { id, name: flags.name, size, width: buffer.width, height: buffer.height }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Imported brush "${r.name}" (${r.id}) from PNG — ${r.width}x${r.height}px`);
    });
  }
}
