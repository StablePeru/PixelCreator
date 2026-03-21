import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  getProjectPath,
  readProjectJSON,
  writeProjectJSON,
  deleteCanvasDirectory,
} from '../../io/project-io.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class CanvasDelete extends BaseCommand {
  static description = 'Delete a canvas from the project';

  static flags = {
    ...BaseCommand.baseFlags,
    canvas: Flags.string({
      char: 'c',
      description: 'Canvas name',
      required: true,
    }),
    force: Flags.boolean({
      description: 'Confirm deletion',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(CanvasDelete);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const idx = project.canvases.indexOf(flags.canvas);
    if (idx === -1) {
      this.error(`Canvas "${flags.canvas}" not found in project.`);
    }

    // Delete canvas directory and all contents
    deleteCanvasDirectory(projectPath, flags.canvas);

    // Remove from project
    project.canvases.splice(idx, 1);
    writeProjectJSON(projectPath, project);

    const resultData = {
      name: flags.canvas,
      deleted: true,
    };

    const cmdResult = makeResult(
      'canvas:delete',
      { canvas: flags.canvas, force: flags.force },
      resultData,
      startTime,
    );

    formatOutput(format, cmdResult, (data) => {
      this.log(`Canvas "${data.name}" deleted.`);
    });
  }
}
