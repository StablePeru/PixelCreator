import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, hueShift, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerHueShift extends BaseCommand {
  static description = 'Shift hue of a layer';

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
    degrees: Flags.integer({
      description: 'Hue shift in degrees (-360 to 360)',
      required: true,
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerHueShift);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.degrees < -360 || flags.degrees > 360) {
      this.error('Degrees must be between -360 and 360.');
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
      const adjusted = hueShift(buffer, flags.degrees);
      writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, adjusted);
      framesProcessed++;
    }

    const resultData = {
      canvas: flags.canvas,
      layer: flags.layer,
      degrees: flags.degrees,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'layer:hue-shift',
      { canvas: flags.canvas, layer: flags.layer, degrees: flags.degrees, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.layer}" hue shifted by ${data.degrees}°`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
