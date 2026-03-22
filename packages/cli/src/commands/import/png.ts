import * as path from 'node:path';
import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, writeCanvasJSON, writeLayerFrame, loadPNG, formatOutput, makeResult } from '@pixelcreator/core';
import type { CanvasData } from '@pixelcreator/core';

export default class ImportPng extends BaseCommand {
  static description = 'Import a PNG file as a new canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    file: Flags.string({
      description: 'Path to the PNG file to import',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Canvas name for the imported image',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ImportPng);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists in this project.`);
    }

    const filePath = path.resolve(flags.file);
    const buffer = loadPNG(filePath);

    const now = new Date().toISOString();

    const canvas: CanvasData = {
      name: flags.name,
      width: buffer.width,
      height: buffer.height,
      created: now,
      modified: now,
      palette: null,
      layers: [
        {
          id: 'layer-001',
          name: 'imported',
          type: 'normal',
          visible: true,
          opacity: 255,
          blendMode: 'normal',
          locked: false,
          order: 0,
        },
      ],
      frames: [
        {
          id: 'frame-001',
          index: 0,
          duration: 100,
        },
      ],
      animationTags: [],
    };

    writeCanvasJSON(projectPath, flags.name, canvas);
    writeLayerFrame(projectPath, flags.name, 'layer-001', 'frame-001', buffer);

    project.canvases.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      source: filePath,
      width: buffer.width,
      height: buffer.height,
      layers: 1,
      frames: 1,
    };

    const cmdResult = makeResult(
      'import:png',
      { file: flags.file, name: flags.name },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Imported "${data.source}" as canvas "${data.name}"`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Layers: ${data.layers}, Frames: ${data.frames}`);
    });
  }
}
