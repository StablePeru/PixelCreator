import * as fs from 'node:fs';
import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readCanvasJSON,
} from '../../io/project-io.js';
import { savePNG } from '../../io/png-codec.js';
import { renderFrames } from '../../core/frame-renderer.js';
import { composeSpritesheet } from '../../core/spritesheet-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class ExportSpritesheet extends BaseCommand {
  static description = 'Export canvas frames as a spritesheet';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    dest: Flags.string({
      description: 'Destination file path for the spritesheet PNG',
      required: true,
    }),
    layout: Flags.string({
      description: 'Layout mode: horizontal, vertical, or grid',
      options: ['horizontal', 'vertical', 'grid'],
      default: 'grid',
    }),
    columns: Flags.integer({
      description: 'Number of columns (grid layout)',
      default: 4,
    }),
    spacing: Flags.integer({
      description: 'Pixel spacing between frames',
      default: 0,
    }),
    metadata: Flags.string({
      description: 'Metadata output format',
      options: ['json', 'none'],
      default: 'json',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ExportSpritesheet);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const canvas = readCanvasJSON(projectPath, flags.canvas);

    if (canvas.frames.length === 0) {
      this.error(`Canvas "${flags.canvas}" has no frames.`);
    }

    const frameIndices = canvas.frames.map((f) => f.index);
    const flattenedFrames = renderFrames(projectPath, flags.canvas, canvas, frameIndices, 1);
    const durations = canvas.frames.map((f) => f.duration);

    const fw = canvas.width;
    const fh = canvas.height;

    const result = composeSpritesheet(
      flattenedFrames, fw, fh, durations, canvas.animationTags,
      {
        layout: flags.layout as 'horizontal' | 'vertical' | 'grid',
        columns: flags.columns,
        spacing: flags.spacing,
      },
    );

    const destPath = path.resolve(flags.dest);
    savePNG(result.buffer, destPath);

    // Write metadata JSON alongside the image
    if (flags.metadata === 'json') {
      const metaPath = destPath.replace(/\.png$/i, '.json');
      const metaData = {
        image: path.basename(destPath),
        ...result.metadata,
      };
      fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
    }

    const cols = flags.layout === 'horizontal'
      ? flattenedFrames.length
      : flags.layout === 'vertical'
        ? 1
        : Math.min(flags.columns, flattenedFrames.length);
    const rows = Math.ceil(flattenedFrames.length / cols);

    const resultData = {
      canvas: flags.canvas,
      dest: destPath,
      layout: flags.layout,
      columns: cols,
      rows,
      frameCount: flattenedFrames.length,
      sheetWidth: result.metadata.size.width,
      sheetHeight: result.metadata.size.height,
      spacing: flags.spacing,
      metadata: flags.metadata,
    };

    const cmdResult = makeResult(
      'export:spritesheet',
      { canvas: flags.canvas, dest: flags.dest, layout: flags.layout, columns: flags.columns, spacing: flags.spacing, metadata: flags.metadata },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Spritesheet exported to ${data.dest}`);
      this.log(`  Layout: ${data.layout} (${data.columns}x${data.rows})`);
      this.log(`  Sheet size: ${data.sheetWidth}x${data.sheetHeight}`);
      this.log(`  Frames: ${data.frameCount}, spacing: ${data.spacing}px`);
      if (data.metadata === 'json') {
        this.log(`  Metadata: ${data.dest.replace(/\.png$/i, '.json')}`);
      }
    });
  }
}
