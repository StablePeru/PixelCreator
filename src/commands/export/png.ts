import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
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

export default class ExportPng extends BaseCommand {
  static description = 'Export a canvas frame as PNG';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination file path',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Frame ID to export (default: first frame)',
    }),
    layer: Flags.string({
      char: 'l',
      description: 'Export only this layer ID',
    }),
    scale: Flags.integer({
      description: 'Scale factor (nearest-neighbor)',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportPng);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const frameId = flags.frame ?? canvas.frames[0]?.id;
    if (!frameId) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const frameExists = canvas.frames.some((f) => f.id === frameId);
    if (!frameExists) {
      this.error(`Frame "${frameId}" not found in canvas "${flags.canvas}".`);
    }

    let buffer: PixelBuffer;

    if (flags.layer) {
      const layerInfo = canvas.layers.find((l) => l.id === flags.layer);
      if (!layerInfo) {
        this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
      }

      buffer = readLayerFrame(projectPath, flags.canvas, flags.layer, frameId);
    } else {
      const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
      }));

      buffer = flattenLayers(layersWithBuffers, canvas.width, canvas.height);
    }

    if (flags.scale > 1) {
      buffer = scaleBuffer(buffer, flags.scale);
    }

    const destPath = path.resolve(flags.dest);
    savePNG(buffer, destPath);

    const resultData = {
      canvas: flags.canvas,
      frame: frameId,
      layer: flags.layer ?? null,
      scale: flags.scale,
      width: buffer.width,
      height: buffer.height,
      dest: destPath,
    };

    const cmdResult = makeResult(
      'export:png',
      { canvas: flags.canvas, dest: flags.dest, frame: flags.frame, layer: flags.layer, scale: flags.scale },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Exported "${data.canvas}" frame ${data.frame} to ${data.dest}`);
      this.log(`  Size: ${data.width}x${data.height} (scale ${data.scale}x)`);
      if (data.layer) {
        this.log(`  Layer: ${data.layer}`);
      } else {
        this.log(`  Layers: flattened`);
      }
    });
  }
}
