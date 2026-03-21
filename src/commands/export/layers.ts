import * as fs from 'node:fs';
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
import { scaleBufferNearest } from '../../core/transform-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportLayers extends BaseCommand {
  static description = 'Export each layer as a separate PNG file';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination directory',
      required: true,
    }),
    frame: Flags.string({
      char: 'f',
      description: 'Frame ID to export (default: first frame)',
    }),
    scale: Flags.integer({
      description: 'Scale factor (nearest-neighbor)',
      default: 1,
    }),
    prefix: Flags.string({
      description: 'File name prefix (default: canvas name)',
    }),
    flatten: Flags.boolean({
      description: 'Also export a flattened composite',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportLayers);

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

    const destDir = path.resolve(flags.dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const prefix = flags.prefix ?? flags.canvas;
    const files: string[] = [];

    for (const layerInfo of canvas.layers) {
      let buffer = readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId);

      if (flags.scale > 1) {
        buffer = scaleBufferNearest(buffer, buffer.width * flags.scale, buffer.height * flags.scale);
      }

      const fileName = `${prefix}_${layerInfo.name}.png`;
      const filePath = path.join(destDir, fileName);
      savePNG(buffer, filePath);
      files.push(filePath);
    }

    if (flags.flatten) {
      const layersWithBuffers: LayerWithBuffer[] = canvas.layers.map((layerInfo) => ({
        info: layerInfo,
        buffer: readLayerFrame(projectPath, flags.canvas, layerInfo.id, frameId),
      }));

      let flattened = flattenLayers(layersWithBuffers, canvas.width, canvas.height);

      if (flags.scale > 1) {
        flattened = scaleBufferNearest(flattened, flattened.width * flags.scale, flattened.height * flags.scale);
      }

      const flatFile = path.join(destDir, `${prefix}_flattened.png`);
      savePNG(flattened, flatFile);
      files.push(flatFile);
    }

    const resultData = {
      canvas: flags.canvas,
      frame: frameId,
      layersExported: canvas.layers.length,
      files,
      scale: flags.scale,
    };

    const cmdResult = makeResult(
      'export:layers',
      { canvas: flags.canvas, dest: flags.dest, frame: flags.frame, scale: flags.scale, prefix: flags.prefix, flatten: flags.flatten },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Exported ${data.layersExported} layers from "${data.canvas}"`);
      for (const f of data.files) {
        this.log(`  ${f}`);
      }
    });
  }
}
