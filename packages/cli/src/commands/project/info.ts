import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, readProjectJSON, formatOutput, makeResult } from '@pixelcreator/core';

export default class ProjectInfo extends BaseCommand {
  static description = 'Display information about the current .pxc project';

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(ProjectInfo);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const project = readProjectJSON(projectPath);

    const resultData = {
      name: project.name,
      version: project.version,
      path: projectPath,
      canvasCount: project.canvases.length,
      paletteCount: project.palettes.length,
      tilesetCount: project.tilesets.length,
      created: project.created,
      modified: project.modified,
    };

    const cmdResult = makeResult('project:info', { project: flags.project }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Project: ${data.name}`);
      this.log(`  Version:   ${data.version}`);
      this.log(`  Path:      ${data.path}`);
      this.log(`  Canvases:  ${data.canvasCount}`);
      this.log(`  Palettes:  ${data.paletteCount}`);
      this.log(`  Tilesets:  ${data.tilesetCount}`);
      this.log(`  Created:   ${data.created}`);
      this.log(`  Modified:  ${data.modified}`);
    });
  }
}
