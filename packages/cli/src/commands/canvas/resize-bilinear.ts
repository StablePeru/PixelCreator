import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, scaleBufferBilinear, formatOutput, makeResult } from '@pixelcreator/core';

export default class CanvasResizeBilinear extends BaseCommand {
  static description = 'Scale a canvas using bilinear interpolation';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    width: Flags.integer({
      char: 'w',
      description: 'Target width',
    }),
    height: Flags.integer({
      char: 'h',
      description: 'Target height',
    }),
    factor: Flags.string({
      char: 'f',
      description: 'Scale factor (multiplies both dimensions)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasResizeBilinear);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const hasFactor = flags.factor !== undefined;
    const hasDimensions = flags.width !== undefined || flags.height !== undefined;

    if (hasFactor && hasDimensions) {
      this.error('Use --factor or --width/--height, not both.');
    }
    if (!hasFactor && !hasDimensions) {
      this.error('Specify --factor or --width and --height.');
    }

    let newWidth: number;
    let newHeight: number;

    if (hasFactor) {
      const factor = parseFloat(flags.factor!);
      if (isNaN(factor) || factor <= 0) {
        this.error('Factor must be a positive number.');
      }
      newWidth = Math.round(canvas.width * factor);
      newHeight = Math.round(canvas.height * factor);
    } else {
      if (!flags.width || !flags.height) {
        this.error('Both --width and --height are required when not using --factor.');
      }
      if (flags.width < 1 || flags.height < 1) {
        this.error('Width and height must be at least 1.');
      }
      newWidth = flags.width;
      newHeight = flags.height;
    }

    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    for (const layer of canvas.layers) {
      for (const frame of canvas.frames) {
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        const scaled = scaleBufferBilinear(buffer, newWidth, newHeight);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, scaled);
      }
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      oldWidth,
      oldHeight,
      newWidth,
      newHeight,
    };

    const cmdResult = makeResult(
      'canvas:resize-bilinear',
      { canvas: flags.canvas, width: flags.width, height: flags.height, factor: flags.factor },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      console.log(`Canvas "${flags.canvas}" scaled (bilinear) from ${data.oldWidth}x${data.oldHeight} to ${data.newWidth}x${data.newHeight}`);
    });
  }
}
