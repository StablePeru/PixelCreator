import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, adjustBrightness, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerBrightness extends BaseCommand {
  static description = 'Adjust brightness of a layer';

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
    amount: Flags.integer({
      description: 'Brightness adjustment (-255 to 255)',
      required: true,
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerBrightness);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.amount < -255 || flags.amount > 255) {
      this.error('Amount must be between -255 and 255.');
    }

    const layer = canvas.layers.find((l) => l.id === flags.layer);
    if (!layer) {
      this.error(`Layer "${flags.layer}" not found in canvas "${flags.canvas}".`);
    }
    if (layer.locked) {
      this.error(`Layer "${flags.layer}" is locked.`);
    }

    const frames = flags.frame
      ? canvas.frames.filter((f) => f.id === flags.frame)
      : canvas.frames;

    if (flags.frame && frames.length === 0) {
      this.error(`Frame "${flags.frame}" not found in canvas "${flags.canvas}".`);
    }

    let framesProcessed = 0;
    for (const frame of frames) {
      const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      const adjusted = adjustBrightness(buffer, flags.amount);
      writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, adjusted);
      framesProcessed++;
    }

    const resultData = {
      canvas: flags.canvas,
      layer: flags.layer,
      amount: flags.amount,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'layer:brightness',
      { canvas: flags.canvas, layer: flags.layer, amount: flags.amount, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.layer}" brightness adjusted by ${data.amount}`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
