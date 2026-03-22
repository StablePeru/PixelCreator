import { BaseCommand } from '../base-command.js';
import { getProjectPath, discoverPlugins, formatOutput, makeResult } from '@pixelcreator/core';

export default class PluginList extends BaseCommand {
  static description = 'List all installed plugins';

  static flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const startTime = Date.now();
    const { flags } = await this.parse(PluginList);

    const format = this.getOutputFormat(flags);
    const projectPath = getProjectPath(flags.project);
    const plugins = discoverPlugins(projectPath);

    const resultData = { plugins, count: plugins.length };
    const cmdResult = makeResult('plugin:list', {}, resultData, startTime);

    formatOutput(format, cmdResult, (data) => {
      if (data.count === 0) {
        this.log('No plugins installed. Install one with `pxc plugin:install`.');
        return;
      }

      this.log(`Plugins (${data.count}):`);
      for (const p of data.plugins) {
        this.log(`  ${p.name}@${p.version} — ${p.description ?? '(no description)'}`);
      }
    });
  }
}
