import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, flipBufferH, flipBufferV, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerFlip extends BaseCommand {
  static description = 'Flip a layer horizontally or vertically';

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
    direction: Flags.string({
      char: 'd',
      description: 'Flip direction: horizontal or vertical',
      required: true,
      options: ['horizontal', 'vertical'],
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerFlip);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }
    if (layer.locked) {
      this.error(`Layer "${flags.layer}" is locked.`);
    }

    const flipFn = flags.direction === 'horizontal' ? flipBufferH : flipBufferV;

    const frames = flags.frame
      ? canvas.frames.filter((f) => f.id === flags.frame)
      : canvas.frames;

    if (flags.frame && frames.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }

    let framesProcessed = 0;
    for (const frame of frames) {
      const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      const flipped = flipFn(buffer);
      writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, flipped);
      framesProcessed++;
    }

    const resultData = {
      canvas: flags.canvas,
      layer: flags.layer,
      direction: flags.direction,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'layer:flip',
      { canvas: flags.canvas, layer: flags.layer, direction: flags.direction, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.layer}" in canvas "${data.canvas}" flipped ${data.direction}ly`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
