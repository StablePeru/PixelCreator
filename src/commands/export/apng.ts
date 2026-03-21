import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
} from '../../io/project-io.js';
import { resolveFrameSequence } from '../../core/animation-engine.js';
import { renderFrames } from '../../core/frame-renderer.js';
import { encodeApng } from '../../io/apng-encoder.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportApng extends BaseCommand {
  static description = 'Export canvas animation as APNG';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination file path',
      required: true,
    }),
    tag: Flags.string({
      description: 'Animation tag to export',
    }),
    scale: Flags.integer({
      description: 'Scale factor',
      default: 1,
    }),
    loop: Flags.integer({
      description: 'Loop count (0 = infinite)',
      default: 0,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportApng);

    const outputFormat = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (canvas.frames.length === 0) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const tag = flags.tag
      ? canvas.animationTags.find((t) => t.name === flags.tag)
      : undefined;
    if (flags.tag && !tag) {
      this.error(`Animation tag "${flags.tag}" not found.`);
    }

    const sequence = resolveFrameSequence(canvas.frames, tag);
    const frameIndices = sequence.map((f) => f.index);
    const durations = sequence.map((f) => f.duration);

    const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, flags.scale);
    const fw = canvas.width * flags.scale;
    const fh = canvas.height * flags.scale;

    const apngFrames = renderedFrames.map((buffer, i) => ({ buffer, duration: durations[i] }));
    const apngBuffer = encodeApng(apngFrames, { width: fw, height: fh, loop: flags.loop });

    const destPath = path.resolve(flags.dest);
    fs.writeFileSync(destPath, apngBuffer);

    const resultData = {
      canvas: flags.canvas,
      dest: destPath,
      frameCount: sequence.length,
      scale: flags.scale,
      size: apngBuffer.length,
      tag: flags.tag ?? null,
    };

    const cmdResult = makeResult(
      'export:apng',
      { canvas: flags.canvas, dest: flags.dest, tag: flags.tag, scale: flags.scale },
      resultData,
      startTime,
    );

    formatOutput(outputFormat, cmdResult, (data) => {
      this.log(`APNG exported to ${data.dest}`);
      this.log(`  Frames: ${data.frameCount}, size: ${data.size} bytes`);
    });
  }
}
