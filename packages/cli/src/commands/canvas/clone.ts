import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, readCanvasJSON, copyCanvasDirectory, formatOutput, makeResult } from '@pixelcreator/core';

export default class CanvasClone extends BaseCommand {
  static description = 'Clone a canvas with all its layers and frames';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Source canvas name',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'New canvas name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasClone);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    if (!project.canvases.includes(flags.canvas)) {
      this.error(`Canvas "${flags.canvas}" not found in project.`);
    }

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists.`);
    }

    copyCanvasDirectory(projectPath, flags.canvas, flags.name);

    project.canvases.push(flags.name);
    writeProjectJSON(projectPath, project);

    const clonedCanvas = readCanvasJSON(projectPath, flags.name);

    const resultData = {
      source: flags.canvas,
      clone: flags.name,
      width: clonedCanvas.width,
      height: clonedCanvas.height,
      layers: clonedCanvas.layers.length,
      frames: clonedCanvas.frames.length,
    };

    const cmdResult = makeResult(
      'canvas:clone',
      { canvas: flags.canvas, name: flags.name },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.source}" cloned to "${data.clone}"`);
      this.log(`  Size: ${data.width}x${data.height}`);
      this.log(`  Layers: ${data.layers}, Frames: ${data.frames}`);
    });
  }
}
