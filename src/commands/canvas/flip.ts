import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
} from '../../io/project-io.js';
import { flipBufferH, flipBufferV } from '../../core/transform-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasFlip extends BaseCommand {
  static description = 'Flip a canvas horizontally or vertically';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    direction: Flags.string({
      char: 'd',
      description: 'Flip direction: horizontal or vertical',
      required: true,
      options: ['horizontal', 'vertical'],
    }),
    layer: Flags.string({
      description: 'Target specific layer ID',
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasFlip);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const flipFn = flags.direction === 'horizontal' ? flipBufferH : flipBufferV;

    const layers = flags.layer
      ? canvas.layers.filter((l) => l.id === flags.layer)
      : canvas.layers;

    if (flags.layer && layers.length === 0) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }

    if (flags.layer && layers[0].locked) {
      this.error(`Layer "${flags.layer}" is locked.`);
    }

    const frames = flags.frame
      ? canvas.frames.filter((f) => f.id === flags.frame)
      : canvas.frames;

    if (flags.frame && frames.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }

    let layersProcessed = 0;
    let framesProcessed = 0;

    for (const layer of layers) {
      if (!flags.layer && layer.locked) continue;
      layersProcessed++;
      for (const frame of frames) {
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        const flipped = flipFn(buffer);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, flipped);
        framesProcessed++;
      }
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      direction: flags.direction,
      layersProcessed,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'canvas:flip',
      { canvas: flags.canvas, direction: flags.direction, layer: flags.layer, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.canvas}" flipped ${data.direction}ly`);
      this.log(`  Layers processed: ${data.layersProcessed}`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
