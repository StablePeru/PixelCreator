import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  readCanvasJSON,
  readLayerFrame,
} from '../../io/project-io.js';
import { PixelBuffer, savePNG } from '../../io/png-codec.js';
import { flattenLayers } from '../../core/layer-engine.js';
import type { LayerWithBuffer } from '../../core/layer-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

function scaleBuffer(buffer: PixelBuffer, scale: number): PixelBuffer {
  const newWidth = buffer.width * scale;
  const newHeight = buffer.height * scale;
  const scaled = new PixelBuffer(newWidth, newHeight);

  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const pixel = buffer.getPixel(x, y);
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          scaled.setPixel(x * scale + sx, y * scale + sy, pixel);
        }
      }
    }
  }

  return scaled;
}

export default class ExportBatch extends BaseCommand {
  static description = 'Export multiple canvases at once';

  static flags = {
    ...BaseCommand.baseFlags,
    canvases: Flags.string({
      description: 'Comma-separated list of canvas names (default: all)',
    }),
    dest: Flags.string({
      description: 'Destination directory',
      required: true,
    }),
    scale: Flags.integer({
      description: 'Scale factor (nearest-neighbor)',
      default: 1,
    }),
    format: Flags.string({
      description: 'Export format',
      default: 'png',
      options: ['png'],
    }),
    frame: Flags.integer({
      description: 'Frame index to export (default: 0)',
      default: 0,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportBatch);

    const outputFormat = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const canvasNames = flags.canvases
      ? flags.canvases.split(',').map((s) => s.trim())
      : project.canvases;

    const destDir = path.resolve(flags.dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const exported: { canvas: string; file: string; width: number; height: number }[] = [];
    const failed: { canvas: string; error: string }[] = [];

    for (const canvasName of canvasNames) {
      try {
        const canvas = readCanvasJSON(projectPath, canvasName);

        const frame = canvas.frames[flags.frame];
        if (!frame) {
          failed.push({ canvas: canvasName, error: `Frame index ${flags.frame} not found` });
          continue;
        }

        const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
          info: layerInfo,
          buffer: readLayerFrame(projectPath, canvasName, layerInfo.id, frame.id),
        }));

        let buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);

        if (flags.scale > 1) {
          buffer = scaleBuffer(buffer, flags.scale);
        }

        const fileName = `${canvasName}.png`;
        const filePath = path.join(destDir, fileName);
        savePNG(buffer, filePath);

        exported.push({ canvas: canvasName, file: filePath, width: buffer.width, height: buffer.height });
      } catch (error: any) {
        failed.push({ canvas: canvasName, error: error.message });
      }
    }

    const resultData = {
      exported,
      total: exported.length,
      failed,
    };

    const cmdResult = makeResult('export:batch', {
      canvases: flags.canvases, dest: flags.dest, scale: flags.scale, format: flags.format, frame: flags.frame,
    }, resultData, startTime);

    formatOutput(outputFormat, cmdResult, (data) => {
      this.log(`Batch export complete: ${data.total} canvases exported`);
      for (const e of data.exported) {
        this.log(`  ${e.canvas} -> ${e.file} (${e.width}x${e.height})`);
      }
      if (data.failed.length > 0) {
        this.log(`Failed (${data.failed.length}):`);
        for (const f of data.failed) {
          this.log(`  ${f.canvas}: ${f.error}`);
        }
      }
    });
  }
}
