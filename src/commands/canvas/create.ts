import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  writeProjectJSON,
  writeCanvasJSON,
  ensureCanvasStructure,
  writeLayerFrame,
} from '../../io/project-io.js';
import { createEmptyBuffer } from '../../io/png-codec.js';
import { drawRect } from '../../core/drawing-engine.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';
import { hexToRGBA } from '../../types/common.js';
import type { CanvasData } from '../../types/canvas.js';

export default class CanvasCreate extends BaseCommand {
  static description = 'Create a new canvas in the project';

  static flags = {
    ...BaseCommand.baseFlags,
    width: Flags.integer({
      char: 'w',
      description: 'Canvas width in pixels',
      required: true,
    }),
    height: Flags.integer({
      char: 'h',
      description: 'Canvas height in pixels',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Canvas name',
      required: true,
    }),
    palette: Flags.string({
      description: 'Palette to assign to this canvas',
    }),
    background: Flags.string({
      description: 'Background hex color (e.g. #ff0000)',
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasCreate);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists in this project.`);
    }

    const now = new Date().toISOString();

    const canvas: CanvasData = {
      name: flags.name,
      width: flags.width,
      height: flags.height,
      created: now,
      modified: now,
      palette: flags.palette ?? null,
      layers: [
        {
          id: 'layer-001',
          name: 'background',
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

    ensureCanvasStructure(projectPath, flags.name, canvas);
    writeCanvasJSON(projectPath, flags.name, canvas);

    if (flags.background) {
      const color = hexToRGBA(flags.background);
      const buffer = createEmptyBuffer(flags.width, flags.height);
      drawRect(buffer, 0, 0, flags.width, flags.height, color, true);
      writeLayerFrame(projectPath, flags.name, 'layer-001', 'frame-001', buffer);
    }

    project.canvases.push(flags.name);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.name,
      width: flags.width,
      height: flags.height,
      palette: flags.palette ?? null,
      background: flags.background ?? null,
      layers: 1,
      frames: 1,
    };

    const cmdResult = makeResult(
      'canvas:create',
      { name: flags.name, width: flags.width, height: flags.height, palette: flags.palette, background: flags.background },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.name}" created (${data.width}x${data.height})`);
      this.log(`  Palette: ${data.palette ?? 'none'}`);
      this.log(`  Background: ${data.background ?? 'transparent'}`);
      this.log(`  Layers: ${data.layers}, Frames: ${data.frames}`);
    });
  }
}
