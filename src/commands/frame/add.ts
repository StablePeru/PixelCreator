import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
  readLayerFrame,
  writeLayerFrame,
} from '../../io/project-io.js';
import { createEmptyBuffer } from '../../io/png-codec.js';
import { generateSequentialId } from '../../utils/id-generator.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { FrameInfo } from '../../types/canvas.js';

export default class FrameAdd extends BaseCommand {
  static description = 'Add new frame(s) to a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    after: Flags.integer({
      description: 'Frame index to insert after',
    }),
    'copy-from': Flags.integer({
      description: 'Frame index to copy pixel data from',
    }),
    count: Flags.integer({
      description: 'Number of frames to add',
      default: 1,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameAdd);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    const insertIndex = flags.after !== undefined ? flags.after + 1 : canvas.frames.length;

    let sourceFrameId: string | null = null;
    if (flags['copy-from'] !== undefined) {
      const sourceFrame = canvas.frames.find((f) => f.index === flags['copy-from']);
      if (!sourceFrame) {
        this.error(`Frame index ${flags['copy-from']} not found in canvas "${flags.canvas}".`);
      }

      sourceFrameId = sourceFrame.id;
    }

    const addedFrames: FrameInfo[] = [];
    const nextBaseIndex = canvas.frames.length;

    for (let i = 0; i < flags.count; i++) {
      const frameIndex = nextBaseIndex + i;
      const frameId = generateSequentialId('frame', frameIndex + 1);

      const frame: FrameInfo = {
        id: frameId,
        index: frameIndex,
        duration: 100,
      };

      for (const layer of canvas.layers) {
        if (sourceFrameId) {
          const sourceBuffer = readLayerFrame(projectPath, flags.canvas, layer.id, sourceFrameId);
          writeLayerFrame(projectPath, flags.canvas, layer.id, frameId, sourceBuffer);
        } else {
          const emptyBuffer = createEmptyBuffer(canvas.width, canvas.height);
          writeLayerFrame(projectPath, flags.canvas, layer.id, frameId, emptyBuffer);
        }
      }

      addedFrames.push(frame);
    }

    // Insert frames at the correct position and reindex
    canvas.frames.splice(insertIndex, 0, ...addedFrames);
    for (let i = 0; i < canvas.frames.length; i++) {
      canvas.frames[i].index = i;
    }

    // Adjust animation tag boundaries
    for (const tag of canvas.animationTags) {
      if (insertIndex <= tag.from) {
        tag.from += flags.count;
        tag.to += flags.count;
      } else if (insertIndex <= tag.to) {
        tag.to += flags.count;
      }
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      added: addedFrames.map((f) => ({ id: f.id, index: f.index })),
      totalFrames: canvas.frames.length,
      copiedFrom: flags['copy-from'] ?? null,
    };

    const cmdResult = makeResult(
      'frame:add',
      { canvas: flags.canvas, after: flags.after, 'copy-from': flags['copy-from'], count: flags.count },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Added ${data.added.length} frame(s) to "${data.canvas}"`);
      for (const f of data.added) {
        this.log(`  ${f.id} (index ${f.index})`);
      }

      if (data.copiedFrom !== null) {
        this.log(`  Copied from frame index ${data.copiedFrom}`);
      }

      this.log(`  Total frames: ${data.totalFrames}`);
    });
  }
}
