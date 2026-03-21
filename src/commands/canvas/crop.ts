import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
} from '../../io/project-io.js';
import { computeContentBounds, extractRegion } from '../../core/drawing-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasCrop extends BaseCommand {
  static description = 'Crop canvas to content bounds';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    padding: Flags.integer({
      description: 'Padding around content',
      default: 0,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasCrop);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    // Compute global bounding box across all layers and frames
    let globalMinX = canvas.width;
    let globalMinY = canvas.height;
    let globalMaxX = -1;
    let globalMaxY = -1;

    for (const layer of canvas.layers) {
      for (const frame of canvas.frames) {
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        const bounds = computeContentBounds(buffer);
        if (bounds) {
          globalMinX = Math.min(globalMinX, bounds.x);
          globalMinY = Math.min(globalMinY, bounds.y);
          globalMaxX = Math.max(globalMaxX, bounds.x + bounds.width - 1);
          globalMaxY = Math.max(globalMaxY, bounds.y + bounds.height - 1);
        }
      }
    }

    if (globalMaxX === -1) {
      this.error('Canvas is entirely transparent — nothing to crop.');
    }

    // Apply padding (clamped to canvas bounds)
    const pad = Math.max(0, flags.padding);
    const cropX = Math.max(0, globalMinX - pad);
    const cropY = Math.max(0, globalMinY - pad);
    const cropRight = Math.min(canvas.width - 1, globalMaxX + pad);
    const cropBottom = Math.min(canvas.height - 1, globalMaxY + pad);
    const newWidth = cropRight - cropX + 1;
    const newHeight = cropBottom - cropY + 1;

    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    // Extract region for each layer/frame
    let framesProcessed = 0;
    for (const layer of canvas.layers) {
      for (const frame of canvas.frames) {
        const buffer = readLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
        const cropped = extractRegion(buffer, cropX, cropY, newWidth, newHeight);
        writeLayerFrame(projectPath, flags.canvas, layer.id, frame.id, cropped);
        framesProcessed++;
      }
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      name: flags.canvas,
      oldWidth,
      oldHeight,
      newWidth,
      newHeight,
      contentBounds: {
        x: globalMinX,
        y: globalMinY,
        width: globalMaxX - globalMinX + 1,
        height: globalMaxY - globalMinY + 1,
      },
      padding: pad,
      framesProcessed,
    };

    const cmdResult = makeResult(
      'canvas:crop',
      { canvas: flags.canvas, padding: flags.padding },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.name}" cropped from ${data.oldWidth}x${data.oldHeight} to ${data.newWidth}x${data.newHeight}`);
      this.log(`  Content bounds: (${data.contentBounds.x},${data.contentBounds.y}) ${data.contentBounds.width}x${data.contentBounds.height}`);
      this.log(`  Padding: ${data.padding}`);
      this.log(`  Frames processed: ${data.framesProcessed}`);
    });
  }
}
