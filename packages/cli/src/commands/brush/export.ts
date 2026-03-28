import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, createDefaultPresets, createBrushMask, PixelBuffer, savePNG, formatOutput, makeResult } from '@pixelcreator/core';

export default class BrushExport extends BaseCommand {
  static override description = 'Export a brush mask as a PNG file';

  static override flags = {
    ...BaseCommand.baseFlags,
    id: Flags.string({ description: 'Brush preset ID', required: true }),
    dest: Flags.string({ description: 'Output PNG file path', required: true }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(BrushExport);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const defaults = createDefaultPresets();
    const custom = project.settings?.brushPresets ?? [];
    const all = [...defaults, ...custom];

    const preset = all.find(p => p.id === flags.id);
    if (!preset) {
      throw new Error(`Brush preset not found: ${flags.id}`);
    }

    const mask = createBrushMask(preset);
    const h = mask.length;
    const w = mask[0]?.length ?? 0;
    const buffer = new PixelBuffer(w, h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y][x]) {
          buffer.setPixel(x, y, { r: 255, g: 255, b: 255, a: 255 });
        }
      }
    }

    savePNG(buffer, flags.dest);

    const result = makeResult('brush:export', { id: flags.id, dest: flags.dest }, { id: preset.id, name: preset.name, dest: flags.dest, width: w, height: h }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      this.log(`Exported brush "${r.name}" mask to ${r.dest} (${r.width}x${r.height})`);
    });
  }
}
