import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readCanvasJSON, savePNG, resolveFrameSequence, renderFrames, composeSpritesheet, encodeGif, encodeApng, formatOutput, makeResult, generateSequentialId } from '@pixelcreator/core';

export default class AnimationExport extends BaseCommand {
  static description = 'Export animation in various formats';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    format: Flags.string({
      description: 'Export format: gif, apng, spritesheet, frames',
      required: true,
      options: ['gif', 'apng', 'spritesheet', 'frames'],
    }),
    dest: Flags.string({
      description: 'Destination file or directory path',
      required: true,
    }),
    tag: Flags.string({
      description: 'Animation tag to export',
    }),
    'sheet-layout': Flags.string({
      description: 'Spritesheet layout',
      options: ['horizontal', 'vertical', 'grid'],
      default: 'grid',
    }),
    'sheet-columns': Flags.integer({
      description: 'Spritesheet columns (grid layout)',
      default: 4,
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
    const { flags } = await this.parse(AnimationExport);

    const outputFormat = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (canvas.frames.length === 0) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    // Resolve frame sequence
    const tag = flags.tag
      ? canvas.animationTags.find((t) => t.name === flags.tag)
      : undefined;
    if (flags.tag && !tag) {
      this.error(`Animation tag "${flags.tag}" not found.`);
    }

    const sequence = resolveFrameSequence(canvas.frames, tag);
    const frameIndices = sequence.map((f) => f.index);
    const durations = sequence.map((f) => f.duration);

    // Render all needed frames
    const renderedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, flags.scale);
    const destPath = path.resolve(flags.dest);
    const fw = canvas.width * flags.scale;
    const fh = canvas.height * flags.scale;

    let resultInfo: { file?: string; directory?: string; size?: number; files?: number; metadataFile?: string; width?: number; height?: number } = {};

    if (flags.format === 'gif') {
      const gifFrames = renderedFrames.map((buffer, i) => ({
        buffer,
        duration: durations[i],
      }));
      const gifBuffer = encodeGif(gifFrames, { width: fw, height: fh, loop: flags.loop });
      fs.writeFileSync(destPath, gifBuffer);
      resultInfo = { file: destPath, size: gifBuffer.length };
    } else if (flags.format === 'apng') {
      const apngFrames = renderedFrames.map((buffer, i) => ({
        buffer,
        duration: durations[i],
      }));
      const apngBuffer = encodeApng(apngFrames, { width: fw, height: fh, loop: flags.loop });
      fs.writeFileSync(destPath, apngBuffer);
      resultInfo = { file: destPath, size: apngBuffer.length };
    } else if (flags.format === 'spritesheet') {
      const result = composeSpritesheet(
        renderedFrames, fw, fh, durations, canvas.animationTags,
        { layout: flags['sheet-layout'] as 'horizontal' | 'vertical' | 'grid', columns: flags['sheet-columns'], spacing: 0 },
      );
      savePNG(result.buffer, destPath);
      // Write metadata
      const metaPath = destPath.replace(/\.png$/i, '.json');
      fs.writeFileSync(metaPath, JSON.stringify({ image: path.basename(destPath), ...result.metadata }, null, 2));
      resultInfo = { file: destPath, metadataFile: metaPath, width: result.metadata.size.width, height: result.metadata.size.height };
    } else if (flags.format === 'frames') {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      const files: string[] = [];
      for (let i = 0; i < renderedFrames.length; i++) {
        const fileName = `${generateSequentialId('frame', i + 1)}.png`;
        const filePath = path.join(destPath, fileName);
        savePNG(renderedFrames[i], filePath);
        files.push(filePath);
      }
      resultInfo = { directory: destPath, files: files.length };
    }

    const resultData = {
      canvas: flags.canvas,
      format: flags.format,
      frameCount: sequence.length,
      scale: flags.scale,
      tag: flags.tag ?? null,
      ...resultInfo,
    };

    const cmdResult = makeResult(
      'animation:export',
      { canvas: flags.canvas, format: flags.format, dest: flags.dest, tag: flags.tag, scale: flags.scale },
      resultData,
      startTime,
    );

    formatOutput(outputFormat, cmdResult, (data) => {
      this.log(`Exported ${data.frameCount} frame(s) as ${data.format} from "${data.canvas}"`);
      if (data.file) this.log(`  File: ${data.file}`);
      if (data.directory) this.log(`  Directory: ${data.directory}`);
      if (data.tag) this.log(`  Tag: ${data.tag}`);
    });
  }
}
