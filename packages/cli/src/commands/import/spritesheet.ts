import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, writeCanvasJSON, writeLayerFrame, loadPNG, decomposeSpritesheet, generateSequentialId, formatOutput, makeResult } from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

export default class ImportSpritesheet extends BaseCommand {
  static description = 'Import a spritesheet as a new canvas with multiple frames';

  static flags = {
    ...BaseCommand.baseFlags,
    file: Flags.string({
      description: 'Path to the spritesheet PNG file',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Canvas name for the imported spritesheet',
      required: true,
    }),
    'frame-width': Flags.integer({
      description: 'Width of each frame in pixels',
      required: true,
    }),
    'frame-height': Flags.integer({
      description: 'Height of each frame in pixels',
      required: true,
    }),
    layout: Flags.string({
      description: 'Spritesheet layout (horizontal, vertical, grid)',
      default: 'horizontal',
      options: ['horizontal', 'vertical', 'grid'],
    }),
    columns: Flags.integer({
      description: 'Number of columns (for grid layout)',
    }),
    spacing: Flags.integer({
      description: 'Spacing between frames in pixels',
      default: 0,
    }),
    duration: Flags.integer({
      description: 'Default frame duration in ms',
      default: 100,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ImportSpritesheet);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists in this project.`);
    }

    const filePath = path.resolve(flags.file);
    const buffer = loadPNG(filePath);

    const frames = decomposeSpritesheet(buffer, flags['frame-width'], flags['frame-height'], {
      layout: flags.layout as 'horizontal' | 'vertical' | 'grid',
      columns: flags.columns,
      spacing: flags.spacing,
    });

    if (frames.length === 0) {
      this.error('No frames could be extracted from the spritesheet.');
    }

    const now = new Date().toISOString();
    const layerId = generateSequentialId('layer', 1);

    const frameInfos = frames.map((_, i) => ({
      id: generateSequentialId('frame', i + 1),
      index: i,
      duration: flags.duration,
    }));

    const canvas: CanvasData = {
      name: flags.name,
      width: flags['frame-width'],
      height: flags['frame-height'],
      created: now,
      modified: now,
      palette: null,
      layers: [
        {
          id: layerId,
          name: 'imported',
          type: 'normal' as const,
          visible: true,
          opacity: 255,
          blendMode: 'normal' as const,
          locked: false,
          order: 0,
        },
      ],
      frames: frameInfos,
      animationTags: [],
    };

    writeCanvasJSON(projectPath, flags.name, canvas);

    for (let i = 0; i < frames.length; i++) {
      writeLayerFrame(projectPath, flags.name, layerId, frameInfos[i].id, frames[i]);
    }

    project.canvases.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      source: filePath,
      frameWidth: flags['frame-width'],
      frameHeight: flags['frame-height'],
      framesImported: frames.length,
    };

    const cmdResult = makeResult('import:spritesheet', {
      file: flags.file, name: flags.name,
      'frame-width': flags['frame-width'], 'frame-height': flags['frame-height'],
      layout: flags.layout, columns: flags.columns, spacing: flags.spacing, duration: flags.duration,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Imported spritesheet "${data.source}" as canvas "${data.name}"`);
      this.log(`  Frame size: ${data.frameWidth}x${data.frameHeight}`);
      this.log(`  Frames imported: ${data.framesImported}`);
    });
  }
}
