import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
  readPaletteJSON,
} from '../../io/project-io.js';
import { ditherBuffer } from '../../core/transform-engine.js';
import { hexToRGBA } from '../../types/common.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class LayerDither extends BaseCommand {
  static description = 'Apply dithering to a layer using a palette';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    layer: Flags.string({
      description: 'Layer ID',
      required: true,
    }),
    palette: Flags.string({
      description: 'Palette name',
      required: true,
    }),
    method: Flags.string({
      description: 'Dithering method (ordered or floyd-steinberg)',
      default: 'ordered',
      options: ['ordered', 'floyd-steinberg'],
    }),
    matrix: Flags.integer({
      description: 'Bayer matrix size for ordered dithering (2, 4, or 8)',
      default: 4,
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerDither);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (![2, 4, 8].includes(flags.matrix)) {
      this.error('Matrix size must be 2, 4, or 8.');
    }

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }
    if (layer.locked) {
      this.error(`Layer "${flags.layer}" is locked.`);
    }

    const paletteData = readPaletteJSON(projectPath, flags.palette);
    const paletteRGBA = paletteData.colors.map((c) => hexToRGBA(c.hex));

    const frames = flags.frame
      ? canvas.frames.filter((f) => f.id === flags.frame)
      : canvas.frames;

    if (flags.frame && frames.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }

    let framesProcessed = 0;
    for (const frame of frames) {
      const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      const dithered = ditherBuffer(
        buffer,
        paletteRGBA,
        flags.method as 'ordered' | 'floyd-steinberg',
        flags.matrix as 2 | 4 | 8,
      );
      writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, dithered);
      framesProcessed++;
    }

    const resultData = {
      canvas: flags.canvas,
      layer: flags.layer,
      palette: flags.palette,
      method: flags.method,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'layer:dither',
      { canvas: flags.canvas, layer: flags.layer, palette: flags.palette, method: flags.method, matrix: flags.matrix, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.layer}" dithered using palette "${data.palette}" (${data.method})`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
