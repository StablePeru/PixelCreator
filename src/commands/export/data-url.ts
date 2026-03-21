import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame } from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { scaleBuffer } from '../../core/frame-renderer.js';
import { encodePNG } from '../../io/png-codec.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportDataUrl extends BaseCommand {
  static override description = 'Export canvas frame as base64 data URL';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Destination text file (omit for stdout)' }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first)' }),
    scale: Flags.integer({ description: 'Scale factor', default: 1 }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportDataUrl);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!frameId) throw new Error('Canvas has no frames');

    const lwb: LayerWithBuffer[] = canvas.layers.map((l) => ({
      info: l,
      buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
    }));
    let buf = flattenLayers(lwb, canvas.width, canvas.height);
    if (flags.scale > 1) buf = scaleBuffer(buf, flags.scale);

    const pngData = encodePNG(buf);
    const base64 = pngData.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    if (flags.dest) {
      const dir = path.dirname(flags.dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(flags.dest, dataUrl, 'utf-8');
    }

    const result = makeResult('export:data-url', { canvas: flags.canvas, dest: flags.dest }, { dataUrl: flags.dest ? `(written to ${flags.dest})` : dataUrl, length: dataUrl.length }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      if (flags.dest) {
        console.log(`Data URL (${r.length} chars) written to ${flags.dest}`);
      } else {
        console.log(dataUrl);
      }
    });
  }
}
