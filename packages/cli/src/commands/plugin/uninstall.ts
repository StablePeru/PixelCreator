import { Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { getProjectPath, uninstallPlugin, getPluginsDir, formatOutput, makeResult } from '@pixelcreator/core';

export default class PluginUninstall extends BaseCommand {
  static description = 'Uninstall a plugin from the project';

  static flags = {
    ...BaseCommand.baseFlags,
    name: Flags.string({
      char: 'n',
      description: 'Plugin name',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PluginUninstall);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);

    uninstallPlugin(flags.name, getPluginsDir(projectPath));

    const resultData = { name: flags.name };
    const cmdResult = makeResult('plugin:uninstall', { name: flags.name }, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      this.log(`Plugin "${data.name}" uninstalled.`);
    });
  }
}
