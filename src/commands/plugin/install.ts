import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath } from '../../io/project-io.js';
import { installPlugin, getPluginsDir } from '../../core/plugin-loader.js';
import { formatOutput, makeResult } from '../../utils/output-formatter.js';

export default class PluginInstall extends BaseCommand {
  static description = 'Install a plugin from a local directory';

  static flags = {
    ...BaseCommand.baseFlags,
    path: Flags.string({
      description: 'Local directory to install from',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PluginInstall);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const manifest = installPlugin(flags.path, getPluginsDir(projectPath));

    const resultData = { name: manifest.name, version: manifest.version, source: 'project' as const };
    const cmdResult = makeResult('plugin:install', { path: flags.path }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Plugin "${data.name}@${data.version}" installed (source: ${data.source})`);
    });
  }
}
