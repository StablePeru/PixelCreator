import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, resizeBuffer, type Anchor, formatOutput, makeResult } from '@pixelcreator/core';

const VALID_ANCHORS: Anchor[] = [
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

export default class CanvasResize extends BaseCommand {
  static description = 'Resize a canvas (crop/extend, no scaling)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    width: Flags.integer({
      char: 'w',
      description: 'New width',
      required: true,
    }),
    height: Flags.integer({
      char: 'h',
      description: 'New height',
      required: true,
    }),
    anchor: Flags.string({
      description: 'Anchor position for resize',
      default: 'top-left',
      options: VALID_ANCHORS as string[],
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasResize);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (flags.width < 1 || flags.height < 1) {
      this.error('Width and height must be at least 1.');
    }

    const anchor = flags.anchor as Anchor;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    // Resize all layer frames
    let framesProcessed = 0;
    for (const layer of canvas.layers) {
      for (const frame of canvas.frames) {
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        const resized = resizeBuffer(buffer, flags.width, flags.height, anchor);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, resized);
        framesProcessed++;
      }
    }

    canvas.width = flags.width;
    canvas.height = flags.height;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      name: flags.canvas,
      oldWidth,
      oldHeight,
      newWidth: flags.width,
      newHeight: flags.height,
      anchor,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'canvas:resize',
      { canvas: flags.canvas, width: flags.width, height: flags.height, anchor },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.name}" resized from ${data.oldWidth}x${data.oldHeight} to ${data.newWidth}x${data.newHeight}`);
      this.log(`  Anchor: ${data.anchor}`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
