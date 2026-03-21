import * as path from 'node:path';
import * as fs from 'node:fs';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  writeProjectJSON,
  writeCanvasJSON,
  writeLayerFrame,
} from '../../io/project-io.js';
import { decodeGif } from '../../io/gif-decoder.js';
import { generateSequentialId } from '../../utils/id-generator.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import type { CanvasData } from '../../types/canvas.js';

export default class ImportGif extends BaseCommand {
  static description = 'Import an animated GIF as a new canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    file: Flags.string({
      description: 'Path to the GIF file',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Canvas name for the imported GIF',
      required: true,
    }),
    duration: Flags.integer({
      description: 'Override frame duration in ms',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ImportGif);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists in this project.`);
    }

    const filePath = path.resolve(flags.file);
    if (!fs.existsSync(filePath)) {
      this.error(`File not found: ${filePath}`);
    }

    const gifData = fs.readFileSync(filePath);
    const frames = decodeGif(gifData);

    if (frames.length === 0) {
      this.error('No frames could be extracted from the GIF.');
    }

    const width = frames[0].buffer.width;
    const height = frames[0].buffer.height;
    const now = new Date().toISOString();
    const layerId = generateSequentialId('layer', 1);

    const frameInfos = frames.map((f, i) => ({
      id: generateSequentialId('frame', i + 1),
      index: i,
      duration: flags.duration ?? f.duration,
    }));

    const canvas: CanvasData = {
      name: flags.name,
      width,
      height,
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
      writeLayerFrame(projectPath, flags.name, layerId, frameInfos[i].id, frames[i].buffer);
    }

    project.canvases.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      source: filePath,
      framesImported: frames.length,
      width,
      height,
    };

    const cmdResult = makeResult('import:gif', {
      file: flags.file, name: flags.name, duration: flags.duration,
    }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Imported GIF "${data.source}" as canvas "${data.name}"`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Frames imported: ${data.framesImported}`);
    });
  }
}
