import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame } from '../../io/project-io.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { sliceNine } from '../../core/nineslice-engine.js';
import { savePNG } from '../../io/png-codec.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class Export9Slice extends BaseCommand {
  static override description = 'Export a canvas frame as 9-slice regions for UI sprites';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Canvas name', required: true }),
    dest: Flags.string({ description: 'Destination directory', required: true }),
    top: Flags.integer({ description: 'Top border size in pixels', required: true }),
    bottom: Flags.integer({ description: 'Bottom border size in pixels', required: true }),
    left: Flags.integer({ description: 'Left border size in pixels', required: true }),
    right: Flags.integer({ description: 'Right border size in pixels', required: true }),
    frame: Flags.string({ char: 'f', description: 'Frame ID (defaults to first frame)' }),
    prefix: Flags.string({ description: 'File name prefix', default: '' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(Export9Slice);
    const projectPath = getProjectPath(flags.project);

    const canvas = readCanvasJSON(projectPath, flags.canvas);
    const frameId = flags.frame || canvas.frames[0]?.id;
    if (!frameId) throw new Error('Canvas has no frames');

    const layerBuffers: LayerWithBuffer[] = canvas.layers.map((l) => ({
      info: l,
      buffer: readLayerFrame(projectPath, flags.canvas, l.id, frameId),
    }));
    const buffer = flattenLayers(layerBuffers, canvas.width, canvas.height);

    const config = { top: flags.top, bottom: flags.bottom, left: flags.left, right: flags.right };
    const { regions, buffers } = sliceNine(buffer, config);

    if (!fs.existsSync(flags.dest)) {
      fs.mkdirSync(flags.dest, { recursive: true });
    }

    const prefix = flags.prefix || flags.canvas;
    const files: string[] = [];
    for (const region of regions) {
      const buf = buffers.get(region.name)!;
      const fileName = `${prefix}_${region.name}.png`;
      savePNG(buf, path.join(flags.dest, fileName));
      files.push(fileName);
    }

    // Write metadata JSON
    const metadata = {
      source: flags.canvas,
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
      borders: config,
      regions: regions.map((r) => ({
        name: r.name,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        file: `${prefix}_${r.name}.png`,
      })),
    };
    fs.writeFileSync(path.join(flags.dest, `${prefix}_9slice.json`), JSON.stringify(metadata, null, 2));

    const result = makeResult('export:9slice', { canvas: flags.canvas, dest: flags.dest }, { dest: flags.dest, regionCount: regions.length, files }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Exported ${r.regionCount} 9-slice regions to ${r.dest}`);
    });
  }
}
