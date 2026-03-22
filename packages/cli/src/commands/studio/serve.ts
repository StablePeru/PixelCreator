import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath } from '@pixelcreator/core';

export default class StudioServe extends BaseCommand {
  static override description = 'Start PixelCreator Studio — web-based real-time preview server';

  static override flags = {
    ...BaseCommand.baseFlags,
    port: Flags.integer({
      description: 'HTTP server port',
      default: 3000,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StudioServe);
    const projectPath = getProjectPath(flags.project);

    const { startStudio } = await import('@pixelcreator/studio');
    startStudio({
      projectPath,
      port: flags.port,
    });
  }
}
