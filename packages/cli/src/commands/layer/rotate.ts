import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, readLayerFrame, writeLayerFrame, rotateBuffer90, formatOutput, makeResult } from '@pixelcreator/core';

export default class LayerRotate extends BaseCommand {
  static description = 'Rotate a layer by 90, 180, or 270 degrees';

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
    angle: Flags.string({
      description: 'Rotation angle: 90, 180, 270',
      required: true,
      options: ['90', '180', '270'],
    }),
    frame: Flags.string({
      description: 'Target specific frame ID',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(LayerRotate);

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

    const turns = (parseInt(flags.angle, 10) / 90) as 1 | 2 | 3;

    // 90/270 on non-square canvas is an error for single layer rotation
    if (turns !== 2 && canvas.width !== canvas.height) {
      this.error('Cannot rotate a single layer by 90/270 in a non-square canvas.');
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
      const rotated = rotateBuffer90(buffer, turns);
      writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, rotated);
      framesProcessed++;
    }

    const resultData = {
      canvas: flags.canvas,
      layer: flags.layer,
      angle: parseInt(flags.angle, 10),
      framesProcessed,
    };

    const cmdResult = makeResult(
      'layer:rotate',
      { canvas: flags.canvas, layer: flags.layer, angle: flags.angle, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Layer "${data.layer}" in canvas "${data.canvas}" rotated ${data.angle}°`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
