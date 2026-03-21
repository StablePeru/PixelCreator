import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
} from '../../io/project-io.js';
import { rotateBuffer90 } from '../../core/transform-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasRotate extends BaseCommand {
  static description = 'Rotate a canvas by 90, 180, or 270 degrees';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    angle: Flags.string({
      description: 'Rotation angle: 90, 180, 270',
      required: true,
      options: ['90', '180', '270'],
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
    const { flags } = await this.parse(CanvasRotate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const turns = (parseInt(flags.angle, 10) / 90) as 1 | 2 | 3;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    // 90/270 with --layer on non-square canvas is an error
    if (flags.layer && turns !== 2 && canvas.width !== canvas.height) {
      this.error('Cannot rotate a single layer by 90/270 in a non-square canvas.');
    }

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
        const rotated = rotateBuffer90(buffer, turns);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, rotated);
        framesProcessed++;
      }
    }

    // Update canvas dimensions for 90/270 when rotating all layers
    if (!flags.layer && turns !== 2) {
      canvas.width = oldHeight;
      canvas.height = oldWidth;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      angle: parseInt(flags.angle, 10),
      oldWidth,
      oldHeight,
      newWidth: canvas.width,
      newHeight: canvas.height,
      layersProcessed,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'canvas:rotate',
      { canvas: flags.canvas, angle: flags.angle, layer: flags.layer, frame: flags.frame },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.canvas}" rotated ${data.angle}°`);
      this.log(`  Size: ${data.oldWidth}x${data.oldHeight} → ${data.newWidth}x${data.newHeight}`);
      this.log(`  Layers processed: ${data.layersProcessed}`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
