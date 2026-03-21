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
import { savePNG } from '../../io/png-codec.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportSequence extends BaseCommand {
  static description = 'Export canvas frames as numbered PNG sequence';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination directory',
      required: true,
    }),
    prefix: Flags.string({
      description: 'File name prefix',
    }),
    scale: Flags.integer({
      description: 'Scale factor',
      default: 1,
    }),
    tag: Flags.string({
      description: 'Animation tag to export',
    }),
    padding: Flags.integer({
      description: 'Zero-padding for frame numbers',
      default: 3,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportSequence);

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

    const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, flags.scale);

    const destDir = path.resolve(flags.dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const prefix = flags.prefix ?? flags.canvas;
    const files: string[] = [];

    for (let i = 0; i < renderedFrames.length; i++) {
      const num = String(i + 1).padStart(flags.padding, '0');
      const fileName = `${prefix}_${num}.png`;
      const filePath = path.join(destDir, fileName);
      savePNG(renderedFrames[i], filePath);
      files.push(fileName);
    }

    const resultData = {
      canvas: flags.canvas,
      dest: destDir,
      frameCount: renderedFrames.length,
      files,
      scale: flags.scale,
    };

    const cmdResult = makeResult(
      'export:sequence',
      { canvas: flags.canvas, dest: flags.dest, prefix: flags.prefix, scale: flags.scale, tag: flags.tag, padding: flags.padding },
      resultData,
      startTime,
    );

    formatOutput(outputFormat, cmdResult, (data) => {
      this.log(`Exported ${data.frameCount} frames to ${data.dest}`);
      for (const f of data.files) {
        this.log(`  ${f}`);
      }
    });
  }
}
