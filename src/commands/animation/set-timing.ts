import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
  writeCanvasJSON,
} from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

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

export default class AnimationSetTiming extends BaseCommand {
  static description = 'Set frame timing (duration or FPS)';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    frame: Flags.integer({
      char: 'f',
      description: 'Frame index to update',
    }),
    range: Flags.string({
      description: 'Range of frame indices (e.g., "0-3")',
    }),
    tag: Flags.string({
      description: 'Animation tag name to target',
    }),
    duration: Flags.integer({
      char: 'd',
      description: 'Duration in milliseconds',
    }),
    fps: Flags.integer({
      description: 'Frames per second (converts to duration)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(AnimationSetTiming);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    // Validate mutual exclusivity
    if (flags.duration !== undefined && flags.fps !== undefined) {
      this.error('--duration and --fps are mutually exclusive.');
    }
    if (flags.duration === undefined && flags.fps === undefined) {
      this.error('Either --duration or --fps is required.');
    }

    const newDuration = flags.duration ?? Math.round(1000 / flags.fps!);

    // Resolve target frame indices
    let targetIndices: number[];
    if (flags.tag) {
      const tag = canvas.animationTags.find((t) => t.name === flags.tag);
      if (!tag) {
        this.error(`Animation tag "${flags.tag}" not found.`);
      }
      targetIndices = [];
      for (let i = tag.from; i <= tag.to; i++) {
        targetIndices.push(i);
      }
    } else if (flags.range) {
      targetIndices = parseRange(flags.range);
    } else if (flags.frame !== undefined) {
      targetIndices = [flags.frame];
    } else {
      // Apply to all frames
      targetIndices = canvas.frames.map((f) => f.index);
    }

    // Validate and update
    let updatedCount = 0;
    for (const idx of targetIndices) {
      const frame = canvas.frames.find((f) => f.index === idx);
      if (!frame) {
        this.error(`Frame index ${idx} not found in canvas "${flags.canvas}".`);
      }
      frame.duration = newDuration;
      updatedCount++;
    }

    writeCanvasJSON(projectPath, flags.canvas, canvas);

    const resultData = {
      canvas: flags.canvas,
      duration: newDuration,
      fps: flags.fps ?? null,
      updatedFrames: updatedCount,
      targetIndices,
    };

    const cmdResult = makeResult(
      'animation:set-timing',
      { canvas: flags.canvas, frame: flags.frame, range: flags.range, tag: flags.tag, duration: flags.duration, fps: flags.fps },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Updated timing for ${data.updatedFrames} frame(s) in "${data.canvas}"`);
      this.log(`  Duration: ${data.duration}ms${data.fps ? ` (${data.fps} FPS)` : ''}`);
    });
  }
}
