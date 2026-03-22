import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, writeProjectJSON, renameCanvasDirectory, formatOutput, makeResult } from '@pixelcreator/core';

export default class CanvasRename extends BaseCommand {
  static description = 'Rename a canvas';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Current canvas name',
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
    const { flags } = await this.parse(CanvasRename);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const idx = project.canvases.indexOf(flags.canvas);
    if (idx === -1) {
      this.error(`Canvas "${flags.canvas}" not found in project.`);
    }

    if (project.canvases.includes(flags.name)) {
      this.error(`Canvas "${flags.name}" already exists.`);
    }

    renameCanvasDirectory(projectPath, flags.canvas, flags.name);

    project.canvases[idx] = flags.name;
    writeProjectJSON(projectPath, project);

    const resultData = {
      oldName: flags.canvas,
      newName: flags.name,
    };

    const cmdResult = makeResult(
      'canvas:rename',
      { canvas: flags.canvas, name: flags.name },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas renamed from "${data.oldName}" to "${data.newName}"`);
    });
  }
}
