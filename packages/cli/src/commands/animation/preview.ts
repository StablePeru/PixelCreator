import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, resolveFrameSequence, applyFpsOverride, renderFrames, encodeGif, encodeApng, formatOutput, makeResult } from '@pixelcreator/core';

export default class AnimationPreview extends BaseCommand {
  static description = 'Generate a quick animation preview';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    format: Flags.string({
      description: 'Preview format: gif or apng',
      options: ['gif', 'apng'],
      default: 'gif',
    }),
    dest: Flags.string({
      description: 'Destination file path',
    }),
    tag: Flags.string({
      description: 'Animation tag to preview',
    }),
    fps: Flags.integer({
      description: 'Override FPS for preview',
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
    const { flags } = await this.parse(AnimationPreview);

    const outputFormat = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (canvas.frames.length === 0) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const destPath = flags.dest
      ? path.resolve(flags.dest)
      : path.resolve(`./preview.${flags.format}`);

    // Resolve frame sequence
    const tag = flags.tag
      ? canvas.animationTags.find((t) => t.name === flags.tag)
      : undefined;
    if (flags.tag && !tag) {
      this.error(`Animation tag "${flags.tag}" not found.`);
    }

    let sequence = resolveFrameSequence(canvas.frames, tag);
    if (flags.fps) {
      sequence = applyFpsOverride(sequence, flags.fps);
    }

    const frameIndices = sequence.map((f) => f.index);
    const durations = sequence.map((f) => f.duration);

    const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, flags.scale);
    const fw = canvas.width * flags.scale;
    const fh = canvas.height * flags.scale;

    let fileBuffer: Buffer;
    if (flags.format === 'apng') {
      const apngFrames = renderedFrames.map((buffer, i) => ({ buffer, duration: durations[i] }));
      fileBuffer = encodeApng(apngFrames, { width: fw, height: fh, loop: flags.loop });
    } else {
      const gifFrames = renderedFrames.map((buffer, i) => ({ buffer, duration: durations[i] }));
      fileBuffer = encodeGif(gifFrames, { width: fw, height: fh, loop: flags.loop });
    }

    fs.writeFileSync(destPath, fileBuffer);

    const resultData = {
      canvas: flags.canvas,
      format: flags.format,
      dest: destPath,
      frameCount: sequence.length,
      scale: flags.scale,
      fps: flags.fps ?? null,
      tag: flags.tag ?? null,
      size: fileBuffer.length,
    };

    const cmdResult = makeResult(
      'animation:preview',
      { canvas: flags.canvas, format: flags.format, dest: flags.dest, tag: flags.tag, fps: flags.fps, scale: flags.scale },
      resultData,
      startTime,
    );

    formatOutput(outputFormat, cmdResult, (data) => {
      this.log(`Preview generated: ${data.dest}`);
      this.log(`  Format: ${data.format}, ${data.frameCount} frames, ${data.size} bytes`);
      if (data.fps) this.log(`  FPS override: ${data.fps}`);
    });
  }
}
