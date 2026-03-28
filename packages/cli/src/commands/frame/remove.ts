import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, writeCanvasJSON, deleteLayerFrame, reindexFrames, formatOutput, makeResult } from '@pixelcreator/core';

function parseRange(range: string): number[] {
  const [start, end] = range.split('-').map(Number);
  if (isNaN(start) || isNaN(end) || start > end) {
    throw new Error(`Invalid range: "${range}". Expected format: "start-end" (e.g., "2-5")`);
  }
  const indices: number[] = [];
  for (let i = start; i <= end; i++) {
    indices.push(i);
  }
  return indices;
}

export default class FrameRemove extends BaseCommand {
  static description = 'Remove frame(s) from a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.integer({
      char: 'f',
      description: 'Frame index to remove',
    }),
    range: Flags.string({
      description: 'Range of frame indices to remove (e.g., "2-5")',
    }),
    force: Flags.boolean({
      description: 'Allow removing all frames',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(FrameRemove);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    // Determine which indices to remove
    let indicesToRemove: number[];
    if (flags.range) {
      indicesToRemove = parseRange(flags.range);
    } else if (flags.frame !== undefined) {
      indicesToRemove = [flags.frame];
    } else {
      this.error('Either --frame or --range is required.');
    }

    // Validate indices exist
    for (const idx of indicesToRemove) {
      if (!canvas.frames.some((f) => f.index === idx)) {
        this.error(`Frame index ${idx} not found in canvas "${flags.canvas}".`);
      }
    }

    // Check if we'd remove all frames
    if (indicesToRemove.length >= canvas.frames.length && !flags.force) {
      this.error('Cannot remove all frames. Use --force to override.');
    }

    // Get frame IDs before removal for PNG cleanup
    const framesToRemove = canvas.frames.filter((f) => indicesToRemove.includes(f.index));
    const removedIds = framesToRemove.map((f) => ({ id: f.id, index: f.index }));

    // Delete PNGs for all layers
    for (const frame of framesToRemove) {
      for (const layer of canvas.layers) {
        deleteLayerFrame(projectPath, flags.canvas, layer.id, frame.id);
      }
    }

    // Remove frames from array
    canvas.frames = canvas.frames.filter((f) => !indicesToRemove.includes(f.index));

    // Adjust animation tags
    canvas.animationTags = canvas.animationTags
      .map((tag) => {
        // Recalculate properly
        const originalFrom = tag.from;
        const originalTo = tag.to;
        const removedBeforeFrom = indicesToRemove.filter((i) => i < originalFrom).length;
        const removedInTag = indicesToRemove.filter((i) => i >= originalFrom && i <= originalTo).length;
        const newFrom = originalFrom - removedBeforeFrom;
        const newTo = originalTo - removedBeforeFrom - removedInTag;

        if (newTo < newFrom) return null; // Tag fully consumed
        return { ...tag, from: newFrom, to: newTo };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    // Reindex remaining frames
    reindexFrames(projectPath, flags.canvas, canvas);
    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      removed: removedIds,
      remainingFrames: canvas.frames.length,
    };

    const cmdResult = makeResult(
      'frame:remove',
      { canvas: flags.canvas, frame: flags.frame, range: flags.range, force: flags.force },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Removed ${data.removed.length} frame(s) from "${data.canvas}"`);
      for (const f of data.removed) {
        this.log(`  ${f.id} (index ${f.index})`);
      }
      this.log(`  Remaining frames: ${data.remainingFrames}`);
    });
  }
}
