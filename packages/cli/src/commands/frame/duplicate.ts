import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame, reindexFrames, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { FrameInfo } from '@pixelcreator/core';

export default class FrameDuplicate extends BaseCommand {
  static description = 'Duplicate a frame in a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.integer({
      char: 'f',
      description: 'Frame index to duplicate',
      required: true,
    }),
    count: Flags.integer({
      description: 'Number of copies to create',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameDuplicate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const sourceFrame = canvas.frames.find((f) => f.index === flags.frame);
    if (!sourceFrame) {
      this.error(`Frame index ${flags.frame} not found in canvas "${flags.canvas}".`);
    }

    const insertIndex = canvas.frames.indexOf(sourceFrame) + 1;
    const addedFrames: FrameInfo[] = [];

    for (let i = 0; i < flags.count; i++) {
      const tempId = generateSequentialId('frame', canvas.frames.length + i + 1);
      const frame: FrameInfo = {
        id: tempId,
        index: canvas.frames.length + i,
        duration: sourceFrame.duration,
      };

      // Copy PNG data from source for all layers
      for (const layer of canvas.layers) {
        const sourceBuffer = readLayerFrame(projectPath, flags.canvas, layer.id, sourceFrame.id);
        writeLayerFrame(projectPath, flags.canvas, layer.id, tempId, sourceBuffer);
      }

      addedFrames.push(frame);
    }

    // Insert after the source frame
    canvas.frames.splice(insertIndex, 0, ...addedFrames);

    // Reindex all frames
    reindexFrames(projectPath, flags.canvas, canvas);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      sourceFrame: flags.frame,
      duplicated: addedFrames.map((f) => ({ id: f.id, index: f.index })),
      totalFrames: canvas.frames.length,
    };

    const cmdResult = makeResult(
      'frame:duplicate',
      { canvas: flags.canvas, frame: flags.frame, count: flags.count },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Duplicated frame ${data.sourceFrame} in "${data.canvas}" (${data.duplicated.length} copies)`);
      for (const f of data.duplicated) {
        this.log(`  ${f.id} (index ${f.index})`);
      }
      this.log(`  Total frames: ${data.totalFrames}`);
    });
  }
}
