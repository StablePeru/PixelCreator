import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, flattenLayers, encodeSvg, formatOutput, makeResult } from '@pixelcreator/core';
import type { LayerWithBuffer } from '@pixelcreator/core';

export default class ExportSvg extends BaseCommand {
  static override description = 'Export a canvas frame as SVG (each pixel as a rect)';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Destination SVG file path', required: true }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    layer: Flags.string({ char: 'l', description: 'Export single layer only' }),
    scale: Flags.integer({ description: 'Pixel size in SVG units', default: 10 }),
    grid: Flags.boolean({ description: 'Show grid lines', default: false }),
    background: Flags.string({ description: 'Background color hex' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportSvg);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!frameId) throw new Error('Canvas has no frames');

    let buffer;
    if (flags.layer) {
      buffer = readLayerFrame(projectPath, flags.canvas, flags.layer, frameId);
    } else {
      const layerBuffers: LayerWithBuffer[] = canvas.layers.map((l) => ({
        info: l,
        buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
      }));
      buffer = flattenLayers(layerBuffers, canvas.width, canvas.height);
    }

    const svg = encodeSvg(buffer, {
      pixelSize: flags.scale,
      showGrid: flags.grid,
      gridColor: '#cccccc',
      background: flags.background || null,
    });

    const dir = path.dirname(flags.dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(flags.dest, svg, 'utf-8');

    const result = makeResult('export:svg', { canvas: flags.canvas, dest: flags.dest, scale: flags.scale, grid: flags.grid }, { dest: flags.dest, width: canvas.width, height: canvas.height, scale: flags.scale }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported ${r.width}x${r.height} canvas to SVG at ${r.dest} (scale: ${r.scale})`);
    });
  }
}
