import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, flattenLayers, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class ExportCss extends BaseCommand {
  static override description = 'Export pixel art as CSS box-shadow art';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Destination CSS file path', required: true }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    scale: Flags.integer({ description: 'Pixel size in CSS px', default: 1 }),
    selector: Flags.string({ description: 'CSS selector', default: '.pixel-art' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportCss);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!frameId) throw new Error('Canvas has no frames');

    const layerBuffers: LayerWithBuffer[] = canvas.layers.map((l) => ({
      info: l,
      buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
    }));
    const buffer = flattenLayers(layerBuffers, canvas.width, canvas.height);

    const shadows: string[] = [];
    const scale = flags.scale;
    const spread = scale > 1 ? scale - 1 : 0;

    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const pixel = buffer.getPixel(x, y);
        if (pixel.a === 0) continue;
        const r = pixel.r.toString(16).padStart(2, '0');
        const g = pixel.g.toString(16).padStart(2, '0');
        const b = pixel.b.toString(16).padStart(2, '0');
        const hex = `#${r}${g}${b}`;
        const sx = (x + 1) * scale;
        const sy = (y + 1) * scale;
        if (pixel.a < 255) {
          const opacity = (pixel.a / 255).toFixed(2);
          shadows.push(`${sx}px ${sy}px 0 ${spread}px rgba(${pixel.r},${pixel.g},${pixel.b},${opacity})`);
        } else {
          shadows.push(`${sx}px ${sy}px 0 ${spread}px ${hex}`);
        }
      }
    }

    const css = `${flags.selector} {\n  width: ${scale}px;\n  height: ${scale}px;\n  box-shadow:\n    ${shadows.join(',\n    ')};\n}\n`;

    const dir = path.dirname(flags.dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(flags.dest, css, 'utf-8');

    const result = makeResult('export:css', { canvas: flags.canvas, dest: flags.dest, scale, selector: flags.selector }, { dest: flags.dest, pixelCount: shadows.length, selector: flags.selector }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported ${r.pixelCount} pixels as CSS box-shadow to ${r.dest}`);
    });
  }
}
