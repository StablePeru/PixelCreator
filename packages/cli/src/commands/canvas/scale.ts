import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, scaleBufferNearest, formatOutput, makeResult } from '@pixelcreator/core';

export default class CanvasScale extends BaseCommand {
  static description = 'Scale a canvas using nearest-neighbor interpolation';

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
    factor: Flags.integer({
      char: 'f',
      description: 'Scale factor (integer >= 1)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasScale);

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
    let method: string;

    if (hasFactor) {
      if (flags.factor! < 1) {
        this.error('Factor must be at least 1.');
      }
      newWidth = canvas.width * flags.factor!;
      newHeight = canvas.height * flags.factor!;
      method = 'factor';
    } else {
      if (!flags.width || !flags.height) {
        this.error('Both --width and --height are required when not using --factor.');
      }
      if (flags.width < 1 || flags.height < 1) {
        this.error('Width and height must be at least 1.');
      }
      newWidth = flags.width;
      newHeight = flags.height;
      method = 'dimensions';
    }

    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    let layersProcessed = 0;
    let framesProcessed = 0;

    for (const layer of canvas.layers) {
      layersProcessed++;
      for (const frame of canvas.frames) {
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        const scaled = scaleBufferNearest(buffer, newWidth, newHeight);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, scaled);
        framesProcessed++;
      }
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      oldWidth,
      oldHeight,
      newWidth,
      newHeight,
      method,
      layersProcessed,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'canvas:scale',
      { canvas: flags.canvas, width: flags.width, height: flags.height, factor: flags.factor },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.canvas}" scaled from ${data.oldWidth}x${data.oldHeight} to ${data.newWidth}x${data.newHeight}`);
      this.log(`  Method: ${data.method}`);
      this.log(`  Layers processed: ${data.layersProcessed}`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
