import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, readLayerFrame, writeLayerFrame } from '../../io/project-io.js';
import { generateSequentialId } from '../../utils/id-generator.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class FrameCopyTo extends BaseCommand {
  static override description = 'Copy frames from one canvas to another';

  static override flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({ char: 'c', description: 'Source canvas name', required: true }),
    target: Flags.string({ description: 'Target canvas name', required: true }),
    frame: Flags.integer({ description: 'Single frame index to copy' }),
    range: Flags.string({ description: 'Frame range to copy: "0-3"' }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameCopyTo);
    const projectPath = getProjectPath(flags.project);

    const srcCanvas = readCanvasJSON(projectPath, flags.canvas);
    const dstCanvas = readCanvasJSON(projectPath, flags.target);

    if (srcCanvas.width !== dstCanvas.width || srcCanvas.height !== dstCanvas.height) {
      throw new Error(`Canvas dimensions must match: ${srcCanvas.width}x${srcCanvas.height} vs ${dstCanvas.width}x${dstCanvas.height}`);
    }

    // Determine frame indices to copy
    let indices: number[];
    if (flags.frame !== undefined) {
      indices = [flags.frame];
    } else if (flags.range) {
      const [start, end] = flags.range.split('-').map(Number);
      indices = [];
      for (let i = start; i <= end; i++) indices.push(i);
    } else {
      throw new Error('Must provide --frame or --range');
    }

    // Validate indices
    for (const idx of indices) {
      if (idx < 0 || idx >= srcCanvas.frames.length) {
        throw new Error(`Frame index ${idx} out of range`);
      }
    }

    const dstLayerId = dstCanvas.layers[0]?.id;
    if (!dstLayerId) throw new Error('Target canvas has no layers');
    const srcLayerId = srcCanvas.layers[0]?.id;
    if (!srcLayerId) throw new Error('Source canvas has no layers');

    let copied = 0;
    for (const idx of indices) {
      const srcFrame = srcCanvas.frames[idx];
      const newFrameId = generateSequentialId('frame', dstCanvas.frames.length + 1);

      dstCanvas.frames.push({
        id: newFrameId,
        index: dstCanvas.frames.length,
        duration: srcFrame.duration,
        label: srcFrame.label,
      });

      const buf = readLayerFrame(projectPath, flags.canvas, srcLayerId, srcFrame.id);
      writeLayerFrame(projectPath, flags.target, dstLayerId, newFrameId, buf);
      copied++;
    }

    writeCanvasJSON(projectPath, flags.target, dstCanvas);

    const result = makeResult('frame:copy-to', { canvas: flags.canvas, target: flags.target }, { source: flags.canvas, target: flags.target, framesCopied: copied }, startTime);
    const format = this.getOutputFormat(flags);
    formatOutput(format, result, (r) => {
      console.log(`Copied ${r.framesCopied} frames from "${r.source}" to "${r.target}"`);
    });
  }
}
